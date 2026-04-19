create table if not exists public.provider_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null unique check (slug = lower(slug) and char_length(trim(slug)) between 3 and 80),
  city text not null check (char_length(trim(city)) between 1 and 120),
  country_code text not null default 'PA' check (char_length(trim(country_code)) between 2 and 3),
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_public_profiles (
  organization_id uuid primary key references public.provider_organizations (id) on delete cascade,
  headline text not null check (char_length(trim(headline)) between 1 and 160),
  bio text not null check (char_length(trim(bio)) between 1 and 2400),
  avatar_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  category text not null check (category in ('walking', 'grooming', 'boarding', 'daycare', 'training', 'veterinary', 'sitting', 'other')),
  short_description text,
  species_served text[] not null default array[]::text[],
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists provider_organizations_owner_user_id_idx on public.provider_organizations (owner_user_id);
create index if not exists provider_organizations_visibility_idx on public.provider_organizations (approval_status, is_public);
create index if not exists provider_organizations_city_idx on public.provider_organizations (city);
create index if not exists provider_services_organization_id_idx on public.provider_services (organization_id);
create index if not exists provider_services_category_idx on public.provider_services (category);
create index if not exists provider_services_visibility_idx on public.provider_services (is_public, is_active);
create index if not exists provider_services_species_served_gin_idx on public.provider_services using gin (species_served);
create index if not exists provider_availability_organization_id_idx on public.provider_availability (organization_id);
create unique index if not exists provider_availability_unique_slot_idx on public.provider_availability (organization_id, day_of_week, starts_at, ends_at);

create or replace function public.has_provider_role(target_user_id uuid default auth.uid())
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
      and role = 'provider'
  );
$$;

create or replace function public.can_manage_provider_organization(
  target_organization_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_organizations
    where id = target_organization_id
      and owner_user_id = target_user_id
      and public.has_provider_role(target_user_id)
  );
$$;

create or replace function public.is_provider_organization_visible(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_organizations as organization
    left join public.provider_public_profiles as profile
      on profile.organization_id = organization.id
    where organization.id = target_organization_id
      and organization.approval_status = 'approved'
      and organization.is_public = true
      and coalesce(profile.is_public, true) = true
  );
$$;

create or replace function public.create_provider_organization(
  next_name text,
  next_slug text,
  next_city text,
  next_country_code text default 'PA',
  next_is_public boolean default true
)
returns public.provider_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_slug text := lower(nullif(trim(next_slug), ''));
  normalized_city text := nullif(trim(next_city), '');
  normalized_country_code text := upper(coalesce(nullif(trim(next_country_code), ''), 'PA'));
  created_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create provider organizations';
  end if;

  if not public.has_provider_role(current_user_id) then
    raise exception 'Provider role required to create provider organizations';
  end if;

  if normalized_name is null then
    raise exception 'Organization name is required';
  end if;

  if normalized_slug is null then
    raise exception 'Organization slug is required';
  end if;

  if normalized_city is null then
    raise exception 'Organization city is required';
  end if;

  insert into public.provider_organizations (
    owner_user_id,
    name,
    slug,
    city,
    country_code,
    approval_status,
    is_public
  )
  values (
    current_user_id,
    normalized_name,
    normalized_slug,
    normalized_city,
    normalized_country_code,
    'approved',
    coalesce(next_is_public, true)
  )
  returning * into created_organization;

  return created_organization;
end;
$$;

create or replace function public.upsert_provider_public_profile(
  target_organization_id uuid,
  next_headline text,
  next_bio text,
  next_avatar_url text default null,
  next_is_public boolean default true
)
returns public.provider_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_headline text := nullif(trim(next_headline), '');
  normalized_bio text := nullif(trim(next_bio), '');
  normalized_avatar_url text := nullif(trim(next_avatar_url), '');
  upserted_profile public.provider_public_profiles;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to publish provider profiles';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to publish profiles';
  end if;

  if normalized_headline is null then
    raise exception 'Provider headline is required';
  end if;

  if normalized_bio is null then
    raise exception 'Provider bio is required';
  end if;

  insert into public.provider_public_profiles (
    organization_id,
    headline,
    bio,
    avatar_url,
    is_public
  )
  values (
    target_organization_id,
    normalized_headline,
    normalized_bio,
    normalized_avatar_url,
    coalesce(next_is_public, true)
  )
  on conflict (organization_id) do update
  set headline = excluded.headline,
      bio = excluded.bio,
      avatar_url = excluded.avatar_url,
      is_public = excluded.is_public,
      updated_at = now()
  returning * into upserted_profile;

  return upserted_profile;
end;
$$;

create or replace function public.create_provider_service(
  target_organization_id uuid,
  next_name text,
  next_category text,
  next_short_description text default null,
  next_species_served text[] default array[]::text[],
  next_duration_minutes integer default null,
  next_is_public boolean default true
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

  insert into public.provider_services (
    organization_id,
    name,
    category,
    short_description,
    species_served,
    duration_minutes,
    is_public,
    is_active
  )
  values (
    target_organization_id,
    normalized_name,
    normalized_category,
    normalized_description,
    coalesce(normalized_species_served, array[]::text[]),
    next_duration_minutes,
    coalesce(next_is_public, true),
    true
  )
  returning * into created_service;

  return created_service;
end;
$$;

create or replace function public.add_provider_availability_slot(
  target_organization_id uuid,
  next_day_of_week smallint,
  next_starts_at time,
  next_ends_at time,
  next_is_active boolean default true
)
returns public.provider_availability
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  created_slot public.provider_availability;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to publish availability';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to publish availability';
  end if;

  if next_day_of_week is null or next_day_of_week < 0 or next_day_of_week > 6 then
    raise exception 'Day of week must be between 0 and 6';
  end if;

  if next_starts_at is null or next_ends_at is null or next_ends_at <= next_starts_at then
    raise exception 'Availability end time must be greater than start time';
  end if;

  insert into public.provider_availability (
    organization_id,
    day_of_week,
    starts_at,
    ends_at,
    is_active
  )
  values (
    target_organization_id,
    next_day_of_week,
    next_starts_at,
    next_ends_at,
    coalesce(next_is_active, true)
  )
  returning * into created_slot;

  return created_slot;
end;
$$;

drop trigger if exists trg_provider_organizations_updated_at on public.provider_organizations;
create trigger trg_provider_organizations_updated_at
before update on public.provider_organizations
for each row
execute function public.set_updated_at();

drop trigger if exists trg_provider_public_profiles_updated_at on public.provider_public_profiles;
create trigger trg_provider_public_profiles_updated_at
before update on public.provider_public_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_provider_services_updated_at on public.provider_services;
create trigger trg_provider_services_updated_at
before update on public.provider_services
for each row
execute function public.set_updated_at();

drop trigger if exists trg_provider_availability_updated_at on public.provider_availability;
create trigger trg_provider_availability_updated_at
before update on public.provider_availability
for each row
execute function public.set_updated_at();

alter table public.provider_organizations enable row level security;
alter table public.provider_public_profiles enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_availability enable row level security;

drop policy if exists provider_organizations_select_public on public.provider_organizations;
create policy provider_organizations_select_public
on public.provider_organizations
for select
to anon, authenticated
using (approval_status = 'approved' and is_public = true);

drop policy if exists provider_public_profiles_select_public on public.provider_public_profiles;
create policy provider_public_profiles_select_public
on public.provider_public_profiles
for select
to anon, authenticated
using (
  is_public = true
  and public.is_provider_organization_visible(organization_id)
);

drop policy if exists provider_services_select_public on public.provider_services;
create policy provider_services_select_public
on public.provider_services
for select
to anon, authenticated
using (
  is_public = true
  and is_active = true
  and public.is_provider_organization_visible(organization_id)
);

drop policy if exists provider_availability_select_public on public.provider_availability;
create policy provider_availability_select_public
on public.provider_availability
for select
to anon, authenticated
using (
  is_active = true
  and public.is_provider_organization_visible(organization_id)
);

grant execute on function public.has_provider_role(uuid) to authenticated;
grant execute on function public.can_manage_provider_organization(uuid, uuid) to authenticated;
grant execute on function public.is_provider_organization_visible(uuid) to anon, authenticated;
grant execute on function public.create_provider_organization(text, text, text, text, boolean) to authenticated;
grant execute on function public.upsert_provider_public_profile(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.create_provider_service(uuid, text, text, text, text[], integer, boolean) to authenticated;
grant execute on function public.add_provider_availability_slot(uuid, smallint, time, time, boolean) to authenticated;
