-- V2 Booking Capacity / Booking Slots
--
-- Adds a parallel slot-capacity backend without changing the legacy
-- preview_booking/create_booking flow. UI migration happens in later CAP slices.

alter table public.provider_services
  drop constraint if exists provider_services_id_organization_id_unique;

alter table public.provider_services
  add constraint provider_services_id_organization_id_unique unique (id, organization_id);

create table if not exists public.provider_availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  service_id uuid not null references public.provider_services (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  capacity integer not null check (capacity > 0),
  is_active boolean not null default true,
  effective_from date,
  effective_until date,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_availability_rules_time_check check (ends_at > starts_at),
  constraint provider_availability_rules_effective_range_check check (
    effective_from is null
    or effective_until is null
    or effective_until >= effective_from
  ),
  constraint provider_availability_rules_service_org_fk
    foreign key (service_id, organization_id)
    references public.provider_services (id, organization_id)
    on delete cascade
);

create table if not exists public.provider_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  service_id uuid references public.provider_services (id) on delete cascade,
  availability_rule_id uuid references public.provider_availability_rules (id) on delete cascade,
  exception_date date not null,
  starts_at time,
  ends_at time,
  capacity_override integer check (capacity_override is null or capacity_override >= 0),
  is_closed boolean not null default false,
  reason text,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_availability_exceptions_target_check check (
    service_id is not null
    or availability_rule_id is not null
  ),
  constraint provider_availability_exceptions_time_pair_check check (
    (starts_at is null and ends_at is null)
    or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  ),
  constraint provider_availability_exceptions_service_org_fk
    foreign key (service_id, organization_id)
    references public.provider_services (id, organization_id)
    on delete cascade
);

alter table public.bookings
  add column if not exists availability_rule_id uuid references public.provider_availability_rules (id) on delete set null,
  add column if not exists slot_start_at timestamptz,
  add column if not exists slot_end_at timestamptz;

do $$
begin
  alter table public.bookings
    add constraint bookings_slot_range_check
    check (
      (slot_start_at is null and slot_end_at is null)
      or (slot_start_at is not null and slot_end_at is not null and slot_end_at > slot_start_at)
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists provider_availability_rules_organization_id_idx
  on public.provider_availability_rules (organization_id);
create index if not exists provider_availability_rules_service_id_idx
  on public.provider_availability_rules (service_id);
create index if not exists provider_availability_rules_day_idx
  on public.provider_availability_rules (day_of_week);
create index if not exists provider_availability_rules_active_idx
  on public.provider_availability_rules (is_active);
create index if not exists provider_availability_rules_effective_idx
  on public.provider_availability_rules (effective_from, effective_until);
create index if not exists provider_availability_rules_lookup_idx
  on public.provider_availability_rules (service_id, day_of_week, starts_at, ends_at)
  where is_active = true;

create index if not exists provider_availability_exceptions_organization_id_idx
  on public.provider_availability_exceptions (organization_id);
create index if not exists provider_availability_exceptions_service_id_idx
  on public.provider_availability_exceptions (service_id);
create index if not exists provider_availability_exceptions_rule_id_idx
  on public.provider_availability_exceptions (availability_rule_id);
create unique index if not exists provider_availability_exceptions_rule_date_unique_idx
  on public.provider_availability_exceptions (availability_rule_id, exception_date)
  where availability_rule_id is not null;

create index if not exists bookings_availability_rule_id_idx on public.bookings (availability_rule_id);
create index if not exists bookings_slot_start_at_idx on public.bookings (slot_start_at);
create index if not exists bookings_slot_end_at_idx on public.bookings (slot_end_at);
create index if not exists bookings_service_slot_idx on public.bookings (provider_service_id, slot_start_at);
create index if not exists bookings_status_slot_start_idx on public.bookings (status, slot_start_at);

drop trigger if exists trg_provider_availability_rules_updated_at on public.provider_availability_rules;
create trigger trg_provider_availability_rules_updated_at
before update on public.provider_availability_rules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_provider_availability_exceptions_updated_at on public.provider_availability_exceptions;
create trigger trg_provider_availability_exceptions_updated_at
before update on public.provider_availability_exceptions
for each row
execute function public.set_updated_at();

create or replace function public.booking_status_consumes_capacity(target_status text)
returns boolean
language sql
immutable
as $$
  select target_status in ('pending_approval', 'confirmed', 'completed');
$$;

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
      (projected.slot_date::timestamp + projected.slot_starts_at) at time zone current_setting('TimeZone') as slot_start_at,
      (projected.slot_date::timestamp + projected.slot_ends_at) at time zone current_setting('TimeZone') as slot_end_at,
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

alter table public.provider_availability_rules enable row level security;
alter table public.provider_availability_exceptions enable row level security;

drop policy if exists provider_availability_rules_select_owner on public.provider_availability_rules;
create policy provider_availability_rules_select_owner
on public.provider_availability_rules
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_availability_rules_select_admin on public.provider_availability_rules;
create policy provider_availability_rules_select_admin
on public.provider_availability_rules
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_availability_rules_insert_owner on public.provider_availability_rules;
create policy provider_availability_rules_insert_owner
on public.provider_availability_rules
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_provider_organization(organization_id, auth.uid())
);

drop policy if exists provider_availability_rules_update_owner on public.provider_availability_rules;
create policy provider_availability_rules_update_owner
on public.provider_availability_rules
for update
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()))
with check (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_availability_exceptions_select_owner on public.provider_availability_exceptions;
create policy provider_availability_exceptions_select_owner
on public.provider_availability_exceptions
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_availability_exceptions_select_admin on public.provider_availability_exceptions;
create policy provider_availability_exceptions_select_admin
on public.provider_availability_exceptions
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_availability_exceptions_insert_owner on public.provider_availability_exceptions;
create policy provider_availability_exceptions_insert_owner
on public.provider_availability_exceptions
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_provider_organization(organization_id, auth.uid())
);

drop policy if exists provider_availability_exceptions_update_owner on public.provider_availability_exceptions;
create policy provider_availability_exceptions_update_owner
on public.provider_availability_exceptions
for update
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()))
with check (public.can_manage_provider_organization(organization_id, auth.uid()));

grant execute on function public.booking_status_consumes_capacity(text) to anon, authenticated;
grant execute on function public.get_service_booking_slots(uuid, date, date) to anon, authenticated;
grant execute on function public.create_booking_from_slot(uuid, uuid, uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;
