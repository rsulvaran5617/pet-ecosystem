-- Additive public SOS feed. Existing Pet Alert map clients are unchanged.
create or replace function public.list_public_pet_sos_map_events(
  bounds_min_latitude double precision,
  bounds_min_longitude double precision,
  bounds_max_latitude double precision,
  bounds_max_longitude double precision,
  filter_view text default 'all',
  filter_species text default null,
  filter_occurred_after timestamptz default null,
  result_limit integer default 100,
  cursor_occurred_at timestamptz default null,
  cursor_event_type text default null,
  cursor_public_slug text default null
)
returns table (
  event_type text, public_slug text, status text, title text, species text,
  city text, occurred_at timestamptz, public_latitude double precision,
  public_longitude double precision
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  longitude_span double precision;
  viewport extensions.geography;
  wrapped_viewport extensions.geography;
begin
  if bounds_min_latitude is null or bounds_max_latitude is null
    or bounds_min_longitude is null or bounds_max_longitude is null
    or bounds_min_latitude not between -90 and 90
    or bounds_max_latitude not between -90 and 90
    or bounds_min_longitude not between -180 and 180
    or bounds_max_longitude not between -180 and 180
    or bounds_min_latitude >= bounds_max_latitude
    or bounds_max_latitude - bounds_min_latitude > 30 then
    raise exception 'PET_SOS_MAP_BOUNDS_INVALID';
  end if;
  if bounds_min_longitude = 180 then bounds_min_longitude := -180; end if;
  if bounds_max_longitude = -180 then bounds_max_longitude := 180; end if;
  longitude_span := case when bounds_min_longitude <= bounds_max_longitude
    then bounds_max_longitude - bounds_min_longitude
    else 360 - bounds_min_longitude + bounds_max_longitude end;
  if longitude_span <= 0 or longitude_span > 30 then
    raise exception 'PET_SOS_MAP_BOUNDS_INVALID';
  end if;
  if filter_view is null or filter_view not in ('all', 'lost', 'seen', 'found')
    or result_limit is null or result_limit not between 1 and 200
    or char_length(coalesce(filter_species, '')) > 80
    or (filter_occurred_after is not null and not isfinite(filter_occurred_after)) then
    raise exception 'PET_SOS_MAP_FILTER_INVALID';
  end if;
  if (cursor_occurred_at is not null or cursor_event_type is not null or cursor_public_slug is not null)
    and (cursor_occurred_at is null or cursor_event_type is null or cursor_public_slug is null
      or not isfinite(cursor_occurred_at)
      or cursor_event_type not in ('lost_pet', 'community_sighting')
      or char_length(cursor_public_slug) not between 1 and 200) then
    raise exception 'PET_SOS_MAP_CURSOR_INVALID';
  end if;

  viewport := extensions.st_makeenvelope(bounds_min_longitude, bounds_min_latitude,
    case when bounds_min_longitude > bounds_max_longitude then 180 else bounds_max_longitude end,
    bounds_max_latitude, 4326)::extensions.geography;
  if bounds_min_longitude > bounds_max_longitude then
    wrapped_viewport := extensions.st_makeenvelope(-180, bounds_min_latitude,
      bounds_max_longitude, bounds_max_latitude, 4326)::extensions.geography;
  end if;

  return query
  with events as (
    select 'lost_pet'::text as event_type, a.alert_slug as public_slug, a.status,
      a.pet_name as title, a.pet_species as species, a.last_seen_city as city,
      a.last_seen_at as occurred_at, a.public_latitude, a.public_longitude
    from public.pet_alert_lost_pets a
    where a.share_enabled and a.public_location_visible and a.public_geo_point is not null
      and (a.public_geo_point operator(extensions.&&) viewport
        or (wrapped_viewport is not null and a.public_geo_point operator(extensions.&&) wrapped_viewport))
      and a.status in ('active', 'sighting_received', 'possible_match', 'found')
      and (a.status = 'found' or a.expires_at is null or a.expires_at > now())
    union all
    select 'community_sighting'::text, r.report_slug, r.status, r.animal_species,
      r.animal_species, r.city, r.sighted_at, r.public_latitude, r.public_longitude
    from public.pet_alert_community_sightings r
    where r.share_enabled and r.public_location_visible and r.public_geo_point is not null
      and (r.public_geo_point operator(extensions.&&) viewport
        or (wrapped_viewport is not null and r.public_geo_point operator(extensions.&&) wrapped_viewport))
      and r.status in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim', 'owner_verified', 'reunited')
      and (r.status = 'reunited' or r.expires_at > now())
  )
  select e.event_type, e.public_slug, e.status, e.title, e.species, e.city,
    e.occurred_at, e.public_latitude, e.public_longitude
  from events e
  where e.public_latitude between bounds_min_latitude and bounds_max_latitude
    and (case when bounds_min_longitude <= bounds_max_longitude
      then e.public_longitude between bounds_min_longitude and bounds_max_longitude
      else e.public_longitude >= bounds_min_longitude or e.public_longitude <= bounds_max_longitude end)
    and (
      (filter_view = 'all' and e.status not in ('found', 'reunited'))
      or (filter_view = 'lost' and e.event_type = 'lost_pet' and e.status <> 'found')
      or (filter_view = 'seen' and e.event_type = 'community_sighting' and e.status <> 'reunited')
      or (filter_view = 'found' and e.status in ('found', 'reunited'))
    )
    and (nullif(trim(filter_species), '') is null or lower(e.species) = lower(trim(filter_species)))
    and (filter_occurred_after is null or e.occurred_at >= filter_occurred_after)
    and (cursor_occurred_at is null or e.occurred_at < cursor_occurred_at
      or (e.occurred_at = cursor_occurred_at
        and (e.event_type, e.public_slug) > (cursor_event_type, cursor_public_slug)))
  order by e.occurred_at desc, e.event_type asc, e.public_slug asc
  limit result_limit + 1;
end;
$$;

revoke all on function public.list_public_pet_sos_map_events(double precision, double precision, double precision, double precision, text, text, timestamptz, integer, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.list_public_pet_sos_map_events(double precision, double precision, double precision, double precision, text, text, timestamptz, integer, timestamptz, text, text) to anon, authenticated;
