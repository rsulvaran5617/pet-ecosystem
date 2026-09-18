import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {query} from './clinical-migration-remote.mjs';
const root=new URL('../../../',import.meta.url);
const version='20260918020000',name='clinical_retry_and_residual_revocation';
const migration=await fs.readFile(new URL(`supabase/migrations/${version}_${name}.sql`,root),'utf8');
const targets=[...['finalize_clinical_encounter','prepare_clinical_document_upload','finalize_clinical_document_upload'].map(fn=>['20260918010000_clinical_write_authorization_revalidation.sql',fn]),['20260901150000_clinical_access_owner_consent.sql','revoke_clinical_write_authorization']];
const current=await query(`select p.proname,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${targets.map(t=>"'"+t[1]+"'").join(',')})`);
const normalize=s=>s.replaceAll('\r\n','\n').trim();
const comparisons=[];
for(const[file,fn]of targets){
 const source=await fs.readFile(new URL('supabase/migrations/'+file,root),'utf8');
 const original=source.match(new RegExp('create or replace function public\\.'+fn+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i'))?.[1];
 const remote=current.find(r=>r.proname===fn)?.prosrc;
 comparisons.push({name:fn,unchanged:!!original&&!!remote&&normalize(original)===normalize(remote)});
}
const prior=await query(`select version from supabase_migrations.schema_migrations where version='${version}'`);
const report={executedAt:new Date().toISOString(),projectMatchesApp:true,comparisons,alreadyApplied:prior.length>0,sha256:crypto.createHash('sha256').update(migration).digest('hex'),applied:false};
if(process.argv.includes('--apply')){
 if(prior.length||comparisons.some(c=>!c.unchanged))throw Error('Remote baseline differs; refusing deployment');
 const candidate=JSON.parse(await fs.readFile(new URL('evidence/clinical-retry-remote-candidate.json',import.meta.url),'utf8'));
 if(candidate.checks.length!==25||candidate.checks.some(c=>!c.passed))throw Error('Candidate validation missing or failed');
 await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${migration}
 insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[$migration$${migration}$migration$]);commit;`);
 report.applied=true;
}
await fs.writeFile(new URL('evidence/clinical-retry-deploy.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
