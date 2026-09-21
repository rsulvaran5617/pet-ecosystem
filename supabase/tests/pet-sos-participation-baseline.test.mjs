import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { pathToFileURL, URL } from 'node:url';

const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH ??
  path.join(os.tmpdir(), 'pet-clinical-regression/node_modules/@electric-sql/pglite/dist/index.js')).href);
const migration = (name) => fs.readFile(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8');
function section(sql, start, end) {
  const from = sql.indexOf(start);
  const to = sql.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing SQL section: ${start}`);
  return sql.slice(from, to);
}
function rpc(sql, name) {
  return section(sql, `create or replace function public.${name}(`, '\n$$;') + '\n$$;';
}

// Characterization of committed SQL, not candidate conversion/RLS certification.
test('SOS participation baseline and documented conversion gaps', async (suite) => {
  const db = new PGlite();
  const user = '00000000-0000-0000-0000-000000000001';
  const pet = '00000000-0000-0000-0000-000000000002';
  const household = '00000000-0000-0000-0000-000000000003';
  const reporter = '00000000-0000-0000-0000-000000000004';
  const alert = '00000000-0000-0000-0000-000000000005';
  const lost = await migration('20260823110000_pet_alert_slice1a_lost_pet_backend');
  const external = await migration('20260826100000_pet_alert_slice8b_external_owner_reports');
  const community = await migration('20260823153000_pet_alert_slice4_community_sightings');
  const core = await migration('20260401220100_core_identity');
  const roles = await migration('20260725103000_core_protective_family_role');
  try {
    await db.exec(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table households(id uuid primary key);
      create table pets(id uuid primary key);
      create function can_edit_household(uuid,uuid) returns boolean language sql as $$select false$$;
      create function insert_audit_log(text,uuid,text,jsonb,uuid) returns void language sql as $$select$$;
      insert into auth.users values('${user}');
      insert into pets values('${pet}');
      insert into households values('${household}');
    `);
    await db.exec(section(lost, 'create table public.pet_alert_lost_pets (', 'create trigger trg_pet_alert_lost_pets_updated_at'));
    await db.exec(section(external, 'alter table public.pet_alert_lost_pets', 'create table public.pet_alert_external_verification_challenges'));
    await db.exec(section(community, 'create table public.pet_alert_community_sightings (', 'create trigger trg_pet_alert_community_sightings_updated_at'));
    await db.exec(rpc(lost, 'can_manage_pet_alert_lost_pet'));
    await db.exec(rpc(lost, 'create_pet_alert_lost_pet_sighting'));
    await db.exec(rpc(community, 'create_pet_alert_community_sighting'));
    await db.exec(section(core, 'create table if not exists public.profiles (', 'create table if not exists public.user_addresses ('));
    await db.exec(section(roles, 'alter table public.user_roles', 'drop policy if exists user_roles_insert_own'));
    await db.exec(rpc(roles, 'sync_core_identity_from_auth'));
    await db.query(`insert into pet_alert_external_reporters
      (id,email_normalized,contact_name,terms_version,privacy_version,consented_at,email_verified_at)
      values($1,'fixture@example.invalid','Fixture','test','test',now(),now())`, [reporter]);

    await suite.test('External alert exists with no Pet, household or auth identity', async () => {
      await db.query(`insert into pet_alert_lost_pets
        (id,source_type,external_reporter_id,status,alert_slug,pet_name,pet_species,
         last_seen_at,last_seen_city,last_seen_country,public_description)
        values($1,'external_owner',$2,'active','fixture-external','Fixture','Perro',now(),'Ciudad','PA','Reporte sintetico')`, [alert, reporter]);
      const { rows } = await db.query('select pet_id,household_id,created_by_user_id from pet_alert_lost_pets where id=$1', [alert]);
      assert.deepEqual(rows[0], { pet_id: null, household_id: null, created_by_user_id: null });
    });

    await suite.test('Registered-pet path still requires resource references', async () => {
      await assert.rejects(db.query(`insert into pet_alert_lost_pets
        (source_type,alert_slug,pet_name,pet_species,last_seen_at,last_seen_city,last_seen_country,public_description)
        values('registered_pet','fixture-invalid','Fixture','Perro',now(),'Ciudad','PA','Reporte sintetico')`),
      (error) => error.code === '23514' && error.constraint === 'pet_alert_lost_pets_source_check');
    });

    await suite.test('KNOWN GAP: external origin currently forbids later pet association', async () => {
      await assert.rejects(db.query('update pet_alert_lost_pets set pet_id=$2,household_id=$3 where id=$1', [alert, pet, household]),
        (error) => error.code === '23514' && error.constraint === 'pet_alert_lost_pets_source_check');
      const { rows } = await db.query('select id,alert_slug,external_reporter_id,pet_id from pet_alert_lost_pets where id=$1', [alert]);
      assert.deepEqual(rows[0], { id: alert, alert_slug: 'fixture-external', external_reporter_id: reporter, pet_id: null });
    });

    await suite.test('KNOWN GAP: linked_user_id alone does not grant alert management', async () => {
      await db.query('update pet_alert_external_reporters set linked_user_id=$2 where id=$1', [reporter, user]);
      const { rows } = await db.query('select can_manage_pet_alert_lost_pet($1,$2) as allowed', [alert, user]);
      assert.equal(rows[0].allowed, false);
    });

    await suite.test('Community report accepts auth identity without profile, role or household membership', async () => {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      const { rows } = await db.query(`select * from create_pet_alert_community_sighting(
        next_animal_species=>'Perro',next_observed_situation=>'Animal observado en la zona',next_city=>'Ciudad')`);
      assert.equal(rows[0].reporter_user_id, user);
      assert.equal(rows[0].status, 'sighting_open');
      assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n, 0);
      assert.equal((await db.query('select count(*)::int as n from user_roles')).rows[0].n, 0);
    });

    await suite.test('Sighting can attach to external alert without Pet or full reporter profile', async () => {
      await db.query(`select create_pet_alert_lost_pet_sighting(
        target_alert_slug=>'fixture-external',next_city=>'Ciudad',next_notes=>'Avistamiento sintetico')`);
      const { rows } = await db.query('select alert_id,reporter_user_id from pet_alert_lost_pet_sightings');
      assert.deepEqual(rows, [{ alert_id: alert, reporter_user_id: user }]);
      assert.equal((await db.query('select status from pet_alert_lost_pets where id=$1', [alert])).rows[0].status, 'sighting_received');
      assert.equal((await db.query('select count(*)::int as n from pet_alert_status_history')).rows[0].n, 2);
    });

    await suite.test('Standalone community RPC rejects absence of auth identity', async () => {
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await assert.rejects(db.query(`select create_pet_alert_community_sighting(
        next_animal_species=>'Perro',next_observed_situation=>'Animal observado en la zona',next_city=>'Ciudad')`), /PET_ALERT_UNAUTHORIZED/);
    });

    await suite.test('KNOWN GAP: auth synchronization assigns Owner when roles are omitted', async () => {
      await db.query('select sync_core_identity_from_auth($1,$2,$3::jsonb)', [user, 'fixture@example.invalid', '{}']);
      assert.deepEqual((await db.query('select role from user_roles where user_id=$1', [user])).rows, [{ role: 'pet_owner' }]);
    });

    await suite.test('Same auth identity supports Owner plus Protector assignments', async () => {
      await db.query("insert into user_roles(user_id,role) values($1,'protective_family')", [user]);
      assert.deepEqual((await db.query('select role from user_roles where user_id=$1 order by role', [user])).rows,
        [{ role: 'pet_owner' }, { role: 'protective_family' }]);
    });
  } finally {
    await db.close();
  }
});
