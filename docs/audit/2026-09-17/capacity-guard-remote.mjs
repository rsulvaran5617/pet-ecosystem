import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {query} from './clinical-migration-remote.mjs';
const baseline=process.argv.includes('--baseline'),candidate=process.argv.includes('--candidate');
const migration=await fs.readFile(new URL('../../../supabase/migrations/20260918030000_provider_capacity_occupied_guard.sql',import.meta.url),'utf8');
const extra=`
 insert into qa_capacity_results select 'failed edit preserves capacity',capacity=2 from provider_availability_rules where id=rule_id;
 insert into qa_capacity_results select 'rejected change has no audit',count(*)=0 from audit_logs where entity_id=rule_id and action='provider_rule_capacity_changed';
 update provider_availability_rules set capacity=3 where id=rule_id;
 update provider_availability_rules set capacity=2 where id=rule_id;
 insert into qa_capacity_results select 'increase and exact occupancy allowed',capacity=2 from provider_availability_rules where id=rule_id;
 update provider_availability_rules set capacity=2 where id=rule_id;
 insert into qa_capacity_results select 'audit once per actual capacity change',count(*)=2 from audit_logs where entity_id=rule_id and action='provider_rule_capacity_changed';
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.cancel_booking(booking_b.id,'QA rollback cancellation');
 perform set_config('request.jwt.claim.sub',provider.owner_user_id::text,true);
 update provider_availability_rules set capacity=1 where id=rule_id;
 insert into qa_capacity_results select 'cancelled booking releases capacity',capacity=1 from provider_availability_rules where id=rule_id;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 begin
  perform public.create_booking_from_slot(pet.household_id,pet.id,service.id,slot.slot_start_at,slot.slot_end_at,rule_id,null);
  insert into qa_capacity_results values('reduced slot rejects another booking',false);
 exception when raise_exception then insert into qa_capacity_results values('reduced slot rejects another booking',sqlerrm='Selected slot is no longer available');end;
 -- Manipulate only rollback fixtures to exercise historical and terminal states.
 update bookings set status='completed' where id=booking_a.id;
 perform set_config('request.jwt.claim.sub',provider.owner_user_id::text,true);
 update provider_availability_rules set capacity=2 where id=rule_id;
 update bookings set status='confirmed',cancelled_at=null where id=booking_b.id;
 begin
  update provider_availability_rules set capacity=1 where id=rule_id;
  insert into qa_capacity_results values('ongoing/future completed still consumes capacity',false);
 exception when raise_exception then insert into qa_capacity_results values('ongoing/future completed still consumes capacity',sqlerrm='No puedes reducir la capacidad por debajo de las reservas existentes.');end;
 update bookings set slot_start_at=now()-interval '2 days',slot_end_at=now()-interval '2 days'+interval '30 minutes' where id in (booking_a.id,booking_b.id);
 update provider_availability_rules set capacity=1 where id=rule_id;
 insert into qa_capacity_results select 'past history does not prevent future reduction',capacity=1 from provider_availability_rules where id=rule_id;
 update bookings set slot_start_at=slot.slot_start_at,slot_end_at=slot.slot_end_at where id=booking_a.id;
 update bookings set slot_start_at=slot.slot_start_at+interval '7 days',slot_end_at=slot.slot_end_at+interval '7 days' where id=booking_b.id;
 update provider_availability_rules set capacity=2 where id=rule_id;
 update provider_availability_rules set capacity=1 where id=rule_id;
 insert into qa_capacity_results select 'count is per slot rather than all dates',capacity=1 from provider_availability_rules where id=rule_id;
 update provider_availability_rules set capacity=2 where id=rule_id;
 update bookings set slot_start_at=slot.slot_start_at,slot_end_at=slot.slot_end_at where id=booking_b.id;
 insert into provider_availability_exceptions(organization_id,service_id,availability_rule_id,exception_date,capacity_override,created_by_user_id)
 values(provider.id,service.id,rule_id,qa_date,2,provider.owner_user_id);
 update provider_availability_rules set capacity=1 where id=rule_id;
 insert into qa_capacity_results select 'date override is respected',capacity=1 from provider_availability_rules where id=rule_id;
 delete from provider_availability_exceptions where availability_rule_id=rule_id;
 update provider_availability_rules set capacity=2 where id=rule_id;
 update provider_availability_rules set is_active=false where id=rule_id;
 insert into qa_capacity_results select 'closing rule preserves existing bookings',count(*)=2 from bookings where availability_rule_id=rule_id;
 begin
  update provider_availability_rules set capacity=1 where id=rule_id;
  insert into qa_capacity_results values('inactive rule cannot bypass capacity guard',false);
 exception when raise_exception then insert into qa_capacity_results values('inactive rule cannot bypass capacity guard',sqlerrm='No puedes reducir la capacidad por debajo de las reservas existentes.');end;
 -- Real RLS role: provider sees their rule but not other households' booking rows.
 perform set_config('request.jwt.claim.sub',provider.owner_user_id::text,true);
 execute 'set local role authenticated';
 begin
  update provider_availability_rules set capacity=1 where id=rule_id;
  insert into qa_capacity_results values('authenticated provider cannot bypass guard through RLS',false);
 exception when raise_exception then insert into qa_capacity_results values('authenticated provider cannot bypass guard through RLS',sqlerrm='No puedes reducir la capacidad por debajo de las reservas existentes.');end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 update provider_availability_rules set capacity=3 where id=rule_id;
 get diagnostics affected = row_count;
 insert into qa_capacity_results values('unrelated owner cannot edit provider rule',affected=0);
 execute 'reset role';
 insert into qa_capacity_results values('trigger helper not callable by authenticated',not has_function_privilege('authenticated','public.guard_provider_rule_capacity()','EXECUTE'));
`;
const sql=`begin;set local lock_timeout='5s';set local statement_timeout='30s';
${candidate?migration:''}
create temp table qa_capacity_results(name text,passed boolean);
grant all on qa_capacity_results to authenticated;
do $qa$
declare provider public.provider_organizations;service public.provider_services;pet public.pets;owner_id uuid;
 rule_id uuid:=gen_random_uuid();qa_date date:=(now() at time zone 'America/Panama')::date+10;slot record;
 booking_a public.bookings;booking_b public.bookings;affected integer;
begin
 select * into provider from provider_organizations where id='716bfcd5-41f5-4a93-88b2-937980a54cf9' and slug='qa-auditoria-2026-09-17';
 select * into service from provider_services where id='0be97ab6-a83a-4dd8-94b0-cdbbd4fae5d4' and organization_id=provider.id and name='QA Paseo de prueba';
 select * into pet from pets where id='8905b844-09c7-4896-ae92-8fc0400b1f67' and name like 'QA %';
 if provider.id is null or service.id is null or pet.id is null then raise exception 'Dedicated QA fixtures missing';end if;
 select created_by_user_id into owner_id from households where id=pet.household_id;
 update provider_organizations set is_public=true where id=provider.id;
 update provider_public_profiles set is_public=true where organization_id=provider.id;
 update provider_services set is_public=true,is_active=true where id=service.id;
 insert into provider_availability_rules(id,organization_id,service_id,day_of_week,starts_at,ends_at,capacity,effective_from,effective_until,created_by_user_id)
 values(rule_id,provider.id,service.id,extract(dow from qa_date)::smallint,'09:00','09:30',2,qa_date,qa_date+7,provider.owner_user_id);
 select * into slot from get_service_booking_slots(service.id,qa_date,qa_date) where availability_rule_id=rule_id;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 booking_a:=public.create_booking_from_slot(pet.household_id,pet.id,service.id,slot.slot_start_at,slot.slot_end_at,rule_id,null);
 booking_b:=public.create_booking_from_slot(pet.household_id,pet.id,service.id,slot.slot_start_at,slot.slot_end_at,rule_id,null);
 perform set_config('request.jwt.claim.sub',provider.owner_user_id::text,true);
 begin
  update provider_availability_rules set capacity=1 where id=rule_id;
  insert into qa_capacity_results values('H06 cannot reduce below two bookings',false);
 exception when raise_exception then insert into qa_capacity_results values('H06 cannot reduce below two bookings',sqlerrm='No puedes reducir la capacidad por debajo de las reservas existentes.');end;
${baseline?'':extra}
end;$qa$;
select * from qa_capacity_results;rollback;`;
const checks=await query(sql);
const mode=baseline?'baseline':candidate?'candidate':'installed';
const report={executedAt:new Date().toISOString(),mode,sha256:crypto.createHash('sha256').update(migration).digest('hex'),fixtureMutations:'rolled back, including publication and bookings',checks};
await fs.writeFile(new URL('evidence/capacity-guard-'+mode+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.equal(checks.length,baseline?1:16);
assert.ok(baseline?checks[0].passed===false:checks.every(c=>c.passed));
