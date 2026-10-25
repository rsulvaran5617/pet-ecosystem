import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {query} from '../2026-09-17/clinical-migration-remote.mjs';
const migration=await readFile(new URL('../../../supabase/migrations/20261025010000_clinical_shared_pet_documents.sql',import.meta.url),'utf8');
const sql=`begin;
set local lock_timeout='5s'; set local statement_timeout='40s';
${migration}
create temp table qa_documents_context as
select p.id pet_id,p.household_id,h.created_by_user_id owner_id,c.id professional_id,c.user_id professional_user_id,
 gen_random_uuid() grant_id,gen_random_uuid() request_id,gen_random_uuid() authz_id,gen_random_uuid() document_id,
 repeat('a',64) token
from public.pets p join public.households h on h.id=p.household_id cross join public.clinical_professional_profiles c
where p.id='8905b844-09c7-4896-ae92-8fc0400b1f67' and p.name like 'QA %'
and c.id='b4edf08b-f8bf-4e71-95c1-3f3dce21634b' and c.professional_name like 'QA %';
do $$begin if (select count(*) from qa_documents_context)<>1 then raise exception 'QA fixture missing'; end if; end$$;
update public.pet_clinical_access_grants set status='revoked',revoked_at=now() where pet_id=(select pet_id from qa_documents_context) and status='active';
update public.clinical_professional_profiles set verification_status='verified',verification_expires_at=now()+interval '1 hour' where id=(select professional_id from qa_documents_context);
insert into public.pet_clinical_access_grants(id,pet_id,household_id,created_by_user_id,token_hash,duration_code,expires_at)
 select grant_id,pet_id,household_id,owner_id,encode(extensions.digest(token,'sha256'),'hex'),'1_hour',now()+interval '1 hour' from qa_documents_context;
insert into public.clinical_write_requests(id,grant_id,pet_id,household_id,professional_profile_id,professional_user_id,requested_scopes,status,expires_at)
 select request_id,grant_id,pet_id,household_id,professional_id,professional_user_id,array['create_encounter'],'approved',now()+interval '1 hour' from qa_documents_context;
insert into public.clinical_write_authorizations(id,request_id,grant_id,pet_id,professional_profile_id,approved_scopes,authorized_by_user_id,expires_at)
 select authz_id,request_id,grant_id,pet_id,professional_id,array['create_encounter'],owner_id,now()+interval '1 hour' from qa_documents_context;
insert into public.pet_documents(id,pet_id,created_by_user_id,title,document_type,file_name,storage_bucket,storage_path,mime_type,file_size_bytes)
 select document_id,pet_id,owner_id,'QA rollback image','vaccination_record','qa.png','pet-documents',pet_id::text||'/qa-rollback-'||document_id::text||'.png','image/png',10 from qa_documents_context;
insert into storage.objects(bucket_id,name,metadata) select storage_bucket,storage_path,'{"size":10,"mimetype":"image/png"}'::jsonb from public.pet_documents where id=(select document_id from qa_documents_context);
create temp table qa_documents_results(name text,passed boolean);
grant select on qa_documents_context to authenticated;
grant insert,select on qa_documents_results to authenticated;
select set_config('request.jwt.claim.sub',(select professional_user_id::text from qa_documents_context),true);
set local role authenticated;
insert into qa_documents_results select 'approved professional lists owner files',
 exists(select 1 from jsonb_array_elements(public.list_shared_pet_clinical_documents(token)->'documents') d where d->>'id'=document_id::text) from qa_documents_context;
insert into qa_documents_results select 'approved professional resolves own pet document', public.get_shared_pet_clinical_document(token,document_id)->>'bucket'='pet-documents' from qa_documents_context;
insert into qa_documents_results select 'direct private document table access denied',not exists(select 1 from public.pet_documents where id=(select document_id from qa_documents_context));
insert into qa_documents_results select 'direct private Storage access denied',not exists(select 1 from storage.objects where name like '%qa-rollback-%' and bucket_id='pet-documents');
reset role;
create function pg_temp.denied(test_name text, bad_document uuid default null, bad_token text default null) returns void language plpgsql as $$
declare context record;
begin
 select * into context from qa_documents_context;
 begin
  execute 'set local role authenticated';
  perform public.get_shared_pet_clinical_document(coalesce(bad_token,context.token),coalesce(bad_document,context.document_id));
  execute 'reset role';
  insert into qa_documents_results values(test_name,false);
 exception when raise_exception or insufficient_privilege then
  insert into qa_documents_results values(test_name,true);
 end;
end$$;
select pg_temp.denied('malformed token',null,'bad');
select pg_temp.denied('unknown token',null,repeat('b',64));
select pg_temp.denied('unknown document',gen_random_uuid());
update public.pet_documents set storage_path=gen_random_uuid()::text||'/foreign.png' where id=(select document_id from qa_documents_context);
select pg_temp.denied('forged foreign Storage path');
update public.pet_documents set storage_path=pet_id::text||'/../foreign.png' where id=(select document_id from qa_documents_context);
select pg_temp.denied('Storage path traversal');
update public.pet_documents set storage_path=pet_id::text||'/%2e%2e/foreign.png' where id=(select document_id from qa_documents_context);
select pg_temp.denied('encoded Storage traversal');
update public.pet_documents set storage_path=pet_id::text||'/qa-rollback-'||id::text||'.png' where id=(select document_id from qa_documents_context);

select pg_temp.denied('foreign pet document',(select id from public.pet_documents where pet_id<>(select pet_id from qa_documents_context) limit 1));
select set_config('request.jwt.claim.sub',(select owner_id::text from qa_documents_context),true);
select pg_temp.denied('different authenticated actor');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.denied('missing actor');
select set_config('request.jwt.claim.sub',(select professional_user_id::text from qa_documents_context),true);
update public.clinical_write_requests set status='requested' where id=(select request_id from qa_documents_context);
select pg_temp.denied('pending approval');
update public.clinical_write_requests set status='completed' where id=(select request_id from qa_documents_context);
set local role authenticated;
insert into qa_documents_results select 'completed consultation retains temporary read',public.get_shared_pet_clinical_document(token,document_id) is not null from qa_documents_context;
reset role;
update public.clinical_write_authorizations set revoked_at=now() where id=(select authz_id from qa_documents_context);
select pg_temp.denied('revoked consent');
update public.clinical_write_authorizations set revoked_at=null,authorized_at=now()-interval '2 hour',expires_at=now()-interval '1 hour' where id=(select authz_id from qa_documents_context);
select pg_temp.denied('expired consent');
update public.clinical_write_authorizations set expires_at=now()+interval '1 hour' where id=(select authz_id from qa_documents_context);
update public.clinical_professional_profiles set verification_status='suspended' where id=(select professional_id from qa_documents_context);
select pg_temp.denied('suspended professional');
update public.clinical_professional_profiles set verification_status='verified',verification_expires_at=now()-interval '1 minute' where id=(select professional_id from qa_documents_context);
select pg_temp.denied('expired professional verification');
update public.clinical_professional_profiles set verification_expires_at=now()+interval '1 hour' where id=(select professional_id from qa_documents_context);
update public.pet_clinical_access_grants set status='revoked',revoked_at=now() where id=(select grant_id from qa_documents_context);
select pg_temp.denied('revoked QR');
update public.pet_clinical_access_grants set status='active',revoked_at=null,created_at=now()-interval '2 hour',expires_at=now()-interval '1 hour' where id=(select grant_id from qa_documents_context);
select pg_temp.denied('expired QR');
update public.pet_clinical_access_grants set expires_at=now()+interval '1 hour',household_id=(select id from public.households where id<>(select household_id from qa_documents_context) limit 1) where id=(select grant_id from qa_documents_context);
select pg_temp.denied('household changed');
insert into qa_documents_results values ('anonymous RPC denied',not has_function_privilege('anon','public.get_shared_pet_clinical_document(text,uuid)','EXECUTE')),
 ('anonymous list denied',not has_function_privilege('anon','public.list_shared_pet_clinical_documents(text)','EXECUTE')),
 ('internal guard inaccessible',not has_function_privilege('authenticated','public.assert_clinical_document_read_access(text)','EXECUTE'));
select * from qa_documents_results;
rollback;`;
const results=await query(sql);
await writeFile(new URL('./sql-results.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),applied:false,environment:'Linked PostgreSQL; transaction rolled back; authenticated DB role/JWT subject, not HTTP sessions',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
assert(results.length>=20);assert(results.every(r=>r.passed));
