create table if not exists public.protective_household_public_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  public_slug text not null unique,
  display_name text not null,
  mission text null,
  public_story text null,
  city text not null,
  state_region text null,
  country_code text not null default 'PA',
  contact_policy text not null default 'platform_only',
  public_contact_label text null,
  public_contact_value text null,
  needs_summary text null,
  is_public boolean not null default false,
  moderation_status text not null default 'draft',
  review_notes text null,
  reviewed_by_user_id uuid null references auth.users(id),
  reviewed_at timestamptz null,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protective_household_public_profiles_contact_policy_check
    check (contact_policy in ('platform_only', 'public_email', 'public_phone', 'external_link')),
  constraint protective_household_public_profiles_moderation_status_check
    check (moderation_status in ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
  constraint protective_household_public_profiles_country_code_check
    check (char_length(country_code) = 2),
  constraint protective_household_public_profiles_display_name_check
    check (length(trim(display_name)) > 0),
  constraint protective_household_public_profiles_city_check
    check (length(trim(city)) > 0),
  constraint protective_household_public_profiles_slug_check
    check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.protective_household_public_profiles is
  'Perfil publico moderado de familias protectoras aprobadas. Separado del perfil interno de aprobacion.';

create index if not exists protective_household_public_profiles_household_idx
  on public.protective_household_public_profiles(household_id);

create index if not exists protective_household_public_profiles_public_idx
  on public.protective_household_public_profiles(moderation_status, is_public);

drop trigger if exists trg_protective_household_public_profiles_updated_at
  on public.protective_household_public_profiles;
create trigger trg_protective_household_public_profiles_updated_at
before update on public.protective_household_public_profiles
for each row execute function public.set_updated_at();

alter table public.protective_household_public_profiles enable row level security;

drop policy if exists protective_public_profiles_select_public
  on public.protective_household_public_profiles;
create policy protective_public_profiles_select_public
on public.protective_household_public_profiles
for select
to anon, authenticated
using (
  is_public = true
  and moderation_status = 'approved'
);

drop policy if exists protective_public_profiles_select_household
  on public.protective_household_public_profiles;
create policy protective_public_profiles_select_household
on public.protective_household_public_profiles
for select
to authenticated
using (
  public.can_view_household(household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists protective_public_profiles_admin_all
  on public.protective_household_public_profiles;
create policy protective_public_profiles_admin_all
on public.protective_household_public_profiles
for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

create or replace function public.normalize_public_slug(next_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(next_value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.make_unique_protective_public_slug(next_display_name text, target_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text := public.normalize_public_slug(next_display_name);
  candidate_slug text;
  suffix text := substring(replace(target_household_id::text, '-', ''), 1, 6);
  counter integer := 0;
begin
  if base_slug is null or base_slug = '' then
    base_slug := 'familia-protectora';
  end if;

  candidate_slug := base_slug;

  while exists (
    select 1
    from public.protective_household_public_profiles as profile
    where profile.public_slug = candidate_slug
      and profile.household_id <> target_household_id
  ) loop
    counter := counter + 1;
    candidate_slug := base_slug || '-' || suffix || case when counter > 1 then '-' || counter::text else '' end;
  end loop;

  return candidate_slug;
end;
$$;

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
  next_needs_summary text default null
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

create or replace function public.submit_protective_public_profile(target_profile_id uuid)
returns public.protective_household_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  submitted_profile public.protective_household_public_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to submit protective public profile';
  end if;

  select *
  into submitted_profile
  from public.protective_household_public_profiles
  where id = target_profile_id;

  if submitted_profile.id is null then
    raise exception 'Perfil publico no encontrado.';
  end if;

  if not public.can_manage_household(submitted_profile.household_id, current_user_id) then
    raise exception 'Household admin required to submit protective public profile';
  end if;

  if not public.is_approved_protective_household(submitted_profile.household_id) then
    raise exception 'Solo una familia protectora aprobada puede enviar perfil publico.';
  end if;

  if submitted_profile.moderation_status not in ('draft', 'rejected') then
    raise exception 'El perfil publico no esta listo para enviarse a revision.';
  end if;

  update public.protective_household_public_profiles
  set
    moderation_status = 'pending_review',
    is_public = false,
    review_notes = null,
    reviewed_by_user_id = null,
    reviewed_at = null,
    updated_at = now()
  where id = target_profile_id
  returning * into submitted_profile;

  perform public.insert_audit_log(
    'protective_household_public_profile',
    submitted_profile.id,
    'protective_public_profile_submitted',
    jsonb_build_object('household_id', submitted_profile.household_id),
    current_user_id
  );

  return submitted_profile;
end;
$$;

create or replace function public.review_protective_public_profile(
  target_profile_id uuid,
  decision text,
  notes text default null
)
returns public.protective_household_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_decision text := lower(trim(decision));
  normalized_notes text := nullif(trim(coalesce(notes, '')), '');
  reviewed_profile public.protective_household_public_profiles%rowtype;
begin
  if current_user_id is null or not public.is_platform_admin(current_user_id) then
    raise exception 'Platform admin required to review protective public profile';
  end if;

  if normalized_decision not in ('approved', 'rejected', 'suspended') then
    raise exception 'Decision no soportada.';
  end if;

  if normalized_decision in ('rejected', 'suspended') and normalized_notes is null then
    raise exception 'La nota es obligatoria para rechazar o suspender.';
  end if;

  update public.protective_household_public_profiles
  set
    moderation_status = normalized_decision,
    is_public = normalized_decision = 'approved',
    review_notes = normalized_notes,
    reviewed_by_user_id = current_user_id,
    reviewed_at = now(),
    updated_at = now()
  where id = target_profile_id
    and moderation_status in ('pending_review', 'approved', 'suspended')
  returning * into reviewed_profile;

  if reviewed_profile.id is null then
    raise exception 'Perfil publico no disponible para revision.';
  end if;

  perform public.insert_audit_log(
    'protective_household_public_profile',
    reviewed_profile.id,
    'protective_public_profile_reviewed',
    jsonb_build_object(
      'household_id', reviewed_profile.household_id,
      'decision', normalized_decision,
      'is_public', reviewed_profile.is_public
    ),
    current_user_id
  );

  return reviewed_profile;
end;
$$;

create or replace function public.get_public_protective_profile_by_slug(target_slug text)
returns setof public.protective_household_public_profiles
language sql
stable
security definer
set search_path = public
as $$
  select profile.*
  from public.protective_household_public_profiles as profile
  where profile.public_slug = public.normalize_public_slug(target_slug)
    and profile.moderation_status = 'approved'
    and profile.is_public = true;
$$;

create or replace function public.list_pending_protective_public_profiles_for_admin()
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

grant select on public.protective_household_public_profiles to anon, authenticated;
grant execute on function public.normalize_public_slug(text) to anon, authenticated;
grant execute on function public.make_unique_protective_public_slug(text, uuid) to authenticated;
grant execute on function public.upsert_protective_public_profile(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_protective_public_profile(uuid) to authenticated;
grant execute on function public.review_protective_public_profile(uuid, text, text) to authenticated;
grant execute on function public.get_public_protective_profile_by_slug(text) to anon, authenticated;
grant execute on function public.list_pending_protective_public_profiles_for_admin() to authenticated;
