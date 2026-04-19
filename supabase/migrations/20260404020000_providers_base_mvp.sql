alter table public.provider_organizations
  alter column approval_status set default 'pending';

create table if not exists public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  document_type text not null check (document_type in ('identity', 'license', 'insurance', 'permit', 'other')),
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_bucket text not null default 'provider-documents',
  storage_path text not null unique,
  mime_type text,
  file_size_bytes integer not null check (file_size_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_documents_organization_id_idx on public.provider_documents (organization_id);
create index if not exists provider_documents_document_type_idx on public.provider_documents (document_type);

create or replace function public.can_view_provider_organization(
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
    from public.provider_organizations as organization
    where organization.id = target_organization_id
      and (
        public.is_provider_organization_visible(organization.id)
        or public.can_manage_provider_organization(organization.id, target_user_id)
        or public.is_platform_admin(target_user_id)
      )
  );
$$;

create or replace function public.extract_provider_organization_id_from_storage_path(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  organization_prefix text := nullif(split_part(coalesce(object_name, ''), '/', 1), '');
begin
  if organization_prefix is null then
    return null;
  end if;

  begin
    return organization_prefix::uuid;
  exception
    when others then
      return null;
  end;
end;
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
    'pending',
    coalesce(next_is_public, true)
  )
  returning * into created_organization;

  return created_organization;
end;
$$;

create or replace function public.update_provider_organization(
  target_organization_id uuid,
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
  updated_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update provider organizations';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to update the organization';
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

  update public.provider_organizations
  set name = normalized_name,
      slug = normalized_slug,
      city = normalized_city,
      country_code = normalized_country_code,
      is_public = coalesce(next_is_public, true),
      updated_at = now()
  where id = target_organization_id
  returning * into updated_organization;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  return updated_organization;
end;
$$;

create or replace function public.update_provider_service(
  target_service_id uuid,
  next_name text,
  next_category text,
  next_short_description text default null,
  next_species_served text[] default array[]::text[],
  next_duration_minutes integer default null,
  next_is_public boolean default true,
  next_is_active boolean default true,
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
  target_service public.provider_services;
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
  updated_service public.provider_services;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update provider services';
  end if;

  select *
  into target_service
  from public.provider_services
  where id = target_service_id;

  if not found then
    raise exception 'Provider service not found';
  end if;

  if not public.can_manage_provider_organization(target_service.organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to update services';
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

  update public.provider_services
  set name = normalized_name,
      category = normalized_category,
      short_description = normalized_description,
      species_served = coalesce(normalized_species_served, array[]::text[]),
      duration_minutes = next_duration_minutes,
      is_public = coalesce(next_is_public, true),
      is_active = coalesce(next_is_active, true),
      booking_mode = normalized_booking_mode,
      base_price_cents = next_base_price_cents,
      currency_code = normalized_currency_code,
      cancellation_window_hours = next_cancellation_window_hours,
      updated_at = now()
  where id = target_service_id
  returning * into updated_service;

  return updated_service;
end;
$$;

create or replace function public.update_provider_availability_slot(
  target_availability_id uuid,
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
  target_slot public.provider_availability;
  updated_slot public.provider_availability;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update availability';
  end if;

  select *
  into target_slot
  from public.provider_availability
  where id = target_availability_id;

  if not found then
    raise exception 'Provider availability slot not found';
  end if;

  if not public.can_manage_provider_organization(target_slot.organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to update availability';
  end if;

  if next_day_of_week is null or next_day_of_week < 0 or next_day_of_week > 6 then
    raise exception 'Day of week must be between 0 and 6';
  end if;

  if next_starts_at is null or next_ends_at is null or next_ends_at <= next_starts_at then
    raise exception 'Availability end time must be greater than start time';
  end if;

  update public.provider_availability
  set day_of_week = next_day_of_week,
      starts_at = next_starts_at,
      ends_at = next_ends_at,
      is_active = coalesce(next_is_active, true),
      updated_at = now()
  where id = target_availability_id
  returning * into updated_slot;

  return updated_slot;
end;
$$;

create or replace function public.approve_provider_organization(target_organization_id uuid)
returns public.provider_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to approve providers';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Admin role required to approve providers';
  end if;

  update public.provider_organizations
  set approval_status = 'approved',
      updated_at = now()
  where id = target_organization_id
  returning * into updated_organization;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  return updated_organization;
end;
$$;

create or replace function public.reject_provider_organization(target_organization_id uuid)
returns public.provider_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to reject providers';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Admin role required to reject providers';
  end if;

  update public.provider_organizations
  set approval_status = 'rejected',
      updated_at = now()
  where id = target_organization_id
  returning * into updated_organization;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  return updated_organization;
end;
$$;

drop trigger if exists trg_provider_documents_updated_at on public.provider_documents;
create trigger trg_provider_documents_updated_at
before update on public.provider_documents
for each row
execute function public.set_updated_at();

alter table public.provider_documents enable row level security;

drop policy if exists provider_organizations_select_owner on public.provider_organizations;
create policy provider_organizations_select_owner
on public.provider_organizations
for select
to authenticated
using (public.can_manage_provider_organization(id, auth.uid()));

drop policy if exists provider_organizations_select_admin on public.provider_organizations;
create policy provider_organizations_select_admin
on public.provider_organizations
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_public_profiles_select_owner on public.provider_public_profiles;
create policy provider_public_profiles_select_owner
on public.provider_public_profiles
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_public_profiles_select_admin on public.provider_public_profiles;
create policy provider_public_profiles_select_admin
on public.provider_public_profiles
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_services_select_owner on public.provider_services;
create policy provider_services_select_owner
on public.provider_services
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_services_select_admin on public.provider_services;
create policy provider_services_select_admin
on public.provider_services
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_availability_select_owner on public.provider_availability;
create policy provider_availability_select_owner
on public.provider_availability
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_availability_select_admin on public.provider_availability;
create policy provider_availability_select_admin
on public.provider_availability
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_documents_select_owner on public.provider_documents;
create policy provider_documents_select_owner
on public.provider_documents
for select
to authenticated
using (public.can_manage_provider_organization(organization_id, auth.uid()));

drop policy if exists provider_documents_select_admin on public.provider_documents;
create policy provider_documents_select_admin
on public.provider_documents
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists provider_documents_insert_owner on public.provider_documents;
create policy provider_documents_insert_owner
on public.provider_documents
for insert
to authenticated
with check (
  public.can_manage_provider_organization(organization_id, auth.uid())
  and created_by_user_id = auth.uid()
  and storage_bucket = 'provider-documents'
  and public.extract_provider_organization_id_from_storage_path(storage_path) = organization_id
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('provider-documents', 'provider-documents', false, 10485760)
on conflict (id) do nothing;

drop policy if exists provider_documents_objects_select on storage.objects;
create policy provider_documents_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-documents'
  and (
    public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
    or public.is_platform_admin(auth.uid())
  )
);

drop policy if exists provider_documents_objects_insert on storage.objects;
create policy provider_documents_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-documents'
  and public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
);

drop policy if exists provider_documents_objects_delete on storage.objects;
create policy provider_documents_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-documents'
  and public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
);

grant execute on function public.can_view_provider_organization(uuid, uuid) to authenticated;
grant execute on function public.extract_provider_organization_id_from_storage_path(text) to authenticated;
grant execute on function public.create_provider_organization(text, text, text, text, boolean) to authenticated;
grant execute on function public.update_provider_organization(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.update_provider_service(uuid, text, text, text, text[], integer, boolean, boolean, text, integer, text, integer) to authenticated;
grant execute on function public.update_provider_availability_slot(uuid, smallint, time, time, boolean) to authenticated;
grant execute on function public.approve_provider_organization(uuid) to authenticated;
grant execute on function public.reject_provider_organization(uuid) to authenticated;
