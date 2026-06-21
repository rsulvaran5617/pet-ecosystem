-- Foster-3A: controlled adoption/foster showcase.
-- Pets keep their identity in public.pets; this slice only publishes a moderated profile.

create table if not exists public.pet_adoption_listings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'paused', 'closed', 'rejected')),
  title text not null,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text not null,
  state_region text,
  country_code text not null default 'PA',
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pet_adoption_listings_one_active_per_pet_idx
on public.pet_adoption_listings(pet_id)
where status in ('draft', 'pending_review', 'published', 'paused', 'rejected');

create index if not exists pet_adoption_listings_household_status_idx
on public.pet_adoption_listings(household_id, status);

create index if not exists pet_adoption_listings_status_published_idx
on public.pet_adoption_listings(status, published_at desc);

create table if not exists public.pet_adoption_listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.pet_adoption_listings(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  storage_bucket text not null default 'pet-adoption-media'
    check (storage_bucket = 'pet-adoption-media'),
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists pet_adoption_listing_media_listing_order_idx
on public.pet_adoption_listing_media(listing_id, display_order, created_at);

create unique index if not exists pet_adoption_listing_media_one_cover_idx
on public.pet_adoption_listing_media(listing_id)
where is_cover;

drop trigger if exists set_pet_adoption_listings_updated_at on public.pet_adoption_listings;
create trigger set_pet_adoption_listings_updated_at
before update on public.pet_adoption_listings
for each row execute function public.set_updated_at();

drop trigger if exists set_pet_adoption_listing_media_updated_at on public.pet_adoption_listing_media;
create trigger set_pet_adoption_listing_media_updated_at
before update on public.pet_adoption_listing_media
for each row execute function public.set_updated_at();

alter table public.pet_adoption_listings enable row level security;
alter table public.pet_adoption_listing_media enable row level security;

create or replace function public.can_manage_pet_adoption_listing(target_listing_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_adoption_listings listing
    where listing.id = target_listing_id
      and public.can_manage_household(listing.household_id, target_user_id)
      and public.is_approved_protective_household(listing.household_id)
  );
$$;

create or replace function public.can_view_pet_adoption_listing(target_listing_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_adoption_listings listing
    where listing.id = target_listing_id
      and (
        listing.status = 'published'
        or public.can_view_household(listing.household_id, target_user_id)
        or public.is_platform_admin(target_user_id)
      )
  );
$$;

drop policy if exists pet_adoption_listings_select on public.pet_adoption_listings;
create policy pet_adoption_listings_select
on public.pet_adoption_listings
for select
to authenticated
using (public.can_view_pet_adoption_listing(id, auth.uid()));

drop policy if exists pet_adoption_listing_media_select on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_select
on public.pet_adoption_listing_media
for select
to authenticated
using (public.can_view_pet_adoption_listing(listing_id, auth.uid()));

drop policy if exists pet_adoption_listing_media_insert on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_insert
on public.pet_adoption_listing_media
for insert
to authenticated
with check (
  storage_bucket = 'pet-adoption-media'
  and media_type = 'image'
  and public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  and exists (
    select 1 from public.pet_adoption_listings listing
    where listing.id = listing_id
      and listing.status in ('draft', 'rejected', 'paused')
  )
);

drop policy if exists pet_adoption_listing_media_update on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_update
on public.pet_adoption_listing_media
for update
to authenticated
using (
  public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  or public.is_platform_admin(auth.uid())
)
with check (
  public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists pet_adoption_listing_media_delete on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_delete
on public.pet_adoption_listing_media
for delete
to authenticated
using (public.can_manage_pet_adoption_listing(listing_id, auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-adoption-media', 'pet-adoption-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.extract_pet_adoption_listing_id_from_storage_path(storage_path text)
returns uuid
language sql
stable
as $$
  select nullif(split_part(storage_path, '/', 1), '')::uuid;
$$;

drop policy if exists pet_adoption_media_objects_select on storage.objects;
create policy pet_adoption_media_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-adoption-media'
  and public.can_view_pet_adoption_listing(public.extract_pet_adoption_listing_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_adoption_media_objects_insert on storage.objects;
create policy pet_adoption_media_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-adoption-media'
  and public.can_manage_pet_adoption_listing(public.extract_pet_adoption_listing_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_adoption_media_objects_delete on storage.objects;
create policy pet_adoption_media_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-adoption-media'
  and public.can_manage_pet_adoption_listing(public.extract_pet_adoption_listing_id_from_storage_path(name), auth.uid())
);

create or replace function public.create_pet_adoption_listing(target_pet_id uuid, target_household_id uuid)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pet public.pets%rowtype;
  protective_profile public.protective_household_profiles%rowtype;
  created_listing public.pet_adoption_listings%rowtype;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'household management permission required';
  end if;

  if not public.is_approved_protective_household(target_household_id) then
    raise exception 'approved protective household required';
  end if;

  select * into selected_pet
  from public.pets
  where id = target_pet_id
    and household_id = target_household_id;

  if not found then
    raise exception 'pet not found in household';
  end if;

  if selected_pet.status = 'in_memory' then
    raise exception 'in-memory pets cannot be published for adoption';
  end if;

  select * into protective_profile
  from public.protective_household_profiles
  where household_id = target_household_id;

  insert into public.pet_adoption_listings (
    pet_id,
    household_id,
    title,
    city,
    state_region,
    country_code,
    created_by_user_id
  )
  values (
    target_pet_id,
    target_household_id,
    selected_pet.name || ' busca hogar',
    protective_profile.city,
    protective_profile.state_region,
    protective_profile.country_code,
    current_user_id
  )
  returning * into created_listing;

  perform public.insert_audit_log(
    'pet_adoption_listing',
    created_listing.id,
    'created',
    current_user_id,
    jsonb_build_object('pet_id', target_pet_id, 'household_id', target_household_id)
  );

  return created_listing;
end;
$$;

create or replace function public.update_pet_adoption_listing(
  target_listing_id uuid,
  next_title text,
  next_public_story text,
  next_personality_notes text,
  next_public_health_summary text,
  next_adoption_requirements text,
  next_city text,
  next_state_region text,
  next_country_code text,
  next_compatibility_children text,
  next_compatibility_dogs text,
  next_compatibility_cats text,
  next_special_needs_notes text
)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_listing public.pet_adoption_listings%rowtype;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set title = nullif(trim(next_title), ''),
      public_story = nullif(trim(next_public_story), ''),
      personality_notes = nullif(trim(next_personality_notes), ''),
      public_health_summary = nullif(trim(next_public_health_summary), ''),
      adoption_requirements = nullif(trim(next_adoption_requirements), ''),
      city = nullif(trim(next_city), ''),
      state_region = nullif(trim(next_state_region), ''),
      country_code = coalesce(nullif(trim(next_country_code), ''), 'PA'),
      compatibility_children = nullif(trim(next_compatibility_children), ''),
      compatibility_dogs = nullif(trim(next_compatibility_dogs), ''),
      compatibility_cats = nullif(trim(next_compatibility_cats), ''),
      special_needs_notes = nullif(trim(next_special_needs_notes), ''),
      status = case when status = 'rejected' then 'draft' else status end,
      review_notes = case when status = 'rejected' then null else review_notes end
  where id = target_listing_id
    and status in ('draft', 'rejected', 'paused')
  returning * into updated_listing;

  if not found then
    raise exception 'listing cannot be edited in its current status';
  end if;

  return updated_listing;
end;
$$;

create or replace function public.submit_pet_adoption_listing(target_listing_id uuid)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  submitted_listing public.pet_adoption_listings%rowtype;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set status = 'pending_review',
      reviewed_by_user_id = null,
      reviewed_at = null,
      review_notes = null
  where id = target_listing_id
    and status in ('draft', 'rejected', 'paused')
    and title is not null
    and city is not null
  returning * into submitted_listing;

  if not found then
    raise exception 'listing is not ready for review';
  end if;

  return submitted_listing;
end;
$$;

create or replace function public.pause_pet_adoption_listing(target_listing_id uuid)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  paused_listing public.pet_adoption_listings%rowtype;
begin
  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set status = 'paused',
      paused_at = now()
  where id = target_listing_id
    and status = 'published'
  returning * into paused_listing;

  if not found then
    raise exception 'listing cannot be paused';
  end if;

  return paused_listing;
end;
$$;

create or replace function public.close_pet_adoption_listing(target_listing_id uuid)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  closed_listing public.pet_adoption_listings%rowtype;
begin
  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id)
     and not public.is_platform_admin(current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set status = 'closed',
      closed_at = now()
  where id = target_listing_id
    and status <> 'closed'
  returning * into closed_listing;

  if not found then
    raise exception 'listing cannot be closed';
  end if;

  return closed_listing;
end;
$$;

create or replace function public.review_pet_adoption_listing(target_listing_id uuid, decision text, notes text default null)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reviewed_listing public.pet_adoption_listings%rowtype;
begin
  if not public.is_platform_admin(current_user_id) then
    raise exception 'platform admin required';
  end if;

  if decision not in ('approved', 'rejected', 'paused') then
    raise exception 'invalid review decision';
  end if;

  if decision in ('rejected', 'paused') and nullif(trim(notes), '') is null then
    raise exception 'review notes required';
  end if;

  update public.pet_adoption_listings
  set status = case decision when 'approved' then 'published' when 'paused' then 'paused' else 'rejected' end,
      published_at = case decision when 'approved' then now() else published_at end,
      paused_at = case decision when 'paused' then now() else paused_at end,
      reviewed_by_user_id = current_user_id,
      reviewed_at = now(),
      review_notes = nullif(trim(notes), '')
  where id = target_listing_id
    and status in ('pending_review', 'published', 'paused')
  returning * into reviewed_listing;

  if not found then
    raise exception 'listing is not reviewable';
  end if;

  if decision = 'approved' then
    update public.pet_adoption_listing_media
    set moderation_status = 'approved'
    where listing_id = target_listing_id
      and moderation_status = 'pending';
  end if;

  return reviewed_listing;
end;
$$;

create or replace function public.list_my_pet_adoption_listings(target_household_id uuid default null)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    profile.breed,
    coalesce(profile.sex, 'unknown'),
    profile.birth_date,
    profile.is_sterilized,
    household.name
  from public.pet_adoption_listings listing
  join public.pets pet on pet.id = listing.pet_id
  left join public.pet_profiles profile on profile.pet_id = pet.id
  join public.households household on household.id = listing.household_id
  where public.can_view_household(listing.household_id, auth.uid())
    and (target_household_id is null or listing.household_id = target_household_id)
  order by listing.updated_at desc;
$$;

create or replace function public.list_published_pet_adoption_listings()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    profile.breed,
    coalesce(profile.sex, 'unknown'),
    profile.birth_date,
    profile.is_sterilized,
    household.name
  from public.pet_adoption_listings listing
  join public.pets pet on pet.id = listing.pet_id
  left join public.pet_profiles profile on profile.pet_id = pet.id
  join public.households household on household.id = listing.household_id
  where listing.status = 'published'
  order by listing.published_at desc nulls last, listing.updated_at desc;
$$;

create or replace function public.get_pet_adoption_listing_detail(target_listing_id uuid)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.list_published_pet_adoption_listings()
  where id = target_listing_id
  union all
  select *
  from public.list_my_pet_adoption_listings(null)
  where id = target_listing_id
    and not exists (
      select 1 from public.list_published_pet_adoption_listings() where id = target_listing_id
    );
$$;

create or replace function public.list_pending_pet_adoption_listings_for_admin()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    profile.breed,
    coalesce(profile.sex, 'unknown'),
    profile.birth_date,
    profile.is_sterilized,
    household.name
  from public.pet_adoption_listings listing
  join public.pets pet on pet.id = listing.pet_id
  left join public.pet_profiles profile on profile.pet_id = pet.id
  join public.households household on household.id = listing.household_id
  where public.is_platform_admin(auth.uid())
    and listing.status = 'pending_review'
  order by listing.updated_at asc;
$$;

grant execute on function public.create_pet_adoption_listing(uuid, uuid) to authenticated;
grant execute on function public.update_pet_adoption_listing(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_pet_adoption_listing(uuid) to authenticated;
grant execute on function public.pause_pet_adoption_listing(uuid) to authenticated;
grant execute on function public.close_pet_adoption_listing(uuid) to authenticated;
grant execute on function public.review_pet_adoption_listing(uuid, text, text) to authenticated;
grant execute on function public.list_my_pet_adoption_listings(uuid) to authenticated;
grant execute on function public.list_published_pet_adoption_listings() to authenticated;
grant execute on function public.get_pet_adoption_listing_detail(uuid) to authenticated;
grant execute on function public.list_pending_pet_adoption_listings_for_admin() to authenticated;
grant execute on function public.can_manage_pet_adoption_listing(uuid, uuid) to authenticated;
grant execute on function public.can_view_pet_adoption_listing(uuid, uuid) to authenticated;
grant execute on function public.extract_pet_adoption_listing_id_from_storage_path(text) to authenticated;
