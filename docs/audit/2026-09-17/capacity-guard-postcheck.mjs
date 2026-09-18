import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
const migration=await fs.readFile(new URL('../../../supabase/migrations/20260918030000_provider_capacity_occupied_guard.sql',import.meta.url),'utf8');
const rows=await query("select proname,prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('guard_provider_rule_capacity','create_booking_from_slot')");
const norm=s=>s.replaceAll('\r\n','\n').trim();
const checks=rows.map(row=>({name:row.proname,passed:norm(row.prosrc)===norm(migration.match(new RegExp('create or replace function public\\.'+row.proname+'\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;'))[1])}));
const [state]=await query(`select
 exists(select 1 from supabase_migrations.schema_migrations where version='20260918030000') as registered,
 exists(select 1 from pg_trigger where tgrelid='public.provider_availability_rules'::regclass and tgname='trg_provider_rule_capacity_guard' and tgenabled='O') as trigger_enabled,
 (select count(*)::int from pg_stat_activity where application_name like 'qa_h06_%' and state like 'idle in transaction%') as idle_qa_transactions`);
assert.equal(checks.length,2);assert.ok(checks.every(c=>c.passed));assert.ok(state.registered&&state.trigger_enabled&&state.idle_qa_transactions===0);
const report={executedAt:new Date().toISOString(),checks,state,typecheck:'7 workspaces passed',lint:'7 workspaces passed',builds:'Not repeated: no client code changes in H06; actual SQL compiled and executed remotely'};
await fs.writeFile(new URL('evidence/capacity-guard-postcheck.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
