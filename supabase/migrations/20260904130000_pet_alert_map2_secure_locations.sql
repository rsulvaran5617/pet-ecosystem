create extension if not exists postgis with schema extensions;

alter table public.pet_alert_lost_pets
  add column public_latitude double precision,
  add column public_longitude double precision,
  add column location_accuracy_meters double precision,
  add column location_source text not null default 'legacy_text',
  add column location_captured_at timestamptz,
  add column public_location_visible boolean not null default false,
  add column private_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when last_seen_lat is null or last_seen_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(last_seen_lng, last_seen_lat), 4326)::extensions.geography
    end
  ) stored,
  add column public_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when public_latitude is null or public_longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(public_longitude, public_latitude), 4326)::extensions.geography
    end
  ) stored,
  add constraint pet_alert_lost_pets_public_latitude_range_check
    check (public_latitude is null or public_latitude between -90 and 90),
  add constraint pet_alert_lost_pets_public_longitude_range_check
    check (public_longitude is null or public_longitude between -180 and 180),
  add constraint pet_alert_lost_pets_public_location_pair_check
    check ((public_latitude is null) = (public_longitude is null)),
  add constraint pet_alert_lost_pets_location_accuracy_check
    check (location_accuracy_meters is null or location_accuracy_meters between 0 and 100000),
  add constraint pet_alert_lost_pets_location_source_check
    check (location_source in ('device', 'map', 'search', 'legacy_text')),
  add constraint pet_alert_lost_pets_location_capture_check
    check (
      (location_source = 'legacy_text')
      or (
        last_seen_lat is not null
        and last_seen_lng is not null
        and location_captured_at is not null
      )
    ),
  add constraint pet_alert_lost_pets_public_location_visibility_check
    check (
      not public_location_visible
      or (
        location_source <> 'legacy_text'
        and public_latitude is not null
        and public_longitude is not null
      )
    );

alter table public.pet_alert_lost_pet_sightings
  add column public_latitude double precision,
  add column public_longitude double precision,
  add column location_accuracy_meters double precision,
  add column location_source text not null default 'legacy_text',
  add column location_captured_at timestamptz,
  add column public_location_visible boolean not null default false,
  add column private_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when latitude is null or longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    end
  ) stored,
  add column public_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when public_latitude is null or public_longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(public_longitude, public_latitude), 4326)::extensions.geography
    end
  ) stored,
  add constraint pet_alert_lost_pet_sightings_public_latitude_range_check
    check (public_latitude is null or public_latitude between -90 and 90),
  add constraint pet_alert_lost_pet_sightings_public_longitude_range_check
    check (public_longitude is null or public_longitude between -180 and 180),
  add constraint pet_alert_lost_pet_sightings_public_location_pair_check
    check ((public_latitude is null) = (public_longitude is null)),
  add constraint pet_alert_lost_pet_sightings_location_accuracy_check
    check (location_accuracy_meters is null or location_accuracy_meters between 0 and 100000),
  add constraint pet_alert_lost_pet_sightings_location_source_check
    check (location_source in ('device', 'map', 'search', 'legacy_text')),
  add constraint pet_alert_lost_pet_sightings_location_capture_check
    check (
      (location_source = 'legacy_text')
      or (latitude is not null and longitude is not null and location_captured_at is not null)
    ),
  add constraint pet_alert_lost_pet_sightings_public_location_visibility_check
    check (
      not public_location_visible
      or (
        location_source <> 'legacy_text'
        and public_latitude is not null
        and public_longitude is not null
      )
    );

alter table public.pet_alert_community_sightings
  add column private_latitude double precision,
  add column private_longitude double precision,
  add column public_latitude double precision,
  add column public_longitude double precision,
  add column location_accuracy_meters double precision,
  add column location_source text not null default 'legacy_text',
  add column location_captured_at timestamptz,
  add column public_location_visible boolean not null default false,
  add column private_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when private_latitude is null or private_longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(private_longitude, private_latitude), 4326)::extensions.geography
    end
  ) stored,
  add column public_geo_point extensions.geography(Point, 4326) generated always as (
    case
      when public_latitude is null or public_longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(public_longitude, public_latitude), 4326)::extensions.geography
    end
  ) stored,
  add constraint pet_alert_community_private_latitude_range_check
    check (private_latitude is null or private_latitude between -90 and 90),
  add constraint pet_alert_community_private_longitude_range_check
    check (private_longitude is null or private_longitude between -180 and 180),
  add constraint pet_alert_community_private_location_pair_check
    check ((private_latitude is null) = (private_longitude is null)),
  add constraint pet_alert_community_public_latitude_range_check
    check (public_latitude is null or public_latitude between -90 and 90),
  add constraint pet_alert_community_public_longitude_range_check
    check (public_longitude is null or public_longitude between -180 and 180),
  add constraint pet_alert_community_public_location_pair_check
    check ((public_latitude is null) = (public_longitude is null)),
  add constraint pet_alert_community_location_accuracy_check
    check (location_accuracy_meters is null or location_accuracy_meters between 0 and 100000),
  add constraint pet_alert_community_location_source_check
    check (location_source in ('device', 'map', 'search', 'legacy_text')),
  add constraint pet_alert_community_location_capture_check
    check (
      (location_source = 'legacy_text')
      or (
        private_latitude is not null
        and private_longitude is not null
        and location_captured_at is not null
      )
    ),
  add constraint pet_alert_community_public_location_visibility_check
    check (
      not public_location_visible
      or (
        location_source <> 'legacy_text'
        and public_latitude is not null
        and public_longitude is not null
      )
    );

create index pet_alert_lost_pets_public_geo_idx
  on public.pet_alert_lost_pets using gist (public_geo_point)
  where public_location_visible;

create index pet_alert_lost_pet_sightings_public_geo_idx
  on public.pet_alert_lost_pet_sightings using gist (public_geo_point)
  where public_location_visible;

create index pet_alert_community_sightings_public_geo_idx
  on public.pet_alert_community_sightings using gist (public_geo_point)
  where public_location_visible;

create or replace function public.generate_pet_alert_public_location(
  private_latitude double precision,
  private_longitude double precision,
  minimum_distance_meters double precision default 250,
  maximum_distance_meters double precision default 500
)
returns table (public_latitude double precision, public_longitude double precision)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  origin_point extensions.geography;
  projected_point extensions.geography;
  offset_distance double precision;
  offset_azimuth double precision;
begin
  if private_latitude is null
    or private_longitude is null
    or private_latitude < -90
    or private_latitude > 90
    or private_longitude < -180
    or private_longitude > 180 then
    raise exception 'PET_ALERT_LOCATION_INVALID';
  end if;

  if minimum_distance_meters < 100
    or maximum_distance_meters > 5000
    or maximum_distance_meters < minimum_distance_meters then
    raise exception 'PET_ALERT_LOCATION_GENERALIZATION_INVALID';
  end if;

  origin_point := extensions.st_setsrid(
    extensions.st_makepoint(private_longitude, private_latitude),
    4326
  )::extensions.geography;
  offset_distance := minimum_distance_meters
    + random() * (maximum_distance_meters - minimum_distance_meters);
  offset_azimuth := random() * 2 * pi();
  projected_point := extensions.st_project(origin_point, offset_distance, offset_azimuth);

  return query
  select
    round(extensions.st_y(projected_point::extensions.geometry)::numeric, 6)::double precision,
    round(extensions.st_x(projected_point::extensions.geometry)::numeric, 6)::double precision;
end;
$$;

create or replace function public.set_pet_alert_lost_pet_location(
  target_alert_id uuid,
  next_latitude double precision,
  next_longitude double precision,
  next_accuracy_meters double precision,
  next_location_source text,
  next_captured_at timestamptz,
  next_public_location_visible boolean default true
)
returns table (
  private_latitude double precision,
  private_longitude double precision,
  location_accuracy_meters double precision,
  location_source text,
  location_captured_at timestamptz,
  public_location_visible boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text := auth.role();
  selected_alert public.pet_alert_lost_pets;
  generalized record;
begin
  select * into selected_alert
  from public.pet_alert_lost_pets
  where id = target_alert_id
  for update;

  if selected_alert.id is null
    or not (
      current_role = 'service_role'
      or (
        current_user_id is not null
        and selected_alert.source_type = 'registered_pet'
        and public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id)
      )
    ) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  if next_location_source not in ('device', 'map', 'search')
    or next_latitude is null
    or next_longitude is null
    or next_latitude < -90
    or next_latitude > 90
    or next_longitude < -180
    or next_longitude > 180
    or next_accuracy_meters is not null
      and (next_accuracy_meters < 0 or next_accuracy_meters > 100000)
    or next_captured_at is null
    or next_captured_at > now() + interval '15 minutes' then
    raise exception 'PET_ALERT_LOCATION_INVALID';
  end if;

  select * into generalized
  from public.generate_pet_alert_public_location(next_latitude, next_longitude, 250, 500);

  update public.pet_alert_lost_pets
  set last_seen_lat = next_latitude,
      last_seen_lng = next_longitude,
      location_precision = 'approximate',
      public_latitude = generalized.public_latitude,
      public_longitude = generalized.public_longitude,
      location_accuracy_meters = next_accuracy_meters,
      location_source = next_location_source,
      location_captured_at = next_captured_at,
      public_location_visible = coalesce(next_public_location_visible, true),
      updated_at = now()
  where id = target_alert_id;

  if current_user_id is not null then
    perform public.insert_audit_log(
      'pet_alert_lost_pet',
      target_alert_id,
      'pet_alert_location_confirmed',
      jsonb_build_object(
        'source', next_location_source,
        'public_location_visible', coalesce(next_public_location_visible, true)
      ),
      current_user_id
    );
  end if;

  return query
  select alert.last_seen_lat,
    alert.last_seen_lng,
    alert.location_accuracy_meters,
    alert.location_source,
    alert.location_captured_at,
    alert.public_location_visible
  from public.pet_alert_lost_pets alert
  where alert.id = target_alert_id;
end;
$$;

create or replace function public.set_pet_alert_lost_pet_sighting_location(
  target_sighting_id uuid,
  next_latitude double precision,
  next_longitude double precision,
  next_accuracy_meters double precision,
  next_location_source text,
  next_captured_at timestamptz,
  next_public_location_visible boolean default false
)
returns table (
  private_latitude double precision,
  private_longitude double precision,
  location_accuracy_meters double precision,
  location_source text,
  location_captured_at timestamptz,
  public_location_visible boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text := auth.role();
  selected_sighting public.pet_alert_lost_pet_sightings;
  generalized record;
begin
  select * into selected_sighting
  from public.pet_alert_lost_pet_sightings
  where id = target_sighting_id
  for update;

  if selected_sighting.id is null
    or not (
      current_role = 'service_role'
      or selected_sighting.reporter_user_id = current_user_id
      or public.can_manage_pet_alert_lost_pet(selected_sighting.alert_id, current_user_id)
    ) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  if next_location_source not in ('device', 'map', 'search')
    or next_latitude is null
    or next_longitude is null
    or next_latitude < -90
    or next_latitude > 90
    or next_longitude < -180
    or next_longitude > 180
    or next_accuracy_meters is not null
      and (next_accuracy_meters < 0 or next_accuracy_meters > 100000)
    or next_captured_at is null
    or next_captured_at > now() + interval '15 minutes' then
    raise exception 'PET_ALERT_LOCATION_INVALID';
  end if;

  select * into generalized
  from public.generate_pet_alert_public_location(next_latitude, next_longitude, 250, 500);

  update public.pet_alert_lost_pet_sightings
  set latitude = next_latitude,
      longitude = next_longitude,
      location_precision = 'approximate',
      public_latitude = generalized.public_latitude,
      public_longitude = generalized.public_longitude,
      location_accuracy_meters = next_accuracy_meters,
      location_source = next_location_source,
      location_captured_at = next_captured_at,
      public_location_visible = coalesce(next_public_location_visible, false),
      updated_at = now()
  where id = target_sighting_id;

  if current_user_id is not null then
    perform public.insert_audit_log(
      'pet_alert_lost_pet_sighting',
      target_sighting_id,
      'pet_alert_location_confirmed',
      jsonb_build_object(
        'source', next_location_source,
        'public_location_visible', coalesce(next_public_location_visible, false)
      ),
      current_user_id
    );
  end if;

  return query
  select sighting.latitude,
    sighting.longitude,
    sighting.location_accuracy_meters,
    sighting.location_source,
    sighting.location_captured_at,
    sighting.public_location_visible
  from public.pet_alert_lost_pet_sightings sighting
  where sighting.id = target_sighting_id;
end;
$$;

create or replace function public.set_pet_alert_community_sighting_location(
  target_report_id uuid,
  next_latitude double precision,
  next_longitude double precision,
  next_accuracy_meters double precision,
  next_location_source text,
  next_captured_at timestamptz,
  next_public_location_visible boolean default true
)
returns table (
  private_latitude double precision,
  private_longitude double precision,
  location_accuracy_meters double precision,
  location_source text,
  location_captured_at timestamptz,
  public_location_visible boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text := auth.role();
  selected_report public.pet_alert_community_sightings;
  generalized record;
begin
  select * into selected_report
  from public.pet_alert_community_sightings
  where id = target_report_id
  for update;

  if selected_report.id is null
    or not (
      current_role = 'service_role'
      or selected_report.reporter_user_id = current_user_id
    ) then
    raise exception 'PET_ALERT_UNAUTHORIZED';
  end if;

  if next_location_source not in ('device', 'map', 'search')
    or next_latitude is null
    or next_longitude is null
    or next_latitude < -90
    or next_latitude > 90
    or next_longitude < -180
    or next_longitude > 180
    or next_accuracy_meters is not null
      and (next_accuracy_meters < 0 or next_accuracy_meters > 100000)
    or next_captured_at is null
    or next_captured_at > now() + interval '15 minutes' then
    raise exception 'PET_ALERT_LOCATION_INVALID';
  end if;

  select * into generalized
  from public.generate_pet_alert_public_location(next_latitude, next_longitude, 250, 500);

  update public.pet_alert_community_sightings
  set private_latitude = next_latitude,
      private_longitude = next_longitude,
      location_precision = 'approximate',
      public_latitude = generalized.public_latitude,
      public_longitude = generalized.public_longitude,
      location_accuracy_meters = next_accuracy_meters,
      location_source = next_location_source,
      location_captured_at = next_captured_at,
      public_location_visible = coalesce(next_public_location_visible, true),
      updated_at = now()
  where id = target_report_id;

  if current_user_id is not null then
    perform public.insert_audit_log(
      'pet_alert_community_sighting',
      target_report_id,
      'pet_alert_location_confirmed',
      jsonb_build_object(
        'source', next_location_source,
        'public_location_visible', coalesce(next_public_location_visible, true)
      ),
      current_user_id
    );
  end if;

  return query
  select report.private_latitude,
    report.private_longitude,
    report.location_accuracy_meters,
    report.location_source,
    report.location_captured_at,
    report.public_location_visible
  from public.pet_alert_community_sightings report
  where report.id = target_report_id;
end;
$$;

create or replace function public.list_public_pet_alert_map_points(
  filter_view text default 'lost',
  filter_query text default null,
  filter_city text default null,
  filter_species text default null,
  bounds_min_latitude double precision default null,
  bounds_min_longitude double precision default null,
  bounds_max_latitude double precision default null,
  bounds_max_longitude double precision default null,
  result_limit integer default 250
)
returns table (
  event_type text,
  public_slug text,
  public_path text,
  status text,
  status_group text,
  title text,
  species text,
  city text,
  occurred_at timestamptz,
  public_latitude double precision,
  public_longitude double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_bounds boolean := bounds_min_latitude is not null
    or bounds_min_longitude is not null
    or bounds_max_latitude is not null
    or bounds_max_longitude is not null;
begin
  if filter_view not in ('lost', 'seen', 'found') then
    raise exception 'PET_ALERT_MAP_FILTER_INVALID';
  end if;

  if has_bounds and (
    bounds_min_latitude is null
    or bounds_min_longitude is null
    or bounds_max_latitude is null
    or bounds_max_longitude is null
    or bounds_min_latitude < -90
    or bounds_max_latitude > 90
    or bounds_min_longitude < -180
    or bounds_max_longitude > 180
    or bounds_min_latitude > bounds_max_latitude
    or bounds_min_longitude > bounds_max_longitude
  ) then
    raise exception 'PET_ALERT_MAP_BOUNDS_INVALID';
  end if;

  return query
  with public_events as (
    select
      'lost_pet'::text as event_type,
      alert.alert_slug as public_slug,
      ('/pet-alert/mascota-perdida/' || alert.alert_slug)::text as public_path,
      alert.status,
      case when alert.status = 'found' then 'found' else 'active' end::text as status_group,
      alert.pet_name as title,
      alert.pet_species as species,
      alert.last_seen_city as city,
      alert.last_seen_at as occurred_at,
      alert.public_latitude,
      alert.public_longitude
    from public.pet_alert_lost_pets alert
    where alert.share_enabled
      and alert.public_location_visible
      and alert.public_geo_point is not null
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
      report.city,
      report.sighted_at,
      report.public_latitude,
      report.public_longitude
    from public.pet_alert_community_sightings report
    where report.share_enabled
      and report.public_location_visible
      and report.public_geo_point is not null
      and report.status in (
        'sighting_open',
        'sheltered_by_reporter',
        'possible_owner_claim',
        'owner_verified',
        'reunited'
      )
      and (report.status = 'reunited' or report.expires_at > now())
  )
  select event.event_type,
    event.public_slug,
    event.public_path,
    event.status,
    event.status_group,
    event.title,
    event.species,
    event.city,
    event.occurred_at,
    event.public_latitude,
    event.public_longitude
  from public_events event
  where (
      (filter_view = 'lost' and event.event_type = 'lost_pet' and event.status_group = 'active')
      or (filter_view = 'seen' and event.event_type = 'community_sighting' and event.status_group = 'active')
      or (filter_view = 'found' and event.status_group = 'found')
    )
    and (
      nullif(trim(filter_query), '') is null
      or concat_ws(' ', event.title, event.species, event.city)
        ilike '%' || trim(filter_query) || '%'
    )
    and (nullif(trim(filter_city), '') is null or event.city ilike trim(filter_city))
    and (nullif(trim(filter_species), '') is null or event.species ilike trim(filter_species))
    and (
      not has_bounds
      or (
        event.public_latitude between bounds_min_latitude and bounds_max_latitude
        and event.public_longitude between bounds_min_longitude and bounds_max_longitude
      )
    )
  order by event.occurred_at desc
  limit least(greatest(coalesce(result_limit, 250), 1), 500);
end;
$$;

revoke all on function public.generate_pet_alert_public_location(double precision, double precision, double precision, double precision) from public;
revoke all on function public.set_pet_alert_lost_pet_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public;
revoke all on function public.set_pet_alert_lost_pet_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public;
revoke all on function public.set_pet_alert_community_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public;
revoke all on function public.list_public_pet_alert_map_points(text, text, text, text, double precision, double precision, double precision, double precision, integer) from public;

grant execute on function public.generate_pet_alert_public_location(double precision, double precision, double precision, double precision) to service_role;
grant execute on function public.set_pet_alert_lost_pet_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
grant execute on function public.set_pet_alert_lost_pet_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
grant execute on function public.set_pet_alert_community_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
grant execute on function public.list_public_pet_alert_map_points(text, text, text, text, double precision, double precision, double precision, double precision, integer) to anon, authenticated;
