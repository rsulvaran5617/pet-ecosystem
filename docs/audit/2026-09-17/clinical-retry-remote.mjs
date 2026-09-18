import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
import {buildClinicalRegressionSql} from './clinical-remote-regression.mjs';
const candidate=process.argv.includes('--candidate');
const migration=await fs.readFile(new URL('../../../supabase/migrations/20260918020000_clinical_retry_and_residual_revocation.sql',import.meta.url),'utf8');
const extra=`
 select idempotency_key into attempt_id from public.clinical_encounters where id=qa_encounter_id;
 insert into qa_clinical_result values('H04 retry returns same attention',public.finalize_clinical_encounter(request_id,attempt_id,now(),'other','QA rollback regression','[{"type":"diagnosis","title":"QA synthetic"}]')=qa_encounter_id,null);
 insert into qa_clinical_result select 'retry creates no duplicate',count(*)=1,null from public.clinical_encounters where authorization_id=authz_id;
 begin
  perform public.finalize_clinical_encounter(request_id,attempt_id,now(),'other','QA changed','[]');
  insert into qa_clinical_result values('changed payload denied',false,null);
 exception when raise_exception then insert into qa_clinical_result values('changed payload denied',sqlerrm='Idempotency payload mismatch',sqlerrm);end;
 begin
  perform public.revoke_clinical_write_authorization(request_id);
  insert into qa_clinical_result values('non-owner cannot revoke',false,null);
 exception when raise_exception then insert into qa_clinical_result values('non-owner cannot revoke',sqlerrm='Clinical write authorization not found',sqlerrm);end;
 document:=public.prepare_clinical_document_upload(qa_encounter_id,attempt_id,'QA pending','other','image/png',12,null);
 insert into qa_clinical_result values('prepare retry returns same document',public.prepare_clinical_document_upload(qa_encounter_id,attempt_id,'QA pending','other','image/png',12,null)=document,null);
 begin
  perform public.prepare_clinical_document_upload(qa_encounter_id,attempt_id,'QA changed','other','image/png',12,null);
  insert into qa_clinical_result values('changed document payload denied',false,null);
 exception when raise_exception then insert into qa_clinical_result values('changed document payload denied',sqlerrm='Idempotency payload mismatch',sqlerrm);end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.revoke_clinical_write_authorization(request_id);
 perform public.revoke_clinical_write_authorization(request_id);
 insert into qa_clinical_result select 'H05 completed request revoked',status='revoked',null from public.clinical_write_requests where id=request_id;
 perform set_config('request.jwt.claim.sub',professional.user_id::text,true);
 insert into qa_clinical_result values('receipt after revocation',public.finalize_clinical_encounter(request_id,attempt_id,now(),'other','QA rollback regression','[{"type":"diagnosis","title":"QA synthetic"}]')=qa_encounter_id,null);
 perform public.finalize_clinical_document_upload(doc_id);
 insert into qa_clinical_result select 'ready document receipt after revocation',upload_status='ready',null from public.clinical_documents where id=doc_id;
 begin
  perform public.finalize_clinical_document_upload((document->>'documentId')::uuid);
  insert into qa_clinical_result values('residual pending finalize blocked',false,null);
 exception when raise_exception then insert into qa_clinical_result values('residual pending finalize blocked',sqlerrm='Active clinical authorization required',sqlerrm);end;
 begin
  perform public.prepare_clinical_document_upload(qa_encounter_id,gen_random_uuid(),'QA rejected','other','image/png',12,null);
  insert into qa_clinical_result values('residual preparation blocked',false,null);
 exception when raise_exception then insert into qa_clinical_result values('residual preparation blocked',sqlerrm='Active document authorization required',sqlerrm);end;
 insert into qa_clinical_result values('residual storage permission blocked',not public.can_upload_clinical_document_object(document->>'bucket',document->>'path',professional.user_id),null);
 insert into qa_clinical_result select 'history preserved',count(*)=1,null from public.clinical_encounters where id=qa_encounter_id;
`;
const sql=buildClinicalRegressionSql(candidate?migration:'').replace('end;\n$qa$;',extra+'\nend;\n$qa$;');
assert.ok(sql.includes('H04 retry'),'Missing additional cases');
const checks=await query(sql);
const report={executedAt:new Date().toISOString(),mode:candidate?'candidate SQL inside rollback':'installed SQL',fixtureMutations:'rolled back',limits:'Real PostgreSQL functions and owner checks. Storage metadata only; no file bytes or simultaneous connections.',checks};
await fs.writeFile(new URL(`evidence/clinical-retry-remote-${candidate?'candidate':'installed'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.equal(checks.length,25);assert.ok(checks.every(r=>r.passed),'Remote retry regression failed');
