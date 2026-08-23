create table public.pet_alert_lost_pets (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete restrict,
  household_id uuid not null references public.households (id) on delete restrict,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'sighting_received', 'possible_match', 'found', 'closed', 'expired', 'flagged')),
  alert_slug text not null unique
    check (alert_slug = lower(alert_slug) and alert_slug ~ '^[a-z0-9][a-z0-9-]{7,79}$'),
  pet_name text not null check (char_length(trim(pet_name)) between 1 and 120),
  pet_species text not null check (char_length(trim(pet_species)) between 1 and 80),
  last_seen_at timestamptz not null,
  last_seen_city text not null check (char_length(trim(last_seen_city)) between 1 and 120),
  last_seen_region text check (last_seen_region is null or char_length(trim(last_seen_region)) between 1 and 120),
  last_seen_country text not null check (char_length(trim(last_seen_country)) between 2 and 80),
  last_seen_reference text check (last_seen_reference is null or char_length(trim(last_seen_reference)) <= 240),
  last_seen_notes text check (last_seen_notes is null or char_length(trim(last_seen_notes)) <= 1200),
  last_seen_lat double precision check (last_seen_lat is null or last_seen_lat between -90 and 90),
  last_seen_lng double precision check (last_seen_lng is null or last_seen_lng between -180 and 180),
  location_precision text not null default 'approximate'
    check (location_precision in ('exact', 'approximate', 'city')),
  public_description text not null check (char_length(trim(public_description)) between 10 and 1600),
  distinctive_marks text check (distinctive_marks is null or char_length(trim(distinctive_marks)) <= 800),
  behavior_notes text check (behavior_notes is null or char_length(trim(behavior_notes)) <= 800),
  medical_public_notes text check (medical_public_notes is null or char_length(trim(medical_public_notes)) <= 500),
  contact_mode text not null default 'internal'
    check (contact_mode in ('internal', 'whatsapp', 'phone', 'email', 'private')),
  contact_name text check (contact_name is null or char_length(trim(contact_name)) <= 120),
  contact_phone text check (contact_phone is null or char_length(trim(contact_phone)) <= 40),
  contact_email text check (contact_email is null or char_length(trim(contact_email)) <= 254),
  contact_consent boolean not null default false,
  share_enabled boolean not null default true,
  published_at timestamptz,
  found_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz,
  close_reason text check (close_reason is null or close_reason in ('found_with_pet_alert', 'found_other_means', 'closed_not_found')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((last_seen_lat is null) = (last_seen_lng is null)),
  check (location_precision <> 'exact' or last_seen_lat is not null),
  check (
    contact_mode in ('internal', 'private')
    or contact_consent
  ),
  check (contact_mode <> 'whatsapp' or contact_phone is not null),
  check (contact_mode <> 'phone' or contact_phone is not null),
  check (contact_mode <> 'email' or contact_email is not null),
  check (
    (status = 'draft' and published_at is null)
    or status <> 'draft'
  ),
  check (
    status not in ('found', 'closed')
    or closed_at is not null
  )
);

create unique index pet_alert_lost_pets_one_open_per_pet_idx
  on public.pet_alert_lost_pets (pet_id)
  where status in ('active', 'sighting_received', 'possible_match', 'flagged');
create index pet_alert_lost_pets_household_status_idx
  on public.pet_alert_lost_pets (household_id, status, updated_at desc);
create index pet_alert_lost_pets_public_idx
  on public.pet_alert_lost_pets (status, expires_at, published_at desc);

create table public.pet_alert_lost_pet_sightings (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.pet_alert_lost_pets (id) on delete restrict,
  reporter_user_id uuid references auth.users (id) on delete set null,
  reporter_name text check (reporter_name is null or char_length(trim(reporter_name)) <= 120),
  reporter_contact text check (reporter_contact is null or char_length(trim(reporter_contact)) <= 254),
  reporter_contact_consent boolean not null default false,
  sighted_at timestamptz not null,
  city text not null check (char_length(trim(city)) between 1 and 120),
  region text check (region is null or char_length(trim(region)) between 1 and 120),
  country text not null check (char_length(trim(country)) between 2 and 80),
  location_reference text check (location_reference is null or char_length(trim(location_reference)) <= 240),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location_precision text not null default 'approximate'
    check (location_precision in ('exact', 'approximate', 'city')),
  notes text not null check (char_length(trim(notes)) between 5 and 1600),
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'possible_lead', 'discarded', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (location_precision <> 'exact' or latitude is not null),
  check (not reporter_contact_consent or reporter_contact is not null)
);

create index pet_alert_lost_pet_sightings_alert_created_idx
  on public.pet_alert_lost_pet_sightings (alert_id, created_at desc);
create index pet_alert_lost_pet_sightings_reporter_idx
  on public.pet_alert_lost_pet_sightings (reporter_user_id, created_at desc)
  where reporter_user_id is not null;

create table public.pet_alert_status_history (
  id uuid primary key default gen_random_uuid(),
  lost_pet_alert_id uuid references public.pet_alert_lost_pets (id) on delete restrict,
  lost_pet_sighting_id uuid references public.pet_alert_lost_pet_sightings (id) on delete restrict,
  old_status text,
  new_status text not null,
  changed_by_user_id uuid references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(trim(reason)) <= 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(lost_pet_alert_id, lost_pet_sighting_id) = 1)
);

create index pet_alert_status_history_alert_idx
  on public.pet_alert_status_history (lost_pet_alert_id, created_at desc)
  where lost_pet_alert_id is not null;
create index pet_alert_status_history_sighting_idx
  on public.pet_alert_status_history (lost_pet_sighting_id, created_at desc)
  where lost_pet_sighting_id is not null;

create table public.pet_alert_media (
  id uuid primary key default gen_random_uuid(),
  lost_pet_alert_id uuid references public.pet_alert_lost_pets (id) on delete restrict,
  lost_pet_sighting_id uuid references public.pet_alert_lost_pet_sightings (id) on delete restrict,
  storage_bucket text not null default 'pet-alert-media' check (storage_bucket = 'pet-alert-media'),
  storage_path text not null unique,
  media_type text not null check (media_type in ('image/jpeg', 'image/png', 'image/webp')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(lost_pet_alert_id, lost_pet_sighting_id) = 1)
);

create index pet_alert_media_alert_idx on public.pet_alert_media (lost_pet_alert_id, created_at);
create index pet_alert_media_sighting_idx on public.pet_alert_media (lost_pet_sighting_id, created_at);

create trigger trg_pet_alert_lost_pets_updated_at
before update on public.pet_alert_lost_pets
for each row execute function public.set_updated_at();

create trigger trg_pet_alert_lost_pet_sightings_updated_at
before update on public.pet_alert_lost_pet_sightings
for each row execute function public.set_updated_at();

create or replace function public.can_manage_pet_alert_lost_pet(
  target_alert_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_alert_lost_pets as alert
    where alert.id = target_alert_id
      and public.can_edit_household(alert.household_id, target_user_id)
  );
$$;

create or replace function public.create_pet_alert_lost_pet(
  target_pet_id uuid,
  next_last_seen_at timestamptz,
  next_last_seen_city text,
  next_last_seen_region text default null,
  next_last_seen_country text default 'PA',
  next_last_seen_reference text default null,
  next_last_seen_notes text default null,
  next_location_precision text default 'approximate',
  next_latitude double precision default null,
  next_longitude double precision default null,
  next_public_description text default '',
  next_distinctive_marks text default null,
  next_behavior_notes text default null,
  next_medical_public_notes text default null,
  next_contact_mode text default 'internal',
  next_contact_name text default null,
  next_contact_phone text default null,
  next_contact_email text default null,
  next_contact_consent boolean default false,
  next_share_enabled boolean default true,
  publish_now boolean default false
)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pet public.pets;
  created_alert public.pet_alert_lost_pets;
  initial_status text := case when publish_now then 'active' else 'draft' end;
begin
  if current_user_id is null then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  select * into selected_pet from public.pets where id = target_pet_id for update;
  if selected_pet.id is null or not public.can_edit_pet(selected_pet.id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  if selected_pet.status <> 'active' then
    raise exception 'PET_ALERT_PET_NOT_ELIGIBLE';
  end if;
  if exists (
    select 1 from public.pet_alert_lost_pets
    where pet_id = selected_pet.id
      and status in ('active', 'sighting_received', 'possible_match', 'flagged')
  ) then
    raise exception 'PET_ALERT_ALREADY_ACTIVE';
  end if;

  insert into public.pet_alert_lost_pets (
    pet_id, household_id, created_by_user_id, status, alert_slug, pet_name, pet_species,
    last_seen_at, last_seen_city, last_seen_region, last_seen_country, last_seen_reference,
    last_seen_notes, last_seen_lat, last_seen_lng, location_precision, public_description,
    distinctive_marks, behavior_notes, medical_public_notes, contact_mode, contact_name,
    contact_phone, contact_email, contact_consent, share_enabled, published_at, expires_at
  ) values (
    selected_pet.id, selected_pet.household_id, current_user_id, initial_status,
    'pet-' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    selected_pet.name, selected_pet.species,
    next_last_seen_at, trim(next_last_seen_city), nullif(trim(next_last_seen_region), ''),
    upper(trim(next_last_seen_country)), nullif(trim(next_last_seen_reference), ''),
    nullif(trim(next_last_seen_notes), ''), next_latitude, next_longitude, next_location_precision,
    trim(next_public_description), nullif(trim(next_distinctive_marks), ''),
    nullif(trim(next_behavior_notes), ''), nullif(trim(next_medical_public_notes), ''),
    next_contact_mode, nullif(trim(next_contact_name), ''), nullif(trim(next_contact_phone), ''),
    nullif(lower(trim(next_contact_email)), ''), next_contact_consent, next_share_enabled,
    case when publish_now then now() else null end,
    case when publish_now then now() + interval '30 days' else null end
  ) returning * into created_alert;

  insert into public.pet_alert_status_history (lost_pet_alert_id, new_status, changed_by_user_id, reason)
  values (created_alert.id, created_alert.status, current_user_id, 'alert_created');

  perform public.insert_audit_log(
    'pet_alert_lost_pet', created_alert.id, 'pet_alert_created',
    jsonb_build_object('pet_id', selected_pet.id, 'status', created_alert.status), current_user_id
  );
  return created_alert;
end;
$$;

create or replace function public.update_pet_alert_lost_pet(
  target_alert_id uuid,
  next_last_seen_at timestamptz,
  next_last_seen_city text,
  next_last_seen_region text default null,
  next_last_seen_country text default 'PA',
  next_last_seen_reference text default null,
  next_last_seen_notes text default null,
  next_location_precision text default 'approximate',
  next_latitude double precision default null,
  next_longitude double precision default null,
  next_public_description text default '',
  next_distinctive_marks text default null,
  next_behavior_notes text default null,
  next_medical_public_notes text default null,
  next_contact_mode text default 'internal',
  next_contact_name text default null,
  next_contact_phone text default null,
  next_contact_email text default null,
  next_contact_consent boolean default false,
  next_share_enabled boolean default true
)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_alert public.pet_alert_lost_pets;
begin
  if current_user_id is null or not public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  update public.pet_alert_lost_pets
  set last_seen_at = next_last_seen_at,
      last_seen_city = trim(next_last_seen_city),
      last_seen_region = nullif(trim(next_last_seen_region), ''),
      last_seen_country = upper(trim(next_last_seen_country)),
      last_seen_reference = nullif(trim(next_last_seen_reference), ''),
      last_seen_notes = nullif(trim(next_last_seen_notes), ''),
      last_seen_lat = next_latitude,
      last_seen_lng = next_longitude,
      location_precision = next_location_precision,
      public_description = trim(next_public_description),
      distinctive_marks = nullif(trim(next_distinctive_marks), ''),
      behavior_notes = nullif(trim(next_behavior_notes), ''),
      medical_public_notes = nullif(trim(next_medical_public_notes), ''),
      contact_mode = next_contact_mode,
      contact_name = nullif(trim(next_contact_name), ''),
      contact_phone = nullif(trim(next_contact_phone), ''),
      contact_email = nullif(lower(trim(next_contact_email)), ''),
      contact_consent = next_contact_consent,
      share_enabled = next_share_enabled
  where id = target_alert_id
    and status in ('draft', 'active', 'sighting_received', 'possible_match')
  returning * into updated_alert;

  if updated_alert.id is null then raise exception 'PET_ALERT_NOT_ACTIVE'; end if;
  perform public.insert_audit_log('pet_alert_lost_pet', updated_alert.id, 'pet_alert_updated', '{}'::jsonb, current_user_id);
  return updated_alert;
end;
$$;

create or replace function public.publish_pet_alert_lost_pet(target_alert_id uuid)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  published_alert public.pet_alert_lost_pets;
begin
  if current_user_id is null or not public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  update public.pet_alert_lost_pets
  set status = 'active',
      published_at = now(),
      expires_at = now() + interval '30 days'
  where id = target_alert_id and status = 'draft'
  returning * into published_alert;

  if published_alert.id is null then raise exception 'PET_ALERT_NOT_ACTIVE'; end if;

  insert into public.pet_alert_status_history (lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason)
  values (published_alert.id, 'draft', 'active', current_user_id, 'alert_published');
  perform public.insert_audit_log(
    'pet_alert_lost_pet', published_alert.id, 'pet_alert_published',
    jsonb_build_object('expires_at', published_alert.expires_at), current_user_id
  );
  return published_alert;
end;
$$;

create or replace function public.mark_pet_alert_lost_pet_found(target_alert_id uuid, found_source text)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  old_status text;
  updated_alert public.pet_alert_lost_pets;
  normalized_reason text;
begin
  if found_source not in ('pet_alert', 'other') then raise exception 'Unsupported found source'; end if;
  if current_user_id is null or not public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  select status into old_status from public.pet_alert_lost_pets where id = target_alert_id for update;
  normalized_reason := case when found_source = 'pet_alert' then 'found_with_pet_alert' else 'found_other_means' end;
  update public.pet_alert_lost_pets
  set status = 'found', found_at = now(), closed_at = now(), close_reason = normalized_reason
  where id = target_alert_id and status in ('active', 'sighting_received', 'possible_match', 'flagged')
  returning * into updated_alert;
  if updated_alert.id is null then raise exception 'PET_ALERT_NOT_ACTIVE'; end if;
  insert into public.pet_alert_status_history (lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_alert.id, old_status, 'found', current_user_id, normalized_reason);
  perform public.insert_audit_log('pet_alert_lost_pet', updated_alert.id, 'pet_alert_found', jsonb_build_object('source', found_source), current_user_id);
  return updated_alert;
end;
$$;

create or replace function public.close_pet_alert_lost_pet(target_alert_id uuid, next_close_reason text)
returns public.pet_alert_lost_pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  old_status text;
  updated_alert public.pet_alert_lost_pets;
begin
  if next_close_reason not in ('found_with_pet_alert', 'found_other_means', 'closed_not_found') then
    raise exception 'Unsupported close reason';
  end if;
  if next_close_reason <> 'closed_not_found' then
    return public.mark_pet_alert_lost_pet_found(
      target_alert_id,
      case when next_close_reason = 'found_with_pet_alert' then 'pet_alert' else 'other' end
    );
  end if;
  if current_user_id is null or not public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  select status into old_status from public.pet_alert_lost_pets where id = target_alert_id for update;
  update public.pet_alert_lost_pets
  set status = 'closed', closed_at = now(), close_reason = next_close_reason
  where id = target_alert_id and status in ('draft', 'active', 'sighting_received', 'possible_match', 'flagged')
  returning * into updated_alert;
  if updated_alert.id is null then raise exception 'PET_ALERT_NOT_ACTIVE'; end if;
  insert into public.pet_alert_status_history (lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_alert.id, old_status, 'closed', current_user_id, next_close_reason);
  perform public.insert_audit_log('pet_alert_lost_pet', updated_alert.id, 'pet_alert_closed', jsonb_build_object('reason', next_close_reason), current_user_id);
  return updated_alert;
end;
$$;

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
  select alert.alert_slug, alert.status, alert.pet_name, alert.pet_species, profile.breed,
    null::text as photo_url, alert.last_seen_at, alert.last_seen_city, alert.last_seen_region,
    alert.last_seen_country, alert.last_seen_reference, alert.public_description,
    alert.distinctive_marks, alert.behavior_notes, alert.medical_public_notes,
    alert.published_at, alert.expires_at
  from public.pet_alert_lost_pets as alert
  left join public.pet_profiles as profile on profile.pet_id = alert.pet_id
  where alert.alert_slug = lower(trim(target_alert_slug))
    and alert.share_enabled
    and alert.status in ('active', 'sighting_received', 'possible_match', 'found', 'closed')
    and (alert.expires_at is null or alert.expires_at > now() or alert.status in ('found', 'closed'));
$$;

create or replace function public.list_pet_alert_lost_pets_for_pet(target_pet_id uuid)
returns setof public.pet_alert_lost_pets
language sql
stable
security definer
set search_path = public
as $$
  select alert.* from public.pet_alert_lost_pets as alert
  where alert.pet_id = target_pet_id and public.can_view_pet(target_pet_id, auth.uid())
  order by alert.created_at desc;
$$;

create or replace function public.list_active_pet_alert_lost_pets_for_household(target_household_id uuid)
returns setof public.pet_alert_lost_pets
language sql
stable
security definer
set search_path = public
as $$
  select alert.* from public.pet_alert_lost_pets as alert
  where alert.household_id = target_household_id
    and public.can_view_household(target_household_id, auth.uid())
    and alert.status in ('active', 'sighting_received', 'possible_match', 'flagged')
  order by alert.updated_at desc;
$$;

create or replace function public.create_pet_alert_lost_pet_sighting(
  target_alert_slug text,
  next_reporter_name text default null,
  next_reporter_contact text default null,
  next_reporter_contact_consent boolean default false,
  next_sighted_at timestamptz default now(),
  next_city text default '',
  next_region text default null,
  next_country text default 'PA',
  next_location_reference text default null,
  next_location_precision text default 'approximate',
  next_latitude double precision default null,
  next_longitude double precision default null,
  next_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_alert public.pet_alert_lost_pets;
  created_sighting public.pet_alert_lost_pet_sightings;
  old_status text;
begin
  select * into selected_alert from public.pet_alert_lost_pets
  where alert_slug = lower(trim(target_alert_slug))
    and share_enabled
    and status in ('active', 'sighting_received', 'possible_match')
    and (expires_at is null or expires_at > now())
  for update;
  if selected_alert.id is null then raise exception 'PET_ALERT_NOT_ACTIVE'; end if;
  old_status := selected_alert.status;

  insert into public.pet_alert_lost_pet_sightings (
    alert_id, reporter_user_id, reporter_name, reporter_contact, reporter_contact_consent,
    sighted_at, city, region, country, location_reference, latitude, longitude,
    location_precision, notes
  ) values (
    selected_alert.id, auth.uid(), nullif(trim(next_reporter_name), ''),
    case when next_reporter_contact_consent then nullif(trim(next_reporter_contact), '') else null end,
    next_reporter_contact_consent, next_sighted_at, trim(next_city), nullif(trim(next_region), ''),
    upper(trim(next_country)), nullif(trim(next_location_reference), ''), next_latitude,
    next_longitude, next_location_precision, trim(next_notes)
  ) returning * into created_sighting;

  if selected_alert.status = 'active' then
    update public.pet_alert_lost_pets set status = 'sighting_received' where id = selected_alert.id;
    insert into public.pet_alert_status_history (lost_pet_alert_id, old_status, new_status, changed_by_user_id, reason)
    values (selected_alert.id, old_status, 'sighting_received', auth.uid(), 'sighting_received');
  end if;
  insert into public.pet_alert_status_history (lost_pet_sighting_id, new_status, changed_by_user_id, reason)
  values (created_sighting.id, 'new', auth.uid(), 'sighting_created');
  perform public.insert_audit_log('pet_alert_lost_pet_sighting', created_sighting.id, 'pet_alert_sighting_created', jsonb_build_object('alert_id', selected_alert.id), auth.uid());
  return created_sighting.id;
end;
$$;

create or replace function public.list_pet_alert_lost_pet_sightings(target_alert_id uuid)
returns setof public.pet_alert_lost_pet_sightings
language sql
stable
security definer
set search_path = public
as $$
  select sighting.* from public.pet_alert_lost_pet_sightings as sighting
  where sighting.alert_id = target_alert_id
    and public.can_manage_pet_alert_lost_pet(target_alert_id, auth.uid())
  order by sighting.created_at desc;
$$;

create or replace function public.update_pet_alert_lost_pet_sighting_status(target_sighting_id uuid, next_status text)
returns public.pet_alert_lost_pet_sightings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  old_status text;
  target_alert_id uuid;
  updated_sighting public.pet_alert_lost_pet_sightings;
begin
  if next_status not in ('new', 'reviewed', 'possible_lead', 'discarded', 'flagged') then
    raise exception 'Unsupported sighting status';
  end if;
  select alert_id, status into target_alert_id, old_status
  from public.pet_alert_lost_pet_sightings where id = target_sighting_id for update;
  if target_alert_id is null or not public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  update public.pet_alert_lost_pet_sightings set status = next_status
  where id = target_sighting_id returning * into updated_sighting;
  insert into public.pet_alert_status_history (lost_pet_sighting_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_sighting.id, old_status, next_status, current_user_id, 'owner_review');
  if next_status = 'possible_lead' then
    update public.pet_alert_lost_pets set status = 'possible_match'
    where id = target_alert_id and status in ('active', 'sighting_received');
  end if;
  perform public.insert_audit_log('pet_alert_lost_pet_sighting', updated_sighting.id, 'pet_alert_sighting_status_updated', jsonb_build_object('old_status', old_status, 'new_status', next_status), current_user_id);
  return updated_sighting;
end;
$$;

alter table public.pet_alert_lost_pets enable row level security;
alter table public.pet_alert_lost_pet_sightings enable row level security;
alter table public.pet_alert_status_history enable row level security;
alter table public.pet_alert_media enable row level security;

create policy pet_alert_lost_pets_select_authorized on public.pet_alert_lost_pets
for select to authenticated
using (public.can_view_household(household_id, auth.uid()) or public.is_platform_admin(auth.uid()));

create policy pet_alert_sightings_select_authorized on public.pet_alert_lost_pet_sightings
for select to authenticated
using (
  public.can_manage_pet_alert_lost_pet(alert_id, auth.uid())
  or reporter_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
);

create policy pet_alert_history_select_authorized on public.pet_alert_status_history
for select to authenticated
using (
  (lost_pet_alert_id is not null and public.can_manage_pet_alert_lost_pet(lost_pet_alert_id, auth.uid()))
  or (lost_pet_sighting_id is not null and exists (
    select 1 from public.pet_alert_lost_pet_sightings as sighting
    where sighting.id = lost_pet_sighting_id
      and public.can_manage_pet_alert_lost_pet(sighting.alert_id, auth.uid())
  ))
  or public.is_platform_admin(auth.uid())
);

create policy pet_alert_media_select_authorized on public.pet_alert_media
for select to authenticated
using (
  (lost_pet_alert_id is not null and public.can_manage_pet_alert_lost_pet(lost_pet_alert_id, auth.uid()))
  or (lost_pet_sighting_id is not null and exists (
    select 1 from public.pet_alert_lost_pet_sightings as sighting
    where sighting.id = lost_pet_sighting_id
      and public.can_manage_pet_alert_lost_pet(sighting.alert_id, auth.uid())
  ))
  or public.is_platform_admin(auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-alert-media', 'pet-alert-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant select on public.pet_alert_lost_pets, public.pet_alert_lost_pet_sightings,
  public.pet_alert_status_history, public.pet_alert_media to authenticated;

revoke all on function public.can_manage_pet_alert_lost_pet(uuid, uuid) from public;
revoke all on function public.create_pet_alert_lost_pet(uuid, timestamptz, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, text, text, boolean, boolean, boolean) from public;
revoke all on function public.update_pet_alert_lost_pet(uuid, timestamptz, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, text, text, boolean, boolean) from public;
revoke all on function public.publish_pet_alert_lost_pet(uuid) from public;
revoke all on function public.mark_pet_alert_lost_pet_found(uuid, text) from public;
revoke all on function public.close_pet_alert_lost_pet(uuid, text) from public;
revoke all on function public.get_public_pet_alert_lost_pet_by_slug(text) from public;
revoke all on function public.list_pet_alert_lost_pets_for_pet(uuid) from public;
revoke all on function public.list_active_pet_alert_lost_pets_for_household(uuid) from public;
revoke all on function public.create_pet_alert_lost_pet_sighting(text, text, text, boolean, timestamptz, text, text, text, text, text, double precision, double precision, text) from public;
revoke all on function public.list_pet_alert_lost_pet_sightings(uuid) from public;
revoke all on function public.update_pet_alert_lost_pet_sighting_status(uuid, text) from public;

grant execute on function public.can_manage_pet_alert_lost_pet(uuid, uuid) to authenticated;
grant execute on function public.create_pet_alert_lost_pet(uuid, timestamptz, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.update_pet_alert_lost_pet(uuid, timestamptz, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.publish_pet_alert_lost_pet(uuid) to authenticated;
grant execute on function public.mark_pet_alert_lost_pet_found(uuid, text) to authenticated;
grant execute on function public.close_pet_alert_lost_pet(uuid, text) to authenticated;
grant execute on function public.get_public_pet_alert_lost_pet_by_slug(text) to anon, authenticated;
grant execute on function public.list_pet_alert_lost_pets_for_pet(uuid) to authenticated;
grant execute on function public.list_active_pet_alert_lost_pets_for_household(uuid) to authenticated;
grant execute on function public.create_pet_alert_lost_pet_sighting(text, text, text, boolean, timestamptz, text, text, text, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.list_pet_alert_lost_pet_sightings(uuid) to authenticated;
grant execute on function public.update_pet_alert_lost_pet_sighting_status(uuid, text) to authenticated;
