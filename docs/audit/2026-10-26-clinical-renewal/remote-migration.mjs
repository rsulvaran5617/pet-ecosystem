import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {query} from '../2026-09-17/clinical-migration-remote.mjs';
const migration=await fs.readFile(new URL('../../../supabase/migrations/20261027010000_clinical_professional_renewal.sql',import.meta.url),'utf8');
const original=await fs.readFile(new URL('../../../supabase/migrations/20260901130000_clinical_access_professional_identity.sql',import.meta.url),'utf8');
const names=['submit_my_clinical_professional_profile','list_pending_clinical_professionals_for_admin'];
const current=await query(`select proname,prosrc from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in (${names.map(n=>`'${n}'`).join(',')})`);
const norm=s=>s.replaceAll('\r\n','\n').trim();
const comparisons=names.map(name=>({name,matches:norm(original.match(new RegExp('function public\\.'+name+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i'))[1])===norm(current.find(r=>r.proname===name).prosrc)}));
const history=await query("select version from supabase_migrations.schema_migrations where version in ('20261025020000','20261027010000') order by version");
assert(history.some(r=>r.version==='20261025020000'));assert(!history.some(r=>r.version==='20261027010000'));assert(comparisons.every(c=>c.matches));
const oldTest=await fs.readFile(new URL('../2026-10-24-clinical-documents/sql-check.mjs',import.meta.url),'utf8');
let fixture=oldTest.match(/const sql=`([\s\S]*?)create temp table qa_documents_results/)[1].replace('${migration}',()=>migration);
const results=await query(fixture+`
create temp table renewal_results(name text,passed boolean);
update clinical_professional_profiles set verification_expires_at=now()-interval '1 minute' where id=(select professional_id from qa_documents_context);
grant select on qa_documents_context to authenticated;grant insert,select on renewal_results to authenticated;
select set_config('request.jwt.claim.sub',(select professional_user_id::text from qa_documents_context),true);
set local role authenticated;
insert into renewal_results select 'professional requests renewal',public.submit_my_clinical_professional_profile()->'profile'->>'verificationStatus'='pending';
insert into renewal_results select 'retry remains pending',public.submit_my_clinical_professional_profile()->'profile'->>'verificationStatus'='pending';
reset role;
insert into renewal_results select 'old request closed',status='revoked' from clinical_write_requests where id=(select request_id from qa_documents_context);
insert into renewal_results select 'old file authorization revoked',revoked_at is not null from clinical_write_authorizations where id=(select authz_id from qa_documents_context);
insert into renewal_results select 'renewal recorded once',count(*)=1 from clinical_professional_verification_events where professional_profile_id=(select professional_id from qa_documents_context) and reason='Professional verification renewal';
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='rsulvaran5617+qaadmin@gmail.com'),true);
set local role authenticated;
insert into renewal_results select 'admin sees pending renewal and expiry',verification_status='pending' and verification_expires_at is not null from list_pending_clinical_professionals_for_admin() where id=(select professional_id from qa_documents_context);
select review_clinical_professional_profile((select professional_id from qa_documents_context),'verified','QA rollback renewal',now()+interval '1 day');
reset role;
insert into renewal_results select 'reviewed identity verified',verification_status='verified' from clinical_professional_profiles where id=(select professional_id from qa_documents_context);
insert into renewal_results select 'review does not revive consent',revoked_at is not null from clinical_write_authorizations where id=(select authz_id from qa_documents_context);
select * from renewal_results;rollback;`);
assert(results.length===8);assert(results.every(r=>r.passed));
await fs.writeFile(new URL('./preflight-qa.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),comparisons,history,scope:'Production PostgreSQL QA fixtures in complete rollback; authenticated DB role and JWT subject, not HTTP sessions.',results},null,2)+'\n');console.log(JSON.stringify(results));
if(process.argv.includes('--apply')){
 const ref=(await fs.readFile(new URL('../../../supabase/.temp/project-ref',import.meta.url),'utf8')).trim();assert.equal(ref,'ivovbyxjwtvcavetewge');
 await query(`begin;set local lock_timeout='5s';set local statement_timeout='40s';${migration}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('20261027010000','clinical_professional_renewal',array[$migration$${migration}$migration$]);commit;select true as applied;`);
 const remote=await query(`select proname,prosrc from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in (${names.map(n=>`'${n}'`).join(',')})`);
 const checks=names.map(name=>({name,matches:norm(migration.match(new RegExp('function public\\.'+name+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i'))[1])===norm(remote.find(r=>r.proname===name).prosrc)}));assert(checks.every(c=>c.matches));await fs.writeFile(new URL('./migration-applied.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),applied:true,version:'20261027010000',checks},null,2)+'\n');console.log('Migration applied and verified');
}
