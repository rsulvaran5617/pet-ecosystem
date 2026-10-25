import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setup,fixture} from './clinical-write-authorization.test.mjs';
const db=await setup(true);
await db.exec(`create schema extensions;
create function extensions.digest(text,text) returns bytea language sql as $$select sha256(convert_to($1,'UTF8'))$$;
create function extensions.gen_random_bytes(integer) returns bytea language sql as $$select decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex')$$;
alter table provider_organizations add column name text;
create table test_owners(pet_id uuid,user_id uuid);
create or replace function can_edit_pet(uuid,uuid) returns boolean language sql as $$select exists(select 1 from test_owners where pet_id=$1 and user_id=$2)$$;
create function can_view_pet(uuid,uuid) returns boolean language sql as $$select can_edit_pet($1,$2)$$;`);
await db.exec(await fs.readFile(new URL('../migrations/20260918020000_clinical_retry_and_residual_revocation.sql',import.meta.url),'utf8'));
await db.exec(await fs.readFile(new URL('../migrations/20261025020000_clinical_authorization_cycle_closure.sql',import.meta.url),'utf8'));
const token='b'.repeat(64);
const query=(sql,args=[])=>db.query(sql,args);
const user=id=>query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const status=async id=>(await query('select status from clinical_write_requests where id=$1',[id])).rows[0].status;
const effective=async id=>(await query('select effective_clinical_request_status(r) as status from clinical_write_requests r where id=$1',[id])).rows[0].status;
const request=async()=> (await query("select request_clinical_write_access($1,array['create_encounter'],null) as id",[token])).rows[0].id;
const denied=async fn=>{await db.exec('savepoint rejected');await assert.rejects(fn);await db.exec('rollback to savepoint rejected; release savepoint rejected');};
const tests=[
 ['exact deadline denies access and closes effective status',async f=>{await query('update clinical_write_requests set expires_at=now() where id=$1',[f.request]);assert.equal(await effective(f.request),'expired');await denied(()=>query('select assert_clinical_write_authorization($1,$2,$3)',[f.authorization,f.pet,'create_encounter']));}],
 ['revocation before deadline blocks document permission',async f=>{await user(f.owner);await query('select revoke_pet_clinical_access($1)',[f.grant]);await user(f.user);await denied(()=>query('select assert_clinical_write_authorization($1,$2,$3)',[f.authorization,f.pet,'upload_clinical_document']));}],
 ['new request cannot revive expired verification',async f=>{await query("update clinical_professional_profiles set verification_expires_at=now() where id=$1",[f.professional]);await denied(()=>request());assert.equal(await status(f.request),'approved');assert.equal(await effective(f.request),'expired');}],
 ['owner can revoke completed residual rights',async f=>{await query("update clinical_write_requests set status='completed' where id=$1",[f.request]);await user(f.owner);await query("select revoke_clinical_write_authorization($1,'QA revoke')",[f.request]);assert.equal(await effective(f.request),'revoked');}],
 ['new request closes approved circuit',async f=>{const id=await request();assert.equal(await status(f.request),'revoked');assert.equal(await status(id),'requested');assert.ok((await query('select revoked_at from clinical_write_authorizations where id=$1',[f.authorization])).rows[0].revoked_at);}],
 ['completed circuit residual rights close',async f=>{await query("update clinical_write_requests set status='completed' where id=$1",[f.request]);await request();assert.equal(await status(f.request),'revoked');assert.equal((await query('select count(*)::int n from clinical_encounters where id=$1',[f.encounter])).rows[0].n,1);}],
 ['pending duplicate is idempotent',async()=>{const id=await request();assert.equal(await request(),id);}],
 ['changed pending submission closes old request',async()=>{const id=await request();await query("select request_clinical_write_access($1,array['record_vaccine'],'new request')",[token]);assert.equal(await status(id),'revoked');}],
 ['QR revocation closes whole circuit',async f=>{await user(f.owner);await query('select revoke_pet_clinical_access($1)',[f.grant]);assert.equal(await status(f.request),'revoked');}],
 ['QR replacement closes old circuit',async f=>{await user(f.owner);await query("select create_pet_clinical_access($1,'1_hour')",[f.pet]);assert.equal(await status(f.request),'revoked');}],
 ['new QR never inherits authorization',async f=>{await user(f.owner);const grant=(await query("select create_pet_clinical_access($1,'1_hour') as g",[f.pet])).rows[0].g;await user(f.user);assert.equal((await query('select get_my_clinical_write_request($1) as r',[grant.token])).rows[0].r,null);}],
 ['expired completed request displays closed',async f=>{await query("update clinical_write_requests set status='completed',expires_at=now()-interval '1 second' where id=$1",[f.request]);assert.equal(await effective(f.request),'expired');}],
 ['professional deadline caps request',async f=>{await query("update clinical_professional_profiles set verification_expires_at=now()+interval '10 minutes' where id=$1",[f.professional]);const id=await request();assert.equal((await query('select r.expires_at=p.verification_expires_at as capped from clinical_write_requests r join clinical_professional_profiles p on p.id=r.professional_profile_id where r.id=$1',[id])).rows[0].capped,true);}],
 ['approval rejects revoked parent',async f=>{const id=await request();await query("update pet_clinical_access_grants set status='revoked',revoked_at=now() where id=$1",[f.grant]);await user(f.owner);await denied(()=>query("select review_clinical_write_request($1,'approved',array['create_encounter'],null)",[id]));}],
 ['approval rejects expired professional',async f=>{const id=await request();await query("update clinical_professional_profiles set verification_expires_at=now()-interval '1 second' where id=$1",[f.professional]);await user(f.owner);await denied(()=>query("select review_clinical_write_request($1,'approved',array['create_encounter'],null)",[id]));}],
 ['new circuit needs new owner approval',async f=>{const id=await request();await denied(()=>query('select assert_clinical_write_authorization($1,$2,$3)',[f.authorization,f.pet,'create_encounter']));await user(f.owner);await query("select review_clinical_write_request($1,'approved',array['create_encounter'],null)",[id]);assert.equal(await status(id),'approved');}],
 ['vet cannot approve own request',async()=>{const id=await request();await denied(()=>query("select review_clinical_write_request($1,'approved',array['create_encounter'],null)",[id]));}],
 ['other household cannot revoke QR',async f=>{await user(f.user);await denied(()=>query('select revoke_pet_clinical_access($1)',[f.grant]));assert.equal(await status(f.request),'approved');}],
 ['anonymous cannot request',async()=>{await user('');await denied(()=>request());}],
 ['invalid replacement preserves old circuit',async f=>{await denied(()=>query("select request_clinical_write_access($1,array['invalid'],null)",[token]));assert.equal(await status(f.request),'approved');}],
 ['public RPCs require authenticated role',async()=>{for(const sig of ['request_clinical_write_access(text,text[],text)','review_clinical_write_request(uuid,text,text[],text)','create_pet_clinical_access(uuid,text)']){assert.equal((await query("select has_function_privilege('anon',$1,'EXECUTE') as allowed",[sig])).rows[0].allowed,false);assert.equal((await query("select has_function_privilege('authenticated',$1,'EXECUTE') as allowed",[sig])).rows[0].allowed,true);}}],
 ['closure helpers inaccessible to authenticated and anon',async()=>{for(const role of ['anon','authenticated'])for(const signature of ['close_clinical_consent_cycles(uuid,uuid,uuid,text)','effective_clinical_request_status(clinical_write_requests)'])assert.equal((await query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed',[role,signature])).rows[0].allowed,false);}],
 ['owner history reports expired residual rights',async f=>{await query("update clinical_write_requests set status='completed',expires_at=now()-interval '1 second' where id=$1",[f.request]);await user(f.owner);assert.equal((await query('select * from list_pet_clinical_write_requests($1)',[f.pet])).rows[0].status,'expired');}],
 ['other household cannot list history',async f=>{assert.equal((await query('select * from list_pet_clinical_write_requests($1)',[f.pet])).rows.length,0);}],
];
const results=[];
try {for(const [name,test] of tests){await db.exec('begin');try{const f=await fixture(db);await query('insert into test_owners values($1,$2)',[f.pet,f.owner]);await query("update pet_clinical_access_grants set token_hash=encode(extensions.digest($1,'sha256'),'hex') where id=$2",[token,f.grant]);await test(f);results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}finally{await db.exec('rollback');}}}finally{await db.close();}
console.log(JSON.stringify({engine:'PGlite',limits:'Single connection; no live Supabase RLS sessions or contention test. Crypto helpers are test-only.',results},null,2));
assert.ok(results.every(r=>r.passed));
