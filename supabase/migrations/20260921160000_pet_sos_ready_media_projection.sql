-- Controlled cutover. Installing this migration does NOT retire legacy clients.
create table public.pet_sos_media_rollout (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check(singleton),
  ready_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.pet_sos_media_rollout default values;
alter table public.pet_sos_media_rollout enable row level security;
revoke all on public.pet_sos_media_rollout from public,anon,authenticated;
create function public.pet_sos_ready_media_only() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select ready_only from public.pet_sos_media_rollout where singleton),true);
$$;
revoke all on function public.pet_sos_ready_media_only() from public;
grant execute on function public.pet_sos_ready_media_only() to anon,authenticated,service_role;

alter table public.pet_alert_media add column processing_version text not null default 'legacy' check(processing_version in ('legacy','sos-v1'));
alter table public.pet_alert_media add column thumbnail_path text;
alter table public.pet_alert_community_sighting_media add column thumbnail_path text;
alter table public.pet_alert_lost_pets add column owner_photo_choice text not null default 'legacy'
  check(owner_photo_choice in('legacy','include','exclude'));

create function public.guard_pet_sos_ready_metadata() returns trigger language plpgsql set search_path=public as $$
begin
  if (new.processing_version<>'legacy' or new.thumbnail_path is not null or public.pet_sos_ready_media_only())
    and auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_SERVER_MEDIA_REQUIRED'; end if;
  return new;
end;
$$;
revoke all on function public.guard_pet_sos_ready_metadata() from public,anon,authenticated;
create trigger pet_sos_external_metadata_guard before insert or update on public.pet_alert_media for each row execute function public.guard_pet_sos_ready_metadata();
create trigger pet_sos_community_metadata_guard before insert or update on public.pet_alert_community_sighting_media for each row execute function public.guard_pet_sos_ready_metadata();

-- Extend the existing finalizer without changing its public service contract.
alter function public.finalize_pet_alert_community_photo(uuid,uuid,uuid,bigint) rename to finalize_pet_alert_community_photo_base_1c3d;
revoke all on function public.finalize_pet_alert_community_photo_base_1c3d(uuid,uuid,uuid,bigint) from public,anon,authenticated,service_role;
create function public.finalize_pet_alert_community_photo(target_upload_id uuid,target_actor_id uuid,target_attempt_id uuid,target_size bigint)
returns text language plpgsql security definer set search_path=public as $$
declare path text; thumb text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  path:=public.finalize_pet_alert_community_photo_base_1c3d(target_upload_id,target_actor_id,target_attempt_id,target_size);
  thumb:=path||'.thumb.jpg';
  perform 1 from storage.objects where bucket_id='pet-alert-media' and name=thumb for share;
  if not found then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  update public.pet_alert_community_sighting_media set thumbnail_path=thumb where storage_path=path;
  return path;
end;
$$;
revoke all on function public.finalize_pet_alert_community_photo(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.finalize_pet_alert_community_photo(uuid,uuid,uuid,bigint) to service_role;

create function public.is_pet_sos_owner_photo_public(target_path text) returns boolean language sql stable security definer set search_path=public as $$
  select public.pet_sos_ready_media_only() and exists(
    select 1 from public.pet_alert_owner_photo_derivatives d
    join public.pet_alert_lost_pets a on a.id=d.alert_id
    join public.pets p on p.id=a.pet_id and p.id=d.pet_id and p.household_id=a.household_id
    join public.pet_profiles profile on profile.pet_id=p.id and profile.avatar_storage_bucket='pet-avatars' and profile.avatar_storage_path=d.source_path
    join storage.objects source on source.id=d.source_object_id and source.bucket_id='pet-avatars' and source.name=d.source_path and source.updated_at=d.source_updated_at
    where d.status='ready' and target_path in(d.display_path,d.thumbnail_path)
      and a.source_type='registered_pet' and a.share_enabled and a.owner_photo_choice<>'exclude'
      and a.status in('active','sighting_received','possible_match','found','closed')
      and (a.status in('found','closed') or a.expires_at is null or a.expires_at>now())
      and exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=d.display_path)
      and exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=d.thumbnail_path)
  );
$$;
revoke all on function public.is_pet_sos_owner_photo_public(text) from public;
grant execute on function public.is_pet_sos_owner_photo_public(text) to anon,authenticated;

alter function public.is_pet_alert_avatar_public(text,text) rename to is_pet_alert_avatar_public_legacy_1c3d;
revoke all on function public.is_pet_alert_avatar_public_legacy_1c3d(text,text) from public,anon,authenticated;
create function public.is_pet_alert_avatar_public(target_bucket text,target_path text) returns boolean language sql stable security definer set search_path=public as $$
  select not public.pet_sos_ready_media_only() and target_bucket='pet-avatars' and exists(
    select 1 from public.pet_profiles p join public.pet_alert_lost_pets a on a.pet_id=p.pet_id
    where p.avatar_storage_bucket=target_bucket and p.avatar_storage_path=target_path and a.owner_photo_choice='legacy'
      and a.share_enabled and a.status in('active','sighting_received','possible_match','found','closed')
      and (a.status in('found','closed') or a.expires_at is null or a.expires_at>now())
  );
$$;
revoke all on function public.is_pet_alert_avatar_public(text,text) from public;
grant execute on function public.is_pet_alert_avatar_public(text,text) to anon,authenticated;
drop policy pet_alert_avatars_objects_select_public on storage.objects;
create policy pet_alert_avatars_objects_select_public on storage.objects for select to anon,authenticated
  using(bucket_id='pet-avatars' and public.is_pet_alert_avatar_public(bucket_id,name));

create or replace function public.is_pet_alert_community_media_public(target_bucket text,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select target_bucket='pet-alert-media' and exists(
    select 1 from public.pet_alert_community_sighting_media m join public.pet_alert_community_sightings r on r.id=m.community_sighting_id and r.report_slug=m.report_slug
    where m.storage_bucket=target_bucket and target_path in(m.storage_path,m.thumbnail_path)
      and r.share_enabled and r.status in('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified','reunited','closed')
      and (r.status in('reunited','closed') or r.expires_at>now())
      and (not public.pet_sos_ready_media_only() or (
        m.processing_version='sos-v1' and m.thumbnail_path is not null
        and exists(select 1 from public.pet_alert_community_photo_uploads j where j.media_id=m.id and j.status='ready' and j.storage_path=m.storage_path)
        and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.storage_path)
        and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.thumbnail_path)
      ))
  );
$$;

create or replace function public.is_pet_alert_lost_media_public(target_bucket text,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select target_bucket='pet-alert-media' and (
    public.is_pet_sos_owner_photo_public(target_path) or exists(
      select 1 from public.pet_alert_media m join public.pet_alert_lost_pets a on a.id=m.lost_pet_alert_id
      where m.storage_bucket=target_bucket and target_path in(m.storage_path,m.thumbnail_path) and m.visibility='public'
        and a.source_type='external_owner' and a.share_enabled
        and a.status in('active','sighting_received','possible_match','found','closed')
        and (a.status in('found','closed') or a.expires_at is null or a.expires_at>now())
        and (not public.pet_sos_ready_media_only() or (
          m.processing_version='sos-v1' and m.thumbnail_path is not null
          and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.storage_path)
          and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.thumbnail_path)
        ))
    )
  );
$$;

drop policy pet_sos_owner_derivatives_private on storage.objects;
create policy pet_sos_owner_derivatives_read on storage.objects as restrictive for select to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1' or public.is_pet_sos_owner_photo_public(name));
create policy pet_sos_owner_derivatives_insert on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1');
create policy pet_sos_owner_derivatives_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1') with check(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1');
create policy pet_sos_owner_derivatives_delete on storage.objects as restrictive for delete to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',1)<>'owner-sos-v1');
create policy pet_sos_ready_only_insert on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'pet-alert-media' or not public.pet_sos_ready_media_only());
create policy pet_sos_ready_only_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'pet-alert-media' or not public.pet_sos_ready_media_only())
  with check(bucket_id<>'pet-alert-media' or not public.pet_sos_ready_media_only());

create function public.pet_sos_media_read_allowed(target_bucket text,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select not public.pet_sos_ready_media_only()
    or coalesce(public.can_admin_review_pet_alert_external_media(target_bucket,target_path),false);
$$;
revoke all on function public.pet_sos_media_read_allowed(text,text) from public;
grant execute on function public.pet_sos_media_read_allowed(text,text) to anon,authenticated;
create policy pet_sos_ready_only_read on storage.objects as restrictive for select to anon,authenticated
  using(bucket_id<>'pet-alert-media' or public.pet_sos_media_read_allowed(bucket_id,name));
create function public.pet_sos_community_metadata_visible(target_report uuid,target_bucket text,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select not public.pet_sos_ready_media_only() or public.is_pet_alert_community_media_public(target_bucket,target_path)
    or coalesce(public.can_manage_pet_alert_community_sighting(target_report,auth.uid()),false);
$$;
revoke all on function public.pet_sos_community_metadata_visible(uuid,text,text) from public;
grant execute on function public.pet_sos_community_metadata_visible(uuid,text,text) to anon,authenticated;
create policy pet_sos_ready_only_community_metadata on public.pet_alert_community_sighting_media as restrictive for select to anon,authenticated
  using(public.pet_sos_community_metadata_visible(community_sighting_id,storage_bucket,storage_path));

create or replace function public.list_public_pet_alert_community_media(target_report_slugs text[])
returns table(id uuid,community_sighting_id uuid,report_slug text,storage_bucket text,storage_path text,display_order integer)
language sql stable security definer set search_path=public as $$
  select m.id,m.community_sighting_id,m.report_slug,m.storage_bucket,m.storage_path,m.display_order
  from public.pet_alert_community_sighting_media m
  where m.report_slug=any(coalesce(target_report_slugs,array[]::text[]))
    and public.is_pet_alert_community_media_public(m.storage_bucket,m.storage_path)
  order by m.report_slug,m.display_order;
$$;
create or replace function public.list_public_pet_alert_lost_pet_media(target_alert_slugs text[])
returns table(alert_slug text,storage_bucket text,storage_path text)
language sql stable security definer set search_path=public as $$
  select a.alert_slug,'pet-alert-media'::text,d.display_path
  from public.pet_alert_owner_photo_derivatives d join public.pet_alert_lost_pets a on a.id=d.alert_id
  where a.alert_slug=any(coalesce(target_alert_slugs,array[]::text[])) and public.is_pet_sos_owner_photo_public(d.display_path)
  union all
  select a.alert_slug,p.avatar_storage_bucket,p.avatar_storage_path
  from public.pet_alert_lost_pets a join public.pet_profiles p on p.pet_id=a.pet_id
  where a.alert_slug=any(coalesce(target_alert_slugs,array[]::text[])) and a.share_enabled and a.owner_photo_choice='legacy'
    and a.status in('active','sighting_received','possible_match','found','closed')
    and (a.status in('found','closed') or a.expires_at is null or a.expires_at>now())
    and public.is_pet_alert_avatar_public(p.avatar_storage_bucket,p.avatar_storage_path)
    and not exists(select 1 from public.pet_alert_owner_photo_derivatives d where d.alert_id=a.id and public.is_pet_sos_owner_photo_public(d.display_path))
  union all
  select a.alert_slug,m.storage_bucket,m.storage_path from public.pet_alert_lost_pets a join public.pet_alert_media m on m.lost_pet_alert_id=a.id
  where a.alert_slug=any(coalesce(target_alert_slugs,array[]::text[])) and public.is_pet_alert_lost_media_public(m.storage_bucket,m.storage_path);
$$;

create function public.set_pet_sos_ready_media_only(enable_ready_only boolean,acknowledge_client_rollout boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if enable_ready_only is null or acknowledge_client_rollout is not true then raise exception 'PET_ALERT_ROLLOUT_ACK_REQUIRED'; end if;
  update public.pet_sos_media_rollout set ready_only=enable_ready_only,updated_at=now() where singleton;
  perform public.insert_audit_log('pet_sos_media_rollout',(select id from public.pet_sos_media_rollout where singleton),'pet_sos_ready_media_changed',jsonb_build_object('enabled',enable_ready_only),null);
end;
$$;
revoke all on function public.set_pet_sos_ready_media_only(boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_pet_sos_ready_media_only(boolean,boolean) to service_role;

create function public.publish_pet_alert_lost_pet_safe(target_alert_id uuid,include_profile_photo boolean)
returns public.pet_alert_lost_pets language plpgsql security definer set search_path=public as $$
declare result public.pet_alert_lost_pets;
begin
  if auth.uid() is null or public.can_manage_pet_alert_lost_pet(target_alert_id,auth.uid()) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  -- Serialize mode changes with publication so a no-photo choice cannot fall back to legacy.
  perform 1 from public.pet_sos_media_rollout where singleton for share;
  if not public.pet_sos_ready_media_only() then raise exception 'PET_ALERT_READY_MEDIA_NOT_ENABLED'; end if;
  if include_profile_photo is null then raise exception 'PET_ALERT_PHOTO_CONSENT_REQUIRED'; end if;
  update public.pet_alert_lost_pets set owner_photo_choice=case when include_profile_photo then 'include' else 'exclude' end where id=target_alert_id;
  result:=public.publish_pet_alert_lost_pet(target_alert_id);
  if include_profile_photo then
    if not exists(select 1 from public.pet_alert_owner_photo_derivatives d where d.alert_id=target_alert_id and public.is_pet_sos_owner_photo_public(d.display_path)) then raise exception 'PET_ALERT_PHOTO_NOT_READY'; end if;
  else
    update public.pet_alert_owner_photo_derivatives set status='failed',updated_at=now() where alert_id=target_alert_id;
    perform public.insert_audit_log('pet_alert_lost_pet',target_alert_id,'pet_alert_photo_not_shared','{}',auth.uid());
  end if;
  return result;
end;
$$;
revoke all on function public.publish_pet_alert_lost_pet_safe(uuid,boolean) from public,anon;
grant execute on function public.publish_pet_alert_lost_pet_safe(uuid,boolean) to authenticated;

-- Operational inventory is read-only. No automatic backfill, consent inference or deletion.
create function public.inspect_pet_sos_media_rollout()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  return jsonb_build_object(
    'readyOnly',public.pet_sos_ready_media_only(),
    'communityLegacy',(select count(*) from public.pet_alert_community_sighting_media where processing_version='legacy' or thumbnail_path is null),
    'externalLegacy',(select count(*) from public.pet_alert_media where processing_version='legacy' or thumbnail_path is null),
    'ownerReady',(select count(*) from public.pet_alert_owner_photo_derivatives where status='ready'),
    'ownerPending',(select count(*) from public.pet_alert_owner_photo_derivatives where status<>'ready'),
    'ownerConsentMissing',(select count(*) from public.pet_alert_lost_pets a where a.source_type='registered_pet' and a.share_enabled and a.status in('active','sighting_received','possible_match') and not exists(select 1 from public.pet_alert_owner_photo_derivatives d where d.alert_id=a.id)),
    'cleanupDryRun',true
  );
end;
$$;
revoke all on function public.inspect_pet_sos_media_rollout() from public,anon,authenticated;
grant execute on function public.inspect_pet_sos_media_rollout() to service_role;

create function public.list_pet_sos_orphan_media_candidates(result_limit integer default 100)
returns table(object_id uuid,storage_path text,object_updated_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if result_limit is null or result_limit not between 1 and 100 then raise exception 'PET_ALERT_INVALID_LIMIT'; end if;
  return query select o.id,o.name,o.updated_at from storage.objects o
  where o.bucket_id='pet-alert-media' and o.updated_at<now()-interval '24 hours'
    and (split_part(o.name,'/',1)='owner-sos-v1' or split_part(o.name,'/',2)='sos-v1')
    and not exists(select 1 from public.pet_alert_owner_photo_derivatives d where o.name in(d.display_path,d.thumbnail_path) and (d.status='ready' or (d.status='processing' and d.lease_until>now())))
    and not exists(select 1 from public.pet_alert_community_photo_uploads j where o.name in(j.storage_path,j.storage_path||'.thumb.jpg') and (j.status='ready' or (j.status='uploading' and j.lease_until>now())))
    and not exists(select 1 from public.pet_alert_community_sighting_media m where o.name in(m.storage_path,m.thumbnail_path))
    and not exists(select 1 from public.pet_alert_media m where o.name in(m.storage_path,m.thumbnail_path))
  order by o.updated_at,o.id limit result_limit;
end;
$$;
revoke all on function public.list_pet_sos_orphan_media_candidates(integer) from public,anon,authenticated;
grant execute on function public.list_pet_sos_orphan_media_candidates(integer) to service_role;

create function public.resolve_pet_sos_public_photo(target_path text)
returns text language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if not public.pet_sos_ready_media_only() then return null; end if;
  if public.is_pet_sos_owner_photo_public(target_path) then return target_path; end if;
  if exists(select 1 from public.pet_alert_community_sighting_media m
    join public.pet_alert_community_photo_uploads j on j.media_id=m.id and j.status='ready' and j.storage_path=m.storage_path
    where target_path in(m.storage_path,m.thumbnail_path) and m.processing_version='sos-v1' and m.thumbnail_path is not null
      and public.is_pet_alert_community_media_public(m.storage_bucket,m.storage_path)
      and exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.storage_path)
      and exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.thumbnail_path)) then return target_path; end if;
  if exists(select 1 from public.pet_alert_media m
    where target_path in(m.storage_path,m.thumbnail_path) and m.processing_version='sos-v1' and m.thumbnail_path is not null
      and public.is_pet_alert_lost_media_public(m.storage_bucket,m.storage_path)
      and exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.storage_path)
      and exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.thumbnail_path)) then return target_path; end if;
  return null;
end;
$$;
revoke all on function public.resolve_pet_sos_public_photo(text) from public,anon,authenticated;
grant execute on function public.resolve_pet_sos_public_photo(text) to service_role;

alter function public.prepare_pet_alert_community_photo(uuid,uuid,text,integer) rename to prepare_pet_alert_community_photo_base_1c3d;
revoke all on function public.prepare_pet_alert_community_photo_base_1c3d(uuid,uuid,text,integer) from public,anon,authenticated,service_role;
create function public.prepare_pet_alert_community_photo(target_report_id uuid,target_actor_id uuid,target_sha256 text,target_order integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare job jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  job:=public.prepare_pet_alert_community_photo_base_1c3d(target_report_id,target_actor_id,target_sha256,target_order);
  if job->>'status'='ready' and not exists(select 1 from public.pet_alert_community_sighting_media m
    where m.storage_path=job->>'storage_path' and m.thumbnail_path=m.storage_path||'.thumb.jpg'
      and exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.thumbnail_path)) then raise exception 'PET_ALERT_PHOTO_NOT_READY'; end if;
  return job;
end;
$$;
revoke all on function public.prepare_pet_alert_community_photo(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.prepare_pet_alert_community_photo(uuid,uuid,text,integer) to service_role;
