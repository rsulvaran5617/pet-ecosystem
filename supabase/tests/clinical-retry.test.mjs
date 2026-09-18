import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import console from 'node:console';
import {URL} from 'node:url';
import {setup,fixture,cases as securityCases} from './clinical-write-authorization.test.mjs';
const migration=await fs.readFile(new URL('../migrations/20260918020000_clinical_retry_and_residual_revocation.sql',import.meta.url),'utf8');
const entries=[{type:'diagnosis',title:' QA diagnosis ',details:' synthetic '}];
const finalize=(db,f,key=f.retryKey,summary='QA retry',items=entries)=>db.query("select finalize_clinical_encounter($1,$2,'2026-09-17T12:00:00Z','other',$3,$4::jsonb) as id",[f.request,key,summary,JSON.stringify(items)]).then(r=>r.rows[0].id);
const prepare=(db,f,title='QA attachment')=>db.query("select prepare_clinical_document_upload($1,$2,$3,'other','image/png',12,null) as doc",[f.encounter,f.docKey,title]).then(r=>r.rows[0].doc);
const revoke=(db,f)=>db.query('select revoke_clinical_write_authorization($1)',[f.request]);
const complete=(db,f)=>db.query('select finalize_clinical_document_upload($1)',[f.document]);
const reject=async(db,run,pattern)=>{let denied=false;await db.exec('savepoint expected_error');try{await run();}catch(e){await db.exec('rollback to savepoint expected_error');assert.match(e.message,pattern);denied=true;}finally{await db.exec('release savepoint expected_error');}assert.ok(denied,'Operation unexpectedly accepted');};
const count=async(db,table)=>Number((await db.query('select count(*) as n from '+table)).rows[0].n);
const cases=[
 ['H04 same encounter key returns receipt once',async(db,f)=>{const id=await finalize(db,f);assert.equal(await finalize(db,f),id);assert.equal(await count(db,'clinical_encounters'),2);assert.equal(await count(db,'test_audit'),1);assert.equal(await count(db,'clinical_entries'),2);}],
 ['H05 completed authorization can be revoked once',async(db,f)=>{await finalize(db,f);await revoke(db,f);await revoke(db,f);assert.equal((await db.query('select status from clinical_write_requests where id=$1',[f.request])).rows[0].status,'revoked');assert.equal(await count(db,'test_audit'),2);assert.equal(await count(db,'clinical_encounters'),2);}],
 ['receipt survives revocation without new writes',async(db,f)=>{const id=await finalize(db,f);await revoke(db,f);assert.equal(await finalize(db,f),id);await reject(db,()=>finalize(db,f,crypto.randomUUID()),/Active clinical authorization/);assert.equal(await count(db,'test_audit'),2);}],
 ['receipt survives suspension but new write does not',async(db,f)=>{const id=await finalize(db,f);await db.query("update clinical_professional_profiles set verification_status='suspended'");assert.equal(await finalize(db,f),id);await reject(db,()=>prepare(db,f),/Verified professional/);}],
 ['changed summary rejected',async(db,f)=>{await finalize(db,f);await reject(db,()=>finalize(db,f,f.retryKey,'Different'),/payload mismatch/);}],
 ['changed entries rejected',async(db,f)=>{await finalize(db,f);await reject(db,()=>finalize(db,f,f.retryKey,'QA retry',[]),/payload mismatch/);}],
 ['another actor cannot retrieve receipt',async(db,f)=>{await finalize(db,f);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.owner]);await reject(db,()=>finalize(db,f),/Active clinical authorization/);}],
 ['anonymous cannot revoke',async(db,f)=>{await db.query("select set_config('request.jwt.claim.sub','',false)");await reject(db,()=>revoke(db,f),/Authenticated user/);}],
 ['document prepare retry is immutable',async(db,f)=>{const doc=await prepare(db,f);assert.deepEqual(await prepare(db,f),doc);assert.equal(await count(db,'clinical_documents'),2);await reject(db,()=>prepare(db,f,'Changed'),/payload mismatch/);}],
 ['revocation blocks residual prepare and pending finalize',async(db,f)=>{await finalize(db,f);await revoke(db,f);await reject(db,()=>prepare(db,f),/authorization required/);await reject(db,()=>complete(db,f),/Active clinical authorization required/);assert.equal((await db.query("select can_upload_clinical_document_object('clinical-documents',$1,$2) as ok",[f.document+'.png',f.user])).rows[0].ok,false);}],
 ['ready document retry writes one audit',async(db,f)=>{await complete(db,f);await complete(db,f);assert.equal(await count(db,'test_audit'),1);}],
 ['ready document receipt survives withdrawal',async(db,f)=>{await complete(db,f);await revoke(db,f);await complete(db,f);assert.equal(await count(db,'test_audit'),2);}],
 ['invalid object stays pending',async(db,f)=>{await db.exec('delete from storage.objects');await reject(db,()=>complete(db,f),/validation failed/);assert.equal((await db.query('select upload_status from clinical_documents where id=$1',[f.document])).rows[0].upload_status,'pending');}],
 ['new key after completion cannot create second attention',async(db,f)=>{await finalize(db,f);await reject(db,()=>finalize(db,f,crypto.randomUUID()),/Active clinical authorization/);}],
 ['corrected entries do not invalidate original receipt',async(db,f)=>{const id=await finalize(db,f);await db.query("insert into clinical_entries(encounter_id,entry_type,title,created_by_user_id,corrects_entry_id,correction_reason) select encounter_id,entry_type,'Correction',created_by_user_id,id,'QA correction' from clinical_entries where encounter_id=$1",[id]);assert.equal(await finalize(db,f),id);}]
];
const report={executedAt:new Date().toISOString(),limits:'Ephemeral SQL, one connection. can_edit_pet stub is permissive; owner isolation is tested separately against Supabase. No real Storage bytes.',baseline:[],patched:[]};
for(const patched of [false,true]){
 const db=await setup(true);
 try{
  if(patched)await db.exec(migration);
  for(const[name,test]of(patched?[...cases,...securityCases]:cases.slice(0,2))){
   await db.exec('begin');let passed=true,error;
   try{const f=await fixture(db);f.retryKey=crypto.randomUUID();f.docKey=crypto.randomUUID();await test(db,f);}catch(e){passed=false;error=e.message;}finally{await db.exec('rollback');}
   report[patched?'patched':'baseline'].push({name,passed,...(error?{error}:{})});
  }
 }finally{await db.close();}
}
await fs.writeFile(new URL('../../docs/audit/2026-09-17/evidence/clinical-retry-sql.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.ok(report.baseline.every(t=>!t.passed),'H04/H05 baseline did not reproduce');
assert.ok(report.patched.every(t=>t.passed),'SQL regression failed');
