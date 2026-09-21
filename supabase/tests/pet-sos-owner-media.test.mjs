import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import console from 'node:console';
import {pathToFileURL, URL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE_PATH ?? path.join(os.tmpdir(),'pet-clinical-regression/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite();
const owner='00000000-0000-0000-0000-000000000001';
const viewer='00000000-0000-0000-0000-000000000002';
const stranger='00000000-0000-0000-0000-000000000003';
const home='00000000-0000-0000-0000-000000000004';
const checks=[];
const reject=async(name,action,pattern)=>{await assert.rejects(action,pattern);checks.push(name);};
const prepare=async(alert,actor=owner,consent=true)=>(await db.query('select prepare_pet_alert_owner_photo($1,$2,$3) job',[alert,actor,consent])).rows[0].job;
const finish=(job,actor=owner)=>db.query('select finalize_pet_alert_owner_photo($1,$2,$3,120,80)',[job.alert_id,actor,job.attempt_id]);
const abort=async(job)=>(await db.query('select abort_pet_alert_owner_photo($1,$2,$3) paths',[job.alert_id,owner,job.attempt_id])).rows[0].paths;
const upload=async(job)=>{for(const name of [job.display_path,job.thumbnail_path])await db.query("insert into storage.objects(bucket_id,name) values('pet-alert-media',$1)",[name]);};
async function seed(){
  const pet=(await db.query('insert into pets(household_id) values($1) returning id',[home])).rows[0].id;
  await db.query("insert into pet_profiles values($1,'pet-avatars',$2)",[pet,`${pet}/photo.jpg`]);
  await db.query("insert into storage.objects(bucket_id,name) values('pet-avatars',$1)",[`${pet}/photo.jpg`]);
  return (await db.query('insert into pet_alert_lost_pets(pet_id,household_id) values($1,$2) returning id',[pet,home])).rows[0].id;
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${viewer}'),('${stranger}');
    create table pets(id uuid primary key default gen_random_uuid(),household_id uuid);
    create table pet_profiles(pet_id uuid primary key,avatar_storage_bucket text,avatar_storage_path text);
    create table pet_alert_lost_pets(id uuid primary key default gen_random_uuid(),pet_id uuid,household_id uuid,source_type text default 'registered_pet',status text default 'active',share_enabled boolean default true,expires_at timestamptz default now()+interval '1 day');
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,updated_at timestamptz default now(),unique(bucket_id,name));
    alter table storage.objects enable row level security;
    create policy permissive_fixture on storage.objects for all to anon,authenticated using(true) with check(true);
    grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;
    create function can_manage_pet_alert_lost_pet(uuid,uuid) returns boolean language sql as $$select $2='${owner}'::uuid$$;
    create function can_edit_pet(uuid,uuid) returns boolean language sql as $$select $2='${owner}'::uuid$$;
    create table audit_logs(action text);
    create function insert_audit_log(text,uuid,text,jsonb,uuid) returns void language sql as $$insert into audit_logs values($3)$$;
  `);
  await db.exec(await fs.readFile(new URL('../migrations/20260921140000_pet_sos_owner_avatar_derivatives.sql',import.meta.url),'utf8'));
  const alert=await seed();
  await reject('NULL service role rejected',()=>prepare(alert),/UNAUTHORIZED/);
  await db.exec("select set_config('request.jwt.claim.role','service_role',false)");
  for(const actor of [viewer,stranger,null]) await reject('insufficient actor rejected',()=>prepare(alert,actor),/UNAUTHORIZED/);
  for(const consent of [false,null]) await reject('explicit consent required',()=>prepare(alert,owner,consent),/CONSENT_REQUIRED/);
  const job=await prepare(alert);
  await reject('single lease',()=>prepare(alert),/BUSY/);
  await reject('both outputs required',()=>finish(job),/NOT_UPLOADED/);
  await upload(job); await finish(job); await finish(job);
  assert.equal((await prepare(alert)).attempt_id,job.attempt_id);
  assert.equal(await abort(job),null);
  assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from storage.objects where bucket_id='pet-avatars'")).rows[0].n,1);
  checks.push('ready replay/audit idempotent; abort preserves ready; original retained');
  await db.query('delete from storage.objects where name=$1',[job.thumbnail_path]);
  const repaired=await prepare(alert);
  assert.notEqual(repaired.attempt_id,job.attempt_id);
  await upload(repaired); await finish(repaired);
  checks.push('missing derivative does not report false ready');
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await reject('no client jobs',()=>db.query('select * from pet_alert_owner_photo_derivatives'),/permission denied/);
    await reject('no client RPC',()=>prepare(alert),/permission denied/);
    assert.equal((await db.query('select * from storage.objects where name=$1',[job.display_path])).rows.length,0);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning *',[job.display_path])).rows.length,0);
    await reject('no client upload',()=>db.query("insert into storage.objects(bucket_id,name) values('pet-alert-media','owner-sos-v1/forged.jpg')"),/row-level security/);
    await db.exec('reset role');
  }
  for(const change of ['status','share','expiry','household','profile','version','permission']) {
    const id=await seed(); const pending=await prepare(id); await upload(pending);
    if(change==='status')await db.query("update pet_alert_lost_pets set status='closed' where id=$1",[id]);
    if(change==='share')await db.query('update pet_alert_lost_pets set share_enabled=false where id=$1',[id]);
    if(change==='expiry')await db.query("update pet_alert_lost_pets set expires_at=now()-interval '1 day' where id=$1",[id]);
    if(change==='household')await db.query('update pets set household_id=gen_random_uuid() where id=$1',[pending.pet_id]);
    if(change==='profile')await db.query("update pet_profiles set avatar_storage_path=pet_id::text||'/other.jpg' where pet_id=$1",[pending.pet_id]);
    if(change==='version')await db.query("update storage.objects set updated_at=now()+interval '1 minute' where id=$1",[pending.source_object_id]);
    await reject(`finalize rechecks ${change}`,()=>finish(pending,change==='permission'?stranger:owner),/NOT_AVAILABLE|UNAUTHORIZED|STALE/);
    assert.deepEqual(await abort(pending),[pending.display_path,pending.thumbnail_path]);
  }
  await db.query("update storage.objects set updated_at=now()+interval '2 minutes' where id=$1",[job.source_object_id]);
  const next=await prepare(alert); assert.notEqual(next.attempt_id,job.attempt_id);
  assert.equal(await abort(job),null);
  await db.query("update pet_alert_owner_photo_derivatives set lease_until=now()-interval '1 minute' where id=$1",[next.id]);
  await reject('expired lease',()=>finish(next),/STALE/);
  await db.query('update pet_alert_owner_photo_derivatives set attempt_count=5 where id=$1',[next.id]);
  await reject('attempt cap',()=>prepare(alert),/RATE_LIMITED/);
  const external=await seed(); await db.query("update pet_alert_lost_pets set source_type='external_owner' where id=$1",[external]);
  await reject('external has no avatar access',()=>prepare(external),/UNAUTHORIZED/);
  console.log(`PASS: ${checks.length} owner derivative checks plus Storage/replay assertions; fixtures only, no hosted RLS/concurrent sessions.`);
} finally {await db.close();}
