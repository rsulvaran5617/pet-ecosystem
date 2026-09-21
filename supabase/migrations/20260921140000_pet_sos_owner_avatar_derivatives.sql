-- Private preparation only. Public projections and legacy retirement belong to 1C.3d.
create table public.pet_alert_owner_photo_derivatives (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null unique references public.pet_alert_lost_pets(id) on delete restrict,
  pet_id uuid not null references public.pets(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  source_object_id uuid not null,
  source_updated_at timestamptz not null,
  source_path text not null,
  status text not null check (status in ('processing','ready','failed')),
  attempt_id uuid not null,
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  attempt_window_started_at timestamptz not null default now(),
  lease_until timestamptz not null,
  consent_at timestamptz not null default now(),
  consent_version text not null default 'owner-avatar-derivative-v1' check (consent_version='owner-avatar-derivative-v1'),
  display_path text not null unique,
  thumbnail_path text not null unique,
  display_bytes integer check (display_bytes between 1 and 5242880),
  thumbnail_bytes integer check (thumbnail_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (display_path='owner-sos-v1/'||alert_id::text||'/'||attempt_id::text||'/display.jpg'),
  check (thumbnail_path='owner-sos-v1/'||alert_id::text||'/'||attempt_id::text||'/thumbnail.jpg'),
  check (status<>'ready' or (display_bytes is not null and thumbnail_bytes is not null))
);
create index pet_alert_owner_derivatives_actor_idx on public.pet_alert_owner_photo_derivatives(actor_id,attempt_window_started_at);
alter table public.pet_alert_owner_photo_derivatives enable row level security;
revoke all on public.pet_alert_owner_photo_derivatives from public,anon,authenticated;

create function public.prepare_pet_alert_owner_photo(target_alert_id uuid,target_actor_id uuid,photo_consent boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  alert public.pet_alert_lost_pets;
  pet public.pets;
  profile public.pet_profiles;
  source storage.objects;
  job public.pet_alert_owner_photo_derivatives;
  attempt uuid:=gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' or target_actor_id is null then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if photo_consent is not true then raise exception 'PET_ALERT_PHOTO_CONSENT_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_actor_id::text,214));
  -- Lock pet before alert, matching the pet-first order of alert creation.
  select p.* into pet from public.pets p join public.pet_alert_lost_pets a on a.pet_id=p.id where a.id=target_alert_id for update of p;
  select * into alert from public.pet_alert_lost_pets where id=target_alert_id for update;
  if alert.id is null or alert.source_type<>'registered_pet' or pet.id is null
    or pet.household_id is distinct from alert.household_id
    or public.can_manage_pet_alert_lost_pet(alert.id,target_actor_id) is not true
    or public.can_edit_pet(pet.id,target_actor_id) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if alert.share_enabled is not true or alert.status not in ('draft','active','sighting_received','possible_match')
    or alert.expires_at<=now() then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  select * into profile from public.pet_profiles where pet_id=pet.id for update;
  if profile.avatar_storage_bucket is distinct from 'pet-avatars' or profile.avatar_storage_path is null
    or split_part(profile.avatar_storage_path,'/',1)<>pet.id::text then raise exception 'PET_ALERT_PHOTO_MISSING'; end if;
  select * into source from storage.objects where bucket_id='pet-avatars' and name=profile.avatar_storage_path for share;
  if source.id is null or source.updated_at is null then raise exception 'PET_ALERT_PHOTO_MISSING'; end if;
  select * into job from public.pet_alert_owner_photo_derivatives where alert_id=alert.id for update;
  if job.status='ready' and job.source_object_id=source.id and job.source_updated_at=source.updated_at
    and exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=job.display_path)
    and exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=job.thumbnail_path) then return to_jsonb(job); end if;
  if job.status='processing' and job.lease_until>now() then raise exception 'PET_ALERT_PHOTO_BUSY'; end if;
  if (select count(*) from public.pet_alert_owner_photo_derivatives where actor_id=target_actor_id
    and attempt_window_started_at>now()-interval '1 hour' and id is distinct from job.id)>=9 then raise exception 'PET_ALERT_RATE_LIMITED'; end if;
  if job.id is null then
    insert into public.pet_alert_owner_photo_derivatives(alert_id,pet_id,actor_id,source_object_id,source_updated_at,source_path,status,attempt_id,lease_until,display_path,thumbnail_path)
    values(alert.id,pet.id,target_actor_id,source.id,source.updated_at,source.name,'processing',attempt,now()+interval '2 minutes',
      'owner-sos-v1/'||alert.id::text||'/'||attempt::text||'/display.jpg','owner-sos-v1/'||alert.id::text||'/'||attempt::text||'/thumbnail.jpg') returning * into job;
  else
    if job.attempt_count>=5 and job.attempt_window_started_at>now()-interval '1 hour' then raise exception 'PET_ALERT_RATE_LIMITED'; end if;
    update public.pet_alert_owner_photo_derivatives set pet_id=pet.id,actor_id=target_actor_id,source_object_id=source.id,source_updated_at=source.updated_at,source_path=source.name,
      status='processing',attempt_id=attempt,lease_until=now()+interval '2 minutes',consent_at=now(),updated_at=now(),
      attempt_count=case when attempt_window_started_at<=now()-interval '1 hour' then 1 else attempt_count+1 end,
      attempt_window_started_at=case when attempt_window_started_at<=now()-interval '1 hour' then now() else attempt_window_started_at end,
      display_path='owner-sos-v1/'||alert.id::text||'/'||attempt::text||'/display.jpg',
      thumbnail_path='owner-sos-v1/'||alert.id::text||'/'||attempt::text||'/thumbnail.jpg',display_bytes=null,thumbnail_bytes=null
      where id=job.id returning * into job;
  end if;
  return to_jsonb(job);
end;
$$;

create function public.finalize_pet_alert_owner_photo(target_alert_id uuid,target_actor_id uuid,target_attempt_id uuid,display_size integer,thumbnail_size integer)
returns void language plpgsql security definer set search_path=public as $$
declare alert public.pet_alert_lost_pets; pet public.pets; profile public.pet_profiles; job public.pet_alert_owner_photo_derivatives;
begin
  if auth.role() is distinct from 'service_role' or target_actor_id is null then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select p.* into pet from public.pets p join public.pet_alert_lost_pets a on a.pet_id=p.id where a.id=target_alert_id for update of p;
  select * into alert from public.pet_alert_lost_pets where id=target_alert_id for update;
  select * into profile from public.pet_profiles where pet_id=pet.id for update;
  select * into job from public.pet_alert_owner_photo_derivatives where alert_id=target_alert_id for update;
  if job.id is null or job.actor_id is distinct from target_actor_id or pet.id is distinct from job.pet_id
    or pet.household_id is distinct from alert.household_id or alert.source_type<>'registered_pet'
    or public.can_manage_pet_alert_lost_pet(alert.id,target_actor_id) is not true
    or public.can_edit_pet(pet.id,target_actor_id) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if alert.share_enabled is not true or alert.status not in ('draft','active','sighting_received','possible_match') or alert.expires_at<=now() then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  if job.attempt_id is distinct from target_attempt_id or profile.avatar_storage_bucket is distinct from 'pet-avatars'
    or profile.avatar_storage_path is distinct from job.source_path then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  perform 1 from storage.objects where id=job.source_object_id and bucket_id='pet-avatars' and name=job.source_path and updated_at=job.source_updated_at for share;
  if not found then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if job.status='ready' then return; end if;
  if job.status<>'processing' or job.lease_until<=now() then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if display_size is null or thumbnail_size is null or display_size not between 1 and 5242880 or thumbnail_size not between 1 and 5242880 then raise exception 'PET_ALERT_PHOTO_INVALID'; end if;
  if not exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=job.display_path)
    or not exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=job.thumbnail_path) then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  update public.pet_alert_owner_photo_derivatives set status='ready',display_bytes=display_size,thumbnail_bytes=thumbnail_size,updated_at=now() where id=job.id;
  perform public.insert_audit_log('pet_alert_lost_pet',alert.id,'pet_alert_owner_photo_prepared',jsonb_build_object('processing_version','sos-v1','consent_version',job.consent_version),target_actor_id);
end;
$$;

create function public.abort_pet_alert_owner_photo(target_alert_id uuid,target_actor_id uuid,target_attempt_id uuid)
returns text[] language plpgsql security definer set search_path=public as $$
declare job public.pet_alert_owner_photo_derivatives;
begin
  if auth.role() is distinct from 'service_role' or target_actor_id is null then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into job from public.pet_alert_owner_photo_derivatives where alert_id=target_alert_id for update;
  if job.id is null or job.actor_id is distinct from target_actor_id then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if job.status<>'processing' or job.attempt_id is distinct from target_attempt_id then return null; end if;
  update public.pet_alert_owner_photo_derivatives set status='failed',updated_at=now() where id=job.id;
  return array[job.display_path,job.thumbnail_path];
end;
$$;

-- No anonymous signing/reading, including ready variants, until the explicit 1C.3d projection.
create policy pet_sos_owner_derivatives_private on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1')
  with check(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1');
revoke all on function public.prepare_pet_alert_owner_photo(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.finalize_pet_alert_owner_photo(uuid,uuid,uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.abort_pet_alert_owner_photo(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_pet_alert_owner_photo(uuid,uuid,boolean) to service_role;
grant execute on function public.finalize_pet_alert_owner_photo(uuid,uuid,uuid,integer,integer) to service_role;
grant execute on function public.abort_pet_alert_owner_photo(uuid,uuid,uuid) to service_role;
