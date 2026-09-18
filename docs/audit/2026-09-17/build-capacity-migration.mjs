import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url);
const source=await fs.readFile(new URL('supabase/migrations/20260604073000_booking_capacity_panama_timezone.sql',root),'utf8');
const original=source.match(/create or replace function public\.create_booking_from_slot\([\s\S]*?\n\$\$;/)[0];
const anchor='    and organization_id = service_row.organization_id\r\n    and is_active = true;';
const normalized=original.replaceAll('\r\n','\n');
const target=anchor.replaceAll('\r\n','\n');
assert.equal(normalized.split(target).length,2);
const booking=normalized.replace(target,`    and organization_id = service_row.organization_id
    and is_active = true
  -- Share the rule lock with other bookings; conflict with provider edits.
  -- Acquire before the existing per-slot advisory lock and capacity snapshot.
  for share;`);
const guard=`-- H06: direct provider updates must not undercut occupied future/ongoing slots.
-- Preserve historical bookings and date-specific capacity overrides.
create or replace function public.guard_provider_rule_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- UPDATE already holds a row lock conflicting with create_booking_from_slot.
  -- This volatile trigger reads committed bookings after that lock is acquired.
  if exists (
    select 1
    from public.bookings as booking
    left join public.provider_availability_exceptions as exception
      on exception.availability_rule_id = old.id
      and exception.exception_date = (booking.slot_start_at at time zone 'America/Panama')::date
    where booking.availability_rule_id = old.id
      and booking.slot_end_at > clock_timestamp()
      and public.booking_status_consumes_capacity(booking.status)
    group by booking.slot_start_at, booking.slot_end_at, exception.capacity_override
    having count(*) > coalesce(exception.capacity_override, new.capacity)
  ) then
    raise exception 'No puedes reducir la capacidad por debajo de las reservas existentes.';
  end if;
  perform public.insert_audit_log('provider_availability_rule', new.id, 'provider_rule_capacity_changed',
    jsonb_build_object('organization_id', new.organization_id, 'service_id', new.service_id,
      'previous_capacity', old.capacity, 'capacity', new.capacity), auth.uid());
  return new;
end; $$;

revoke all on function public.guard_provider_rule_capacity() from public, anon, authenticated;
create trigger trg_provider_rule_capacity_guard
before update of capacity on public.provider_availability_rules
for each row when (old.capacity is distinct from new.capacity)
execute function public.guard_provider_rule_capacity();

`;
await fs.writeFile(new URL('supabase/migrations/20260918030000_provider_capacity_occupied_guard.sql',root),guard+booking+'\n');
