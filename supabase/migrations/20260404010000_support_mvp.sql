alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('pet_owner', 'provider', 'admin'));

create or replace function public.prevent_user_role_value_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role <> new.role then
    raise exception 'Changing an existing user role value is not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_roles_prevent_role_change on public.user_roles;
create trigger trg_user_roles_prevent_role_change
before update on public.user_roles
for each row
execute function public.prevent_user_role_value_change();

drop policy if exists user_roles_insert_own on public.user_roles;
create policy user_roles_insert_own
on public.user_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role in ('pet_owner', 'provider')
);

create or replace function public.switch_active_user_role(next_role text)
returns setof public.user_roles
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  switched_role_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to switch role';
  end if;

  if next_role not in ('pet_owner', 'provider', 'admin') then
    raise exception 'Unsupported role: %', next_role;
  end if;

  update public.user_roles
  set is_active = true,
      updated_at = now()
  where user_id = current_user_id
    and role = next_role
  returning id into switched_role_id;

  if switched_role_id is null then
    if next_role = 'admin' then
      raise exception 'Admin role must be provisioned administratively';
    end if;

    insert into public.user_roles (
      user_id,
      role,
      is_active
    )
    values (
      current_user_id,
      next_role,
      true
    )
    returning id into switched_role_id;
  end if;

  return query
  select *
  from public.user_roles
  where user_id = current_user_id
  order by created_at asc;
end;
$$;

grant execute on function public.switch_active_user_role(text) to authenticated;

create or replace function public.is_platform_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = target_user_id
      and role = 'admin'
  );
$$;

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  provider_organization_id uuid not null references public.provider_organizations (id) on delete restrict,
  provider_service_id uuid not null references public.provider_services (id) on delete restrict,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  creator_email text not null,
  creator_display_name text not null,
  provider_name text not null,
  service_name text not null,
  pet_name text not null,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  subject text not null check (char_length(trim(subject)) between 3 and 140),
  description_text text not null check (char_length(trim(description_text)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  admin_note text,
  resolution_text text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at),
  check ((status = 'resolved' and resolved_at is not null) or (status <> 'resolved' and resolved_at is null))
);

create index if not exists support_cases_created_by_user_id_idx on public.support_cases (created_by_user_id);
create index if not exists support_cases_status_idx on public.support_cases (status);
create index if not exists support_cases_created_at_idx on public.support_cases (created_at desc);

drop trigger if exists trg_support_cases_updated_at on public.support_cases;
create trigger trg_support_cases_updated_at
before update on public.support_cases
for each row
execute function public.set_updated_at();

create or replace function public.can_create_support_case(target_booking_id uuid, target_user_id uuid default auth.uid())
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

create or replace function public.create_support_case(
  target_booking_id uuid,
  next_subject text,
  next_description_text text
)
returns public.support_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  creator_profile public.profiles;
  target_pet public.pets;
  target_provider public.provider_organizations;
  target_pricing public.booking_pricing;
  normalized_subject text := nullif(trim(next_subject), '');
  normalized_description_text text := nullif(trim(next_description_text), '');
  created_case public.support_cases;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create support cases';
  end if;

  if normalized_subject is null then
    raise exception 'Support subject is required';
  end if;

  if normalized_description_text is null then
    raise exception 'Support description is required';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_create_support_case(target_booking.id, current_user_id) then
    raise exception 'Only the household-side booking participant can create support cases in this MVP';
  end if;

  if exists (
    select 1
    from public.support_cases
    where booking_id = target_booking.id
  ) then
    raise exception 'A support case already exists for this booking';
  end if;

  select *
  into creator_profile
  from public.profiles
  where id = current_user_id;

  if not found then
    raise exception 'Creator profile was not found';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_booking.pet_id;

  if not found then
    raise exception 'Booking pet was not found';
  end if;

  select *
  into target_provider
  from public.provider_organizations
  where id = target_booking.provider_organization_id;

  if not found then
    raise exception 'Booking provider organization was not found';
  end if;

  select *
  into target_pricing
  from public.booking_pricing
  where booking_id = target_booking.id;

  if not found then
    raise exception 'Booking pricing was not found';
  end if;

  insert into public.support_cases (
    booking_id,
    household_id,
    pet_id,
    provider_organization_id,
    provider_service_id,
    created_by_user_id,
    creator_email,
    creator_display_name,
    provider_name,
    service_name,
    pet_name,
    scheduled_start_at,
    scheduled_end_at,
    subject,
    description_text
  )
  values (
    target_booking.id,
    target_booking.household_id,
    target_booking.pet_id,
    target_booking.provider_organization_id,
    target_booking.provider_service_id,
    current_user_id,
    creator_profile.email,
    trim(concat_ws(' ', creator_profile.first_name, creator_profile.last_name)),
    target_provider.name,
    target_pricing.service_name,
    target_pet.name,
    target_booking.scheduled_start_at,
    target_booking.scheduled_end_at,
    normalized_subject,
    normalized_description_text
  )
  returning * into created_case;

  return created_case;
end;
$$;

create or replace function public.update_support_case_admin(
  target_case_id uuid,
  next_status text,
  next_admin_note text default null,
  next_resolution_text text default null
)
returns public.support_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_case public.support_cases;
  normalized_status text := lower(coalesce(nullif(trim(next_status), ''), ''));
  normalized_admin_note text := nullif(trim(next_admin_note), '');
  normalized_resolution_text text := nullif(trim(next_resolution_text), '');
  updated_case public.support_cases;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update support cases';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Platform admin role required to update support cases';
  end if;

  if normalized_status not in ('open', 'in_review', 'resolved') then
    raise exception 'Unsupported support case status';
  end if;

  select *
  into target_case
  from public.support_cases
  where id = target_case_id;

  if not found then
    raise exception 'Support case was not found';
  end if;

  if normalized_status = 'resolved'
    and coalesce(normalized_resolution_text, target_case.resolution_text) is null then
    raise exception 'A resolution is required to resolve the support case';
  end if;

  update public.support_cases
  set status = normalized_status,
      admin_note = coalesce(normalized_admin_note, admin_note),
      resolution_text = case
        when normalized_status = 'resolved' then coalesce(normalized_resolution_text, resolution_text)
        else null
      end,
      resolved_at = case
        when normalized_status = 'resolved' then coalesce(resolved_at, now())
        else null
      end,
      updated_at = now()
  where id = target_case_id
  returning * into updated_case;

  return updated_case;
end;
$$;

alter table public.support_cases enable row level security;

drop policy if exists support_cases_select_visible on public.support_cases;
create policy support_cases_select_visible
on public.support_cases
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
);

grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.can_create_support_case(uuid, uuid) to authenticated;
grant execute on function public.create_support_case(uuid, text, text) to authenticated;
grant execute on function public.update_support_case_admin(uuid, text, text, text) to authenticated;
