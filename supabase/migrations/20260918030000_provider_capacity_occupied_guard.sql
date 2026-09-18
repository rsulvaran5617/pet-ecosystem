-- H06: direct provider updates must not undercut occupied future/ongoing slots.
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

create or replace function public.create_booking_from_slot(
  target_household_id uuid,
  target_pet_id uuid,
  target_provider_service_id uuid,
  target_slot_start_at timestamptz,
  target_slot_end_at timestamptz,
  target_availability_rule_id uuid,
  target_payment_method_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  household_row public.households;
  pet_row public.pets;
  organization_row public.provider_organizations;
  service_row public.provider_services;
  payment_method_row public.payment_methods;
  rule_row public.provider_availability_rules;
  slot_row record;
  next_status text;
  computed_cancellation_deadline timestamptz;
  created_booking public.bookings;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create bookings';
  end if;

  if target_slot_start_at is null or target_slot_end_at is null or target_slot_end_at <= target_slot_start_at then
    raise exception 'Selected slot range is invalid';
  end if;

  if not public.can_book_household(target_household_id, current_user_id) then
    raise exception 'Book permission is required for the selected household';
  end if;

  select *
  into household_row
  from public.households
  where id = target_household_id;

  if not found then
    raise exception 'Selected household was not found';
  end if;

  select *
  into pet_row
  from public.pets as pet
  where pet.id = target_pet_id
    and pet.household_id = target_household_id;

  if not found then
    raise exception 'Selected pet must belong to the selected household';
  end if;

  perform public.ensure_pet_is_bookable(target_pet_id);

  select *
  into service_row
  from public.provider_services
  where id = target_provider_service_id
    and is_public = true
    and is_active = true;

  if not found then
    raise exception 'Selected provider service is not publicly bookable';
  end if;

  select *
  into organization_row
  from public.provider_organizations
  where id = service_row.organization_id
    and public.is_provider_organization_visible(id);

  if not found then
    raise exception 'Selected provider is not publicly bookable';
  end if;

  select *
  into rule_row
  from public.provider_availability_rules
  where id = target_availability_rule_id
    and service_id = service_row.id
    and organization_id = service_row.organization_id
    and is_active = true
  -- Share the rule lock with other bookings; conflict with provider edits.
  -- Acquire before the existing per-slot advisory lock and capacity snapshot.
  for share;

  if not found then
    raise exception 'Selected slot is not available';
  end if;

  if target_payment_method_id is not null then
    if not public.can_pay_household(target_household_id, current_user_id) then
      raise exception 'Pay permission is required to attach a saved payment method';
    end if;

    select *
    into payment_method_row
    from public.payment_methods
    where id = target_payment_method_id
      and user_id = current_user_id
      and status = 'active';

    if not found then
      raise exception 'Selected payment method is not available';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(target_availability_rule_id::text),
    hashtext(target_slot_start_at::text || ':' || target_slot_end_at::text)
  );

  select *
  into slot_row
  from public.get_service_booking_slots(
    target_provider_service_id,
    (target_slot_start_at at time zone 'America/Panama')::date,
    (target_slot_start_at at time zone 'America/Panama')::date
  ) as slot
  where slot.availability_rule_id = target_availability_rule_id
    and slot.slot_start_at = target_slot_start_at
    and slot.slot_end_at = target_slot_end_at
  limit 1;

  if not found then
    raise exception 'Selected slot was not found';
  end if;

  if slot_row.status not in ('available', 'low_capacity') then
    raise exception 'Selected slot is no longer available';
  end if;

  next_status := case service_row.booking_mode when 'instant' then 'confirmed' else 'pending_approval' end;
  computed_cancellation_deadline :=
    target_slot_start_at - make_interval(hours => greatest(service_row.cancellation_window_hours, 0));

  insert into public.bookings (
    household_id,
    pet_id,
    provider_organization_id,
    provider_service_id,
    booked_by_user_id,
    selected_payment_method_id,
    booking_mode,
    status,
    scheduled_start_at,
    scheduled_end_at,
    cancellation_deadline_at,
    cancellation_window_hours,
    availability_rule_id,
    slot_start_at,
    slot_end_at
  )
  values (
    household_row.id,
    pet_row.id,
    organization_row.id,
    service_row.id,
    current_user_id,
    payment_method_row.id,
    service_row.booking_mode,
    next_status,
    target_slot_start_at,
    target_slot_end_at,
    computed_cancellation_deadline,
    service_row.cancellation_window_hours,
    target_availability_rule_id,
    target_slot_start_at,
    target_slot_end_at
  )
  returning * into created_booking;

  insert into public.booking_pricing (
    booking_id,
    provider_service_id,
    service_name,
    currency_code,
    unit_price_cents,
    subtotal_price_cents,
    total_price_cents
  )
  values (
    created_booking.id,
    service_row.id,
    service_row.name,
    service_row.currency_code,
    service_row.base_price_cents,
    service_row.base_price_cents,
    service_row.base_price_cents
  );

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    created_booking.id,
    null,
    created_booking.status,
    current_user_id,
    case
      when created_booking.status = 'confirmed' then 'Booking created from capacity slot with instant confirmation'
      else 'Booking created from capacity slot and waiting provider approval'
    end
  );

  perform public.insert_audit_log(
    'booking',
    created_booking.id,
    'booking_created_from_slot',
    jsonb_build_object(
      'booking_mode', created_booking.booking_mode,
      'status', created_booking.status,
      'household_id', created_booking.household_id,
      'pet_id', created_booking.pet_id,
      'provider_organization_id', created_booking.provider_organization_id,
      'provider_service_id', created_booking.provider_service_id,
      'availability_rule_id', target_availability_rule_id,
      'slot_start_at', target_slot_start_at,
      'slot_end_at', target_slot_end_at,
      'selected_payment_method_id', created_booking.selected_payment_method_id
    ),
    current_user_id
  );

  return created_booking;
end;
$$;
