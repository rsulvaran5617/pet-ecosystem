// Actual PL/pgSQL regression tests in an ephemeral PostgreSQL WASM instance.
// See docs/audit/2026-09-17/CORRECCION_CLINICA.md for setup and limitations.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL, URL} from 'node:url';
import process from 'node:process';
import crypto from 'node:crypto';
import console from 'node:console';
import assert from 'node:assert/strict';
const modulePath=process.env.PGLITE_MODULE_PATH??path.join(os.tmpdir(),'pet-clinical-regression/node_modules/@electric-sql/pglite/dist/index.js');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const root=new URL('../../',import.meta.url);
const names=['20260901110000_clinical_access_read_only.sql','20260901130000_clinical_access_professional_identity.sql','20260901150000_clinical_access_owner_consent.sql','20260901170000_clinical_access_append_only_encounters.sql','20260901190000_clinical_access_documents_timeline.sql','20260903100000_clinical_document_storage_policy_isolation.sql'];
const sources=await Promise.all(names.map(n=>fs.readFile(new URL('supabase/migrations/'+n,root),'utf8')));
const fix=await fs.readFile(new URL('supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql',root),'utf8');
const fn=(index,name)=>{const match=sources[index].match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?\\$\\$;'));assert.ok(match,name);return match[0];};
export async function setup(patched){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.households(id uuid primary key);
 create table public.pets(id uuid primary key,household_id uuid not null references public.households(id));
 create table public.provider_organizations(id uuid primary key);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 create function public.can_edit_pet(uuid,uuid) returns boolean language sql as $$select $2 is not null$$;
 create table public.test_audit(entity_id uuid,action text);
 create function public.insert_audit_log(text,uuid,text,jsonb,uuid) returns void language sql as $$insert into public.test_audit values($2,$3)$$;`);
 for(const index of [0,1,2,3])for(const table of sources[index].matchAll(/create table public\.[\s\S]*?\n\);/g))await db.exec(table[0]);
 for(const table of ['clinical_entries','clinical_documents'])await db.exec(sources[4].match(new RegExp('alter table public\\.'+table+'[\\s\\S]*?;'))[0]);
 await db.exec(sources[4].match(/create unique index clinical_documents_author_idempotency_idx[\s\S]*?;/)[0]);
 for(const[index,name]of [[0,'revoke_pet_clinical_access'],[2,'revoke_clinical_write_authorization'],[3,'finalize_clinical_encounter'],[4,'prepare_clinical_document_upload'],[4,'finalize_clinical_document_upload'],[4,'create_clinical_entry_correction'],[5,'can_upload_clinical_document_object']])await db.exec(fn(index,name));
 if(patched)await db.exec(fix);
 return db;
}
export async function fixture(db){
 const f=Object.fromEntries(['owner','user','household','pet','professional','grant','request','authorization','encounter','entry','document','key'].map(k=>[k,crypto.randomUUID()]));
 await db.exec(`insert into auth.users values('${f.owner}'),('${f.user}');insert into households values('${f.household}');insert into pets values('${f.pet}','${f.household}');
 insert into clinical_professional_profiles(id,user_id,professional_name,professional_type,license_reference,jurisdiction,verification_status) values('${f.professional}','${f.user}','QA Professional','other','QA only','QA','verified');
 insert into pet_clinical_access_grants(id,pet_id,household_id,created_by_user_id,token_hash,duration_code,expires_at) values('${f.grant}','${f.pet}','${f.household}','${f.owner}',repeat('a',32)||replace('${f.grant}','-',''),'1_hour',now()+interval '1 hour');
 insert into clinical_write_requests(id,grant_id,pet_id,household_id,professional_profile_id,professional_user_id,requested_scopes,status,expires_at) values('${f.request}','${f.grant}','${f.pet}','${f.household}','${f.professional}','${f.user}',array['create_encounter','record_diagnosis','upload_clinical_document'],'approved',now()+interval '1 hour');
 insert into clinical_write_authorizations(id,request_id,grant_id,pet_id,professional_profile_id,approved_scopes,authorized_by_user_id,expires_at) values('${f.authorization}','${f.request}','${f.grant}','${f.pet}','${f.professional}',array['create_encounter','record_diagnosis','upload_clinical_document'],'${f.owner}',now()+interval '1 hour');
 insert into clinical_encounters(id,authorization_id,pet_id,professional_profile_id,attended_at,encounter_type,summary,idempotency_key) values('${f.encounter}','${f.authorization}','${f.pet}','${f.professional}',now(),'other','QA fixture','${f.key}');
 insert into clinical_entries(id,encounter_id,entry_type,title,created_by_user_id) values('${f.entry}','${f.encounter}','diagnosis','QA original','${f.user}');
 insert into clinical_documents(id,encounter_id,title,document_type,storage_path,mime_type,file_size_bytes,created_by_user_id) values('${f.document}','${f.encounter}','QA document','other','${f.document}.png','image/png',12,'${f.user}');
 insert into storage.objects(bucket_id,name,metadata) values('clinical-documents','${f.document}.png','{"size":12,"mimetype":"image/png"}');
 select set_config('request.jwt.claim.sub','${f.user}',false);`);
 return f;
}
const finalize=(db,f)=>db.query(`select public.finalize_clinical_encounter($1,$2,now(),'other','QA new encounter','[]'::jsonb) as id`,[f.request,crypto.randomUUID()]);
const correct=(db,f)=>db.query(`select public.create_clinical_entry_correction($1,$2,'QA corrected',null,'QA reason') as id`,[f.entry,f.request]);
const completeDocument=(db,f)=>db.query('select public.finalize_clinical_document_upload($1)',[f.document]);
const prepare=(db,f)=>db.query(`select public.prepare_clinical_document_upload($1,$2,'QA document','other','image/png',12,null)`,[f.encounter,crypto.randomUUID()]);
const uploadAllowed=async(db,f,bucket='clinical-documents',user=f.user)=>(await db.query('select public.can_upload_clinical_document_object($1,$2,$3) as allowed',[bucket,f.document+'.png',user])).rows[0].allowed;
const reject=async(db,fn,pattern)=>{let denied=false;await db.exec('savepoint expected_rejection');try{await fn();}catch(e){await db.exec('rollback to savepoint expected_rejection');assert.match(e.message,pattern);denied=true;}finally{await db.exec('release savepoint expected_rejection');}assert.ok(denied,'Operation unexpectedly accepted');};
export const cases=[
 ['H01 revoked grant blocks encounter',async(db,f)=>{await db.query('select revoke_pet_clinical_access($1)',[f.grant]);await reject(db,()=>finalize(db,f),/Clinical access is invalid/);}],
 ['H02 suspended professional blocks correction',async(db,f)=>{await db.query("update clinical_professional_profiles set verification_status='suspended' where id=$1",[f.professional]);await reject(db,()=>correct(db,f),/Verified professional/);}],
 ['H03 suspended professional blocks document finalize',async(db,f)=>{await db.query("update clinical_professional_profiles set verification_status='suspended' where id=$1",[f.professional]);await reject(db,()=>completeDocument(db,f),/Verified professional/);assert.equal((await db.query('select upload_status from clinical_documents where id=$1',[f.document])).rows[0].upload_status,'pending');}],
 ['valid encounter succeeds',async(db,f)=>{assert.ok((await finalize(db,f)).rows[0].id);}],
 ['valid correction preserves original',async(db,f)=>{await correct(db,f);assert.equal((await db.query('select title from clinical_entries where id=$1',[f.entry])).rows[0].title,'QA original');assert.equal((await db.query('select count(*)::int as n from clinical_entries where corrects_entry_id=$1',[f.entry])).rows[0].n,1);}],
 ['valid completed request permits existing upload flow',async(db,f)=>{await db.query("update clinical_write_requests set status='completed' where id=$1",[f.request]);await prepare(db,f);assert.equal(await uploadAllowed(db,f),true);await completeDocument(db,f);assert.equal((await db.query('select upload_status from clinical_documents where id=$1',[f.document])).rows[0].upload_status,'ready');}],
 ['revoked grant blocks prepare and storage upload',async(db,f)=>{await db.query('select revoke_pet_clinical_access($1)',[f.grant]);await reject(db,()=>prepare(db,f),/Clinical access is invalid/);assert.equal(await uploadAllowed(db,f),false);}],
 ['revoked consent blocks document finalize',async(db,f)=>{await db.query('update clinical_write_authorizations set revoked_at=now() where id=$1',[f.authorization]);await reject(db,()=>completeDocument(db,f),/expired or revoked/);}],
 ['expired professional blocks correction',async(db,f)=>{await db.query("update clinical_professional_profiles set verification_expires_at=now()-interval '1 minute' where id=$1",[f.professional]);await reject(db,()=>correct(db,f),/Verified professional/);}],
 ['expired grant blocks document finalize',async(db,f)=>{await db.query("update pet_clinical_access_grants set created_at=now()-interval '2 hour',expires_at=now()-interval '1 hour' where id=$1",[f.grant]);await reject(db,()=>completeDocument(db,f),/Clinical access is invalid/);}],
 ['expired consent blocks document finalize',async(db,f)=>{await db.query("update clinical_write_authorizations set authorized_at=now()-interval '2 hour',expires_at=now()-interval '1 hour' where id=$1",[f.authorization]);await reject(db,()=>completeDocument(db,f),/expired or revoked/);}],
 ['scope required at document finalize',async(db,f)=>{await db.query("update clinical_write_authorizations set approved_scopes=array['create_encounter'] where id=$1",[f.authorization]);await reject(db,()=>completeDocument(db,f),/scope was not authorized/);}],
 ['another user cannot finalize document',async(db,f)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.owner]);await reject(db,()=>completeDocument(db,f),/document is not available/);}],
 ['anonymous cannot finalize document',async(db,f)=>{await db.query("select set_config('request.jwt.claim.sub','',false)");await reject(db,()=>completeDocument(db,f),/Authenticated user required/);}],
 ['transfer invalidates prior grant for writes',async(db,f)=>{const household=crypto.randomUUID();await db.query('insert into households values($1)',[household]);await db.query('update pets set household_id=$1 where id=$2',[household,f.pet]);await reject(db,()=>finalize(db,f),/Clinical access is invalid/);}],
 ['unrelated storage bucket remains outside clinical authorization',async(db,f)=>{assert.equal(await uploadAllowed(db,f,'pet-documents'),false);}],
 ['storage cannot impersonate professional',async(db,f)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.owner]);assert.equal(await uploadAllowed(db,f),false);}],
 ['private guard not callable by authenticated',async(db)=>{assert.equal((await db.query("select has_function_privilege('authenticated','public.assert_clinical_write_authorization(uuid,uuid,text)','EXECUTE') as allowed")).rows[0].allowed,false);}],
 ['invalid object metadata cannot become ready',async(db,f)=>{await db.query("update storage.objects set metadata='{}' where name=$1",[f.document+'.png']);await reject(db,()=>completeDocument(db,f),/validation failed/);}],
 ['revocation preserves finalized history',async(db,f)=>{await db.query('select revoke_pet_clinical_access($1)',[f.grant]);assert.equal((await db.query('select count(*)::int as n from clinical_encounters where id=$1',[f.encounter])).rows[0].n,1);}],
 ['suspension blocks new storage upload',async(db,f)=>{await db.query("update clinical_professional_profiles set verification_status='suspended' where id=$1",[f.professional]);assert.equal(await uploadAllowed(db,f),false);}]
];
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
const report={engine:'PGlite 0.3.14 (PostgreSQL WASM)',executedAt:new Date().toISOString(),limits:'Single-connection SQL regression, not a Supabase integration or concurrent-lock test.',baseline:[],patched:[]};
for(const patched of [false,true]){
 const db=await setup(patched);
 try{for(const[name,test]of(patched?cases:cases.slice(0,3))){
   await db.exec('begin');let passed=true,error;
   try{await test(db,await fixture(db));}catch(e){passed=false;error=e.message;}
   finally{await db.exec('rollback');}
   report[patched?'patched':'baseline'].push({name,passed,...(error?{error}:{})});
 }}finally{await db.close();}
}
await fs.writeFile(new URL('docs/audit/2026-09-17/evidence/clinical-fix-regression.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.ok(report.baseline.every(t=>!t.passed&&t.error==='Operation unexpectedly accepted'),'Baseline did not reproduce H01-H03');
assert.ok(report.patched.every(t=>t.passed),'Patched SQL regression failed');
}
