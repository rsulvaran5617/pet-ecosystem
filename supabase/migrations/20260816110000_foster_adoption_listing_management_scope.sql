-- Foster adoption listing management scope repair.
-- Lets an approved protective household manage a listing when it owns the
-- listing or currently holds custody of the pet attached to the listing.

create or replace function public.can_manage_pet_adoption_listing(target_listing_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_adoption_listings as listing
    join public.pets as pet
      on pet.id = listing.pet_id
    where listing.id = target_listing_id
      and (
        (
          public.can_manage_household(listing.household_id, target_user_id)
          and public.is_approved_protective_household(listing.household_id)
        )
        or (
          public.can_manage_household(pet.household_id, target_user_id)
          and public.is_approved_protective_household(pet.household_id)
        )
      )
  );
$$;

comment on function public.can_manage_pet_adoption_listing(uuid, uuid) is
  'Allows approved protective household admins to manage adoption listings by listing household or current protective pet custody.';

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

  update public.pet_adoption_listings as listing
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
      status = case when listing.status = 'rejected' then 'draft' else listing.status end,
      share_status = case when listing.status = 'published' then 'enabled' else listing.share_status end,
      review_notes = case when listing.status = 'rejected' then null else listing.review_notes end
  where listing.id = target_listing_id
    and listing.status in ('draft', 'rejected', 'paused', 'pending_review', 'published')
  returning * into updated_listing;

  if not found then
    raise exception 'listing cannot be edited in its current status';
  end if;

  return updated_listing;
end;
$$;

drop function if exists public.submit_pet_adoption_listing(uuid);
drop function if exists public.submit_pet_adoption_listing(uuid, boolean);

create function public.submit_pet_adoption_listing(
  target_listing_id uuid,
  responsibility_acknowledged boolean default false
)
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

  if responsibility_acknowledged is not true then
    raise exception 'Debes aceptar la responsabilidad sobre el contenido antes de publicar.';
  end if;

  if not public.can_manage_pet_adoption_listing(target_listing_id, current_user_id) then
    raise exception 'listing management permission required';
  end if;

  update public.pet_adoption_listings as listing
  set status = 'published',
      share_status = 'enabled',
      share_published_at = coalesce(listing.share_published_at, now()),
      published_at = coalesce(listing.published_at, now()),
      paused_at = null,
      reviewed_by_user_id = null,
      reviewed_at = null,
      review_notes = 'Publicado por familia protectora aprobada bajo responsabilidad propia.',
      responsibility_acknowledged_at = now(),
      responsibility_acknowledged_by_user_id = current_user_id
  where listing.id = target_listing_id
    and listing.status in ('draft', 'rejected', 'paused', 'pending_review', 'published')
    and nullif(trim(listing.title), '') is not null
    and nullif(trim(listing.city), '') is not null
    and exists (
      select 1
      from public.households as household
      join public.protective_household_profiles as protective_profile
        on protective_profile.household_id = household.id
      where household.id = listing.household_id
        and household.household_type = 'protective'
        and protective_profile.status = 'approved'
    )
  returning * into submitted_listing;

  if not found then
    raise exception 'La publicacion no esta lista o la familia protectora no esta aprobada.';
  end if;

  update public.pet_adoption_listing_media
  set moderation_status = 'approved',
      updated_at = now()
  where listing_id = target_listing_id
    and moderation_status = 'pending';

  return submitted_listing;
end;
$$;

grant execute on function public.can_manage_pet_adoption_listing(uuid, uuid) to authenticated;
grant execute on function public.update_pet_adoption_listing(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_pet_adoption_listing(uuid, boolean) to authenticated;
