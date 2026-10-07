-- Qualify pgcrypto without broadening the SECURITY DEFINER search_path.
-- Preserve service-only creation behind CAPTCHA/OTP in the Edge Function.
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
  if auth.role() is distinct from 'service_role' then
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
    || '-' || substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12);

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

revoke all on function public.create_external_pet_alert_report(uuid, text, text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_external_pet_alert_report(uuid, text, text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, text, text) to service_role;
