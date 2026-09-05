create or replace function public.list_admin_pet_alert_geographic_locations(
  filter_target_type text default 'all',
  filter_location_state text default 'all',
  result_limit integer default 100
)
returns table (
  target_type text,
  target_id uuid,
  public_slug text,
  status text,
  title text,
  species text,
  city text,
  private_latitude double precision,
  private_longitude double precision,
  public_latitude double precision,
  public_longitude double precision,
  location_accuracy_meters double precision,
  location_source text,
  location_captured_at timestamptz,
  public_location_visible boolean,
  updated_at timestamptz
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
  if filter_target_type not in ('all', 'lost_pet', 'community_sighting')
    or filter_location_state not in ('all', 'visible', 'hidden', 'missing') then
    raise exception 'PET_ALERT_GEOGRAPHIC_FILTER_INVALID';
  end if;

  return query
  with locations as (
    select
      'lost_pet'::text as target_type,
      alert.id as target_id,
      alert.alert_slug as public_slug,
      alert.status,
      alert.pet_name as title,
      alert.pet_species as species,
      alert.last_seen_city as city,
      alert.last_seen_lat as private_latitude,
      alert.last_seen_lng as private_longitude,
      alert.public_latitude,
      alert.public_longitude,
      alert.location_accuracy_meters,
      alert.location_source,
      alert.location_captured_at,
      alert.public_location_visible,
      alert.updated_at
    from public.pet_alert_lost_pets alert

    union all

    select
      'community_sighting'::text,
      report.id,
      report.report_slug,
      report.status,
      report.animal_species,
      report.animal_species,
      report.city,
      report.private_latitude,
      report.private_longitude,
      report.public_latitude,
      report.public_longitude,
      report.location_accuracy_meters,
      report.location_source,
      report.location_captured_at,
      report.public_location_visible,
      report.updated_at
    from public.pet_alert_community_sightings report
  )
  select location.*
  from locations location
  where (filter_target_type = 'all' or location.target_type = filter_target_type)
    and (
      filter_location_state = 'all'
      or (filter_location_state = 'visible' and location.public_location_visible)
      or (filter_location_state = 'hidden' and location.private_latitude is not null and not location.public_location_visible)
      or (filter_location_state = 'missing' and location.private_latitude is null)
    )
  order by location.updated_at desc
  limit least(greatest(coalesce(result_limit, 100), 1), 250);
end;
$$;

create or replace function public.moderate_pet_alert_geographic_location(
  target_type text,
  target_id uuid,
  moderation_action text,
  moderation_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  private_latitude double precision;
  private_longitude double precision;
  existing_public_latitude double precision;
  existing_public_longitude double precision;
  generalized record;
  next_visible boolean;
begin
  if not public.is_platform_admin(current_user_id) then
    raise exception 'PET_ALERT_ADMIN_REQUIRED';
  end if;
  if target_type not in ('lost_pet', 'community_sighting')
    or moderation_action not in ('hide', 'restore', 'regenerate')
    or length(trim(coalesce(moderation_reason, ''))) < 8 then
    raise exception 'PET_ALERT_GEOGRAPHIC_MODERATION_INVALID';
  end if;

  if target_type = 'lost_pet' then
    select alert.last_seen_lat, alert.last_seen_lng, alert.public_latitude, alert.public_longitude
    into private_latitude, private_longitude, existing_public_latitude, existing_public_longitude
    from public.pet_alert_lost_pets alert
    where alert.id = target_id
    for update;
  else
    select report.private_latitude, report.private_longitude, report.public_latitude, report.public_longitude
    into private_latitude, private_longitude, existing_public_latitude, existing_public_longitude
    from public.pet_alert_community_sightings report
    where report.id = target_id
    for update;
  end if;

  if private_latitude is null or private_longitude is null then
    raise exception 'PET_ALERT_LOCATION_NOT_FOUND';
  end if;
  if moderation_action = 'restore'
    and (existing_public_latitude is null or existing_public_longitude is null) then
    raise exception 'PET_ALERT_PUBLIC_LOCATION_NOT_FOUND';
  end if;

  if moderation_action = 'regenerate' then
    select * into generalized
    from public.generate_pet_alert_public_location(private_latitude, private_longitude, 250, 500);
  end if;
  next_visible := moderation_action <> 'hide';

  if target_type = 'lost_pet' then
    if moderation_action = 'regenerate' then
      update public.pet_alert_lost_pets
      set public_latitude = generalized.public_latitude,
          public_longitude = generalized.public_longitude,
          public_location_visible = true,
          updated_at = now()
      where id = target_id;
    else
      update public.pet_alert_lost_pets
      set public_location_visible = next_visible, updated_at = now()
      where id = target_id;
    end if;
  else
    if moderation_action = 'regenerate' then
      update public.pet_alert_community_sightings
      set public_latitude = generalized.public_latitude,
          public_longitude = generalized.public_longitude,
          public_location_visible = true,
          updated_at = now()
      where id = target_id;
    else
      update public.pet_alert_community_sightings
      set public_location_visible = next_visible, updated_at = now()
      where id = target_id;
    end if;
  end if;

  perform public.insert_audit_log(
    'pet_alert_geographic_location',
    target_id,
    'pet_alert_geographic_' || moderation_action,
    jsonb_build_object(
      'target_type', target_type,
      'reason', trim(moderation_reason),
      'public_location_visible', next_visible
    ),
    current_user_id
  );
  return true;
end;
$$;

revoke all on function public.list_admin_pet_alert_geographic_locations(text, text, integer) from public;
revoke all on function public.moderate_pet_alert_geographic_location(text, uuid, text, text) from public;

grant execute on function public.list_admin_pet_alert_geographic_locations(text, text, integer) to authenticated;
grant execute on function public.moderate_pet_alert_geographic_location(text, uuid, text, text) to authenticated;
