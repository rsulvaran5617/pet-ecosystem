import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const modulePath = process.env.PGLITE_MODULE_PATH ?? path.join(
  os.tmpdir(), 'pet-clinical-regression/node_modules/@electric-sql/pglite/dist/index.js',
);
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const checks = [];
const reporter = '00000000-0000-0000-0000-000000000001';
const manager = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const resource = '00000000-0000-0000-0000-000000000010';
const missing = '00000000-0000-0000-0000-000000000099';
const functions = [
  'set_pet_alert_lost_pet_sighting_location',
  'set_pet_alert_community_sighting_location',
];
const tables = ['pet_alert_lost_pet_sightings', 'pet_alert_community_sightings'];
const signature = '(uuid,double precision,double precision,double precision,text,timestamptz,boolean)';
const check = (name, actual) => { assert.ok(actual, name); checks.push(name); };
const invoke = (name, id = resource) => db.query(
  `select * from public.${name}($1,8.5,-80.1,20,'device',now(),false)`, [id],
);
async function actor(role, user = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [user, role]);
  if (role) await db.exec(`set role ${role}`);
}
async function rejected(name, action, pattern = /PET_ALERT_UNAUTHORIZED/) {
  await assert.rejects(action, pattern);
  checks.push(name);
}
async function snapshot() {
  await db.exec('reset role');
  const rows = [];
  for (const table of [...tables, 'audit_logs']) {
    rows.push((await db.query(`select * from ${table}`)).rows);
  }
  return rows;
}

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema extensions;
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql as
      $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    create table audit_logs(entity_type text, entity_id uuid, action text, context jsonb, actor_id uuid);
    create function public.insert_audit_log(text,uuid,text,jsonb,uuid) returns void language sql as
      $$ insert into audit_logs values($1,$2,$3,$4,$5) $$;
    create function public.can_manage_pet_alert_lost_pet(uuid,uuid) returns boolean language sql as
      $$ select coalesce($2='${manager}'::uuid,false) $$;
    -- Geometry is deliberately stubbed: these tests cover authorization, not PostGIS.
    create function public.generate_pet_alert_public_location(double precision,double precision,integer,integer)
      returns table(public_latitude double precision,public_longitude double precision)
      language sql as $$ select $1+0.003,$2+0.003 $$;
  `);
  for (const table of tables) {
    await db.exec(`create table public.${table}(
      id uuid primary key, reporter_user_id uuid, alert_id uuid,
      latitude double precision, longitude double precision,
      private_latitude double precision, private_longitude double precision,
      public_latitude double precision, public_longitude double precision,
      location_precision text, location_accuracy_meters double precision,
      location_source text, location_captured_at timestamptz,
      public_location_visible boolean, updated_at timestamptz
    )`);
    await db.query(`insert into ${table}(id,reporter_user_id,alert_id) values($1,$2,$1)`, [resource, reporter]);
  }

  const baseline = await fs.readFile(new URL('../migrations/20260904130000_pet_alert_map2_secure_locations.sql', import.meta.url), 'utf8');
  for (const name of functions) {
    const start = baseline.indexOf(`create or replace function public.${name}(`);
    assert.ok(start >= 0);
    const end = baseline.indexOf('\n$$;', start);
    assert.ok(end > start);
    await db.exec(baseline.slice(start, end + 4));
    // Reproduce the explicit anon grant observed remotely, independent of PUBLIC.
    await db.exec(`revoke all on function public.${name}${signature} from public;
      grant execute on function public.${name}${signature} to anon,authenticated,service_role`);
  }
  await actor('anon');
  for (const name of functions) {
    check(`${name}: baseline NULL guard reproduced using synthetic row`, (await invoke(name)).rows.length === 1);
  }
  await db.exec('reset role');
  await db.exec(await fs.readFile(new URL('../migrations/20260920160000_pet_sos_location_authorization.sql', import.meta.url), 'utf8'));

  for (const name of functions) {
    const before = await snapshot();
    await actor('anon');
    await rejected(`${name}: anon grant removed`, () => invoke(name), /permission denied/);
    await actor('authenticated');
    await rejected(`${name}: missing uid rejected`, () => invoke(name));
    await actor('authenticated', stranger);
    await rejected(`${name}: foreign user rejected`, () => invoke(name));
    await actor('authenticated', reporter);
    await rejected(`${name}: missing resource rejected`, () => invoke(name, missing));
    assert.deepEqual(await snapshot(), before);
    checks.push(`${name}: denied operations changed neither row nor audit`);

    await actor('authenticated', reporter);
    check(`${name}: reporter can update`, (await invoke(name)).rows.length === 1);
    await rejected(`${name}: invalid coordinates still rejected`, () => db.query(
      `select * from public.${name}($1,91,-80.1,20,'device',now(),false)`, [resource],
    ), /PET_ALERT_LOCATION_INVALID/);
    await actor('service_role');
    check(`${name}: trusted service still allowed without uid`, (await invoke(name)).rows.length === 1);
  }

  await actor('authenticated', manager);
  check('Authorized alert manager can update linked sighting', (await invoke(functions[0])).rows.length === 1);
  await rejected('Alert manager cannot update someone else community report', () => invoke(functions[1]));

  await db.exec('reset role');
  for (const table of tables) await db.exec(`update ${table} set reporter_user_id=null`);
  for (const name of functions) {
    await actor('authenticated', stranger);
    await rejected(`${name}: null reporter does not grant foreign access`, () => invoke(name));
    await actor('');
    await rejected(`${name}: null role and null uid fail closed even as function owner`, () => invoke(name));
  }
  await actor('authenticated', manager);
  check('Manager path survives a null sighting reporter', (await invoke(functions[0])).rows.length === 1);
  await db.exec('reset role');
  const audit = (await db.query('select * from audit_logs')).rows;
  check('Successful authenticated updates audited', audit.length === 4);
  check('Audit contains no private coordinates', audit.every(row =>
    Object.keys(row.context).sort().join(',') === 'public_location_visible,source'));
  console.log(JSON.stringify({ passed: true, checks,
    limits: 'Isolated PGlite fixtures. Real function bodies/ACL; stubbed auth, household permission, geometry and audit. Not full RLS, PostGIS, concurrency or native QA.' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ passed: false, checks, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await db.close();
}
