create or replace function public.list_public_pet_alert_directory(
  filter_view text default 'lost',
  filter_query text default null,
  filter_city text default null,
  filter_species text default null,
  result_limit integer default 18,
  result_offset integer default 0
)
returns table (
  event_type text,
  public_slug text,
  public_path text,
  status text,
  status_group text,
  title text,
  species text,
  breed text,
  city text,
  region text,
  country text,
  occurred_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz,
  summary text,
  location_reference text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with public_events as (
    select
      'lost_pet'::text as event_type,
      alert.alert_slug as public_slug,
      ('/pet-alert/mascota-perdida/' || alert.alert_slug)::text as public_path,
      alert.status,
      case when alert.status = 'found' then 'found' else 'active' end::text as status_group,
      alert.pet_name as title,
      alert.pet_species as species,
      profile.breed,
      alert.last_seen_city as city,
      alert.last_seen_region as region,
      alert.last_seen_country as country,
      alert.last_seen_at as occurred_at,
      alert.published_at,
      alert.updated_at,
      alert.public_description as summary,
      alert.last_seen_reference as location_reference
    from public.pet_alert_lost_pets alert
    left join public.pet_profiles profile on profile.pet_id = alert.pet_id
    where alert.share_enabled
      and alert.status in ('active', 'sighting_received', 'possible_match', 'found')
      and (alert.status = 'found' or alert.expires_at is null or alert.expires_at > now())

    union all

    select
      'community_sighting'::text,
      report.report_slug,
      ('/pet-alert/mascota-vista/' || report.report_slug)::text,
      report.status,
      case when report.status = 'reunited' then 'found' else 'active' end::text,
      report.animal_species,
      report.animal_species,
      report.apparent_breed,
      report.city,
      report.region,
      report.country,
      report.sighted_at,
      report.published_at,
      report.updated_at,
      report.observed_situation,
      report.location_reference
    from public.pet_alert_community_sightings report
    where report.share_enabled
      and report.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited')
      and (report.status = 'reunited' or report.expires_at > now())
  ), filtered_events as (
    select event.*
    from public_events event
    where filter_view in ('lost', 'seen', 'found')
      and (
        (filter_view = 'lost' and event.event_type = 'lost_pet' and event.status_group = 'active')
        or (filter_view = 'seen' and event.event_type = 'community_sighting' and event.status_group = 'active')
        or (filter_view = 'found' and event.status_group = 'found')
      )
      and (
        nullif(trim(filter_query), '') is null
        or concat_ws(' ', event.title, event.species, event.breed, event.city, event.region, event.summary)
          ilike '%' || trim(filter_query) || '%'
      )
      and (nullif(trim(filter_city), '') is null or event.city ilike trim(filter_city))
      and (nullif(trim(filter_species), '') is null or event.species ilike trim(filter_species))
  )
  select event.*, count(*) over () as total_count
  from filtered_events event
  order by event.updated_at desc, event.published_at desc
  limit least(greatest(result_limit, 1), 50)
  offset greatest(result_offset, 0);
$$;

revoke all on function public.list_public_pet_alert_directory(text, text, text, text, integer, integer) from public;
grant execute on function public.list_public_pet_alert_directory(text, text, text, text, integer, integer) to anon, authenticated;
