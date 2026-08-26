alter table public.pet_alert_lost_pets
  alter column pet_id drop not null,
  alter column household_id drop not null,
  alter column created_by_user_id drop not null;

alter table public.pet_alert_lost_pets
  drop constraint if exists pet_alert_lost_pets_status_check;

alter table public.pet_alert_lost_pets
  add column source_type text not null default 'registered_pet'
    check (source_type in ('registered_pet', 'external_owner')),
  add column external_reporter_id uuid,
  add column pet_breed text check (pet_breed is null or char_length(trim(pet_breed)) <= 120),
  add column apparent_size text check (apparent_size is null or apparent_size in ('small', 'medium', 'large', 'unknown')),
  add column apparent_sex text check (apparent_sex is null or apparent_sex in ('female', 'male', 'unknown')),
  add column primary_color text check (primary_color is null or char_length(trim(primary_color)) <= 80),
  add column terms_version text,
  add column privacy_version text,
  add column consented_at timestamptz,
  add constraint pet_alert_lost_pets_status_check check (
    status in (
      'draft', 'pending_verification', 'pending_review', 'active', 'sighting_received',
      'possible_match', 'paused', 'found', 'closed', 'withdrawn', 'rejected', 'expired', 'flagged'
    )
  );

create table public.pet_alert_external_reporters (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique check (email_normalized = lower(trim(email_normalized)) and char_length(email_normalized) between 3 and 254),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 120),
  contact_phone text check (contact_phone is null or char_length(trim(contact_phone)) <= 40),
  preferred_contact_mode text not null default 'email' check (preferred_contact_mode in ('email', 'phone', 'private')),
  publish_name boolean not null default false,
  publish_email boolean not null default false,
  publish_phone boolean not null default false,
  email_verified_at timestamptz,
  terms_version text not null,
  privacy_version text not null,
  consented_at timestamptz not null,
  linked_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not publish_phone or contact_phone is not null)
);

alter table public.pet_alert_lost_pets
  add constraint pet_alert_lost_pets_external_reporter_fk
  foreign key (external_reporter_id) references public.pet_alert_external_reporters (id) on delete restrict,
  add constraint pet_alert_lost_pets_source_check check (
    (
      source_type = 'registered_pet'
      and pet_id is not null
      and household_id is not null
      and created_by_user_id is not null
      and external_reporter_id is null
    )
    or (
      source_type = 'external_owner'
      and pet_id is null
      and household_id is null
      and created_by_user_id is null
      and external_reporter_id is not null
    )
  );

create table public.pet_alert_external_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  external_reporter_id uuid not null references public.pet_alert_external_reporters (id) on delete restrict,
  purpose text not null check (purpose in ('publish', 'recover', 'critical_action', 'link_account')),
  code_hash text not null check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  resend_count integer not null default 0 check (resend_count between 0 and 3),
  request_fingerprint_hash text not null check (char_length(request_fingerprint_hash) = 64),
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.pet_alert_external_access_tokens (
  id uuid primary key default gen_random_uuid(),
  external_reporter_id uuid not null references public.pet_alert_external_reporters (id) on delete restrict,
  lost_pet_alert_id uuid not null references public.pet_alert_lost_pets (id) on delete restrict,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  rotated_from_id uuid references public.pet_alert_external_access_tokens (id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index pet_alert_external_challenges_reporter_idx
  on public.pet_alert_external_verification_challenges (external_reporter_id, purpose, created_at desc);
create index pet_alert_external_challenges_expiry_idx
  on public.pet_alert_external_verification_challenges (expires_at)
  where consumed_at is null and revoked_at is null;
create index pet_alert_external_challenges_fingerprint_idx
  on public.pet_alert_external_verification_challenges (request_fingerprint_hash, created_at desc);
create index pet_alert_external_tokens_alert_idx
  on public.pet_alert_external_access_tokens (lost_pet_alert_id, expires_at desc);
create index pet_alert_lost_pets_external_queue_idx
  on public.pet_alert_lost_pets (status, created_at desc)
  where source_type = 'external_owner';

alter table public.pet_alert_external_reporters enable row level security;
alter table public.pet_alert_external_verification_challenges enable row level security;
alter table public.pet_alert_external_access_tokens enable row level security;

create policy pet_alert_external_reporters_select_admin
on public.pet_alert_external_reporters for select to authenticated
using (public.is_platform_admin(auth.uid()));

create policy pet_alert_external_challenges_select_admin
on public.pet_alert_external_verification_challenges for select to authenticated
using (public.is_platform_admin(auth.uid()));

create policy pet_alert_external_tokens_select_admin
on public.pet_alert_external_access_tokens for select to authenticated
using (public.is_platform_admin(auth.uid()));

create or replace function public.consume_pet_alert_external_challenge(
  target_challenge_id uuid,
  submitted_code_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_challenge public.pet_alert_external_verification_challenges;
begin
  if auth.role() <> 'service_role' then
    raise exception 'PET_ALERT_SERVICE_ROLE_REQUIRED';
  end if;

  select * into selected_challenge
  from public.pet_alert_external_verification_challenges
  where id = target_challenge_id
  for update;

  if selected_challenge.id is null
    or selected_challenge.purpose <> 'publish'
    or selected_challenge.consumed_at is not null
    or selected_challenge.revoked_at is not null
    or selected_challenge.expires_at <= now()
    or selected_challenge.attempt_count >= 5 then
    raise exception 'PET_ALERT_VERIFICATION_INVALID';
  end if;

  if selected_challenge.code_hash <> submitted_code_hash then
    update public.pet_alert_external_verification_challenges
    set attempt_count = least(attempt_count + 1, 5)
    where id = selected_challenge.id;
    return null;
  end if;

  update public.pet_alert_external_verification_challenges
  set consumed_at = now(), attempt_count = attempt_count + 1
  where id = selected_challenge.id;

  update public.pet_alert_external_reporters
  set email_verified_at = now(), updated_at = now()
  where id = selected_challenge.external_reporter_id;

  return selected_challenge.external_reporter_id;
end;
$$;

create or replace function public.create_external_pet_alert_report(
  target_reporter_id uuid,
  next_pet_name text,
  next_pet_species text,
  next_pet_breed text,
  next_apparent_size text,
  next_apparent_sex text,
  next_primary_color text,
  next_last_seen_at timestamptz,
  next_last_seen_city text,
  next_last_seen_region text,
  next_last_seen_country text,
  next_last_seen_reference text,
  next_public_description text,
  next_distinctive_marks text,
  next_behavior_notes text,
  next_medical_public_notes text,
  next_terms_version text,
  next_privacy_version text
)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_reporter public.pet_alert_external_reporters;
  created_alert public.pet_alert_lost_pets;
  generated_slug text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'PET_ALERT_SERVICE_ROLE_REQUIRED';
  end if;

  select * into selected_reporter
  from public.pet_alert_external_reporters
  where id = target_reporter_id
    and email_verified_at is not null
    and terms_version = next_terms_version
    and privacy_version = next_privacy_version;

  if selected_reporter.id is null then
    raise exception 'PET_ALERT_REPORTER_NOT_VERIFIED';
  end if;

  generated_slug := coalesce(nullif(trim(both '-' from lower(regexp_replace(trim(next_pet_name), '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'pet')
    || '-' || substr(encode(gen_random_bytes(8), 'hex'), 1, 12);

  insert into public.pet_alert_lost_pets (
    source_type, external_reporter_id, status, alert_slug, pet_name, pet_species,
    pet_breed, apparent_size, apparent_sex, primary_color, last_seen_at,
    last_seen_city, last_seen_region, last_seen_country, last_seen_reference,
    location_precision, public_description, distinctive_marks, behavior_notes,
    medical_public_notes, contact_mode, share_enabled, terms_version,
    privacy_version, consented_at
  ) values (
    'external_owner', selected_reporter.id, 'pending_review', generated_slug,
    trim(next_pet_name), trim(next_pet_species), nullif(trim(next_pet_breed), ''),
    next_apparent_size, next_apparent_sex, nullif(trim(next_primary_color), ''),
    next_last_seen_at, trim(next_last_seen_city), nullif(trim(next_last_seen_region), ''),
    trim(next_last_seen_country), nullif(trim(next_last_seen_reference), ''),
    'approximate', trim(next_public_description), nullif(trim(next_distinctive_marks), ''),
    nullif(trim(next_behavior_notes), ''), nullif(trim(next_medical_public_notes), ''),
    'private', true, next_terms_version, next_privacy_version, now()
  ) returning * into created_alert;

  insert into public.pet_alert_status_history (
    lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason
  ) values (created_alert.id, null, 'pending_review', null, 'External owner report submitted after email verification');

  return created_alert;
end;
$$;

create or replace function public.list_pending_external_pet_alert_reports()
returns table (
  alert_id uuid,
  alert_slug text,
  pet_name text,
  pet_species text,
  pet_breed text,
  last_seen_at timestamptz,
  city text,
  region text,
  country text,
  location_reference text,
  public_description text,
  distinctive_marks text,
  contact_name text,
  contact_email text,
  photo_storage_bucket text,
  photo_storage_path text,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'PET_ALERT_ADMIN_REQUIRED';
  end if;

  return query
  select alert.id, alert.alert_slug, alert.pet_name, alert.pet_species, alert.pet_breed,
    alert.last_seen_at, alert.last_seen_city, alert.last_seen_region, alert.last_seen_country,
    alert.last_seen_reference, alert.public_description, alert.distinctive_marks,
    reporter.contact_name, reporter.email_normalized, cover.storage_bucket, cover.storage_path, alert.created_at
  from public.pet_alert_lost_pets alert
  join public.pet_alert_external_reporters reporter on reporter.id = alert.external_reporter_id
  left join lateral (
    select media.storage_bucket, media.storage_path
    from public.pet_alert_media media
    where media.lost_pet_alert_id = alert.id
    order by media.created_at asc
    limit 1
  ) cover on true
  where alert.source_type = 'external_owner' and alert.status = 'pending_review'
  order by alert.created_at asc;
end;
$$;

create or replace function public.review_external_pet_alert_report(
  target_alert_id uuid,
  decision text,
  decision_reason text
)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reviewed_alert public.pet_alert_lost_pets;
  next_status text;
begin
  if not public.is_platform_admin(current_user_id) then
    raise exception 'PET_ALERT_ADMIN_REQUIRED';
  end if;
  if decision not in ('approve', 'reject') then
    raise exception 'PET_ALERT_INVALID_DECISION';
  end if;
  if char_length(trim(coalesce(decision_reason, ''))) < 5 then
    raise exception 'PET_ALERT_DECISION_REASON_REQUIRED';
  end if;

  if decision = 'approve' and not exists (
    select 1 from public.pet_alert_media media
    where media.lost_pet_alert_id = target_alert_id
      and media.visibility = 'public'
  ) then
    raise exception 'PET_ALERT_EXTERNAL_PHOTO_REQUIRED';
  end if;

  next_status := case when decision = 'approve' then 'active' else 'rejected' end;
  update public.pet_alert_lost_pets
  set status = next_status,
      published_at = case when decision = 'approve' then now() else null end,
      expires_at = case when decision = 'approve' then now() + interval '30 days' else null end,
      updated_at = now()
  where id = target_alert_id
    and source_type = 'external_owner'
    and status = 'pending_review'
  returning * into reviewed_alert;

  if reviewed_alert.id is null then
    raise exception 'PET_ALERT_EXTERNAL_REPORT_NOT_PENDING';
  end if;

  insert into public.pet_alert_status_history (
    lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason
  ) values (
    reviewed_alert.id, 'pending_review', next_status, current_user_id, trim(decision_reason)
  );

  perform public.insert_audit_log(
    'pet_alert_lost_pet', reviewed_alert.id, 'pet_alert_external_reviewed',
    jsonb_build_object('decision', decision, 'reason', trim(decision_reason)), current_user_id
  );
  return reviewed_alert;
end;
$$;

create or replace function public.list_public_pet_alert_lost_pet_media(target_alert_slugs text[])
returns table (alert_slug text, storage_bucket text, storage_path text)
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
    and profile.avatar_storage_path is not null

  union all

  select alert.alert_slug, media.storage_bucket, media.storage_path
  from public.pet_alert_lost_pets alert
  join public.pet_alert_media media on media.lost_pet_alert_id = alert.id
  where alert.alert_slug = any(coalesce(target_alert_slugs, array[]::text[]))
    and alert.source_type = 'external_owner'
    and alert.share_enabled
    and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
    and (alert.status in ('found', 'closed') or alert.expires_at is null or alert.expires_at > now())
    and media.visibility = 'public';
$$;

create or replace function public.is_pet_alert_lost_media_public(target_bucket text, target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket = 'pet-alert-media' and exists (
    select 1
    from public.pet_alert_media media
    join public.pet_alert_lost_pets alert on alert.id = media.lost_pet_alert_id
    where media.storage_bucket = target_bucket
      and media.storage_path = target_path
      and media.visibility = 'public'
      and alert.source_type = 'external_owner'
      and alert.share_enabled
      and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
      and (alert.status in ('found', 'closed') or alert.expires_at is null or alert.expires_at > now())
  );
$$;

drop policy if exists pet_alert_lost_media_objects_select_public on storage.objects;
create policy pet_alert_lost_media_objects_select_public
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'pet-alert-media'
  and public.is_pet_alert_lost_media_public(bucket_id, name)
);

create or replace function public.can_admin_review_pet_alert_external_media(target_bucket text, target_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(auth.uid()) and target_bucket = 'pet-alert-media' and exists (
    select 1
    from public.pet_alert_media media
    join public.pet_alert_lost_pets alert on alert.id = media.lost_pet_alert_id
    where media.storage_bucket = target_bucket
      and media.storage_path = target_path
      and alert.source_type = 'external_owner'
      and alert.status = 'pending_review'
  );
$$;

create policy pet_alert_external_media_objects_select_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'pet-alert-media'
  and public.can_admin_review_pet_alert_external_media(bucket_id, name)
);

create or replace function public.get_public_pet_alert_lost_pet_by_slug(target_alert_slug text)
returns table (
  alert_slug text, status text, pet_name text, pet_species text, pet_breed text, photo_url text,
  last_seen_at timestamptz, last_seen_city text, last_seen_region text, last_seen_country text,
  last_seen_reference text, public_description text, distinctive_marks text, behavior_notes text,
  medical_public_notes text, published_at timestamptz, expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select alert.alert_slug, alert.status, alert.pet_name, alert.pet_species,
    coalesce(profile.breed, alert.pet_breed), null::text,
    alert.last_seen_at, alert.last_seen_city, alert.last_seen_region, alert.last_seen_country,
    alert.last_seen_reference, alert.public_description, alert.distinctive_marks,
    alert.behavior_notes, alert.medical_public_notes, alert.published_at, alert.expires_at
  from public.pet_alert_lost_pets alert
  left join public.pet_profiles profile on profile.pet_id = alert.pet_id
  where alert.alert_slug = lower(trim(target_alert_slug))
    and alert.share_enabled
    and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
    and (alert.expires_at is null or alert.expires_at > now() or alert.status in ('found', 'closed'));
$$;

create or replace function public.list_public_pet_alert_directory(
  filter_view text default 'lost', filter_query text default null, filter_city text default null,
  filter_species text default null, result_limit integer default 18, result_offset integer default 0
)
returns table (
  event_type text, public_slug text, public_path text, status text, status_group text,
  title text, species text, breed text, city text, region text, country text,
  occurred_at timestamptz, published_at timestamptz, updated_at timestamptz,
  summary text, location_reference text, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with public_events as (
    select 'lost_pet'::text as event_type, alert.alert_slug as public_slug,
      ('/pet-alert/mascota-perdida/' || alert.alert_slug)::text as public_path, alert.status,
      case when alert.status = 'found' then 'found' else 'active' end::text as status_group,
      alert.pet_name as title, alert.pet_species as species,
      coalesce(profile.breed, alert.pet_breed) as breed,
      alert.last_seen_city as city, alert.last_seen_region as region,
      alert.last_seen_country as country, alert.last_seen_at as occurred_at,
      alert.published_at, alert.updated_at, alert.public_description as summary,
      alert.last_seen_reference as location_reference
    from public.pet_alert_lost_pets alert
    left join public.pet_profiles profile on profile.pet_id = alert.pet_id
    where alert.share_enabled
      and alert.status in ('active', 'sighting_received', 'possible_match', 'found')
      and (alert.status = 'found' or alert.expires_at is null or alert.expires_at > now())
    union all
    select 'community_sighting'::text, report.report_slug,
      ('/pet-alert/mascota-vista/' || report.report_slug)::text, report.status,
      case when report.status = 'reunited' then 'found' else 'active' end::text,
      report.animal_species, report.animal_species, report.apparent_breed,
      report.city, report.region, report.country, report.sighted_at, report.published_at,
      report.updated_at, report.observed_situation, report.location_reference
    from public.pet_alert_community_sightings report
    where report.share_enabled
      and report.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited')
      and (report.status = 'reunited' or report.expires_at > now())
  ), filtered_events as (
    select event.* from public_events event
    where filter_view in ('lost', 'seen', 'found')
      and ((filter_view = 'lost' and event.event_type = 'lost_pet' and event.status_group = 'active')
        or (filter_view = 'seen' and event.event_type = 'community_sighting' and event.status_group = 'active')
        or (filter_view = 'found' and event.status_group = 'found'))
      and (nullif(trim(filter_query), '') is null or concat_ws(' ', event.title, event.species, event.breed, event.city, event.region, event.summary) ilike '%' || trim(filter_query) || '%')
      and (nullif(trim(filter_city), '') is null or event.city ilike trim(filter_city))
      and (nullif(trim(filter_species), '') is null or event.species ilike trim(filter_species))
  )
  select event.*, count(*) over () from filtered_events event
  order by event.updated_at desc, event.published_at desc
  limit least(greatest(result_limit, 1), 50) offset greatest(result_offset, 0);
$$;

revoke all on table public.pet_alert_external_reporters from anon, authenticated;
revoke all on table public.pet_alert_external_verification_challenges from anon, authenticated;
revoke all on table public.pet_alert_external_access_tokens from anon, authenticated;
revoke all on function public.list_pending_external_pet_alert_reports() from public;
revoke all on function public.review_external_pet_alert_report(uuid, text, text) from public;
revoke all on function public.consume_pet_alert_external_challenge(uuid, text) from public;
revoke all on function public.create_external_pet_alert_report(uuid, text, text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.is_pet_alert_lost_media_public(text, text) from public;
revoke all on function public.can_admin_review_pet_alert_external_media(text, text) from public;
grant execute on function public.list_pending_external_pet_alert_reports() to authenticated;
grant execute on function public.review_external_pet_alert_report(uuid, text, text) to authenticated;
grant execute on function public.consume_pet_alert_external_challenge(uuid, text) to service_role;
grant execute on function public.create_external_pet_alert_report(uuid, text, text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.is_pet_alert_lost_media_public(text, text) to anon, authenticated;
grant execute on function public.can_admin_review_pet_alert_external_media(text, text) to authenticated;
grant execute on function public.list_public_pet_alert_lost_pet_media(text[]) to anon, authenticated;
grant execute on function public.get_public_pet_alert_lost_pet_by_slug(text) to anon, authenticated;
grant execute on function public.list_public_pet_alert_directory(text, text, text, text, integer, integer) to anon, authenticated;
