alter table public.pets
  add column if not exists status text not null default 'active',
  add column if not exists in_memory_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pets_status_check'
      and conrelid = 'public.pets'::regclass
  ) then
    alter table public.pets
      add constraint pets_status_check
      check (status in ('active', 'in_memory'));
  end if;
end;
$$;

create index if not exists pets_status_idx on public.pets (status);
create index if not exists pets_household_status_idx on public.pets (household_id, status);

create or replace function public.set_pet_memory_status(
  target_pet_id uuid,
  next_status text
)
returns public.pets
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := lower(nullif(trim(next_status), ''));
  target_pet public.pets;
  updated_pet public.pets;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to update pet status';
  end if;

  if normalized_status not in ('active', 'in_memory') then
    raise exception 'Unsupported pet status';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_pet_id;

  if not found then
    raise exception 'Pet not found';
  end if;

  if not public.can_edit_household(target_pet.household_id, auth.uid()) then
    raise exception 'Household edit permission required to update pet status';
  end if;

  update public.pets
  set status = normalized_status,
      in_memory_at = case
        when normalized_status = 'in_memory' and in_memory_at is null then now()
        when normalized_status = 'active' then null
        else in_memory_at
      end,
      updated_at = now()
  where id = target_pet_id
  returning * into updated_pet;

  return updated_pet;
end;
$$;

create or replace function public.ensure_pet_is_bookable(target_pet_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_status text;
begin
  select status
  into target_status
  from public.pets
  where id = target_pet_id;

  if target_status = 'in_memory' then
    raise exception 'Selected pet is in memory and cannot be used for new bookings';
  end if;
end;
$$;

create or replace function public.preview_booking(
  target_household_id uuid,
  target_pet_id uuid,
  target_provider_organization_id uuid,
  target_provider_service_id uuid,
  target_payment_method_id uuid default null
)
returns table (
  household_id uuid,
  pet_id uuid,
  provider_organization_id uuid,
  provider_service_id uuid,
  selected_payment_method_id uuid,
  booking_mode text,
  status_on_create text,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  cancellation_deadline_at timestamptz,
  cancellation_window_hours integer,
  currency_code text,
  unit_price_cents integer,
  subtotal_price_cents integer,
  total_price_cents integer,
  household_name text,
  pet_name text,
  provider_name text,
  service_name text,
  service_duration_minutes integer,
  payment_method_brand text,
  payment_method_last_4 text
)
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
  resolved_window record;
  next_status text;
  computed_cancellation_deadline timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to preview bookings';
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
  into organization_row
  from public.provider_organizations
  where id = target_provider_organization_id
    and public.is_provider_organization_visible(id);

  if not found then
    raise exception 'Selected provider is not publicly bookable';
  end if;

  select *
  into service_row
  from public.provider_services
  where id = target_provider_service_id
    and organization_id = target_provider_organization_id
    and is_public = true
    and is_active = true;

  if not found then
    raise exception 'Selected provider service is not publicly bookable';
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

  select *
  into resolved_window
  from public.resolve_next_provider_service_window(target_provider_service_id)
  limit 1;

  if resolved_window.scheduled_start_at is null or resolved_window.scheduled_end_at is null then
    raise exception 'Selected provider service has no active availability yet';
  end if;

  next_status := case service_row.booking_mode when 'instant' then 'confirmed' else 'pending_approval' end;
  computed_cancellation_deadline :=
    resolved_window.scheduled_start_at - make_interval(hours => greatest(service_row.cancellation_window_hours, 0));

  return query
  select
    household_row.id,
    pet_row.id,
    organization_row.id,
    service_row.id,
    payment_method_row.id,
    service_row.booking_mode,
    next_status,
    resolved_window.scheduled_start_at,
    resolved_window.scheduled_end_at,
    computed_cancellation_deadline,
    service_row.cancellation_window_hours,
    service_row.currency_code,
    service_row.base_price_cents,
    service_row.base_price_cents,
    service_row.base_price_cents,
    household_row.name,
    pet_row.name,
    organization_row.name,
    service_row.name,
    service_row.duration_minutes,
    payment_method_row.brand::text,
    payment_method_row.last_4;
end;
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
    (target_slot_start_at at time zone current_setting('TimeZone'))::date,
    (target_slot_start_at at time zone current_setting('TimeZone'))::date
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

grant execute on function public.set_pet_memory_status(uuid, text) to authenticated;
grant execute on function public.ensure_pet_is_bookable(uuid) to authenticated;
