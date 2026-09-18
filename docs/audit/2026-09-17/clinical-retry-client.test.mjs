import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Blob} from 'node:buffer';
import {URL} from 'node:url';
import console from 'node:console';
import {createClinicalAccessApiClient} from '../../../packages/api-client/src/clinical-access.ts';
import {submitClinicalEncounter} from '../../../apps/web/src/features/clinical-access/services/clinical-encounter-submission.ts';
const file=new Blob(['QA'],{type:'image/png'});
const prepared={documentId:'qa-document',bucket:'clinical-documents',path:'qa.png'};
const input={requestId:'qa-request',idempotencyKey:'stable-encounter-key',attendedAt:'2026-09-17T12:00:00Z',encounterType:'other',summary:'Synthetic',entries:[]};
const attempt=()=>({input,attachment:{file,title:'QA',documentType:'other',idempotencyKey:'stable-document-key'},encounterId:null,prepared:null,documentComplete:false});
const checks=[];
async function test(name,run){await run();checks.push({name,passed:true});}
await test('attachment failure retries only pending phase with same key',async()=>{
 const counts={save:0,prepare:0,upload:0};const a=attempt();
 const client={finalizeClinicalEncounter:async()=>{counts.save++;return 'qa-encounter';},prepareClinicalDocumentUpload:async p=>{counts.prepare++;assert.equal(p.idempotencyKey,'stable-document-key');return prepared;},uploadPreparedClinicalDocument:async p=>{assert.deepEqual(p,prepared);if(++counts.upload===1)throw Error('network');}};
 await assert.rejects(submitClinicalEncounter(client,a),/network/);assert.equal(a.encounterId,'qa-encounter');assert.equal(a.documentComplete,false);
 assert.equal(await submitClinicalEncounter(client,a),'qa-encounter');assert.equal(a.documentComplete,true);assert.deepEqual(counts,{save:1,prepare:1,upload:2});
});
await test('lost encounter response retains exact operation',async()=>{
 const a=attempt();a.attachment=null;let calls=0;const received=[];
 const client={finalizeClinicalEncounter:async p=>{received.push(JSON.parse(JSON.stringify(p)));if(++calls===1)throw Error('lost receipt');return 'qa-existing';}};
 await assert.rejects(submitClinicalEncounter(client,a));assert.equal(await submitClinicalEncounter(client,a),'qa-existing');assert.deepEqual(received,[input,input]);
});
await test('lost prepare response retains attachment key and saved encounter',async()=>{
 const a=attempt();let saves=0;const keys=[];
 const client={finalizeClinicalEncounter:async()=>{saves++;return 'qa-existing';},prepareClinicalDocumentUpload:async p=>{keys.push(p.idempotencyKey);if(keys.length===1)throw Error('lost prepare');return prepared;},uploadPreparedClinicalDocument:async()=>{}};
 await assert.rejects(submitClinicalEncounter(client,a));await submitClinicalEncounter(client,a);assert.equal(saves,1);assert.deepEqual(keys,['stable-document-key','stable-document-key']);
});
await test('completed submission refresh does not write again',async()=>{
 const a=attempt();a.encounterId='qa-existing';a.prepared=prepared;a.documentComplete=true;
 assert.equal(await submitClinicalEncounter({},a),'qa-existing');
});
for(const mode of ['normal','lost-upload','lost-finalize','revoked','duplicate'])await test('API document recovery: '+mode,async()=>{
 let present=false,ready=false,rpcCalls=0,uploadCalls=0;
 const api=createClinicalAccessApiClient({
  rpc:async(name,args)=>{assert.equal(name,'finalize_clinical_document_upload');assert.equal(args.target_document_id,prepared.documentId);rpcCalls++;if(mode==='revoked')return {error:{message:'Active clinical authorization required'}};if(!present)return {error:{message:'Clinical document validation failed'}};ready=true;if(mode==='lost-finalize'&&rpcCalls===2)throw Error('lost finalize');return {error:null};},
  storage:{from:bucket=>{assert.equal(bucket,prepared.bucket);return {upload:async(path,blob,options)=>{assert.equal(path,prepared.path);assert.equal(blob,file);assert.equal(options.upsert,false);uploadCalls++;present=true;if(mode==='lost-upload')throw Error('lost upload');return {error:mode==='duplicate'?{message:'The resource already exists',statusCode:'409'}:null};}};}}
 });
 if(['lost-upload','lost-finalize','revoked'].includes(mode))await assert.rejects(api.uploadPreparedClinicalDocument(prepared,file));
 if(mode==='revoked'){assert.equal(uploadCalls,0);return;}
 await api.uploadPreparedClinicalDocument(prepared,file);assert.equal(ready,true);assert.equal(uploadCalls,1);
});
await fs.writeFile(new URL('evidence/clinical-retry-client.json',import.meta.url),JSON.stringify({executedAt:new Date().toISOString(),limits:'Real client/service logic with simulated network responses; not browser or real file upload.',checks},null,2)+'\n');
console.log(JSON.stringify(checks,null,2));
