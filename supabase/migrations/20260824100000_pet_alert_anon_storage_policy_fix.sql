create or replace function public.is_pet_alert_community_media_public(
  target_bucket text,
  target_path text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket = 'pet-alert-media'
    and exists (
      select 1
      from public.pet_alert_community_sighting_media media
      join public.pet_alert_community_sightings report
        on report.id = media.community_sighting_id
       and report.report_slug = media.report_slug
      where media.storage_bucket = target_bucket
        and media.storage_path = target_path
        and report.share_enabled
        and report.status in (
          'sighting_open',
          'sheltered_by_reporter',
          'possible_owner_claim',
          'owner_verified',
          'reunited',
          'closed'
        )
        and (report.status in ('reunited', 'closed') or report.expires_at > now())
    );
$$;

drop policy if exists pet_alert_community_media_objects_select on storage.objects;
create policy pet_alert_community_media_objects_select
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'pet-alert-media'
  and public.is_pet_alert_community_media_public(bucket_id, name)
);

revoke all on function public.is_pet_alert_community_media_public(text, text) from public;
grant execute on function public.is_pet_alert_community_media_public(text, text) to anon, authenticated;
