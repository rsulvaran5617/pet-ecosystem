-- Offline maintenance only. No schedule, cutover, backfill or deletion on install.
create table public.pet_sos_media_backfills (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('community','external')),
  media_id uuid not null,
  snapshot jsonb not null,
  source_path text not null,
  source_object_id uuid not null,
  source_updated_at timestamptz not null,
  display_path text not null unique,
  thumbnail_path text not null unique,
  status text not null check(status in ('processing','ready','failed')),
  lease_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index pet_sos_backfill_processing on public.pet_sos_media_backfills(kind,media_id) where status='processing';
create index pet_sos_backfill_media_idx on public.pet_sos_media_backfills(kind,media_id,status);
create index pet_sos_backfill_source_idx on public.pet_sos_media_backfills(source_path);
alter table public.pet_sos_media_backfills enable row level security;
revoke all on public.pet_sos_media_backfills from public,anon,authenticated;

create table public.pet_sos_media_tombstones (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null unique,
  storage_path text not null unique,
  object_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pet_sos_media_tombstones enable row level security;
revoke all on public.pet_sos_media_tombstones from public,anon,authenticated;

-- Parent then metadata locks follow publication/moderation's ordering.
create function public.pet_sos_backfill_snapshot(target_kind text,target_media uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m jsonb; p jsonb; parent_id uuid; source storage.objects;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if target_kind='community' then
    select community_sighting_id into parent_id from public.pet_alert_community_sighting_media where id=target_media;
    select to_jsonb(r) into p from public.pet_alert_community_sightings r where id=parent_id for update;
    select to_jsonb(r) into m from public.pet_alert_community_sighting_media r where id=target_media and community_sighting_id=parent_id for update;
    if p->>'status' not in('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified','reunited','closed') then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  elsif target_kind='external' then
    select lost_pet_alert_id into parent_id from public.pet_alert_media where id=target_media;
    select to_jsonb(r) into p from public.pet_alert_lost_pets r where id=parent_id for update;
    select to_jsonb(r) into m from public.pet_alert_media r where id=target_media and lost_pet_alert_id=parent_id for update;
    if p->>'source_type' is distinct from 'external_owner' or m->>'visibility' is distinct from 'public'
      or p->>'status' not in('pending_review','active','sighting_received','possible_match','found','closed') then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  else raise exception 'PET_ALERT_INVALID_KIND'; end if;
  if m is null or p is null or (p->>'share_enabled')::boolean is not true
    or (p->>'status' not in('found','closed','reunited') and (p->>'expires_at')::timestamptz<=now())
    or m->>'storage_bucket' is distinct from 'pet-alert-media' then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  select * into source from storage.objects where bucket_id='pet-alert-media' and name=m->>'storage_path' for share;
  if source.id is null then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  return jsonb_build_object('media',m,'parent',p,'objectId',source.id,'objectUpdatedAt',source.updated_at);
end;
$$;
revoke all on function public.pet_sos_backfill_snapshot(text,uuid) from public,anon,authenticated,service_role;

create function public.prepare_pet_sos_media_backfill(target_kind text,target_media uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare snap jsonb; job public.pet_sos_media_backfills; job_id uuid:=gen_random_uuid(); prefix text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  snap:=public.pet_sos_backfill_snapshot(target_kind,target_media);
  if snap->'media'->>'processing_version'='sos-v1' and snap->'media'->>'thumbnail_path' is not null
    and exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=snap->'media'->>'thumbnail_path') then
    return jsonb_build_object('status','already_ready');
  end if;
  if exists(select 1 from public.pet_sos_media_backfills where kind=target_kind and media_id=target_media and status='processing' and lease_until>now()) then raise exception 'PET_ALERT_PHOTO_BUSY'; end if;
  update public.pet_sos_media_backfills set status='failed',updated_at=now() where kind=target_kind and media_id=target_media and status='processing';
  prefix:=snap->'parent'->>'id';
  insert into public.pet_sos_media_backfills(id,kind,media_id,snapshot,source_path,source_object_id,source_updated_at,display_path,thumbnail_path,status,lease_until)
    values(job_id,target_kind,target_media,snap,snap->'media'->>'storage_path',(snap->>'objectId')::uuid,(snap->>'objectUpdatedAt')::timestamptz,
      prefix||'/backfill-sos-v1/'||job_id||'/display.jpg',prefix||'/backfill-sos-v1/'||job_id||'/thumbnail.jpg','processing',now()+interval '10 minutes') returning * into job;
  perform public.insert_audit_log('pet_sos_media_backfill',job.id,'pet_sos_backfill_prepared',jsonb_build_object('kind',target_kind,'media_id',target_media),null);
  return jsonb_build_object('status','processing','id',job.id,'source_path',job.source_path,'display_path',job.display_path,'thumbnail_path',job.thumbnail_path);
end;
$$;
revoke all on function public.prepare_pet_sos_media_backfill(text,uuid) from public,anon,authenticated;
grant execute on function public.prepare_pet_sos_media_backfill(text,uuid) to service_role;

create function public.finalize_pet_sos_media_backfill(target_job uuid,display_size bigint)
returns void language plpgsql security definer set search_path=public as $$
declare job public.pet_sos_media_backfills; snap jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into job from public.pet_sos_media_backfills where id=target_job;
  if job.id is null then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if job.status='ready' then return; end if;
  snap:=public.pet_sos_backfill_snapshot(job.kind,job.media_id);
  select * into job from public.pet_sos_media_backfills where id=target_job for update;
  if job.status<>'processing' or job.lease_until<=now() or snap is distinct from job.snapshot then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if display_size is null or display_size not between 1 and 5242880 then raise exception 'PET_ALERT_PHOTO_INVALID'; end if;
  perform 1 from storage.objects where bucket_id='pet-alert-media' and name=job.display_path for share;
  if not found then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  perform 1 from storage.objects where bucket_id='pet-alert-media' and name=job.thumbnail_path for share;
  if not found then raise exception 'PET_ALERT_PHOTO_NOT_UPLOADED'; end if;
  if job.kind='community' then
    update public.pet_alert_community_sighting_media set storage_path=job.display_path,thumbnail_path=job.thumbnail_path,
      processing_version='sos-v1',file_name='foto.jpg',mime_type='image/jpeg',file_size_bytes=display_size where id=job.media_id;
  else
    update public.pet_alert_media set storage_path=job.display_path,thumbnail_path=job.thumbnail_path,
      processing_version='sos-v1',media_type='image/jpeg' where id=job.media_id;
  end if;
  update public.pet_sos_media_backfills set status='ready',updated_at=now() where id=job.id;
  perform public.insert_audit_log('pet_sos_media_backfill',job.id,'pet_sos_backfill_ready',jsonb_build_object('kind',job.kind,'media_id',job.media_id),null);
end;
$$;
revoke all on function public.finalize_pet_sos_media_backfill(uuid,bigint) from public,anon,authenticated;
grant execute on function public.finalize_pet_sos_media_backfill(uuid,bigint) to service_role;

create function public.abort_pet_sos_media_backfill(target_job uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  update public.pet_sos_media_backfills set status='failed',updated_at=now() where id=target_job and status='processing';
  if found then perform public.insert_audit_log('pet_sos_media_backfill',target_job,'pet_sos_backfill_failed','{}',null); end if;
end;
$$;
revoke all on function public.abort_pet_sos_media_backfill(uuid) from public,anon,authenticated;
grant execute on function public.abort_pet_sos_media_backfill(uuid) to service_role;

-- Keep community publication conditions in one place; only extend ready provenance.
create function public.pet_sos_community_photo_ready(target_media uuid,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.pet_alert_community_photo_uploads where media_id=target_media and status='ready' and storage_path=target_path)
    or exists(select 1 from public.pet_sos_media_backfills where kind='community' and media_id=target_media and status='ready' and display_path=target_path);
$$;
revoke all on function public.pet_sos_community_photo_ready(uuid,text) from public,anon,authenticated,service_role;

create or replace function public.is_pet_alert_community_media_public(target_bucket text,target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select target_bucket='pet-alert-media' and exists(
    select 1 from public.pet_alert_community_sighting_media m join public.pet_alert_community_sightings r on r.id=m.community_sighting_id and r.report_slug=m.report_slug
    where m.storage_bucket=target_bucket and target_path in(m.storage_path,m.thumbnail_path)
      and r.share_enabled and r.status in('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified','reunited','closed')
      and (r.status in('reunited','closed') or r.expires_at>now())
      and (not public.pet_sos_ready_media_only() or (
        m.processing_version='sos-v1' and m.thumbnail_path is not null
        and public.pet_sos_community_photo_ready(m.id,m.storage_path)
        and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.storage_path)
        and exists(select 1 from storage.objects where bucket_id=target_bucket and name=m.thumbnail_path)))
  );
$$;
create or replace function public.resolve_pet_sos_public_photo(target_path text)
returns text language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if not public.pet_sos_ready_media_only() then return null; end if;
  if public.is_pet_sos_owner_photo_public(target_path)
    or public.is_pet_alert_community_media_public('pet-alert-media',target_path)
    or public.is_pet_alert_lost_media_public('pet-alert-media',target_path) then return target_path; end if;
  return null;
end;
$$;

create policy pet_sos_backfill_no_client_write on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'backfill-sos-v1');
create policy pet_sos_backfill_no_client_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'backfill-sos-v1')
  with check(bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'backfill-sos-v1');
create policy pet_sos_backfill_no_client_delete on storage.objects as restrictive for delete to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'backfill-sos-v1');
create policy pet_sos_backfill_no_client_read on storage.objects as restrictive for select to anon,authenticated
  using(bucket_id<>'pet-alert-media' or split_part(name,'/',2)<>'backfill-sos-v1'
    or public.is_pet_alert_community_media_public(bucket_id,name) or public.is_pet_alert_lost_media_public(bucket_id,name)
    or public.can_admin_review_pet_alert_external_media(bucket_id,name));

create function public.pet_sos_media_referenced(target_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.pet_alert_media where target_path in(storage_path,thumbnail_path))
    or exists(select 1 from public.pet_alert_community_sighting_media where target_path in(storage_path,thumbnail_path))
    or exists(select 1 from public.pet_alert_owner_photo_derivatives where target_path in(display_path,thumbnail_path))
    or exists(select 1 from public.pet_alert_community_photo_uploads where target_path in(storage_path,storage_path||'.thumb.jpg'))
    or exists(select 1 from public.pet_sos_media_backfills where target_path=source_path or (target_path in(display_path,thumbnail_path) and (status='ready' or (status='processing' and lease_until>now()))));
$$;
revoke all on function public.pet_sos_media_referenced(text) from public,anon,authenticated,service_role;

-- Permanent tombstones prevent reattachment/re-upload between claim and Storage DELETE.
create function public.guard_pet_sos_retired_paths() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb:=to_jsonb(new); paths text[]; path text;
begin
  if tg_table_schema='storage' then
    if row_data->>'bucket_id'<>'pet-alert-media' then return new; end if;
    paths:=array[row_data->>'name'];
  else
    paths:=array[row_data->>'storage_path',row_data->>'display_path',row_data->>'thumbnail_path',row_data->>'source_path'];
    if tg_table_name='pet_alert_community_photo_uploads' then paths:=array_append(paths,(row_data->>'storage_path')||'.thumb.jpg'); end if;
    if tg_table_name='pet_sos_media_backfills' and row_data->>'status'='failed' then paths:=array[row_data->>'source_path']; end if;
  end if;
  for path in select distinct unnest(paths) order by 1 loop
    if path is null then continue; end if;
    perform pg_advisory_xact_lock(hashtextextended(path,214));
    if exists(select 1 from public.pet_sos_media_tombstones where storage_path=path) then raise exception 'PET_ALERT_MEDIA_RETIRED'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.guard_pet_sos_retired_paths() from public,anon,authenticated,service_role;
create trigger pet_sos_retired_paths before insert or update on storage.objects for each row execute function public.guard_pet_sos_retired_paths();
create trigger pet_sos_retired_paths before insert or update on public.pet_alert_media for each row execute function public.guard_pet_sos_retired_paths();
create trigger pet_sos_retired_paths before insert or update on public.pet_alert_community_sighting_media for each row execute function public.guard_pet_sos_retired_paths();
create trigger pet_sos_retired_paths before insert or update on public.pet_alert_owner_photo_derivatives for each row execute function public.guard_pet_sos_retired_paths();
create trigger pet_sos_retired_paths before insert or update on public.pet_alert_community_photo_uploads for each row execute function public.guard_pet_sos_retired_paths();
create trigger pet_sos_retired_paths before insert or update on public.pet_sos_media_backfills for each row execute function public.guard_pet_sos_retired_paths();

create or replace function public.list_pet_sos_orphan_media_candidates(result_limit integer default 100)
returns table(object_id uuid,storage_path text,object_updated_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if result_limit is null or result_limit not between 1 and 100 then raise exception 'PET_ALERT_INVALID_LIMIT'; end if;
  return query select o.id,o.name,o.updated_at from storage.objects o
  where o.bucket_id='pet-alert-media' and o.updated_at<now()-interval '24 hours'
    and (split_part(o.name,'/',1)='owner-sos-v1' or split_part(o.name,'/',2) in('sos-v1','backfill-sos-v1'))
    and not public.pet_sos_media_referenced(o.name)
  order by o.updated_at,o.id limit result_limit;
end;
$$;
create function public.claim_pet_sos_orphan(target_object uuid,expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare obj storage.objects; tomb public.pet_sos_media_tombstones;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into obj from storage.objects where id=target_object and bucket_id='pet-alert-media';
  if obj.id is null then
    select * into tomb from public.pet_sos_media_tombstones where object_id=target_object and object_updated_at=expected_updated_at;
    if tomb.id is null then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
    return jsonb_build_object('id',tomb.id,'storage_path',tomb.storage_path);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(obj.name,214));
  select * into obj from storage.objects where id=target_object and bucket_id='pet-alert-media';
  if obj.id is null or obj.updated_at is distinct from expected_updated_at or obj.updated_at>=now()-interval '24 hours'
    or not (split_part(obj.name,'/',1)='owner-sos-v1' or split_part(obj.name,'/',2) in('sos-v1','backfill-sos-v1'))
    or public.pet_sos_media_referenced(obj.name) then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  insert into public.pet_sos_media_tombstones(object_id,storage_path,object_updated_at) values(obj.id,obj.name,obj.updated_at)
    on conflict(object_id) do nothing;
  select * into tomb from public.pet_sos_media_tombstones where object_id=obj.id;
  perform public.insert_audit_log('pet_sos_media_tombstone',tomb.id,'pet_sos_cleanup_claimed','{}',null);
  return jsonb_build_object('id',tomb.id,'storage_path',tomb.storage_path);
end;
$$;
revoke all on function public.claim_pet_sos_orphan(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_pet_sos_orphan(uuid,timestamptz) to service_role;
create function public.finish_pet_sos_orphan_cleanup(target_tombstone uuid)
returns void language plpgsql security definer set search_path=public as $$
declare tomb public.pet_sos_media_tombstones;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  select * into tomb from public.pet_sos_media_tombstones where id=target_tombstone for update;
  if tomb.id is null then raise exception 'PET_ALERT_PHOTO_STALE'; end if;
  if exists(select 1 from storage.objects where bucket_id='pet-alert-media' and name=tomb.storage_path) then raise exception 'PET_ALERT_CLEANUP_NOT_DELETED'; end if;
  if tomb.deleted_at is not null then return; end if;
  update public.pet_sos_media_tombstones set deleted_at=now(),updated_at=now() where id=tomb.id;
  perform public.insert_audit_log('pet_sos_media_tombstone',tomb.id,'pet_sos_cleanup_completed','{}',null);
end;
$$;
revoke all on function public.finish_pet_sos_orphan_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.finish_pet_sos_orphan_cleanup(uuid) to service_role;

create function public.list_pet_sos_backfill_candidates(result_limit integer default 25)
returns table(kind text,media_id uuid) language plpgsql stable security definer set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if result_limit is null or result_limit not between 1 and 100 then raise exception 'PET_ALERT_INVALID_LIMIT'; end if;
  return query
    select 'community'::text,m.id from public.pet_alert_community_sighting_media m join public.pet_alert_community_sightings r on r.id=m.community_sighting_id
    where (m.processing_version='legacy' or m.thumbnail_path is null or not exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.thumbnail_path)) and r.share_enabled
      and r.status in('sighting_open','sheltered_by_reporter','possible_owner_claim','owner_verified','reunited','closed')
      and (r.status in('reunited','closed') or r.expires_at>now())
    union all
    select 'external'::text,m.id from public.pet_alert_media m join public.pet_alert_lost_pets a on a.id=m.lost_pet_alert_id
    where (m.processing_version='legacy' or m.thumbnail_path is null or not exists(select 1 from storage.objects where bucket_id=m.storage_bucket and name=m.thumbnail_path)) and a.source_type='external_owner' and a.share_enabled and m.visibility='public'
      and a.status in('pending_review','active','sighting_received','possible_match','found','closed')
      and (a.status in('found','closed') or a.expires_at is null or a.expires_at>now())
    order by 1,2 limit result_limit;
end;
$$;
revoke all on function public.list_pet_sos_backfill_candidates(integer) from public,anon,authenticated;
grant execute on function public.list_pet_sos_backfill_candidates(integer) to service_role;

-- Existing Owner alerts need explicit opt-in too; never infer it in bulk maintenance.
create function public.set_pet_sos_owner_photo_choice(target_alert uuid,include_photo boolean)
returns void language plpgsql security definer set search_path=public as $$
declare a public.pet_alert_lost_pets;
begin
  if auth.uid() is null or public.can_manage_pet_alert_lost_pet(target_alert,auth.uid()) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  perform 1 from public.pet_sos_media_rollout where singleton for share;
  if not public.pet_sos_ready_media_only() then raise exception 'PET_ALERT_READY_MEDIA_NOT_ENABLED'; end if;
  select * into a from public.pet_alert_lost_pets where id=target_alert for update;
  if public.can_edit_pet(a.pet_id,auth.uid()) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if a.source_type is distinct from 'registered_pet' or a.status not in('active','sighting_received','possible_match')
    or a.expires_at<=now() or not a.share_enabled then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  if include_photo is null then raise exception 'PET_ALERT_PHOTO_CONSENT_REQUIRED'; end if;
  update public.pet_alert_lost_pets set owner_photo_choice=case when include_photo then 'include' else 'exclude' end where id=target_alert;
  if include_photo then
    if not exists(select 1 from public.pet_alert_owner_photo_derivatives d where d.alert_id=target_alert and public.is_pet_sos_owner_photo_public(d.display_path)) then raise exception 'PET_ALERT_PHOTO_NOT_READY'; end if;
  else
    update public.pet_alert_owner_photo_derivatives set status='failed',updated_at=now() where alert_id=target_alert;
  end if;
  perform public.insert_audit_log('pet_alert_lost_pet',target_alert,'pet_sos_owner_photo_choice',jsonb_build_object('include',include_photo),auth.uid());
end;
$$;
revoke all on function public.set_pet_sos_owner_photo_choice(uuid,boolean) from public,anon;
grant execute on function public.set_pet_sos_owner_photo_choice(uuid,boolean) to authenticated;
