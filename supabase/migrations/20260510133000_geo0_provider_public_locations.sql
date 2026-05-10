create extension if not exists postgis with schema extensions;

create table if not exists public.provider_public_locations (
  organization_id uuid primary key references public.provider_organizations (id) on delete cascade,
  display_label text not null check (char_length(trim(display_label)) between 1 and 160),
  address_line_public text check (address_line_public is null or char_length(trim(address_line_public)) between 1 and 240),
  city text not null check (char_length(trim(city)) between 1 and 120),
  state_region text check (state_region is null or char_length(trim(state_region)) between 1 and 120),
  country_code text not null default 'PA' check (char_length(trim(country_code)) = 2),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geo_point extensions.geography(Point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  location_precision text not null default 'approximate' check (location_precision in ('exact', 'approximate', 'city')),
  is_public boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_public_locations_geo_point_idx
on public.provider_public_locations using gist (geo_point);

create index if not exists provider_public_locations_public_idx
on public.provider_public_locations (is_public, city, country_code);

drop trigger if exists trg_provider_public_locations_updated_at on public.provider_public_locations;
create trigger trg_provider_public_locations_updated_at
before update on public.provider_public_locations
for each row
execute function public.set_updated_at();

create or replace function public.upsert_provider_public_location(
  target_organization_id uuid,
  next_display_label text,
  next_address_line_public text default null,
  next_city text default null,
  next_state_region text default null,
  next_country_code text default 'PA',
  next_latitude double precision default null,
  next_longitude double precision default null,
  next_location_precision text default 'approximate',
  next_is_public boolean default false
)
returns public.provider_public_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_display_label text := nullif(trim(next_display_label), '');
  normalized_address_line_public text := nullif(trim(next_address_line_public), '');
  normalized_city text := nullif(trim(next_city), '');
  normalized_state_region text := nullif(trim(next_state_region), '');
  normalized_country_code text := upper(coalesce(nullif(trim(next_country_code), ''), 'PA'));
  normalized_precision text := lower(coalesce(nullif(trim(next_location_precision), ''), 'approximate'));
  upserted_location public.provider_public_locations;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to update provider public location';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, auth.uid()) then
    raise exception 'You do not have permission to update this provider location';
  end if;

  if normalized_display_label is null then
    raise exception 'Display label is required';
  end if;

  if normalized_city is null then
    raise exception 'City is required';
  end if;

  if next_latitude is null or next_longitude is null then
    raise exception 'Latitude and longitude are required';
  end if;

  if normalized_precision not in ('exact', 'approximate', 'city') then
    raise exception 'Unsupported location precision';
  end if;

  insert into public.provider_public_locations (
    organization_id,
    display_label,
    address_line_public,
    city,
    state_region,
    country_code,
    latitude,
    longitude,
    location_precision,
    is_public
  )
  values (
    target_organization_id,
    normalized_display_label,
    normalized_address_line_public,
    normalized_city,
    normalized_state_region,
    normalized_country_code,
    next_latitude,
    next_longitude,
    normalized_precision,
    coalesce(next_is_public, false)
  )
  on conflict (organization_id) do update
  set display_label = excluded.display_label,
      address_line_public = excluded.address_line_public,
      city = excluded.city,
      state_region = excluded.state_region,
      country_code = excluded.country_code,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      location_precision = excluded.location_precision,
      is_public = excluded.is_public,
      verified_at = case
        when provider_public_locations.latitude is distinct from excluded.latitude
          or provider_public_locations.longitude is distinct from excluded.longitude
          or provider_public_locations.address_line_public is distinct from excluded.address_line_public
        then null
        else provider_public_locations.verified_at
      end,
      updated_at = now()
  returning * into upserted_location;

  return upserted_location;
end;
$$;

create or replace function public.list_marketplace_provider_locations()
returns setof public.provider_public_locations
language sql
stable
security definer
set search_path = public
as $$
  select location.*
  from public.provider_public_locations as location
  join public.provider_organizations as organization
    on organization.id = location.organization_id
  join public.provider_public_profiles as profile
    on profile.organization_id = organization.id
  where location.is_public = true
    and profile.is_public = true
    and public.is_provider_organization_visible(organization.id)
    and exists (
      select 1
      from public.provider_services as service
      where service.organization_id = organization.id
        and service.is_public = true
        and service.is_active = true
    );
$$;

alter table public.provider_public_locations enable row level security;

drop policy if exists provider_public_locations_select_marketplace on public.provider_public_locations;
create policy provider_public_locations_select_marketplace
on public.provider_public_locations
for select
to anon, authenticated
using (
  is_public = true
  and public.is_provider_organization_visible(organization_id)
  and exists (
    select 1
    from public.provider_public_profiles as profile
    where profile.organization_id = provider_public_locations.organization_id
      and profile.is_public = true
  )
  and exists (
    select 1
    from public.provider_services as service
    where service.organization_id = provider_public_locations.organization_id
      and service.is_public = true
      and service.is_active = true
  )
);

drop policy if exists provider_public_locations_select_manage on public.provider_public_locations;
create policy provider_public_locations_select_manage
on public.provider_public_locations
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_public_locations_select_admin on public.provider_public_locations;
create policy provider_public_locations_select_admin
on public.provider_public_locations
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_public_locations_insert_manage on public.provider_public_locations;
create policy provider_public_locations_insert_manage
on public.provider_public_locations
for insert
to authenticated
with check (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_public_locations_update_manage on public.provider_public_locations;
create policy provider_public_locations_update_manage
on public.provider_public_locations
for update
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()))
with check (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_public_locations_update_admin on public.provider_public_locations;
create policy provider_public_locations_update_admin
on public.provider_public_locations
for update
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

grant execute on function public.upsert_provider_public_location(uuid, text, text, text, text, text, double precision, double precision, text, boolean) to authenticated;
grant execute on function public.list_marketplace_provider_locations() to anon, authenticated;
