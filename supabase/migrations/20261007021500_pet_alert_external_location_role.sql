-- Avoid SQL CURRENT_ROLE inside SECURITY DEFINER; preserve JWT-based authorization.
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
  jwt_role text := auth.role();
  selected_alert public.pet_alert_lost_pets;
  generalized record;
begin
  select * into selected_alert
  from public.pet_alert_lost_pets
  where id = target_alert_id
  for update;

  if selected_alert.id is null
    or (
      jwt_role = 'service_role'
      or (
        current_user_id is not null
        and selected_alert.source_type = 'registered_pet'
        and public.can_manage_pet_alert_lost_pet(target_alert_id, current_user_id)
      )
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

revoke all on function public.set_pet_alert_lost_pet_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) from public, anon;
grant execute on function public.set_pet_alert_lost_pet_location(uuid, double precision, double precision, double precision, text, timestamptz, boolean) to authenticated, service_role;
