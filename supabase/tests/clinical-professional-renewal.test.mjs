import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setup,fixture} from './clinical-write-authorization.test.mjs';
const db=await setup(true);
const read=name=>fs.readFile(new URL('../migrations/'+name,import.meta.url),'utf8');
const source=await read('20260901130000_clinical_access_professional_identity.sql');
const fn=name=>source.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?\\$\\$;'))[0];
await db.exec(`alter table provider_organizations add column name text;alter table provider_organizations add column owner_user_id uuid;
create table test_admins(user_id uuid);
create function is_platform_admin(uuid) returns boolean language sql as $$select exists(select 1 from test_admins where user_id=$1)$$;
create function can_view_pet(uuid,uuid) returns boolean language sql as $$select can_edit_pet($1,$2)$$;`);
for(const name of ['get_my_clinical_professional_context','list_pending_clinical_professionals_for_admin','review_clinical_professional_profile'])await db.exec(fn(name));
await db.exec(await read('20261025020000_clinical_authorization_cycle_closure.sql'));
await db.exec(await read('20261027010000_clinical_professional_renewal.sql'));
const q=(sql,args=[])=>db.query(sql,args);
const actor=id=>q("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const renew=()=>q('select submit_my_clinical_professional_profile() as context');
const expire=f=>q('update clinical_professional_profiles set verification_expires_at=now() where id=$1',[f.professional]);
const deny=async action=>{await db.exec('savepoint denied');await assert.rejects(action);await db.exec('rollback to savepoint denied;release savepoint denied');};
const status=async f=>(await q('select verification_status from clinical_professional_profiles where id=$1',[f.professional])).rows[0].verification_status;
const tests=[
 ['expired verified identity can request review',async f=>{await expire(f);const r=await renew();assert.equal(r.rows[0].context.profile.verificationStatus,'pending');}],
 ['renewal does not approve identity',async f=>{await expire(f);await renew();assert.equal(await status(f),'pending');}],
 ['stored expired identity can renew',async f=>{await q("update clinical_professional_profiles set verification_status='expired' where id=$1",[f.professional]);await renew();assert.equal(await status(f),'pending');}],
 ['draft onboarding still submits',async f=>{await q("update clinical_professional_profiles set verification_status='draft' where id=$1",[f.professional]);await renew();assert.equal(await status(f),'pending');}],
 ['double submit creates one verification event',async f=>{await expire(f);await renew();await renew();assert.equal((await q("select count(*)::int n from clinical_professional_verification_events where professional_profile_id=$1 and event_type='submitted'",[f.professional])).rows[0].n,1);}],
 ['unexpired identity cannot renew',async()=>{await deny(renew);}],
 ['suspended identity cannot self renew',async f=>{await q("update clinical_professional_profiles set verification_status='suspended' where id=$1",[f.professional]);await deny(renew);}],
 ['rejected identity must correct draft first',async f=>{await q("update clinical_professional_profiles set verification_status='rejected' where id=$1",[f.professional]);await deny(renew);}],
 ['anonymous renewal denied',async()=>{await actor('');await deny(renew);}],
 ['another user cannot renew profile',async f=>{await expire(f);await actor(f.owner);await deny(renew);assert.equal(await status(f),'verified');}],
 ['renewal closes completed residual authorization',async f=>{await expire(f);await q("update clinical_write_requests set status='completed' where id=$1",[f.request]);await renew();assert.equal((await q('select status from clinical_write_requests where id=$1',[f.request])).rows[0].status,'revoked');assert.ok((await q('select revoked_at from clinical_write_authorizations where id=$1',[f.authorization])).rows[0].revoked_at);}],
 ['new administrative verification cannot restore old consent',async f=>{await expire(f);await renew();await actor(f.owner);await q("select review_clinical_professional_profile($1,'verified','QA renewal',now()+interval '1 day')",[f.professional]);assert.equal(await status(f),'verified');await actor(f.user);await deny(()=>q('select assert_clinical_write_authorization($1,$2,$3)',[f.authorization,f.pet,'create_encounter']));}],
 ['professional cannot approve own renewal',async f=>{await expire(f);await renew();await deny(()=>q("select review_clinical_professional_profile($1,'verified',null,null)",[f.professional]));}],
 ['admin sees effective expiry and expiry date',async f=>{await expire(f);await actor(f.owner);const row=(await q('select * from list_pending_clinical_professionals_for_admin()')).rows[0];assert.equal(row.verification_status,'expired');assert.ok(row.verification_expires_at);}],
 ['non-admin cannot list professionals',async()=>{assert.equal((await q('select * from list_pending_clinical_professionals_for_admin()')).rows.length,0);}],
 ['renewal preserves historical clinical entries',async f=>{await expire(f);await renew();assert.equal((await q('select count(*)::int n from clinical_encounters where id=$1',[f.encounter])).rows[0].n,1);}],
 ['renewal RPC is authenticated-only',async()=>{assert.equal((await q("select has_function_privilege('anon','submit_my_clinical_professional_profile()','EXECUTE') as allowed")).rows[0].allowed,false);}],
];
const results=[];
try{for(const[name,test]of tests){await db.exec('begin');try{const f=await fixture(db);await q('insert into test_admins values($1)',[f.owner]);await test(f);results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}finally{await db.exec('rollback');}}}finally{await db.close();}
console.log(JSON.stringify({engine:'PGlite',scope:'Single-connection real PL/pgSQL; mocked admin membership; no live RLS session or concurrency claim.',results},null,2));assert(results.every(r=>r.passed));
