// PostgreSQL integration of the SQL entry points; all fixture changes ROLLBACK.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
const candidate=process.argv.includes('--candidate');
const migration=await fs.readFile(new URL('../../../supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql',import.meta.url),'utf8');
export function buildClinicalRegressionSql(candidateSql='') { return `begin;
set local lock_timeout='5s';set local statement_timeout='30s';
${candidateSql}
create temp table qa_clinical_result(name text,passed boolean,detail text);
do $qa$
declare
 professional public.clinical_professional_profiles;
 pet public.pets; owner_id uuid; grant_id uuid:=gen_random_uuid();request_id uuid:=gen_random_uuid();authz_id uuid:=gen_random_uuid();
 qa_encounter_id uuid;entry_id uuid;document jsonb;doc_id uuid;attempt_id uuid;
begin
 select * into professional from public.clinical_professional_profiles where id='b4edf08b-f8bf-4e71-95c1-3f3dce21634b' and professional_name='QA Auditoría — NO PROFESIONAL REAL';
 select * into pet from public.pets where id='8905b844-09c7-4896-ae92-8fc0400b1f67' and name like 'QA %';
 if professional.id is null or pet.id is null then raise exception 'Dedicated QA fixture is missing';end if;
 select created_by_user_id into owner_id from public.households where id=pet.household_id;
 update public.clinical_professional_profiles set verification_status='verified',verification_expires_at=now()+interval '1 hour' where id=professional.id;
 insert into public.pet_clinical_access_grants(id,pet_id,household_id,created_by_user_id,token_hash,duration_code,expires_at)
 values(grant_id,pet.id,pet.household_id,owner_id,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'1_hour',now()+interval '1 hour');
 insert into public.clinical_write_requests(id,grant_id,pet_id,household_id,professional_profile_id,professional_user_id,requested_scopes,status,expires_at)
 values(request_id,grant_id,pet.id,pet.household_id,professional.id,professional.user_id,array['create_encounter','record_diagnosis','upload_clinical_document'],'approved',now()+interval '1 hour');
 insert into public.clinical_write_authorizations(id,request_id,grant_id,pet_id,professional_profile_id,approved_scopes,authorized_by_user_id,expires_at)
 values(authz_id,request_id,grant_id,pet.id,professional.id,array['create_encounter','record_diagnosis','upload_clinical_document'],owner_id,now()+interval '1 hour');
 perform set_config('request.jwt.claim.sub',professional.user_id::text,true);
 qa_encounter_id:=public.finalize_clinical_encounter(request_id,gen_random_uuid(),now(),'other','QA rollback regression','[{"type":"diagnosis","title":"QA synthetic"}]');
 insert into qa_clinical_result values('valid encounter',qa_encounter_id is not null,null);
 select id into entry_id from public.clinical_entries where clinical_entries.encounter_id=qa_encounter_id limit 1;
 document:=public.prepare_clinical_document_upload(qa_encounter_id,gen_random_uuid(),'QA rollback document','other','image/png',12,null);
 doc_id:=(document->>'documentId')::uuid;
 insert into storage.objects(bucket_id,name,metadata) values(document->>'bucket',document->>'path','{"size":12,"mimetype":"image/png"}');
 insert into qa_clinical_result values('valid storage permission',public.can_upload_clinical_document_object(document->>'bucket',document->>'path',professional.user_id),null);
 update public.clinical_write_requests set status='approved' where id=request_id;
 attempt_id:=public.create_clinical_entry_correction(entry_id,request_id,'QA valid correction',null,'QA reason');
 insert into qa_clinical_result values('valid correction',attempt_id is not null,null);

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.revoke_pet_clinical_access(grant_id);
 perform set_config('request.jwt.claim.sub',professional.user_id::text,true);
 begin
  perform public.finalize_clinical_encounter(request_id,gen_random_uuid(),now(),'other','QA rejected','[]');
  insert into qa_clinical_result values('H01 revoked grant',false,'unexpectedly accepted');
 exception when raise_exception then insert into qa_clinical_result values('H01 revoked grant',sqlerrm='Clinical access is invalid or expired',sqlerrm);end;
 insert into qa_clinical_result values('revoked grant blocks storage',not public.can_upload_clinical_document_object(document->>'bucket',document->>'path',professional.user_id),null);
 update public.pet_clinical_access_grants set status='active',revoked_at=null where id=grant_id;

 update public.clinical_professional_profiles set verification_status='suspended' where id=professional.id;
 begin
  perform public.create_clinical_entry_correction(entry_id,request_id,'QA rejected correction',null,'QA reason');
  insert into qa_clinical_result values('H02 suspension correction',false,'unexpectedly accepted');
 exception when raise_exception then insert into qa_clinical_result values('H02 suspension correction',sqlerrm='Verified professional identity required',sqlerrm);end;
 begin
  perform public.finalize_clinical_document_upload(doc_id);
  insert into qa_clinical_result values('H03 suspension document finalize',false,'unexpectedly accepted');
 exception when raise_exception then insert into qa_clinical_result values('H03 suspension document finalize',sqlerrm='Verified professional identity required',sqlerrm);end;
 insert into qa_clinical_result values('suspension blocks storage',not public.can_upload_clinical_document_object(document->>'bucket',document->>'path',professional.user_id),null);
 update public.clinical_professional_profiles set verification_status='verified' where id=professional.id;
 update public.clinical_write_authorizations set revoked_at=now() where id=authz_id;
 begin
  perform public.finalize_clinical_document_upload(doc_id);
  insert into qa_clinical_result values('revoked consent document finalize',false,'unexpectedly accepted');
 exception when raise_exception then insert into qa_clinical_result values('revoked consent document finalize',sqlerrm='Clinical authorization is expired or revoked',sqlerrm);end;
 update public.clinical_write_authorizations set revoked_at=null where id=authz_id;
 update public.clinical_write_requests set status='completed' where id=request_id;
 perform public.finalize_clinical_document_upload(doc_id);
 insert into qa_clinical_result select 'valid document finalize',upload_status='ready',null from public.clinical_documents where id=doc_id;
 insert into qa_clinical_result values('guard ACL',not has_function_privilege('authenticated','public.assert_clinical_write_authorization(uuid,uuid,text)','EXECUTE'),null);
 insert into qa_clinical_result values('unrelated storage bucket',not public.can_upload_clinical_document_object('pet-documents','unrelated',professional.user_id),null);
end;
$qa$;
select * from qa_clinical_result;
rollback;`; }
if (process.argv[1]?.replaceAll('\\','/').endsWith('/clinical-remote-regression.mjs')) {
const sql=buildClinicalRegressionSql(candidate?migration:'');
const rows=await query(sql);
const report={executedAt:new Date().toISOString(),mode:candidate?'candidate migration inside rollback':'installed migration',fixtureMutations:'rolled back',checks:rows};
await fs.writeFile(new URL(`evidence/clinical-remote-${candidate?'candidate':'installed'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.equal(rows.length,12,'Unexpected result count');assert.ok(rows.every(r=>r.passed),'Remote SQL regression failed');
}
