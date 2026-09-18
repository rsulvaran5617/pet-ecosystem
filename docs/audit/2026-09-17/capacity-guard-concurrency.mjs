// Two real PostgreSQL connections per race. Only dedicated QA fixtures persist.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
const org='716bfcd5-41f5-4a93-88b2-937980a54cf9',service='0be97ab6-a83a-4dd8-94b0-cdbbd4fae5d4',pet='8905b844-09c7-4896-ae92-8fc0400b1f67';
const rules=[crypto.randomUUID(),crypto.randomUUID()];
const report={executedAt:new Date().toISOString(),checks:[],cleanup:[],ruleIds:rules,limits:'SQL/RPC concurrency at READ COMMITTED, two Management API connections. No browser/native or load test. Temporary publication reverted before each COMMIT.'};
let fixture,seeded=false;const inflight=[];
const check=(name,passed)=>{report.checks.push({name,passed});assert.ok(passed,name);};
const actor=id=>`select set_config('request.jwt.claim.sub','${id}',true);`;
const visibility=value=>`update provider_organizations set is_public=${value} where id='${org}';update provider_public_profiles set is_public=${value} where organization_id='${org}';update provider_services set is_public=${value} where id='${service}';`;
const booking=slot=>`public.create_booking_from_slot('${fixture.household_id}','${pet}','${service}','${slot.start_at}'::timestamptz,'${slot.end_at}'::timestamptz,'${slot.id}',null)`;
const launch=sql=>{const p=query(sql).then(rows=>({ok:true,rows}),error=>({ok:false,error:error.message}));inflight.push(p);return p;};
const waitFor=async(appName,type)=>{
 for(let attempt=0;attempt<20;attempt++){
  const rows=await query(`select wait_event_type,wait_event from pg_stat_activity where application_name='${appName}' and state='active'`);
  if(rows.some(r=>type==='sleep'?r.wait_event==='PgSleep':r.wait_event_type==='Lock'))return true;
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 return false;
};
try{
 [fixture]=await query(`select organization.owner_user_id as provider_id,household.created_by_user_id as owner_id,pet.household_id,
 organization.is_public as org_public,profile.is_public as profile_public,service.is_public as service_public,service.is_active
 from provider_organizations organization join provider_public_profiles profile on profile.organization_id=organization.id
 join provider_services service on service.organization_id=organization.id
 cross join pets pet join households household on household.id=pet.household_id
 where organization.id='${org}' and organization.slug='qa-auditoria-2026-09-17' and service.id='${service}' and service.name='QA Paseo de prueba'
 and pet.id='${pet}' and pet.name like 'QA %'`);
 assert.ok(fixture&&fixture.is_active&&!fixture.org_public&&!fixture.profile_public&&!fixture.service_public,'QA baseline must be private and active');
 const seed=rules.map((id,i)=>`insert into provider_availability_rules(id,organization_id,service_id,day_of_week,starts_at,ends_at,capacity,effective_from,effective_until,created_by_user_id)
 select '${id}','${org}','${service}',extract(dow from day)::smallint,'09:00','09:30',2,day,day,'${fixture.provider_id}' from (select (now() at time zone 'America/Panama')::date+${12+i} as day) d;`).join('\n');
 const slots=await query(`begin;${seed}
 ${actor(fixture.owner_id)}${visibility(true)}
 do $qa$ declare slot record;begin
 for slot in select rule.id,(rule.effective_from+rule.starts_at) at time zone 'America/Panama' as start_at,(rule.effective_from+rule.ends_at) at time zone 'America/Panama' as end_at from provider_availability_rules rule where id in ('${rules[0]}','${rules[1]}') loop
 perform public.create_booking_from_slot('${fixture.household_id}','${pet}','${service}',slot.start_at,slot.end_at,slot.id,null);
 end loop;end;$qa$;
 ${visibility(false)}
 select rule.id,(rule.effective_from+rule.starts_at) at time zone 'America/Panama' as start_at,(rule.effective_from+rule.ends_at) at time zone 'America/Panama' as end_at from provider_availability_rules rule where id in ('${rules[0]}','${rules[1]}');commit;`);
 seeded=true;
 const first=slots.find(s=>s.id===rules[0]),second=slots.find(s=>s.id===rules[1]);
 const suffix=crypto.randomUUID().slice(0,8);
 const bookingApp='qa_h06_booking_'+suffix,editApp='qa_h06_edit_'+suffix;
 const createFirst=launch(`begin;set local statement_timeout='20s';set local application_name='${bookingApp}';${actor(fixture.owner_id)}${visibility(true)}select id from ${booking(first)};${visibility(false)}select pg_sleep(8);commit;`);
 check('booking-first transaction holds rule lock',await waitFor(bookingApp,'sleep'));
 const editSecond=launch(`begin;set local statement_timeout='20s';set local application_name='${editApp}';${actor(fixture.provider_id)}update provider_availability_rules set capacity=1 where id='${first.id}';commit;`);
 check('capacity edit waits for in-flight booking',await waitFor(editApp,'lock'));
 const [created,edited]=await Promise.all([createFirst,editSecond]);
 check('booking commits before edit',created.ok);
 check('edit sees committed occupancy and rejects reduction',!edited.ok&&edited.error.includes('No puedes reducir la capacidad'));
 const editFirst=launch(`begin;set local statement_timeout='20s';set local application_name='${editApp}';${actor(fixture.provider_id)}update provider_availability_rules set capacity=1 where id='${second.id}';select pg_sleep(8);commit;`);
 check('edit-first transaction holds rule lock',await waitFor(editApp,'sleep'));
 const createSecond=launch(`begin;set local statement_timeout='20s';set local application_name='${bookingApp}';${actor(fixture.owner_id)}${visibility(true)}select id from ${booking(second)};${visibility(false)}commit;`);
 check('booking waits for in-flight capacity edit',await waitFor(bookingApp,'lock'));
 const [reduced,rejected]=await Promise.all([editFirst,createSecond]);
 check('valid reduction commits first',reduced.ok);
 check('booking rechecks reduced capacity and rejects',!rejected.ok&&rejected.error.includes('Selected slot is no longer available'));
 const rows=await query(`select rule.id,rule.capacity,count(booking.id)::int as occupied from provider_availability_rules rule left join bookings booking on booking.availability_rule_id=rule.id and booking_status_consumes_capacity(booking.status) where rule.id in ('${rules[0]}','${rules[1]}') group by rule.id`);
 check('both races leave capacity at or above occupied slots',rows.length===2&&rows.every(r=>r.capacity===r.occupied));
}catch(e){report.error=e.message;process.exitCode=1;}
finally{
 await Promise.allSettled(inflight);
 if(seeded){
  try{
   await query(`begin;${actor(fixture.owner_id)}do $qa$ declare b record;begin for b in select id from bookings where availability_rule_id in ('${rules[0]}','${rules[1]}') and status in ('pending_approval','confirmed') loop perform public.cancel_booking(b.id,'QA H06 completed');end loop;end;$qa$;update provider_availability_rules set is_active=false where id in ('${rules[0]}','${rules[1]}');commit;`);
   report.cleanup.push({name:'QA bookings cancelled and rules disabled',passed:true});
  }catch(e){report.cleanup.push({name:'QA cleanup',passed:false,error:e.message});process.exitCode=1;}
 }
 const [state]=await query(`select (select count(*)::int from bookings where availability_rule_id in ('${rules[0]}','${rules[1]}') and status<>'cancelled') as open_bookings,(select bool_and(not is_active) from provider_availability_rules where id in ('${rules[0]}','${rules[1]}')) as rules_disabled,(select not is_public from provider_organizations where id='${org}') as org_private,(select not is_public from provider_public_profiles where organization_id='${org}') as profile_private,(select not is_public from provider_services where id='${service}') as service_private`);
 report.finalState=state;
 if(state.open_bookings!==0||!state.org_private||!state.profile_private||!state.service_private)process.exitCode=1;
 await fs.writeFile(new URL('evidence/capacity-guard-concurrency.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
