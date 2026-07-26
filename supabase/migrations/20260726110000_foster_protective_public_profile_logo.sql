alter table public.protective_household_public_profiles
  add column if not exists logo_storage_bucket text null,
  add column if not exists logo_storage_path text null;

comment on column public.protective_household_public_profiles.logo_storage_bucket is
  'Bucket privado que almacena el logo del perfil publico moderado de la familia protectora.';

comment on column public.protective_household_public_profiles.logo_storage_path is
  'Ruta privada del logo del perfil publico moderado de la familia protectora.';

insert into storage.buckets (id, name, public)
values ('protective-household-logos', 'protective-household-logos', false)
on conflict (id) do nothing;

create or replace function public.extract_protective_household_id_from_logo_path(storage_path text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_segment text;
begin
  first_segment := split_part(coalesce(storage_path, ''), '/', 1);

  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;

  return null;
end;
$$;

grant execute on function public.extract_protective_household_id_from_logo_path(text) to anon, authenticated;

drop policy if exists protective_household_logos_select on storage.objects;
create policy protective_household_logos_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'protective-household-logos'
  and (
    exists (
      select 1
      from public.protective_household_public_profiles as profile
      where profile.logo_storage_bucket = storage.objects.bucket_id
        and profile.logo_storage_path = storage.objects.name
        and profile.moderation_status = 'approved'
        and profile.is_public = true
    )
    or public.can_view_household(public.extract_protective_household_id_from_logo_path(storage.objects.name), auth.uid())
    or public.is_platform_admin(auth.uid())
  )
);

drop policy if exists protective_household_logos_insert on storage.objects;
create policy protective_household_logos_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'protective-household-logos'
  and public.can_manage_household(public.extract_protective_household_id_from_logo_path(name), auth.uid())
);

drop policy if exists protective_household_logos_update on storage.objects;
create policy protective_household_logos_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'protective-household-logos'
  and public.can_manage_household(public.extract_protective_household_id_from_logo_path(name), auth.uid())
)
with check (
  bucket_id = 'protective-household-logos'
  and public.can_manage_household(public.extract_protective_household_id_from_logo_path(name), auth.uid())
);

drop policy if exists protective_household_logos_delete on storage.objects;
create policy protective_household_logos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'protective-household-logos'
  and public.can_manage_household(public.extract_protective_household_id_from_logo_path(name), auth.uid())
);

create or replace function public.set_protective_public_profile_logo(
  target_profile_id uuid,
  next_logo_storage_bucket text,
  next_logo_storage_path text
)
returns public.protective_household_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_bucket text := nullif(trim(coalesce(next_logo_storage_bucket, '')), '');
  normalized_path text := nullif(trim(coalesce(next_logo_storage_path, '')), '');
  saved_profile public.protective_household_public_profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update protective public profile logo';
  end if;

  select *
  into saved_profile
  from public.protective_household_public_profiles
  where id = target_profile_id;

  if saved_profile.id is null then
    raise exception 'Perfil publico no encontrado.';
  end if;

  if not public.can_manage_household(saved_profile.household_id, current_user_id) then
    raise exception 'Household admin required to update protective public profile logo';
  end if;

  if not public.is_approved_protective_household(saved_profile.household_id) then
    raise exception 'Solo una familia protectora aprobada puede actualizar su logo publico.';
  end if;

  if normalized_bucket <> 'protective-household-logos' then
    raise exception 'Bucket de logo no soportado.';
  end if;

  if public.extract_protective_household_id_from_logo_path(normalized_path) <> saved_profile.household_id then
    raise exception 'La ruta del logo no corresponde a esta familia protectora.';
  end if;

  update public.protective_household_public_profiles
  set
    logo_storage_bucket = normalized_bucket,
    logo_storage_path = normalized_path,
    is_public = false,
    moderation_status = 'draft',
    review_notes = null,
    reviewed_by_user_id = null,
    reviewed_at = null,
    updated_at = now()
  where id = target_profile_id
  returning * into saved_profile;

  perform public.insert_audit_log(
    'protective_household_public_profile',
    saved_profile.id,
    'protective_public_profile_logo_saved',
    jsonb_build_object('household_id', saved_profile.household_id),
    current_user_id
  );

  return saved_profile;
end;
$$;

grant execute on function public.set_protective_public_profile_logo(uuid, text, text) to authenticated;

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
