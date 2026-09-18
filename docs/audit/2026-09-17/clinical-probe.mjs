import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadSmokeEnv } from '../../../packages/api-client/scripts/smoke/env.ts';
import { createClinicalAccessApiClient } from '../../../packages/api-client/src/clinical-access.ts';
const require=createRequire(new URL('../../../packages/api-client/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const env=loadSmokeEnv(['owner','provider','admin']);
const fixture=JSON.parse(await fs.readFile(new URL('./evidence/bookings.json',import.meta.url),'utf8')).fixtures;
const clients=Object.fromEntries(['owner','provider','admin'].map(role=>{const raw=createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}});return [role,{raw,api:createClinicalAccessApiClient(raw)}];}));
const {owner,provider,admin}=clients;
const result={executedAt:new Date().toISOString(),checks:[],observations:[],fixtures:{petId:fixture.petId},cleanup:[]};
const check=(id,passed,details)=>result.checks.push({id,passed,details});
const deny=async(id,fn,expected)=>{try{await fn();check(id,false,'Operación aceptada');}catch(e){check(id,expected.test(e.message),e.message);}};
const grants=[],requests=[];let profileId,suspended=false;
const scopes=['create_encounter','record_diagnosis','upload_clinical_document'];
const authorize=async()=>{
  const grant=await owner.api.createPetClinicalAccess(fixture.petId,'1_hour');grants.push(grant.id);
  const requestId=await provider.api.requestClinicalWriteAccess(grant.token,scopes,'QA auditoría: mascota ficticia; no atención real');requests.push(requestId);
  await owner.api.reviewClinicalWriteRequest(requestId,'approved',scopes,'Autorización QA');
  return {grant,requestId};
};
const encounterInput=requestId=>({requestId,idempotencyKey:crypto.randomUUID(),attendedAt:new Date().toISOString(),encounterType:'other',summary:'QA: registro sintético, sin diagnóstico real',entries:[{type:'diagnosis',title:'QA sintético',details:'Solo prueba de permisos'}]});
try{
  for(const [role,c]of Object.entries(clients)){const {error}=await c.raw.auth.signInWithPassword(env.actors[role]);if(error)throw error;}
  const previous=await provider.api.getMyClinicalProfessionalContext();
  if(previous.profile)throw new Error('Ya existe identidad clínica; no se modifica automáticamente');
  const created=await provider.api.saveMyClinicalProfessionalProfile({professionalName:'QA Auditoría — NO PROFESIONAL REAL',professionalType:'other',licenseReference:'QA-SINTETICO-NO-VALIDO',jurisdiction:'QA entorno de pruebas',countryCode:'PA',providerOrganizationId:fixture.organizationId});
  profileId=created.profile.id;result.fixtures.profileId=profileId;
  await provider.api.submitMyClinicalProfessionalProfile();
  await admin.api.reviewClinicalProfessionalProfile(profileId,'verified','Prueba QA autorizada; suspender al terminar',new Date(Date.now()+3600000).toISOString());
  check('CLIN-PROFILE', (await provider.api.getMyClinicalProfessionalContext()).profile.verificationStatus==='verified');
  const a=await authorize();await owner.api.revokePetClinicalAccess(a.grant.id);
  const inputA=encounterInput(a.requestId);
  let encounterA;
  try{encounterA=await provider.api.finalizeClinicalEncounter(inputA);result.observations.push({id:'CLIN-LINK-REVOCATION',writeAcceptedAfterReadLinkRevocation:true,encounterId:encounterA});}
  catch(e){result.observations.push({id:'CLIN-LINK-REVOCATION',writeAcceptedAfterReadLinkRevocation:false,error:e.message});}
  if(encounterA){try{const retry=await provider.api.finalizeClinicalEncounter(inputA);check('CLIN-IDEMPOTENCY',retry===encounterA);}catch(e){check('CLIN-IDEMPOTENCY',false,e.message);}}
  const b=await authorize();const encounterB=await provider.api.finalizeClinicalEncounter(encounterInput(b.requestId));
  result.fixtures.encounterIds=[encounterA,encounterB].filter(Boolean);
  try { await owner.api.revokeClinicalWriteAuthorization(b.requestId,'QA'); check('CLIN-COMPLETED-AUTH-REVOCABLE',true); }
  catch (e) { check('CLIN-COMPLETED-AUTH-REVOCABLE',false,e.message); }
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=','base64');
  const prepared=await provider.api.prepareClinicalDocumentUpload({encounterId:encounterB,idempotencyKey:crypto.randomUUID(),title:'QA imagen sintética',documentType:'other',mimeType:'image/png',fileSizeBytes:png.length});
  const {error:uploadError}=await provider.raw.storage.from(prepared.bucket).upload(prepared.path,png,{contentType:'image/png',upsert:false});if(uploadError)throw uploadError;
  result.fixtures.documentId=prepared.documentId;
  const entry=(await owner.api.listPetClinicalTimeline(fixture.petId)).find(e=>e.id===encounterB).entries[0];
  const c=await authorize();
  await admin.api.reviewClinicalProfessionalProfile(profileId,'suspended','QA: suspensión para comprobar revalidación de permisos');suspended=true;
  await deny('CLIN-SUSPENDED-ENCOUNTER',()=>provider.api.finalizeClinicalEncounter(encounterInput(c.requestId)),/verified professional identity required/i);
  await deny('CLIN-SUSPENDED-CORRECTION',()=>provider.api.createClinicalEntryCorrection(entry.id,c.requestId,'QA corrección sintética',null,'Prueba de bloqueo tras suspensión'),/verified|suspended|authorization/i);
  await deny('CLIN-SUSPENDED-DOCUMENT-FINALIZE',async()=>{const r=await provider.raw.rpc('finalize_clinical_document_upload',{target_document_id:prepared.documentId});if(r.error)throw r.error;},/verified|suspended|authorization/i);
  result.fixtures.requestIds=requests;
}catch(e){result.error=e.message;process.exitCode=1;}
finally{
  const cleanup=async(name,fn)=>{try{await fn();result.cleanup.push({name,ok:true});}catch(e){result.cleanup.push({name,ok:false,error:e.message});}};
  if(profileId&&!suspended)await cleanup('Suspend QA profile',()=>admin.api.reviewClinicalProfessionalProfile(profileId,'suspended','Fin de prueba QA'));
  for(const id of requests){const rows=await owner.api.listPetClinicalWriteRequests(fixture.petId).catch(()=>[]);if(rows.find(r=>r.id===id)?.status==='approved')await cleanup('Revoke active QA write authorization',()=>owner.api.revokeClinicalWriteAuthorization(id,'Fin de prueba QA'));}
  for(const id of grants){const rows=await owner.api.listPetClinicalAccessGrants(fixture.petId).catch(()=>[]);if(rows.find(r=>r.id===id)?.status==='active')await cleanup('Revoke QA access link',()=>owner.api.revokePetClinicalAccess(id));}
  if(profileId)result.finalProfessionalStatus=(await provider.api.getMyClinicalProfessionalContext().catch(()=>({profile:null}))).profile?.verificationStatus;
  await fs.writeFile(new URL('./evidence/clinical.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  await Promise.allSettled(Object.values(clients).map(c=>c.raw.auth.signOut()));
}
console.log(JSON.stringify(result,null,2));
