create or replace function public.upsert_protective_public_profile(
  target_household_id uuid,
  next_display_name text,
  next_mission text default null,
  next_public_story text default null,
  next_city text default null,
  next_state_region text default null,
  next_country_code text default 'PA',
  next_contact_policy text default 'platform_only',
  next_public_contact_label text default null,
  next_public_contact_value text default null,
  next_needs_summary text default null,
  next_website_url text default null,
  next_instagram_url text default null,
  next_facebook_url text default null,
  next_tiktok_url text default null,
  next_whatsapp_url text default null
)
returns public.protective_household_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_display_name text := nullif(trim(next_display_name), '');
  normalized_city text := nullif(trim(coalesce(next_city, '')), '');
  normalized_country_code text := upper(coalesce(nullif(trim(next_country_code), ''), 'PA'));
  normalized_contact_policy text := coalesce(nullif(trim(next_contact_policy), ''), 'platform_only');
  existing_profile public.protective_household_public_profiles%rowtype;
  saved_profile public.protective_household_public_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update protective public profile';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'Household admin required to update protective public profile';
  end if;

  if not public.is_approved_protective_household(target_household_id) then
    raise exception 'Solo una familia protectora aprobada puede preparar un perfil publico.';
  end if;

  if normalized_display_name is null then
    raise exception 'El nombre visible es obligatorio.';
  end if;

  if normalized_city is null then
    raise exception 'La ciudad es obligatoria.';
  end if;

  if char_length(normalized_country_code) <> 2 then
    raise exception 'El pais debe usar codigo ISO de dos letras.';
  end if;

  if normalized_contact_policy not in ('platform_only', 'public_email', 'public_phone', 'external_link') then
    raise exception 'Politica de contacto no soportada.';
  end if;

  select *
  into existing_profile
  from public.protective_household_public_profiles
  where household_id = target_household_id;

  if existing_profile.id is not null and existing_profile.moderation_status not in ('draft', 'rejected', 'approved') then
    raise exception 'El perfil publico solo puede editarse en borrador, rechazado o aprobado.';
  end if;

  insert into public.protective_household_public_profiles (
    household_id,
    public_slug,
    display_name,
    mission,
    public_story,
    city,
    state_region,
    country_code,
    contact_policy,
    public_contact_label,
    public_contact_value,
    needs_summary,
    website_url,
    instagram_url,
    facebook_url,
    tiktok_url,
    whatsapp_url,
    is_public,
    moderation_status,
    review_notes,
    reviewed_by_user_id,
    reviewed_at,
    created_by_user_id
  )
  values (
    target_household_id,
    public.make_unique_protective_public_slug(normalized_display_name, target_household_id),
    normalized_display_name,
    nullif(trim(coalesce(next_mission, '')), ''),
    nullif(trim(coalesce(next_public_story, '')), ''),
    normalized_city,
    nullif(trim(coalesce(next_state_region, '')), ''),
    normalized_country_code,
    normalized_contact_policy,
    nullif(trim(coalesce(next_public_contact_label, '')), ''),
    nullif(trim(coalesce(next_public_contact_value, '')), ''),
    nullif(trim(coalesce(next_needs_summary, '')), ''),
    public.normalize_optional_https_url(next_website_url),
    public.normalize_optional_https_url(next_instagram_url),
    public.normalize_optional_https_url(next_facebook_url),
    public.normalize_optional_https_url(next_tiktok_url),
    public.normalize_optional_https_url(next_whatsapp_url),
    false,
    'draft',
    null,
    null,
    null,
    current_user_id
  )
  on conflict (household_id)
  do update set
    display_name = excluded.display_name,
    mission = excluded.mission,
    public_story = excluded.public_story,
    city = excluded.city,
    state_region = excluded.state_region,
    country_code = excluded.country_code,
    contact_policy = excluded.contact_policy,
    public_contact_label = excluded.public_contact_label,
    public_contact_value = excluded.public_contact_value,
    needs_summary = excluded.needs_summary,
    website_url = excluded.website_url,
    instagram_url = excluded.instagram_url,
    facebook_url = excluded.facebook_url,
    tiktok_url = excluded.tiktok_url,
    whatsapp_url = excluded.whatsapp_url,
    is_public = false,
    moderation_status = 'draft',
    review_notes = null,
    reviewed_by_user_id = null,
    reviewed_at = null,
    updated_at = now()
  returning * into saved_profile;

  perform public.insert_audit_log(
    'protective_household_public_profile',
    saved_profile.id,
    'protective_public_profile_saved',
    jsonb_build_object(
      'household_id',
      saved_profile.household_id,
      'previous_status',
      existing_profile.moderation_status,
      'status',
      saved_profile.moderation_status
    ),
    current_user_id
  );

  return saved_profile;
end;
$$;

grant execute on function public.upsert_protective_public_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
