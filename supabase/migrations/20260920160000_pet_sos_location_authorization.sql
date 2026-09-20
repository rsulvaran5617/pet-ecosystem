-- SOS Foundation-1A: reject indeterminate authorization and inherited anon grants.
-- Preserve existing signatures and authorized callers; do not rewrite MAP-2 history.

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
  jwt_role text := auth.role();
  selected_sighting public.pet_alert_lost_pet_sightings;
  generalized record;
begin
  select * into selected_sighting
  from public.pet_alert_lost_pet_sightings
  where id = target_sighting_id
  for update;

  if selected_sighting.id is null
    or (
      jwt_role = 'service_role'
      or selected_sighting.reporter_user_id = current_user_id
      or public.can_manage_pet_alert_lost_pet(selected_sighting.alert_id, current_user_id)
    ) is not true then
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
  jwt_role text := auth.role();
  selected_report public.pet_alert_community_sightings;
  generalized record;
begin
  select * into selected_report
  from public.pet_alert_community_sightings
  where id = target_report_id
  for update;

  if selected_report.id is null
    or (
      jwt_role = 'service_role'
      or selected_report.reporter_user_id = current_user_id
    ) is not true then
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

revoke all on function public.set_pet_alert_lost_pet_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public, anon;
grant execute on function public.set_pet_alert_lost_pet_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
revoke all on function public.set_pet_alert_community_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public, anon;
grant execute on function public.set_pet_alert_community_sighting_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
