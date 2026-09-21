-- Additive rollout: legacy uploads remain available until compatible clients are adopted.
alter table public.pet_alert_community_sighting_media
  add column processing_version text not null default 'legacy'
  check (processing_version in ('legacy', 'sos-v1'));

create table public.pet_alert_community_photo_uploads (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.pet_alert_community_sightings(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  display_order integer not null check (display_order between 0 and 2),
  status text not null check (status in ('uploading', 'ready', 'failed')),
  attempt_id uuid not null,
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  lease_until timestamptz not null,
  storage_path text not null unique,
  media_id uuid references public.pet_alert_community_sighting_media(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, actor_id, display_order, source_sha256),
  check (storage_path = report_id::text || '/sos-v1/' || attempt_id::text || '.jpg')
);
create index pet_alert_photo_uploads_actor_time_idx on public.pet_alert_community_photo_uploads(actor_id, created_at desc);
create index pet_alert_photo_uploads_report_lease_idx on public.pet_alert_community_photo_uploads(report_id, display_order, lease_until) where status = 'uploading';
alter table public.pet_alert_community_photo_uploads enable row level security;
revoke all on public.pet_alert_community_photo_uploads from public, anon, authenticated;

create function public.prepare_pet_alert_community_photo(target_report_id uuid, target_actor_id uuid, target_sha256 text, target_order integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  report public.pet_alert_community_sightings;
  job public.pet_alert_community_photo_uploads;
  attempt uuid := gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if target_actor_id is null or target_report_id is null or target_sha256 is null
    or target_sha256 !~ '^[a-f0-9]{64}$' or target_order is null or target_order not between 0 and 2
    then raise exception 'PET_ALERT_PHOTO_INVALID'; end if;
  -- Serialize the actor quota across reports, then reserve the report slot.
  perform pg_advisory_xact_lock(hashtextextended(target_actor_id::text, 213));
  select * into report from public.pet_alert_community_sightings where id=target_report_id for update;
  if report.id is null or public.can_manage_pet_alert_community_sighting(report.id,target_actor_id) is not true
    then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if report.status not in ('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified') or report.expires_at <= now()
    then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  select * into job from public.pet_alert_community_photo_uploads
    where report_id=report.id and actor_id=target_actor_id and display_order=target_order and source_sha256=target_sha256 for update;
  if job.status='ready' then
    if job.media_id is null then raise exception 'PET_ALERT_PHOTO_REMOVED'; end if;
    return jsonb_build_object('status','ready','id',job.id,'attempt_id',job.attempt_id,'storage_path',job.storage_path);
  end if;
  if job.status='uploading' and job.lease_until > now() then raise exception 'PET_ALERT_PHOTO_BUSY'; end if;
  if exists(select 1 from public.pet_alert_community_sighting_media where community_sighting_id=report.id and display_order=target_order)
    or exists(select 1 from public.pet_alert_community_photo_uploads where report_id=report.id and display_order=target_order
      and status='uploading' and lease_until>now() and id is distinct from job.id)
    then raise exception 'PET_ALERT_PHOTO_SLOT_TAKEN'; end if;
  if job.id is null then
    if (select count(*) from public.pet_alert_community_photo_uploads where actor_id=target_actor_id and created_at>now()-interval '1 hour') >= 9
      then raise exception 'PET_ALERT_RATE_LIMITED'; end if;
    insert into public.pet_alert_community_photo_uploads(report_id,actor_id,source_sha256,display_order,status,attempt_id,lease_until,storage_path)
      values(report.id,target_actor_id,target_sha256,target_order,'uploading',attempt,now()+interval '2 minutes',report.id::text||'/sos-v1/'||attempt::text||'.jpg') returning * into job;
  else
    if job.attempt_count>=5 then raise exception 'PET_ALERT_RATE_LIMITED'; end if;
    update public.pet_alert_community_photo_uploads set status='uploading',attempt_id=attempt,attempt_count=attempt_count+1,
      lease_until=now()+interval '2 minutes',storage_path=report.id::text||'/sos-v1/'||attempt::text||'.jpg',updated_at=now()
      where id=job.id returning * into job;
  end if;
  return jsonb_build_object('status','uploading','id',job.id,'attempt_id',job.attempt_id,'storage_path',job.storage_path);
end;
$$;

create function public.finalize_pet_alert_community_photo(target_upload_id uuid, target_actor_id uuid, target_attempt_id uuid, target_size bigint)
returns text language plpgsql security definer set search_path = public as $$
declare
  report public.pet_alert_community_sightings;
  job public.pet_alert_community_photo_uploads;
  new_media_id uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into job from public.pet_alert_community_photo_uploads where id=target_upload_id;
  select * into report from public.pet_alert_community_sightings where id=job.report_id for update;
  select * into job from public.pet_alert_community_photo_uploads where id=target_upload_id for update;
  if job.id is null or target_actor_id is null or job.actor_id is distinct from target_actor_id
    or public.can_manage_pet_alert_community_sighting(job.report_id,target_actor_id) is not true
    then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if job.attempt_id is distinct from target_attempt_id then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if report.status not in ('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified') or report.expires_at<=now()
    then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  if job.status='ready' and job.media_id is not null then return job.storage_path; end if;
  if job.status<>'uploading' or job.lease_until<=now() then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if target_size is null or target_size<1 or target_size>5242880 then raise exception 'PET_ALERT_PHOTO_INVALID'; end if;
  if not exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=job.storage_path)
    then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  insert into public.pet_alert_community_sighting_media(community_sighting_id,report_slug,storage_path,file_name,mime_type,file_size_bytes,display_order,created_by_user_id,processing_version)
    values(report.id,report.report_slug,job.storage_path,'foto.jpg','image/jpeg',target_size,job.display_order,job.actor_id,'sos-v1') returning id into new_media_id;
  update public.pet_alert_community_photo_uploads set status='ready',media_id=new_media_id,updated_at=now() where id=job.id;
  perform public.insert_audit_log('pet_alert_community_sighting_media',new_media_id,'pet_alert_photo_sanitized',jsonb_build_object('report_id',report.id,'processing_version','sos-v1'),job.actor_id);
  return job.storage_path;
end;
$$;

create function public.abort_pet_alert_community_photo(target_upload_id uuid, target_actor_id uuid, target_attempt_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare job public.pet_alert_community_photo_uploads;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into job from public.pet_alert_community_photo_uploads where id=target_upload_id for update;
  if job.id is null or target_actor_id is null or job.actor_id is distinct from target_actor_id then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  -- A late/uncertain request must never delete an already published or newer attempt.
  if job.status<>'uploading' or job.attempt_id is distinct from target_attempt_id then return null; end if;
  update public.pet_alert_community_photo_uploads set status='failed',updated_at=now() where id=job.id;
  return job.storage_path;
end;
$$;

create function public.guard_pet_alert_sanitized_media() returns trigger language plpgsql set search_path=public as $$
begin
  if (new.processing_version<>'legacy' or split_part(new.storage_path,'/',2)='sos-v1')
    and auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_SERVER_MEDIA_REQUIRED'; end if;
  return new;
end;
$$;
create trigger pet_alert_sanitized_media_guard before insert or update on public.pet_alert_community_sighting_media
  for each row execute function public.guard_pet_alert_sanitized_media();

-- Restrictive policies protect the reserved namespace even if other permissive policies exist.
create policy pet_sos_media_server_insert on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'sos-v1');
create policy pet_sos_media_server_update on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'sos-v1')
  with check (bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'sos-v1');
create policy pet_sos_media_server_delete on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'sos-v1');
create policy pet_sos_media_ready_read on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'sos-v1'
    or public.is_pet_alert_community_media_public(bucket_id,name));

revoke all on function public.prepare_pet_alert_community_photo(uuid,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.finalize_pet_alert_community_photo(uuid,uuid,uuid,bigint) from public,anon,authenticated;
revoke all on function public.abort_pet_alert_community_photo(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.guard_pet_alert_sanitized_media() from public,anon,authenticated;
grant execute on function public.prepare_pet_alert_community_photo(uuid,uuid,text,integer) to service_role;
grant execute on function public.finalize_pet_alert_community_photo(uuid,uuid,uuid,bigint) to service_role;
grant execute on function public.abort_pet_alert_community_photo(uuid,uuid,uuid) to service_role;
