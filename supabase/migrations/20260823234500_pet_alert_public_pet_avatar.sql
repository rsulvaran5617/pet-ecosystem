create or replace function public.is_pet_alert_avatar_public(target_bucket text, target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket = 'pet-avatars'
    and exists (
      select 1
      from public.pet_profiles profile
      join public.pet_alert_lost_pets alert on alert.pet_id = profile.pet_id
      where profile.avatar_storage_bucket = target_bucket
        and profile.avatar_storage_path = target_path
        and alert.share_enabled
        and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
        and (alert.status in ('found', 'closed') or alert.expires_at is null or alert.expires_at > now())
    );
$$;

create or replace function public.list_public_pet_alert_lost_pet_media(target_alert_slugs text[])
returns table (
  alert_slug text,
  storage_bucket text,
  storage_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select alert.alert_slug, profile.avatar_storage_bucket, profile.avatar_storage_path
  from public.pet_alert_lost_pets alert
  join public.pet_profiles profile on profile.pet_id = alert.pet_id
  where alert.alert_slug = any(coalesce(target_alert_slugs, array[]::text[]))
    and alert.share_enabled
    and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
    and (alert.status in ('found', 'closed') or alert.expires_at is null or alert.expires_at > now())
    and profile.avatar_storage_bucket = 'pet-avatars'
    and profile.avatar_storage_path is not null;
$$;

drop policy if exists pet_alert_avatars_objects_select_public on storage.objects;
create policy pet_alert_avatars_objects_select_public
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'pet-avatars'
  and public.is_pet_alert_avatar_public(bucket_id, name)
);

revoke all on function public.is_pet_alert_avatar_public(text, text) from public;
revoke all on function public.list_public_pet_alert_lost_pet_media(text[]) from public;
grant execute on function public.is_pet_alert_avatar_public(text, text) to anon, authenticated;
grant execute on function public.list_public_pet_alert_lost_pet_media(text[]) to anon, authenticated;
