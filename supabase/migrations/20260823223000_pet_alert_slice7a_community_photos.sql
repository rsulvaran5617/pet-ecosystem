-- PET ALERT Slice 7A: optional community sighting photo gallery.
-- Photos remain in a private bucket and inherit report-level visibility/moderation.

create table public.pet_alert_community_sighting_media (
  id uuid primary key default gen_random_uuid(),
  community_sighting_id uuid not null references public.pet_alert_community_sightings (id) on delete restrict,
  report_slug text not null,
  storage_bucket text not null default 'pet-alert-media' check (storage_bucket = 'pet-alert-media'),
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 180),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  display_order integer not null check (display_order between 0 and 2),
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (community_sighting_id, display_order),
  check (storage_path like community_sighting_id::text || '/%')
);

create index pet_alert_community_sighting_media_report_idx
  on public.pet_alert_community_sighting_media (community_sighting_id, display_order);
create index pet_alert_community_sighting_media_slug_idx
  on public.pet_alert_community_sighting_media (report_slug, display_order);

create or replace function public.can_manage_pet_alert_community_sighting(target_report_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pet_alert_community_sightings report
    where report.id = target_report_id
      and (report.reporter_user_id = target_user_id or public.is_platform_admin(target_user_id))
  );
$$;

create or replace function public.count_pet_alert_community_sighting_media(target_report_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.pet_alert_community_sighting_media media
  where media.community_sighting_id = target_report_id;
$$;

create or replace function public.extract_pet_alert_community_sighting_id_from_media_path(storage_path text)
returns uuid
language sql
stable
as $$
  select case
    when split_part(storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(storage_path, '/', 1)::uuid
    else null
  end;
$$;

alter table public.pet_alert_community_sighting_media enable row level security;

create policy pet_alert_community_media_select_public
on public.pet_alert_community_sighting_media for select to anon, authenticated
using (
  exists (
    select 1 from public.pet_alert_community_sightings report
    where report.id = community_sighting_id
      and report.report_slug = pet_alert_community_sighting_media.report_slug
      and report.share_enabled
      and report.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited', 'closed')
      and (report.status in ('reunited', 'closed') or report.expires_at > now())
  )
);

create policy pet_alert_community_media_select_owner
on public.pet_alert_community_sighting_media for select to authenticated
using (public.can_manage_pet_alert_community_sighting(community_sighting_id, auth.uid()));

create policy pet_alert_community_media_insert
on public.pet_alert_community_sighting_media for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.can_manage_pet_alert_community_sighting(community_sighting_id, auth.uid())
  and public.count_pet_alert_community_sighting_media(community_sighting_id) < 3
  and exists (
    select 1 from public.pet_alert_community_sightings report
    where report.id = community_sighting_id and report.report_slug = pet_alert_community_sighting_media.report_slug
  )
);

create policy pet_alert_community_media_delete
on public.pet_alert_community_sighting_media for delete to authenticated
using (public.can_manage_pet_alert_community_sighting(community_sighting_id, auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-alert-media', 'pet-alert-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy pet_alert_community_media_objects_select
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'pet-alert-media'
  and exists (
    select 1
    from public.pet_alert_community_sighting_media media
    where media.storage_bucket = storage.objects.bucket_id
      and media.storage_path = storage.objects.name
  )
);

create policy pet_alert_community_media_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pet-alert-media'
  and public.can_manage_pet_alert_community_sighting(
    public.extract_pet_alert_community_sighting_id_from_media_path(name), auth.uid()
  )
);

create policy pet_alert_community_media_objects_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'pet-alert-media'
  and public.can_manage_pet_alert_community_sighting(
    public.extract_pet_alert_community_sighting_id_from_media_path(name), auth.uid()
  )
);

revoke all on public.pet_alert_community_sighting_media from anon, authenticated;
grant select on public.pet_alert_community_sighting_media to anon, authenticated;
grant insert, delete on public.pet_alert_community_sighting_media to authenticated;
revoke all on function public.can_manage_pet_alert_community_sighting(uuid, uuid) from public;
revoke all on function public.count_pet_alert_community_sighting_media(uuid) from public;
grant execute on function public.can_manage_pet_alert_community_sighting(uuid, uuid) to authenticated;
grant execute on function public.count_pet_alert_community_sighting_media(uuid) to authenticated;
