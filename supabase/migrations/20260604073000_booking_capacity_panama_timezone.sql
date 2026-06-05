-- Booking capacity slots must be projected in the product/business timezone.
-- Supabase/Postgres stays in UTC; these RPCs convert local Panama schedule rules
-- into absolute timestamptz instants explicitly instead of depending on session TimeZone.

create or replace function public.get_service_booking_slots(
  target_service_id uuid,
  from_date date,
  to_date date
)
returns table (
  availability_rule_id uuid,
  organization_id uuid,
  service_id uuid,
  slot_date date,
  slot_start_at timestamptz,
  slot_end_at timestamptz,
  capacity_total integer,
  reserved_count integer,
  available_count integer,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with service_scope as (
    select service.id as service_id, service.organization_id
    from public.provider_services as service
    where service.id = target_service_id
      and service.is_public = true
      and service.is_active = true
      and public.is_provider_organization_visible(service.organization_id)
  ),
  requested_days as (
    select day::date as slot_date
    from generate_series(
      least(from_date, to_date)::timestamp,
      greatest(from_date, to_date)::timestamp,
      interval '1 day'
    ) as day
  ),
  projected as (
    select
      rule.id as availability_rule_id,
      rule.organization_id,
      rule.service_id,
      requested_days.slot_date,
      coalesce(exception.starts_at, rule.starts_at) as slot_starts_at,
      coalesce(exception.ends_at, rule.ends_at) as slot_ends_at,
      coalesce(exception.capacity_override, rule.capacity) as capacity_total,
      coalesce(exception.is_closed, false) as is_closed
    from requested_days
    join public.provider_availability_rules as rule
      on rule.service_id = target_service_id
     and rule.is_active = true
     and rule.day_of_week = extract(dow from requested_days.slot_date)::smallint
     and (rule.effective_from is null or rule.effective_from <= requested_days.slot_date)
     and (rule.effective_until is null or rule.effective_until >= requested_days.slot_date)
    join service_scope on service_scope.service_id = rule.service_id
    left join public.provider_availability_exceptions as exception
      on exception.availability_rule_id = rule.id
     and exception.exception_date = requested_days.slot_date
  ),
  slot_rows as (
    select
      projected.availability_rule_id,
      projected.organization_id,
      projected.service_id,
      projected.slot_date,
      (projected.slot_date::timestamp + projected.slot_starts_at) at time zone 'America/Panama' as slot_start_at,
      (projected.slot_date::timestamp + projected.slot_ends_at) at time zone 'America/Panama' as slot_end_at,
      projected.capacity_total,
      projected.is_closed
    from projected
  ),
  reserved as (
    select
      slot_rows.availability_rule_id,
      slot_rows.slot_start_at,
      slot_rows.slot_end_at,
      count(booking.id)::integer as reserved_count
    from slot_rows
    left join public.bookings as booking
      on booking.availability_rule_id = slot_rows.availability_rule_id
     and booking.slot_start_at = slot_rows.slot_start_at
     and booking.slot_end_at = slot_rows.slot_end_at
     and public.booking_status_consumes_capacity(booking.status)
    group by slot_rows.availability_rule_id, slot_rows.slot_start_at, slot_rows.slot_end_at
  )
  select
    slot_rows.availability_rule_id,
    slot_rows.organization_id,
    slot_rows.service_id,
    slot_rows.slot_date,
    slot_rows.slot_start_at,
    slot_rows.slot_end_at,
    slot_rows.capacity_total,
    reserved.reserved_count,
    greatest(slot_rows.capacity_total - reserved.reserved_count, 0)::integer as available_count,
    case
      when slot_rows.slot_start_at <= now() then 'expired'
      when slot_rows.is_closed or slot_rows.capacity_total <= 0 then 'unavailable'
      when slot_rows.capacity_total - reserved.reserved_count <= 0 then 'full'
      when slot_rows.capacity_total - reserved.reserved_count = 1 then 'low_capacity'
      else 'available'
    end as status
  from slot_rows
  join reserved
    on reserved.availability_rule_id = slot_rows.availability_rule_id
   and reserved.slot_start_at = slot_rows.slot_start_at
   and reserved.slot_end_at = slot_rows.slot_end_at
  order by slot_rows.slot_start_at asc;
$$;

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
    and is_active = true;

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

grant execute on function public.get_service_booking_slots(uuid, date, date) to anon, authenticated;
grant execute on function public.create_booking_from_slot(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;
