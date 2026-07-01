alter table public.pet_adoption_listings
  add column if not exists public_slug text,
  add column if not exists share_status text not null default 'disabled',
  add column if not exists share_published_at timestamptz;

alter table public.pet_adoption_listings
  drop constraint if exists pet_adoption_listings_share_status_check;

alter table public.pet_adoption_listings
  add constraint pet_adoption_listings_share_status_check
  check (share_status in ('disabled', 'enabled'));

alter table public.pet_adoption_listings
  drop constraint if exists pet_adoption_listings_public_slug_check;

alter table public.pet_adoption_listings
  add constraint pet_adoption_listings_public_slug_check
  check (public_slug is null or public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index if not exists pet_adoption_listings_public_slug_key
  on public.pet_adoption_listings(public_slug)
  where public_slug is not null;

create index if not exists pet_adoption_listings_share_public_idx
  on public.pet_adoption_listings(status, share_status, share_published_at desc);

create or replace function public.make_unique_pet_adoption_listing_slug(next_label text, target_listing_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base_slug text := public.normalize_public_slug(next_label);
  candidate_slug text := base_slug;
  suffix integer := 2;
begin
  loop
    exit when not exists (
      select 1
      from public.pet_adoption_listings as listing
      where listing.public_slug = candidate_slug
        and listing.id <> target_listing_id
    );

    candidate_slug := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  return candidate_slug;
end;
$$;

create or replace function public.set_pet_adoption_listing_public_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pet_name text;
begin
  if new.public_slug is null or trim(new.public_slug) = '' then
    select pet.name into pet_name
    from public.pets as pet
    where pet.id = new.pet_id;

    new.public_slug := public.make_unique_pet_adoption_listing_slug(
      coalesce(nullif(new.title, ''), pet_name, 'mascota'),
      new.id
    );
  else
    new.public_slug := public.make_unique_pet_adoption_listing_slug(new.public_slug, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pet_adoption_listing_public_slug on public.pet_adoption_listings;
create trigger trg_pet_adoption_listing_public_slug
before insert or update of public_slug on public.pet_adoption_listings
for each row
execute function public.set_pet_adoption_listing_public_slug();

update public.pet_adoption_listings as listing
set public_slug = public.make_unique_pet_adoption_listing_slug(
    coalesce(nullif(listing.title, ''), pet.name, 'mascota'),
    listing.id
  ),
  share_status = case when listing.status = 'published' then 'enabled' else listing.share_status end,
  share_published_at = case
    when listing.status = 'published' then coalesce(listing.share_published_at, listing.published_at, listing.updated_at)
    else listing.share_published_at
  end
from public.pets as pet
where pet.id = listing.pet_id
  and listing.public_slug is null;

alter table public.pet_adoption_listings
  alter column public_slug set not null;

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
      share_status = 'disabled',
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
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set status = 'paused',
      paused_at = now(),
      share_status = 'disabled'
  where id = target_listing_id
    and status in ('published', 'pending_review')
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
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings
  set status = 'closed',
      closed_at = now(),
      share_status = 'disabled'
  where id = target_listing_id
    and status in ('published', 'paused', 'pending_review')
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
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.is_admin_user(current_user_id) then
    raise exception 'admin role required';
  end if;

  if decision not in ('approved', 'rejected', 'paused') then
    raise exception 'invalid adoption listing review decision';
  end if;

  update public.pet_adoption_listings
  set status = case decision
        when 'approved' then 'published'
        when 'paused' then 'paused'
        else 'rejected'
      end,
      published_at = case when decision = 'approved' then coalesce(published_at, now()) else published_at end,
      paused_at = case when decision = 'paused' then now() else paused_at end,
      share_status = case when decision = 'approved' then 'enabled' else 'disabled' end,
      share_published_at = case when decision = 'approved' then coalesce(share_published_at, now()) else share_published_at end,
      reviewed_by_user_id = current_user_id,
      reviewed_at = now(),
      review_notes = nullif(trim(notes), '')
  where id = target_listing_id
    and status in ('pending_review', 'paused', 'published')
  returning * into reviewed_listing;

  if not found then
    raise exception 'listing is not ready for review';
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

drop function if exists public.get_pet_adoption_listing_detail(uuid);
drop function if exists public.list_my_pet_adoption_listings(uuid);
create function public.list_my_pet_adoption_listings(target_household_id uuid default null)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
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
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
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

drop function if exists public.list_published_pet_adoption_listings();
create function public.list_published_pet_adoption_listings()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
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
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
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
    and listing.share_status = 'enabled'
  order by listing.published_at desc nulls last, listing.updated_at desc;
$$;

create function public.get_pet_adoption_listing_detail(target_listing_id uuid)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
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

drop function if exists public.list_pending_pet_adoption_listings_for_admin();
create function public.list_pending_pet_adoption_listings_for_admin()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
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
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
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
  where public.is_admin_user(auth.uid())
    and (
      listing.status = 'pending_review'
      or exists (
        select 1
        from public.pet_adoption_listing_media media
        where media.listing_id = listing.id
          and media.moderation_status = 'pending'
      )
    )
  order by listing.updated_at asc;
$$;

create or replace function public.get_public_pet_adoption_listing_by_slug(target_slug text)
returns table (
  public_slug text,
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
  share_published_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  protective_profile_slug text,
  protective_display_name text,
  protective_mission text,
  protective_public_story text,
  protective_city text,
  protective_state_region text,
  protective_country_code text,
  contact_policy text,
  public_contact_label text,
  public_contact_value text,
  needs_summary text,
  media jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.public_slug,
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
    listing.share_published_at,
    pet.name,
    pet.species,
    pet_profile.breed,
    coalesce(pet_profile.sex, 'unknown'),
    pet_profile.birth_date,
    pet_profile.is_sterilized,
    public_profile.public_slug,
    public_profile.display_name,
    public_profile.mission,
    public_profile.public_story,
    public_profile.city,
    public_profile.state_region,
    public_profile.country_code,
    public_profile.contact_policy,
    public_profile.public_contact_label,
    public_profile.public_contact_value,
    public_profile.needs_summary,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', media.id,
          'media_type', media.media_type,
          'storage_bucket', media.storage_bucket,
          'storage_path', media.storage_path,
          'file_name', media.file_name,
          'mime_type', media.mime_type,
          'display_order', media.display_order,
          'is_cover', media.is_cover
        )
        order by media.is_cover desc, media.display_order asc, media.created_at asc
      ) filter (where media.id is not null),
      '[]'::jsonb
    ) as media
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  left join public.pet_profiles as pet_profile on pet_profile.pet_id = pet.id
  join public.households as household on household.id = listing.household_id
  join public.protective_household_profiles as protective_profile
    on protective_profile.household_id = household.id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = household.id
  left join public.pet_adoption_listing_media as media
    on media.listing_id = listing.id
    and media.moderation_status = 'approved'
  where listing.public_slug = public.normalize_public_slug(target_slug)
    and listing.status = 'published'
    and listing.share_status = 'enabled'
    and household.household_type = 'protective'
    and protective_profile.status = 'approved'
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
    and pet.status = 'active'
  group by
    listing.id,
    pet.id,
    pet_profile.pet_id,
    public_profile.id;
$$;

drop policy if exists pet_adoption_media_objects_public_select on storage.objects;
create policy pet_adoption_media_objects_public_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'pet-adoption-media'
  and exists (
    select 1
    from public.pet_adoption_listing_media media
    join public.pet_adoption_listings listing on listing.id = media.listing_id
    join public.households household on household.id = listing.household_id
    join public.protective_household_profiles protective_profile
      on protective_profile.household_id = household.id
    join public.protective_household_public_profiles public_profile
      on public_profile.household_id = household.id
    where media.storage_bucket = storage.objects.bucket_id
      and media.storage_path = storage.objects.name
      and media.moderation_status = 'approved'
      and listing.status = 'published'
      and listing.share_status = 'enabled'
      and household.household_type = 'protective'
      and protective_profile.status = 'approved'
      and public_profile.moderation_status = 'approved'
      and public_profile.is_public = true
  )
);

grant execute on function public.make_unique_pet_adoption_listing_slug(text, uuid) to authenticated;
grant execute on function public.get_public_pet_adoption_listing_by_slug(text) to anon, authenticated;
grant execute on function public.list_my_pet_adoption_listings(uuid) to authenticated;
grant execute on function public.list_published_pet_adoption_listings() to authenticated;
grant execute on function public.get_pet_adoption_listing_detail(uuid) to authenticated;
grant execute on function public.list_pending_pet_adoption_listings_for_admin() to authenticated;
