-- Foster-3B: moderated adoption media gallery.
-- Keeps published adoption listings visible while new photos wait for admin review.

drop policy if exists pet_adoption_listing_media_select on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_select
on public.pet_adoption_listing_media
for select
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  or exists (
    select 1
    from public.pet_adoption_listings listing
    where listing.id = pet_adoption_listing_media.listing_id
      and listing.status = 'published'
      and pet_adoption_listing_media.moderation_status = 'approved'
  )
);

drop policy if exists pet_adoption_listing_media_insert on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_insert
on public.pet_adoption_listing_media
for insert
to authenticated
with check (
  storage_bucket = 'pet-adoption-media'
  and media_type = 'image'
  and moderation_status = 'pending'
  and public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  and exists (
    select 1
    from public.pet_adoption_listings listing
    where listing.id = listing_id
      and listing.status in ('draft', 'rejected', 'paused', 'published')
  )
  and (
    select count(*)
    from public.pet_adoption_listing_media existing_media
    where existing_media.listing_id = pet_adoption_listing_media.listing_id
  ) < 8
);

drop policy if exists pet_adoption_listing_media_update on public.pet_adoption_listing_media;
drop policy if exists pet_adoption_listing_media_update_admin on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_update_admin
on public.pet_adoption_listing_media
for update
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

drop policy if exists pet_adoption_listing_media_delete on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_delete
on public.pet_adoption_listing_media
for delete
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or (
    public.can_manage_pet_adoption_listing(listing_id, auth.uid())
    and moderation_status <> 'approved'
  )
);

drop policy if exists pet_adoption_media_objects_select on storage.objects;
create policy pet_adoption_media_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-adoption-media'
  and (
    public.is_platform_admin(auth.uid())
    or public.can_manage_pet_adoption_listing(public.extract_pet_adoption_listing_id_from_storage_path(name), auth.uid())
    or exists (
      select 1
      from public.pet_adoption_listing_media media
      join public.pet_adoption_listings listing on listing.id = media.listing_id
      where media.storage_bucket = bucket_id
        and media.storage_path = name
        and media.moderation_status = 'approved'
        and listing.status = 'published'
    )
  )
);

drop policy if exists pet_adoption_media_objects_delete on storage.objects;
create policy pet_adoption_media_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-adoption-media'
  and (
    public.is_platform_admin(auth.uid())
    or public.can_manage_pet_adoption_listing(public.extract_pet_adoption_listing_id_from_storage_path(name), auth.uid())
  )
);

create or replace function public.set_pet_adoption_listing_cover(target_media_id uuid)
returns public.pet_adoption_listing_media
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_media public.pet_adoption_listing_media%rowtype;
begin
  select * into target_media
  from public.pet_adoption_listing_media
  where id = target_media_id;

  if not found then
    raise exception 'adoption media not found';
  end if;

  if target_media.moderation_status = 'rejected' then
    raise exception 'rejected media cannot be used as cover';
  end if;

  if not (
    public.is_platform_admin(current_user_id)
    or public.can_manage_pet_adoption_listing(target_media.listing_id, current_user_id)
  ) then
    raise exception 'not allowed to manage adoption media cover';
  end if;

  update public.pet_adoption_listing_media
  set is_cover = false
  where listing_id = target_media.listing_id
    and id <> target_media_id;

  update public.pet_adoption_listing_media
  set is_cover = true
  where id = target_media_id
  returning * into target_media;

  return target_media;
end;
$$;

create or replace function public.review_pet_adoption_listing_media(
  target_media_id uuid,
  decision text,
  notes text default null
)
returns public.pet_adoption_listing_media
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reviewed_media public.pet_adoption_listing_media%rowtype;
  replacement_cover_id uuid;
  has_approved_cover boolean;
begin
  if not public.is_platform_admin(current_user_id) then
    raise exception 'platform admin required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid media review decision';
  end if;

  if decision = 'rejected' and nullif(trim(notes), '') is null then
    raise exception 'review notes required';
  end if;

  update public.pet_adoption_listing_media
  set moderation_status = decision,
      updated_at = now()
  where id = target_media_id
  returning * into reviewed_media;

  if not found then
    raise exception 'adoption media not found';
  end if;

  if decision = 'approved' then
    if reviewed_media.is_cover then
      update public.pet_adoption_listing_media
      set is_cover = false
      where listing_id = reviewed_media.listing_id
        and id <> reviewed_media.id;
    else
      select exists (
        select 1
        from public.pet_adoption_listing_media media
        where media.listing_id = reviewed_media.listing_id
          and media.moderation_status = 'approved'
          and media.is_cover
          and media.id <> reviewed_media.id
      ) into has_approved_cover;

      if not has_approved_cover then
        update public.pet_adoption_listing_media
        set is_cover = false
        where listing_id = reviewed_media.listing_id
          and id <> reviewed_media.id;

        update public.pet_adoption_listing_media
        set is_cover = true
        where id = reviewed_media.id
        returning * into reviewed_media;
      end if;
    end if;
  else
    if reviewed_media.is_cover then
      update public.pet_adoption_listing_media
      set is_cover = false
      where id = reviewed_media.id;

      select media.id into replacement_cover_id
      from public.pet_adoption_listing_media media
      where media.listing_id = reviewed_media.listing_id
        and media.moderation_status = 'approved'
        and media.id <> reviewed_media.id
      order by media.display_order, media.created_at
      limit 1;

      if replacement_cover_id is not null then
        update public.pet_adoption_listing_media
        set is_cover = true
        where id = replacement_cover_id;
      end if;

      select * into reviewed_media
      from public.pet_adoption_listing_media
      where id = target_media_id;
    end if;
  end if;

  return reviewed_media;
end;
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
    and (
      listing.status = 'pending_review'
      or exists (
        select 1
        from public.pet_adoption_listing_media media
        where media.listing_id = listing.id
          and media.moderation_status = 'pending'
      )
    )
  order by listing.updated_at desc, listing.created_at desc;
$$;

grant execute on function public.set_pet_adoption_listing_cover(uuid) to authenticated;
grant execute on function public.review_pet_adoption_listing_media(uuid, text, text) to authenticated;
grant execute on function public.list_pending_pet_adoption_listings_for_admin() to authenticated;
