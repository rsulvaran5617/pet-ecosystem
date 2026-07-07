-- Fix ambiguous "id" references when loading adoption listing detail.
-- The previous function filtered derived tables with `where id = ...`, which
-- can be ambiguous because the returned table also exposes an `id` column.

create or replace function public.get_pet_adoption_listing_detail(target_listing_id uuid)
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
  select published_listing.*
  from public.list_published_pet_adoption_listings() as published_listing
  where published_listing.id = target_listing_id
  union all
  select owned_listing.*
  from public.list_my_pet_adoption_listings(null) as owned_listing
  where owned_listing.id = target_listing_id
    and not exists (
      select 1
      from public.list_published_pet_adoption_listings() as existing_published_listing
      where existing_published_listing.id = target_listing_id
    );
$$;

grant execute on function public.get_pet_adoption_listing_detail(uuid) to authenticated;
