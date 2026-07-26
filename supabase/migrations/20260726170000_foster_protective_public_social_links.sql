alter table public.protective_household_public_profiles
  add column if not exists website_url text null,
  add column if not exists instagram_url text null,
  add column if not exists facebook_url text null,
  add column if not exists tiktok_url text null,
  add column if not exists whatsapp_url text null;

comment on column public.protective_household_public_profiles.website_url is
  'Enlace publico opcional del sitio web de la Familia Protectora.';

comment on column public.protective_household_public_profiles.instagram_url is
  'Enlace publico opcional de Instagram de la Familia Protectora.';

comment on column public.protective_household_public_profiles.facebook_url is
  'Enlace publico opcional de Facebook de la Familia Protectora.';

comment on column public.protective_household_public_profiles.tiktok_url is
  'Enlace publico opcional de TikTok de la Familia Protectora.';

comment on column public.protective_household_public_profiles.whatsapp_url is
  'Enlace publico opcional de WhatsApp declarado por la Familia Protectora.';

alter table public.protective_household_public_profiles
  drop constraint if exists protective_household_public_profiles_website_url_check,
  drop constraint if exists protective_household_public_profiles_instagram_url_check,
  drop constraint if exists protective_household_public_profiles_facebook_url_check,
  drop constraint if exists protective_household_public_profiles_tiktok_url_check,
  drop constraint if exists protective_household_public_profiles_whatsapp_url_check,
  add constraint protective_household_public_profiles_website_url_check
    check (website_url is null or website_url ~* '^https://'),
  add constraint protective_household_public_profiles_instagram_url_check
    check (instagram_url is null or instagram_url ~* '^https://(www\.)?instagram\.com/'),
  add constraint protective_household_public_profiles_facebook_url_check
    check (facebook_url is null or facebook_url ~* '^https://(www\.)?facebook\.com/'),
  add constraint protective_household_public_profiles_tiktok_url_check
    check (tiktok_url is null or tiktok_url ~* '^https://(www\.)?tiktok\.com/'),
  add constraint protective_household_public_profiles_whatsapp_url_check
    check (whatsapp_url is null or whatsapp_url ~* '^https://(wa\.me|api\.whatsapp\.com)/');

create or replace function public.normalize_optional_https_url(next_value text)
returns text
language sql
immutable
as $$
  select nullif(trim(coalesce(next_value, '')), '');
$$;

grant execute on function public.normalize_optional_https_url(text) to anon, authenticated;

drop function if exists public.upsert_protective_public_profile(uuid, text, text, text, text, text, text, text, text, text, text);

create function public.upsert_protective_public_profile(
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

  if existing_profile.id is not null and existing_profile.moderation_status not in ('draft', 'rejected') then
    raise exception 'El perfil publico solo puede editarse en borrador o rechazado.';
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
    jsonb_build_object('household_id', saved_profile.household_id, 'status', saved_profile.moderation_status),
    current_user_id
  );

  return saved_profile;
end;
$$;

grant execute on function public.upsert_protective_public_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

drop function if exists public.list_pending_protective_public_profiles_for_admin();

create function public.list_pending_protective_public_profiles_for_admin()
returns table (
  id uuid,
  household_id uuid,
  public_slug text,
  display_name text,
  mission text,
  public_story text,
  city text,
  state_region text,
  country_code text,
  contact_policy text,
  public_contact_label text,
  public_contact_value text,
  needs_summary text,
  website_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  whatsapp_url text,
  logo_storage_bucket text,
  logo_storage_path text,
  is_public boolean,
  moderation_status text,
  review_notes text,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  household_name text,
  created_by_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.household_id,
    profile.public_slug,
    profile.display_name,
    profile.mission,
    profile.public_story,
    profile.city,
    profile.state_region,
    profile.country_code,
    profile.contact_policy,
    profile.public_contact_label,
    profile.public_contact_value,
    profile.needs_summary,
    profile.website_url,
    profile.instagram_url,
    profile.facebook_url,
    profile.tiktok_url,
    profile.whatsapp_url,
    profile.logo_storage_bucket,
    profile.logo_storage_path,
    profile.is_public,
    profile.moderation_status,
    profile.review_notes,
    profile.reviewed_by_user_id,
    profile.reviewed_at,
    profile.created_by_user_id,
    profile.created_at,
    profile.updated_at,
    household.name as household_name,
    auth_user.email as created_by_email
  from public.protective_household_public_profiles as profile
  join public.households as household on household.id = profile.household_id
  left join auth.users as auth_user on auth_user.id = profile.created_by_user_id
  where public.is_platform_admin(auth.uid())
    and profile.moderation_status = 'pending_review'
  order by profile.updated_at asc;
$$;

grant execute on function public.list_pending_protective_public_profiles_for_admin() to authenticated;

drop function if exists public.get_pet_adoption_listing_detail(uuid);
drop function if exists public.list_published_pet_adoption_listings();
drop function if exists public.list_my_pet_adoption_listings(uuid);

create function public.list_my_pet_adoption_listings(target_household_id uuid default null)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text,
  protective_website_url text,
  protective_instagram_url text,
  protective_facebook_url text,
  protective_tiktok_url text,
  protective_whatsapp_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    pet_profile.breed,
    coalesce(pet_profile.sex, 'unknown'),
    pet_profile.birth_date,
    pet_profile.is_sterilized,
    household.name,
    public_profile.website_url,
    public_profile.instagram_url,
    public_profile.facebook_url,
    public_profile.tiktok_url,
    public_profile.whatsapp_url
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  left join public.pet_profiles as pet_profile on pet_profile.pet_id = pet.id
  join public.households as household on household.id = listing.household_id
  left join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = household.id
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
  where public.can_view_household(listing.household_id, auth.uid())
    and (target_household_id is null or listing.household_id = target_household_id)
  order by listing.updated_at desc;
$$;

create function public.list_published_pet_adoption_listings()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text,
  protective_website_url text,
  protective_instagram_url text,
  protective_facebook_url text,
  protective_tiktok_url text,
  protective_whatsapp_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    pet_profile.breed,
    coalesce(pet_profile.sex, 'unknown'),
    pet_profile.birth_date,
    pet_profile.is_sterilized,
    household.name,
    public_profile.website_url,
    public_profile.instagram_url,
    public_profile.facebook_url,
    public_profile.tiktok_url,
    public_profile.whatsapp_url
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  left join public.pet_profiles as pet_profile on pet_profile.pet_id = pet.id
  join public.households as household on household.id = listing.household_id
  left join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = household.id
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
  where listing.status = 'published'
    and listing.share_status = 'enabled'
  order by listing.published_at desc nulls last, listing.updated_at desc;
$$;

create function public.get_pet_adoption_listing_detail(target_listing_id uuid)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text,
  protective_website_url text,
  protective_instagram_url text,
  protective_facebook_url text,
  protective_tiktok_url text,
  protective_whatsapp_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select published_listing.*
  from public.list_published_pet_adoption_listings() as published_listing
  where published_listing.id = target_listing_id
  union all
  select owned_listing.*
  from public.list_my_pet_adoption_listings(null) as owned_listing
  where owned_listing.id = target_listing_id
    and not exists (
      select 1
      from public.list_published_pet_adoption_listings() as existing_published_listing
      where existing_published_listing.id = target_listing_id
    );
$$;

grant execute on function public.list_my_pet_adoption_listings(uuid) to authenticated;
grant execute on function public.list_published_pet_adoption_listings() to anon, authenticated;
grant execute on function public.get_pet_adoption_listing_detail(uuid) to authenticated;

drop function if exists public.get_public_pet_adoption_listing_by_slug(text);

create function public.get_public_pet_adoption_listing_by_slug(target_slug text)
returns table (
  public_slug text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  share_published_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  protective_profile_slug text,
  protective_display_name text,
  protective_mission text,
  protective_public_story text,
  protective_city text,
  protective_state_region text,
  protective_country_code text,
  contact_policy text,
  public_contact_label text,
  public_contact_value text,
  needs_summary text,
  protective_website_url text,
  protective_instagram_url text,
  protective_facebook_url text,
  protective_tiktok_url text,
  protective_whatsapp_url text,
  listing_status text,
  media jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.public_slug,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.share_published_at,
    pet.name,
    pet.species,
    pet_profile.breed,
    coalesce(pet_profile.sex, 'unknown'),
    pet_profile.birth_date,
    pet_profile.is_sterilized,
    public_profile.public_slug,
    public_profile.display_name,
    public_profile.mission,
    public_profile.public_story,
    public_profile.city,
    public_profile.state_region,
    public_profile.country_code,
    public_profile.contact_policy,
    public_profile.public_contact_label,
    public_profile.public_contact_value,
    public_profile.needs_summary,
    public_profile.website_url,
    public_profile.instagram_url,
    public_profile.facebook_url,
    public_profile.tiktok_url,
    public_profile.whatsapp_url,
    listing.status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', media.id,
          'media_type', media.media_type,
          'storage_bucket', media.storage_bucket,
          'storage_path', media.storage_path,
          'file_name', media.file_name,
          'mime_type', media.mime_type,
          'display_order', media.display_order,
          'is_cover', media.is_cover
        )
        order by media.is_cover desc, media.display_order asc, media.created_at asc
      ) filter (where media.id is not null),
      '[]'::jsonb
    ) as media
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  left join public.pet_profiles as pet_profile on pet_profile.pet_id = pet.id
  join public.households as household on household.id = listing.household_id
  join public.protective_household_profiles as protective_profile
    on protective_profile.household_id = household.id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = household.id
  left join public.pet_adoption_listing_media as media
    on media.listing_id = listing.id
    and media.moderation_status = 'approved'
  where listing.public_slug = public.normalize_public_slug(target_slug)
    and listing.status = 'published'
    and listing.share_status = 'enabled'
    and household.household_type = 'protective'
    and protective_profile.status = 'approved'
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
    and pet.status = 'active'
  group by
    listing.id,
    pet.id,
    pet_profile.pet_id,
    public_profile.id;
$$;

grant execute on function public.get_public_pet_adoption_listing_by_slug(text) to anon, authenticated;
