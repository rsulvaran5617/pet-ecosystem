import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const root=new URL('../../../',import.meta.url);
const values={};
for(const file of ['apps/web/.env.local','apps/mobile/.env','.env.local','.env']){
 const body=await fs.readFile(new URL(file,root),'utf8').catch(()=> '');
 for(const line of body.split(/\r?\n/)){const m=line.match(/^(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1]in values))values[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}
}
const env=key=>process.env[key]||values[key];
const ref=(await fs.readFile(new URL('supabase/.temp/project-ref',root),'utf8')).trim();
if(new URL(env('NEXT_PUBLIC_SUPABASE_URL')||env('EXPO_PUBLIC_SUPABASE_URL')).hostname!==ref+'.supabase.co')throw new Error('Linked project differs from app configuration');
const token=env('SUPABASE_ACCESS_TOKEN');if(!token)throw new Error('Management token unavailable');
export async function query(sql){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
 const result=await response.json();if(!response.ok)throw new Error(`Database API ${response.status}: ${String(result.message??'query failed').replace(/sbp_[A-Za-z0-9]+/g,'[redacted]')}`);return result;
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\','/').split('/').pop())){
 const migration=await fs.readFile(new URL('supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql',root),'utf8');
 const targets=[['20260901170000_clinical_access_append_only_encounters.sql','finalize_clinical_encounter'],...['prepare_clinical_document_upload','finalize_clinical_document_upload','create_clinical_entry_correction'].map(n=>['20260901190000_clinical_access_documents_timeline.sql',n]),['20260903100000_clinical_document_storage_policy_isolation.sql','can_upload_clinical_document_object']];
 const current=await query(`select p.proname,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${targets.map(t=>"'"+t[1]+"'").join(',')})`);
 const norm=s=>s.replaceAll('\r\n','\n').trim();
 const comparisons=[];
 for(const[file,name]of targets){const source=await fs.readFile(new URL('supabase/migrations/'+file,root),'utf8');const original=source.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i'))?.[1];const remote=current.find(r=>r.proname===name)?.prosrc;comparisons.push({name,unchanged:!!original&&!!remote&&norm(original)===norm(remote)});}
 const prior=await query("select version from supabase_migrations.schema_migrations where version='20260918010000'");
 const report={executedAt:new Date().toISOString(),projectMatchesApp:true,comparisons,alreadyApplied:prior.length>0,sha256:crypto.createHash('sha256').update(migration).digest('hex'),applied:false};
 if(process.argv.includes('--apply')){
  if(prior.length||comparisons.some(c=>!c.unchanged))throw new Error('Remote baseline changed or migration already recorded; inspect before applying');
  await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${migration}
insert into supabase_migrations.schema_migrations(version,name,statements) values('20260918010000','clinical_write_authorization_revalidation',array[$migration$${migration}$migration$]);commit;`);
  report.applied=true;
 }
 await fs.writeFile(new URL('evidence/clinical-migration-remote.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
