-- Foster adoption media RLS hotfix.
-- Avoid recursive RLS evaluation when enforcing the 8-photo limit on insert.

create or replace function public.count_pet_adoption_listing_media(target_listing_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.pet_adoption_listing_media media
  where media.listing_id = target_listing_id;
$$;

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
  and public.count_pet_adoption_listing_media(listing_id) < 8
);

grant execute on function public.count_pet_adoption_listing_media(uuid) to authenticated;
