import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {query} from '../2026-09-17/clinical-migration-remote.mjs';
const ref=(await fs.readFile(new URL('../../../supabase/.temp/project-ref',import.meta.url),'utf8')).trim();
if(ref!=='ivovbyxjwtvcavetewge')throw Error('Unexpected production project');
const version='20261025020000';
const migration=await fs.readFile(new URL('../../../supabase/migrations/'+version+'_clinical_authorization_cycle_closure.sql',import.meta.url),'utf8');
const prior=await query(`select version from supabase_migrations.schema_migrations where version='${version}'`);
if(!prior.length){
 const sources=await Promise.all(['20260901110000_clinical_access_read_only.sql','20260901150000_clinical_access_owner_consent.sql'].map(n=>fs.readFile(new URL('../../../supabase/migrations/'+n,import.meta.url),'utf8')));
 const names=['create_pet_clinical_access','revoke_pet_clinical_access','request_clinical_write_access','review_clinical_write_request','get_my_clinical_write_request','list_pet_clinical_write_requests'];
 const rows=await query(`select proname,prosrc from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in (${names.map(n=>`'${n}'`).join(',')})`);
 if(rows.length!==6)throw Error('Unexpected baseline');
 for(const row of rows){const src=sources.find(s=>s.includes('function public.'+row.proname+'('));const body=src.match(new RegExp('function public\\.'+row.proname+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i'))?.[1];if(body?.replaceAll('\r\n','\n').trim()!==row.prosrc.replaceAll('\r\n','\n').trim())throw Error('Baseline changed: '+row.proname);}
 await query(`begin;set local lock_timeout='5s';set local statement_timeout='40s';${migration}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','clinical_authorization_cycle_closure',array[$migration$${migration}$migration$]);commit;select '${version}' as applied;`);
}
const functions=[...migration.matchAll(/create or replace function public\.(\w+)\([\s\S]*?as \$\$([\s\S]*?)\$\$;/gi)];
const rows=await query(`select proname,prosrc from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in (${functions.map(f=>`'${f[1]}'`).join(',')})`);
const checks=functions.map(f=>({name:f[1],matches:rows.find(r=>r.proname===f[1])?.prosrc.replaceAll('\r\n','\n').trim()===f[2].replaceAll('\r\n','\n').trim()}));
if(checks.some(c=>!c.matches))throw Error('Post-apply mismatch');
const report={checkedAt:new Date().toISOString(),version,applied:true,alreadyPresent:prior.length>0,sha256:crypto.createHash('sha256').update(migration).digest('hex'),checks};
await fs.writeFile(new URL('./migration-applied.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
