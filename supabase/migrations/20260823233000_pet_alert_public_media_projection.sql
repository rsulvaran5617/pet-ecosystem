create or replace function public.list_public_pet_alert_community_media(target_report_slugs text[])
returns table (
  id uuid,
  community_sighting_id uuid,
  report_slug text,
  storage_bucket text,
  storage_path text,
  display_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    media.id,
    media.community_sighting_id,
    media.report_slug,
    media.storage_bucket,
    media.storage_path,
    media.display_order
  from public.pet_alert_community_sighting_media media
  join public.pet_alert_community_sightings report
    on report.id = media.community_sighting_id
   and report.report_slug = media.report_slug
  where media.report_slug = any(coalesce(target_report_slugs, array[]::text[]))
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
  order by media.report_slug, media.display_order;
$$;

revoke all on function public.list_public_pet_alert_community_media(text[]) from public;
grant execute on function public.list_public_pet_alert_community_media(text[]) to anon, authenticated;
