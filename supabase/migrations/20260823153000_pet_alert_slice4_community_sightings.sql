create table public.pet_alert_community_sightings (
  id uuid primary key default gen_random_uuid(),
  report_slug text not null unique
    check (report_slug = lower(report_slug) and report_slug ~ '^[a-z0-9][a-z0-9-]{7,79}$'),
  reporter_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'sighting_open'
    check (status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited', 'closed', 'expired', 'flagged')),
  animal_species text not null check (char_length(trim(animal_species)) between 1 and 80),
  apparent_breed text check (apparent_breed is null or char_length(trim(apparent_breed)) <= 120),
  apparent_size text not null default 'unknown' check (apparent_size in ('small', 'medium', 'large', 'unknown')),
  apparent_sex text not null default 'unknown' check (apparent_sex in ('female', 'male', 'unknown')),
  primary_color text check (primary_color is null or char_length(trim(primary_color)) <= 80),
  collar_description text check (collar_description is null or char_length(trim(collar_description)) <= 240),
  distinctive_marks text check (distinctive_marks is null or char_length(trim(distinctive_marks)) <= 800),
  behavior_notes text check (behavior_notes is null or char_length(trim(behavior_notes)) <= 800),
  observed_situation text not null check (char_length(trim(observed_situation)) between 10 and 1200),
  sighted_at timestamptz not null,
  city text not null check (char_length(trim(city)) between 1 and 120),
  region text check (region is null or char_length(trim(region)) <= 120),
  country text not null check (char_length(trim(country)) between 2 and 80),
  location_reference text check (location_reference is null or char_length(trim(location_reference)) <= 240),
  location_precision text not null default 'approximate' check (location_precision in ('approximate', 'city')),
  share_enabled boolean not null default true,
  published_at timestamptz not null default now(),
  closed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  close_reason text check (close_reason is null or close_reason in ('reunited', 'animal_left_area', 'duplicate', 'closed_other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sighted_at <= now() + interval '15 minutes'),
  check (expires_at > published_at),
  check (status not in ('reunited', 'closed') or closed_at is not null)
);

create index pet_alert_community_sightings_public_idx
  on public.pet_alert_community_sightings (status, country, city, published_at desc);
create index pet_alert_community_sightings_reporter_idx
  on public.pet_alert_community_sightings (reporter_user_id, created_at desc);

create table public.pet_alert_community_sighting_history (
  id uuid primary key default gen_random_uuid(),
  community_sighting_id uuid not null references public.pet_alert_community_sightings (id) on delete restrict,
  old_status text,
  new_status text not null,
  changed_by_user_id uuid references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(trim(reason)) <= 500),
  created_at timestamptz not null default now()
);

create index pet_alert_community_sighting_history_target_idx
  on public.pet_alert_community_sighting_history (community_sighting_id, created_at desc);

create trigger trg_pet_alert_community_sightings_updated_at
before update on public.pet_alert_community_sightings
for each row execute function public.set_updated_at();

create or replace function public.create_pet_alert_community_sighting(
  next_animal_species text,
  next_apparent_breed text default null,
  next_apparent_size text default 'unknown',
  next_apparent_sex text default 'unknown',
  next_primary_color text default null,
  next_collar_description text default null,
  next_distinctive_marks text default null,
  next_behavior_notes text default null,
  next_observed_situation text default '',
  next_sighted_at timestamptz default now(),
  next_city text default '',
  next_region text default null,
  next_country text default 'PA',
  next_location_reference text default null,
  next_location_precision text default 'approximate',
  next_share_enabled boolean default true
)
returns public.pet_alert_community_sightings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  created_report public.pet_alert_community_sightings;
begin
  if current_user_id is null then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  if (select count(*) from public.pet_alert_community_sightings
      where reporter_user_id = current_user_id and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'PET_ALERT_RATE_LIMITED';
  end if;

  insert into public.pet_alert_community_sightings (
    report_slug, reporter_user_id, animal_species, apparent_breed, apparent_size,
    apparent_sex, primary_color, collar_description, distinctive_marks, behavior_notes,
    observed_situation, sighted_at, city, region, country, location_reference,
    location_precision, share_enabled
  ) values (
    'vista-' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    current_user_id, trim(next_animal_species), nullif(trim(next_apparent_breed), ''),
    next_apparent_size, next_apparent_sex, nullif(trim(next_primary_color), ''),
    nullif(trim(next_collar_description), ''), nullif(trim(next_distinctive_marks), ''),
    nullif(trim(next_behavior_notes), ''), trim(next_observed_situation), next_sighted_at,
    trim(next_city), nullif(trim(next_region), ''), upper(trim(next_country)),
    nullif(trim(next_location_reference), ''), next_location_precision, next_share_enabled
  ) returning * into created_report;

  insert into public.pet_alert_community_sighting_history (
    community_sighting_id, new_status, changed_by_user_id, reason
  ) values (created_report.id, created_report.status, current_user_id, 'community_sighting_created');

  perform public.insert_audit_log(
    'pet_alert_community_sighting', created_report.id, 'pet_alert_community_sighting_created',
    jsonb_build_object('status', created_report.status, 'city', created_report.city), current_user_id
  );
  return created_report;
end;
$$;

create or replace function public.get_public_pet_alert_community_sighting_by_slug(target_report_slug text)
returns table (
  report_slug text, status text, animal_species text, apparent_breed text,
  apparent_size text, apparent_sex text, primary_color text, collar_description text,
  distinctive_marks text, behavior_notes text, observed_situation text,
  sighted_at timestamptz, city text, region text, country text,
  location_reference text, published_at timestamptz, expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select report.report_slug, report.status, report.animal_species, report.apparent_breed,
    report.apparent_size, report.apparent_sex, report.primary_color, report.collar_description,
    report.distinctive_marks, report.behavior_notes, report.observed_situation,
    report.sighted_at, report.city, report.region, report.country,
    report.location_reference, report.published_at, report.expires_at
  from public.pet_alert_community_sightings report
  where report.report_slug = target_report_slug
    and report.share_enabled
    and report.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited', 'closed')
    and (report.status in ('reunited', 'closed') or report.expires_at > now());
$$;

create or replace function public.list_public_pet_alert_community_sightings(
  filter_city text default null,
  filter_country text default 'PA',
  result_limit integer default 30
)
returns table (
  report_slug text, status text, animal_species text, apparent_breed text,
  apparent_size text, apparent_sex text, primary_color text, collar_description text,
  distinctive_marks text, behavior_notes text, observed_situation text,
  sighted_at timestamptz, city text, region text, country text,
  location_reference text, published_at timestamptz, expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select report.report_slug, report.status, report.animal_species, report.apparent_breed,
    report.apparent_size, report.apparent_sex, report.primary_color, report.collar_description,
    report.distinctive_marks, report.behavior_notes, report.observed_situation,
    report.sighted_at, report.city, report.region, report.country,
    report.location_reference, report.published_at, report.expires_at
  from public.pet_alert_community_sightings report
  where report.share_enabled
    and report.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified')
    and report.expires_at > now()
    and (nullif(trim(filter_city), '') is null or lower(report.city) = lower(trim(filter_city)))
    and (nullif(trim(filter_country), '') is null or upper(report.country) = upper(trim(filter_country)))
  order by report.published_at desc
  limit least(greatest(result_limit, 1), 50);
$$;

create or replace function public.list_my_pet_alert_community_sightings()
returns setof public.pet_alert_community_sightings
language sql
stable
security definer
set search_path = public
as $$
  select report.* from public.pet_alert_community_sightings report
  where report.reporter_user_id = auth.uid()
  order by report.created_at desc;
$$;

create or replace function public.close_pet_alert_community_sighting(
  target_report_id uuid,
  next_close_reason text default 'closed_other'
)
returns public.pet_alert_community_sightings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_report public.pet_alert_community_sightings;
  updated_report public.pet_alert_community_sightings;
  next_status text := case when next_close_reason = 'reunited' then 'reunited' else 'closed' end;
begin
  select * into selected_report from public.pet_alert_community_sightings where id = target_report_id for update;
  if current_user_id is null or selected_report.id is null or selected_report.reporter_user_id <> current_user_id then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;
  if selected_report.status not in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified') then
    raise exception 'PET_ALERT_NOT_ACTIVE';
  end if;

  update public.pet_alert_community_sightings
  set status = next_status, closed_at = now(), close_reason = next_close_reason
  where id = target_report_id returning * into updated_report;

  insert into public.pet_alert_community_sighting_history (
    community_sighting_id, old_status, new_status, changed_by_user_id, reason
  ) values (updated_report.id, selected_report.status, updated_report.status, current_user_id, next_close_reason);
  perform public.insert_audit_log(
    'pet_alert_community_sighting', updated_report.id, 'pet_alert_community_sighting_closed',
    jsonb_build_object('reason', next_close_reason), current_user_id
  );
  return updated_report;
end;
$$;

alter table public.pet_alert_community_sightings enable row level security;
alter table public.pet_alert_community_sighting_history enable row level security;

create policy pet_alert_community_sightings_select_own
on public.pet_alert_community_sightings for select to authenticated
using (reporter_user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create policy pet_alert_community_history_select_authorized
on public.pet_alert_community_sighting_history for select to authenticated
using (exists (
  select 1 from public.pet_alert_community_sightings report
  where report.id = community_sighting_id
    and (report.reporter_user_id = auth.uid() or public.is_platform_admin(auth.uid()))
));

revoke all on public.pet_alert_community_sightings, public.pet_alert_community_sighting_history from anon, authenticated;
grant select on public.pet_alert_community_sightings, public.pet_alert_community_sighting_history to authenticated;

revoke all on function public.create_pet_alert_community_sighting(text, text, text, text, text, text, text, text, text, timestamptz, text, text, text, text, text, boolean) from public;
revoke all on function public.get_public_pet_alert_community_sighting_by_slug(text) from public;
revoke all on function public.list_public_pet_alert_community_sightings(text, text, integer) from public;
revoke all on function public.list_my_pet_alert_community_sightings() from public;
revoke all on function public.close_pet_alert_community_sighting(uuid, text) from public;

grant execute on function public.create_pet_alert_community_sighting(text, text, text, text, text, text, text, text, text, timestamptz, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.get_public_pet_alert_community_sighting_by_slug(text) to anon, authenticated;
grant execute on function public.list_public_pet_alert_community_sightings(text, text, integer) to anon, authenticated;
grant execute on function public.list_my_pet_alert_community_sightings() to authenticated;
grant execute on function public.close_pet_alert_community_sighting(uuid, text) to authenticated;
