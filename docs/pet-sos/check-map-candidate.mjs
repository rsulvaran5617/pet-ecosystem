import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import console from 'node:console';
import {URL} from 'node:url';
import {query} from '../audit/2026-09-17/clinical-migration-remote.mjs';

// Candidate validation only. No apply mode and no migration history insertion.
const migration=await fs.readFile(new URL('../../supabase/migrations/20260920210000_pet_sos_bounded_map_feed.sql',import.meta.url),'utf8');
const fixtures=await fs.readFile(new URL('../../supabase/tests/pet-sos-map-fixtures.sql',import.meta.url),'utf8');
const [before]=await query("select exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='list_public_pet_sos_map_events') as present");
assert.equal(before.present,false,'Candidate already exists; inspect deployment instead');
const fixtureMigration=migration.replaceAll('public.pet_alert_lost_pets a','pg_temp.sos_lost a').replaceAll('public.pet_alert_community_sightings r','pg_temp.sos_seen r');
const split=fixtures.indexOf('do $tests$');
const result=await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';
  ${migration}
  ${fixtures.slice(0,split)}
  ${fixtureMigration}
  ${fixtures.slice(split)}
  select jsonb_build_object('checks',(select jsonb_agg(to_jsonb(c)) from sos_checks c),
    'plan',(select value from sos_plan),
    'anon_execute',has_function_privilege('anon','public.list_public_pet_sos_map_events(double precision,double precision,double precision,double precision,text,text,timestamptz,integer,timestamptz,text,text)','execute')) as result;
  rollback;`);
const [after]=await query("select exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='list_public_pet_sos_map_events') as present");
assert.equal(after.present,false,'Rollback not confirmed');
console.log(JSON.stringify({checkedAt:new Date().toISOString(),rolledBack:true,result,limits:'Synthetic temp tables; production SQL compiled but fixture relation names substituted for behavioral tests. No customer mutation or persistent migration; no native QA or concurrent load.'},null,2));
