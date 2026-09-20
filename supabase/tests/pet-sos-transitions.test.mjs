import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import console from 'node:console';
import {pathToFileURL, URL} from 'node:url';
const {PGlite} = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH ?? path.join(os.tmpdir(), 'pet-clinical-regression/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
const owner = '00000000-0000-0000-0000-000000000001';
const admin = '00000000-0000-0000-0000-000000000002';
const stranger = '00000000-0000-0000-0000-000000000003';
const checks = [];
const check = (name, actual) => {assert.ok(actual, name); checks.push(name);};
const actor = async (id) => {await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);};
const reject = async (name, action, pattern) => {await assert.rejects(action, pattern); checks.push(name);};
const row = async (table, id) => (await db.query(`select * from ${table} where id=$1`, [id])).rows[0];
const review = (id, status) => db.query('select review_pet_alert_community_claim($1,$2,$3)', [id,status,'QA decision']);
const moderate = (id, action) => db.query('select moderate_pet_alert_content($1,$2,$3)', [id,action,'QA moderation decision']);
async function seed(status = 'possible_owner_claim') {
  const report = (await db.query('insert into pet_alert_community_sightings(reporter_user_id,status) values($1,$2) returning id', [owner,status])).rows[0].id;
  const claim = (await db.query('insert into pet_alert_community_claims(community_sighting_id,status) values($1,$2) returning id', [report,'pending'])).rows[0].id;
  return {report,claim};
}
async function moderation(target, type='community_sighting', previous='sighting_open') {
  return (await db.query('insert into pet_alert_moderation_cases(target_id,target_type,target_previous_status) values($1,$2,$3) returning id', [target,type,previous])).rows[0].id;
}
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function is_platform_admin(uuid) returns boolean language sql as $$select $1='${admin}'::uuid$$;
    create table profiles(id uuid,first_name text,last_name text,email text,phone text);
    create table audit_logs(entity_type text,entity_id uuid,action text,context jsonb,actor uuid);
    create function insert_audit_log(text,uuid,text,jsonb,uuid) returns void language sql as $$insert into audit_logs values($1,$2,$3,$4,$5)$$;
    create table pet_alert_community_sightings(id uuid primary key default gen_random_uuid(),reporter_user_id uuid,status text,expires_at timestamptz default now()+interval '1 day',share_enabled boolean default true,closed_at timestamptz,close_reason text);
    create table pet_alert_lost_pets(id uuid primary key default gen_random_uuid(),status text,closed_at timestamptz,close_reason text);
    create table pet_alert_community_claims(id uuid primary key default gen_random_uuid(),community_sighting_id uuid,status text,reviewed_by_user_id uuid,reviewed_at timestamptz,decision_reason text,authorized_reporter_name text,authorized_reporter_email text,authorized_reporter_phone text);
    create unique index one_approved on pet_alert_community_claims(community_sighting_id) where status='approved';
    create table pet_alert_community_claim_history(claim_id uuid,old_status text,new_status text,changed_by_user_id uuid,reason text);
    create table pet_alert_moderation_cases(id uuid primary key default gen_random_uuid(),target_id uuid,target_type text,target_previous_status text,status text default 'open',resolution_action text,resolution_reason text,reviewed_by_user_id uuid,reviewed_at timestamptz,created_at timestamptz default clock_timestamp());
    create table pet_alert_moderation_history(moderation_case_id uuid,old_status text,new_status text,action text,reason text,changed_by_user_id uuid);
  `);
  const baseline = await fs.readFile(new URL('../migrations/20260823183000_pet_alert_slice5_controlled_claims.sql', import.meta.url), 'utf8');
  const start = baseline.indexOf('create or replace function public.review_pet_alert_community_claim(');
  await db.exec(baseline.slice(start,baseline.indexOf('\n$$;',start)+4));
  await actor(owner);
  const prior = await seed('closed');
  await review(prior.claim,'approved');
  check('Baseline reproduces reopening a closed report on isolated fixture', (await row('pet_alert_community_sightings',prior.report)).status === 'owner_verified');
  await db.exec(await fs.readFile(new URL('../migrations/20260920190000_pet_sos_transition_integrity.sql',import.meta.url),'utf8'));

  for(const state of ['closed','reunited','expired','flagged','owner_verified']) {
    const fixture = await seed(state);
    await reject(`Cannot approve claim after ${state}`,()=>review(fixture.claim,'approved'),/PET_ALERT_REPORT_NOT_AVAILABLE/);
    check(`${state} rejection rollback preserves pending claim`, (await row('pet_alert_community_claims',fixture.claim)).status === 'pending');
    await review(fixture.claim,'rejected');
    check(`Rejecting remaining claim preserves ${state}`, (await row('pet_alert_community_sightings',fixture.report)).status === state);
  }
  for(const column of ['expires_at','share_enabled']) {
    const fixture=await seed();
    await db.query(`update pet_alert_community_sightings set ${column}=${column==='expires_at'?"now()-interval '1 day'":'false'} where id=$1`,[fixture.report]);
    await reject(`Approval respects ${column}`,()=>review(fixture.claim,'approved'),/PET_ALERT_REPORT_NOT_AVAILABLE/);
  }
  const valid=await seed();
  await review(valid.claim,'approved');
  check('Valid approval still verifies owner', (await row('pet_alert_community_sightings',valid.report)).status==='owner_verified');
  await reject('Repeated review cannot duplicate history',()=>review(valid.claim,'approved'),/PET_ALERT_CLAIM_NOT_PENDING/);
  await reject('Null decision is rejected',()=>review(valid.claim,null),/PET_ALERT_INVALID_CLAIM_STATUS/);
  await actor(stranger);
  const foreign=await seed();
  await reject('Foreign user cannot review',()=>review(foreign.claim,'approved'),/PET_ALERT_UNAUTHORIZED/);
  await actor(owner);
  const pending=await seed();
  await db.query('insert into pet_alert_community_claims(community_sighting_id,status) values($1,$2)',[pending.report,'pending']);
  await review(pending.claim,'rejected');
  check('Remaining pending claim preserves possible match', (await row('pet_alert_community_sightings',pending.report)).status==='possible_owner_claim');

  await actor(admin);
  for(const type of ['community_sighting','lost_pet_alert']) {
    const table=type==='community_sighting'?'pet_alert_community_sightings':'pet_alert_lost_pets';
    const status=type==='community_sighting'?'reunited':'found';
    const target=(await db.query(`insert into ${table}(status) values($1) returning id`,[status])).rows[0].id;
    const stale=await moderation(target,type,'sighting_open');
    const flag=await moderation(target,type,'sighting_open');
    await moderate(flag,'flag');
    check(`${type} flag captures effective status, not stale complaint`,(await row('pet_alert_moderation_cases',flag)).target_status_at_action===status);
    await reject(`${type} stale restore rejected`,()=>moderate(stale,'restore'),/PET_ALERT_MODERATION_STALE_STATE/);
    const close=await moderation(target,type,'flagged');
    await reject(`${type} recovered result cannot be overwritten by close`,()=>moderate(close,'close'),/PET_ALERT_MODERATION_STALE_STATE/);
    const fresh=await moderation(target,type,'flagged');
    await moderate(fresh,'restore');
    check(`${type} restores exact effective state`,(await row(table,target)).status===status);
    const notFlagged=await moderation(target,type,status);
    await reject(`${type} restore on unflagged report rejected`,()=>moderate(notFlagged,'restore'),/PET_ALERT_MODERATION_STALE_STATE/);
    check(`${type} failed operation leaves case open`,(await row('pet_alert_moderation_cases',notFlagged)).status==='open');
  }
  const legacy=await seed('flagged');
  const legacyCase=await moderation(legacy.report);
  await reject('Legacy flag without reliable snapshot cannot be restored',()=>moderate(legacyCase,'restore'),/PET_ALERT_MODERATION_STALE_STATE/);
  const ordinary=await seed('sighting_open');
  const ordinaryCase=await moderation(ordinary.report);
  await moderate(ordinaryCase,'close');
  check('Valid administrative closure remains available',(await row('pet_alert_community_sightings',ordinary.report)).status==='closed');
  await reject('Resolved case cannot be processed twice',()=>moderate(ordinaryCase,'dismiss'),/PET_ALERT_MODERATION_ALREADY_REVIEWED/);
  await actor(owner);
  await reject('Owner is not platform moderator',()=>moderate(legacyCase,'dismiss'),/PET_ALERT_UNAUTHORIZED/);
  await actor('');
  await reject('Missing identity fails closed for admin helper returning NULL',()=>moderate(legacyCase,'dismiss'),/PET_ALERT_UNAUTHORIZED/);
  for(const name of ['review_pet_alert_community_claim','moderate_pet_alert_content']) {
    await db.exec('set role anon');
    await reject(`${name} denies anon EXECUTE`,()=>db.query(`select ${name}($1,$2,$3)`,[ordinaryCase,'dismiss','QA reason']),/permission denied/);
    await db.exec('reset role');
  }
  console.log(JSON.stringify({passed:true,checks,limits:'PGlite synthetic fixtures; real function bodies, simplified tables/auth/admin helpers. No multi-connection concurrency, full RLS or production mutation.'},null,2));
} catch(error) {
  console.error(JSON.stringify({passed:false,checks,error:error.message},null,2));process.exitCode=1;
} finally {await db.close();}
