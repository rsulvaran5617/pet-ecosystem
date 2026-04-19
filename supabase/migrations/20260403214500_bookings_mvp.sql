alter table public.provider_services
  add column if not exists booking_mode text not null default 'instant' check (booking_mode in ('instant', 'approval_required')),
  add column if not exists base_price_cents integer not null default 0 check (base_price_cents >= 0),
  add column if not exists currency_code text not null default 'USD' check (char_length(currency_code) = 3),
  add column if not exists cancellation_window_hours integer not null default 24 check (cancellation_window_hours >= 0);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  provider_organization_id uuid not null references public.provider_organizations (id) on delete restrict,
  provider_service_id uuid not null references public.provider_services (id) on delete restrict,
  booked_by_user_id uuid not null references auth.users (id) on delete cascade,
  selected_payment_method_id uuid references public.payment_methods (id) on delete set null,
  booking_mode text not null check (booking_mode in ('instant', 'approval_required')),
  status text not null check (status in ('pending_approval', 'confirmed', 'cancelled')),
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  cancellation_deadline_at timestamptz not null,
  cancellation_window_hours integer not null check (cancellation_window_hours >= 0),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at),
  check ((status = 'cancelled' and cancelled_at is not null) or (status <> 'cancelled' and cancelled_at is null))
);

create table if not exists public.booking_pricing (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  provider_service_id uuid not null references public.provider_services (id) on delete restrict,
  service_name text not null,
  currency_code text not null check (char_length(currency_code) = 3),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  subtotal_price_cents integer not null check (subtotal_price_cents >= 0),
  total_price_cents integer not null check (total_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status text check (from_status is null or from_status in ('pending_approval', 'confirmed', 'cancelled')),
  to_status text not null check (to_status in ('pending_approval', 'confirmed', 'cancelled')),
  changed_by_user_id uuid not null references auth.users (id) on delete cascade,
  change_reason text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_household_id_idx on public.bookings (household_id);
create index if not exists bookings_pet_id_idx on public.bookings (pet_id);
create index if not exists bookings_provider_service_id_idx on public.bookings (provider_service_id);
create index if not exists bookings_booked_by_user_id_idx on public.bookings (booked_by_user_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_scheduled_start_at_idx on public.bookings (scheduled_start_at);
create index if not exists booking_pricing_booking_id_idx on public.booking_pricing (booking_id);
create index if not exists booking_status_history_booking_id_idx on public.booking_status_history (booking_id);
create index if not exists booking_status_history_created_at_idx on public.booking_status_history (created_at);

create or replace function public.can_book_household(target_household_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members as membership
    where membership.household_id = target_household_id
      and membership.user_id = target_user_id
      and (
        membership.permissions @> array['book']::text[]
        or membership.permissions @> array['admin']::text[]
      )
  );
$$;

create or replace function public.can_pay_household(target_household_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members as membership
    where membership.household_id = target_household_id
      and membership.user_id = target_user_id
      and (
        membership.permissions @> array['pay']::text[]
        or membership.permissions @> array['admin']::text[]
      )
  );
$$;

create or replace function public.can_view_booking(target_booking_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as booking
    where booking.id = target_booking_id
      and public.can_view_household(booking.household_id, target_user_id)
  );
$$;

create or replace function public.resolve_next_provider_service_window(target_service_id uuid)
returns table (
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  service_row public.provider_services;
  availability_row public.provider_availability;
  current_day_start timestamptz := date_trunc('day', now());
  days_until_slot integer;
  candidate_start timestamptz;
  candidate_end timestamptz;
  best_start timestamptz;
  best_end timestamptz;
  service_duration interval;
begin
  select *
  into service_row
  from public.provider_services
  where id = target_service_id;

  if not found then
    return;
  end if;

  if service_row.duration_minutes is not null then
    service_duration := make_interval(mins => service_row.duration_minutes);
  end if;

  for availability_row in
    select *
    from public.provider_availability
    where organization_id = service_row.organization_id
      and is_active = true
    order by day_of_week asc, starts_at asc
  loop
    days_until_slot := (availability_row.day_of_week - extract(dow from now())::integer + 7) % 7;
    candidate_start :=
      current_day_start
      + make_interval(days => days_until_slot)
      + (availability_row.starts_at - time '00:00');

    if candidate_start <= now() then
      candidate_start := candidate_start + interval '7 days';
    end if;

    if service_duration is not null then
      candidate_end := candidate_start + service_duration;
    else
      candidate_end := date_trunc('day', candidate_start) + (availability_row.ends_at - time '00:00');
      if candidate_end <= candidate_start then
        candidate_end := candidate_end + interval '1 day';
      end if;
    end if;

    if best_start is null or candidate_start < best_start then
      best_start := candidate_start;
      best_end := candidate_end;
    end if;
  end loop;

  if best_start is null then
    return;
  end if;

  return query select best_start, best_end;
end;
$$;

drop function if exists public.create_provider_service(uuid, text, text, text, text[], integer, boolean);
create or replace function public.create_provider_service(
  target_organization_id uuid,
  next_name text,
  next_category text,
  next_short_description text default null,
  next_species_served text[] default array[]::text[],
  next_duration_minutes integer default null,
  next_is_public boolean default true,
  next_booking_mode text default 'instant',
  next_base_price_cents integer default 0,
  next_currency_code text default 'USD',
  next_cancellation_window_hours integer default 24
)
returns public.provider_services
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_category text := lower(nullif(trim(next_category), ''));
  normalized_description text := nullif(trim(next_short_description), '');
  normalized_species_served text[] := array(
    select distinct lower(trim(value))
    from unnest(coalesce(next_species_served, array[]::text[])) as value
    where trim(value) <> ''
  );
  normalized_booking_mode text := lower(coalesce(nullif(trim(next_booking_mode), ''), 'instant'));
  normalized_currency_code text := upper(coalesce(nullif(trim(next_currency_code), ''), 'USD'));
  created_service public.provider_services;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create provider services';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to create services';
  end if;

  if normalized_name is null then
    raise exception 'Provider service name is required';
  end if;

  if normalized_category not in ('walking', 'grooming', 'boarding', 'daycare', 'training', 'veterinary', 'sitting', 'other') then
    raise exception 'Unsupported provider service category';
  end if;

  if normalized_booking_mode not in ('instant', 'approval_required') then
    raise exception 'Unsupported booking mode';
  end if;

  if next_base_price_cents is null or next_base_price_cents < 0 then
    raise exception 'Base price must be zero or positive';
  end if;

  if char_length(normalized_currency_code) <> 3 then
    raise exception 'Currency code must use 3 characters';
  end if;

  if next_cancellation_window_hours is null or next_cancellation_window_hours < 0 then
    raise exception 'Cancellation window must be zero or positive';
  end if;

  insert into public.provider_services (
    organization_id,
    name,
    category,
    short_description,
    species_served,
    duration_minutes,
    is_public,
    is_active,
    booking_mode,
    base_price_cents,
    currency_code,
    cancellation_window_hours
  )
  values (
    target_organization_id,
    normalized_name,
    normalized_category,
    normalized_description,
    coalesce(normalized_species_served, array[]::text[]),
    next_duration_minutes,
    coalesce(next_is_public, true),
    true,
    normalized_booking_mode,
    next_base_price_cents,
    normalized_currency_code,
    next_cancellation_window_hours
  )
  returning * into created_service;

  return created_service;
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

create or replace function public.create_booking(
  target_household_id uuid,
  target_pet_id uuid,
  target_provider_organization_id uuid,
  target_provider_service_id uuid,
  target_payment_method_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  preview_row record;
  created_booking public.bookings;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create bookings';
  end if;

  select *
  into preview_row
  from public.preview_booking(
    target_household_id,
    target_pet_id,
    target_provider_organization_id,
    target_provider_service_id,
    target_payment_method_id
  )
  limit 1;

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
    cancellation_window_hours
  )
  values (
    preview_row.household_id,
    preview_row.pet_id,
    preview_row.provider_organization_id,
    preview_row.provider_service_id,
    current_user_id,
    preview_row.selected_payment_method_id,
    preview_row.booking_mode,
    preview_row.status_on_create,
    preview_row.scheduled_start_at,
    preview_row.scheduled_end_at,
    preview_row.cancellation_deadline_at,
    preview_row.cancellation_window_hours
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
    preview_row.provider_service_id,
    preview_row.service_name,
    preview_row.currency_code,
    preview_row.unit_price_cents,
    preview_row.subtotal_price_cents,
    preview_row.total_price_cents
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
      when created_booking.status = 'confirmed' then 'Booking created with instant confirmation'
      else 'Booking created and waiting provider approval'
    end
  );

  return created_booking;
end;
$$;

create or replace function public.cancel_booking(
  target_booking_id uuid,
  next_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  updated_booking public.bookings;
  normalized_reason text := nullif(trim(next_reason), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to cancel bookings';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_book_household(target_booking.household_id, current_user_id) then
    raise exception 'Book permission is required to cancel this booking';
  end if;

  if target_booking.status = 'cancelled' then
    raise exception 'Booking has already been cancelled';
  end if;

  if now() > target_booking.cancellation_deadline_at then
    raise exception 'The basic cancellation window has already passed';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = normalized_reason,
      updated_at = now()
  where id = target_booking_id
  returning * into updated_booking;

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    updated_booking.id,
    target_booking.status,
    updated_booking.status,
    current_user_id,
    coalesce(normalized_reason, 'Booking cancelled under the base household policy')
  );

  return updated_booking;
end;
$$;

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_booking_pricing_updated_at on public.booking_pricing;
create trigger trg_booking_pricing_updated_at
before update on public.booking_pricing
for each row
execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.booking_pricing enable row level security;
alter table public.booking_status_history enable row level security;

drop policy if exists bookings_select_visible on public.bookings;
create policy bookings_select_visible
on public.bookings
for select
to authenticated
using (public.can_view_household(household_id, auth.uid()));

drop policy if exists booking_pricing_select_visible on public.booking_pricing;
create policy booking_pricing_select_visible
on public.booking_pricing
for select
to authenticated
using (public.can_view_booking(booking_id, auth.uid()));

drop policy if exists booking_status_history_select_visible on public.booking_status_history;
create policy booking_status_history_select_visible
on public.booking_status_history
for select
to authenticated
using (public.can_view_booking(booking_id, auth.uid()));

grant execute on function public.can_book_household(uuid, uuid) to authenticated;
grant execute on function public.can_pay_household(uuid, uuid) to authenticated;
grant execute on function public.can_view_booking(uuid, uuid) to authenticated;
grant execute on function public.resolve_next_provider_service_window(uuid) to authenticated;
grant execute on function public.create_provider_service(uuid, text, text, text, text[], integer, boolean, text, integer, text, integer) to authenticated;
grant execute on function public.preview_booking(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
