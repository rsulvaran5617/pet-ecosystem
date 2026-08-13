-- Foster responsible direct adoption media publication.
-- Approved protective households can publish and remove adoption photos without prior admin review.

drop policy if exists pet_adoption_listing_media_insert on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_insert
on public.pet_adoption_listing_media
for insert
to authenticated
with check (
  storage_bucket = 'pet-adoption-media'
  and media_type = 'image'
  and moderation_status in ('approved', 'pending')
  and public.can_manage_pet_adoption_listing(listing_id, auth.uid())
  and exists (
    select 1
    from public.pet_adoption_listings listing
    where listing.id = listing_id
      and listing.status in ('draft', 'rejected', 'paused', 'published')
  )
  and public.count_pet_adoption_listing_media(listing_id) < 8
);

drop policy if exists pet_adoption_listing_media_delete on public.pet_adoption_listing_media;
create policy pet_adoption_listing_media_delete
on public.pet_adoption_listing_media
for delete
to authenticated
using (
  public.is_platform_admin(auth.uid())
  or public.can_manage_pet_adoption_listing(listing_id, auth.uid())
);
