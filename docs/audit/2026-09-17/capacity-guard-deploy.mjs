import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
const root=new URL('../../../',import.meta.url),version='20260918030000',name='provider_capacity_occupied_guard';
const migration=await fs.readFile(new URL(`supabase/migrations/${version}_${name}.sql`,root),'utf8');
const source=await fs.readFile(new URL('supabase/migrations/20260604073000_booking_capacity_panama_timezone.sql',root),'utf8');
const original=source.match(/create or replace function public\.create_booking_from_slot\([\s\S]*?as \$\$([\s\S]*?)\$\$;/)[1];
const [remote]=await query("select prosrc from pg_proc where oid='public.create_booking_from_slot(uuid,uuid,uuid,timestamptz,timestamptz,uuid,uuid)'::regprocedure");
const [prior]=await query(`select exists(select 1 from supabase_migrations.schema_migrations where version='${version}') as registered, to_regprocedure('public.guard_provider_rule_capacity()') is not null as helper_exists`);
const norm=s=>s.replaceAll('\r\n','\n').trim();
const sha256=crypto.createHash('sha256').update(migration).digest('hex');
const report={executedAt:new Date().toISOString(),projectMatchesApp:true,baselineMatches:norm(original)===norm(remote.prosrc),alreadyApplied:prior.registered,helperExists:prior.helper_exists,sha256,applied:false};
if(process.argv.includes('--apply')){
 assert.ok(report.baselineMatches&&!prior.registered&&!prior.helper_exists,'Unexpected remote baseline');
 const tested=JSON.parse(await fs.readFile(new URL('evidence/capacity-guard-candidate.json',import.meta.url),'utf8'));
 assert.equal(tested.sha256,sha256);assert.equal(tested.checks.length,16);assert.ok(tested.checks.every(c=>c.passed));
 await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${migration}
 insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[$migration$${migration}$migration$]);commit;`);
 report.applied=true;
}
await fs.writeFile(new URL('evidence/capacity-guard-deploy.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
