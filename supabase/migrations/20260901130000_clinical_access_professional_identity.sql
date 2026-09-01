create table public.clinical_professional_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  professional_name text not null check (char_length(trim(professional_name)) between 3 and 160),
  professional_type text not null check (professional_type in ('veterinarian', 'veterinary_technician', 'other')),
  license_reference text not null check (char_length(trim(license_reference)) between 3 and 120),
  jurisdiction text not null check (char_length(trim(jurisdiction)) between 2 and 120),
  country_code text not null default 'PA' check (char_length(country_code) between 2 and 3),
  provider_organization_id uuid references public.provider_organizations (id) on delete set null,
  verification_status text not null default 'draft' check (verification_status in ('draft', 'pending', 'verified', 'rejected', 'suspended', 'expired')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  reviewed_by_user_id uuid references auth.users (id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinical_professional_verification_events (
  id uuid primary key default gen_random_uuid(),
  professional_profile_id uuid not null references public.clinical_professional_profiles (id) on delete cascade,
  event_type text not null check (event_type in ('profile_saved', 'submitted', 'verified', 'rejected', 'suspended')),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

create index clinical_professional_profiles_status_idx on public.clinical_professional_profiles (verification_status, submitted_at);
create index clinical_professional_profiles_organization_idx on public.clinical_professional_profiles (provider_organization_id);
create index clinical_professional_verification_events_profile_idx on public.clinical_professional_verification_events (professional_profile_id, created_at desc);

create trigger trg_clinical_professional_profiles_updated_at
before update on public.clinical_professional_profiles
for each row execute function public.set_updated_at();

alter table public.clinical_professional_profiles enable row level security;
alter table public.clinical_professional_verification_events enable row level security;

create policy clinical_professional_profiles_select_own
on public.clinical_professional_profiles for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create policy clinical_professional_events_select_scoped
on public.clinical_professional_verification_events for select to authenticated
using (public.is_platform_admin(auth.uid()) or exists (
  select 1 from public.clinical_professional_profiles profile
  where profile.id = professional_profile_id and profile.user_id = auth.uid()
));

create or replace function public.get_my_clinical_professional_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', profile.id, 'professionalName', profile.professional_name,
        'professionalType', profile.professional_type, 'licenseReference', profile.license_reference,
        'jurisdiction', profile.jurisdiction, 'countryCode', profile.country_code,
        'providerOrganizationId', profile.provider_organization_id,
        'organizationName', organization.name, 'verificationStatus', case
          when profile.verification_status = 'verified' and profile.verification_expires_at <= now() then 'expired'
          else profile.verification_status end,
        'submittedAt', profile.submitted_at, 'reviewedAt', profile.reviewed_at,
        'verifiedAt', profile.verified_at, 'verificationExpiresAt', profile.verification_expires_at,
        'createdAt', profile.created_at, 'updatedAt', profile.updated_at
      )
      from public.clinical_professional_profiles profile
      left join public.provider_organizations organization on organization.id = profile.provider_organization_id
      where profile.user_id = auth.uid()
    ),
    'organizationOptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', organization.id, 'name', organization.name) order by organization.name)
      from public.provider_organizations organization
      where organization.owner_user_id = auth.uid()
    ), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;

create or replace function public.upsert_my_clinical_professional_profile(
  next_professional_name text,
  next_professional_type text,
  next_license_reference text,
  next_jurisdiction text,
  next_country_code text default 'PA',
  next_provider_organization_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_profile public.clinical_professional_profiles;
  saved_profile public.clinical_professional_profiles;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  if nullif(trim(next_professional_name), '') is null or nullif(trim(next_license_reference), '') is null or nullif(trim(next_jurisdiction), '') is null then
    raise exception 'Professional identity fields are required';
  end if;
  if next_professional_type not in ('veterinarian', 'veterinary_technician', 'other') then raise exception 'Invalid professional type'; end if;
  if next_provider_organization_id is not null and not public.can_manage_provider_organization(next_provider_organization_id, current_user_id) then
    raise exception 'Organization is not available';
  end if;

  select * into existing_profile from public.clinical_professional_profiles where user_id = current_user_id;
  if existing_profile.id is not null and existing_profile.verification_status not in ('draft', 'rejected') then
    raise exception 'Professional profile cannot be edited in its current status';
  end if;

  insert into public.clinical_professional_profiles (
    user_id, professional_name, professional_type, license_reference, jurisdiction,
    country_code, provider_organization_id, verification_status, submitted_at,
    reviewed_at, verified_at, verification_expires_at, reviewed_by_user_id, admin_notes
  ) values (
    current_user_id, trim(next_professional_name), next_professional_type, trim(next_license_reference),
    trim(next_jurisdiction), upper(trim(next_country_code)), next_provider_organization_id, 'draft', null,
    null, null, null, null, null
  )
  on conflict (user_id) do update set
    professional_name = excluded.professional_name,
    professional_type = excluded.professional_type,
    license_reference = excluded.license_reference,
    jurisdiction = excluded.jurisdiction,
    country_code = excluded.country_code,
    provider_organization_id = excluded.provider_organization_id,
    verification_status = 'draft', submitted_at = null, reviewed_at = null,
    verified_at = null, verification_expires_at = null, reviewed_by_user_id = null, admin_notes = null
  returning * into saved_profile;

  insert into public.clinical_professional_verification_events (professional_profile_id, event_type, actor_user_id)
  values (saved_profile.id, 'profile_saved', current_user_id);
  return public.get_my_clinical_professional_context();
end;
$$;

create or replace function public.submit_my_clinical_professional_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  submitted_profile public.clinical_professional_profiles;
begin
  update public.clinical_professional_profiles
  set verification_status = 'pending', submitted_at = now()
  where user_id = current_user_id and verification_status = 'draft'
  returning * into submitted_profile;
  if submitted_profile.id is null then raise exception 'Professional profile is not ready to submit'; end if;
  insert into public.clinical_professional_verification_events (professional_profile_id, event_type, actor_user_id)
  values (submitted_profile.id, 'submitted', current_user_id);
  return public.get_my_clinical_professional_context();
end;
$$;

create or replace function public.get_clinical_access_authenticated_context(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_grant public.pet_clinical_access_grants;
  professional_profile public.clinical_professional_profiles;
  organization_name text;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Clinical access is invalid or expired'; end if;
  select * into target_grant from public.pet_clinical_access_grants
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex');
  if target_grant.id is null or target_grant.status <> 'active' or target_grant.expires_at <= now() then
    raise exception 'Clinical access is invalid or expired';
  end if;
  select * into professional_profile from public.clinical_professional_profiles where user_id = current_user_id;
  if professional_profile.provider_organization_id is not null then
    select name into organization_name from public.provider_organizations where id = professional_profile.provider_organization_id;
  end if;
  insert into public.pet_clinical_access_events (grant_id, event_type, actor_user_id)
  values (target_grant.id, 'viewed', current_user_id);
  return jsonb_build_object(
    'expiresAt', target_grant.expires_at,
    'professional', case when professional_profile.id is null then null else jsonb_build_object(
      'professionalName', professional_profile.professional_name,
      'professionalType', professional_profile.professional_type,
      'organizationName', organization_name,
      'verificationStatus', case
        when professional_profile.verification_status = 'verified' and professional_profile.verification_expires_at <= now() then 'expired'
        else professional_profile.verification_status end,
      'verificationExpiresAt', professional_profile.verification_expires_at
    ) end
  );
end;
$$;

create or replace function public.list_pending_clinical_professionals_for_admin()
returns table (
  id uuid, user_id uuid, professional_name text, professional_type text,
  license_reference text, jurisdiction text, country_code text,
  organization_name text, verification_status text, submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select profile.id, profile.user_id, profile.professional_name, profile.professional_type,
    profile.license_reference, profile.jurisdiction, profile.country_code, organization.name,
    profile.verification_status, profile.submitted_at
  from public.clinical_professional_profiles profile
  left join public.provider_organizations organization on organization.id = profile.provider_organization_id
  where public.is_platform_admin(auth.uid()) and profile.verification_status in ('pending', 'verified')
  order by case when profile.verification_status = 'pending' then 0 else 1 end, profile.submitted_at;
$$;

create or replace function public.review_clinical_professional_profile(
  target_profile_id uuid,
  decision text,
  reason text default null,
  next_verification_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_profile public.clinical_professional_profiles;
begin
  if not public.is_platform_admin(current_user_id) then raise exception 'Platform admin required'; end if;
  if decision not in ('verified', 'rejected', 'suspended') then raise exception 'Invalid review decision'; end if;
  if decision = 'verified' and next_verification_expires_at is not null and next_verification_expires_at <= now() then raise exception 'Verification expiration must be in the future'; end if;
  if decision in ('rejected', 'suspended') and nullif(trim(reason), '') is null then raise exception 'Review reason is required'; end if;
  select * into target_profile from public.clinical_professional_profiles where id = target_profile_id for update;
  if target_profile.id is null then raise exception 'Professional profile not found'; end if;
  if decision in ('verified', 'rejected') and target_profile.verification_status <> 'pending' then raise exception 'Only pending profiles can be reviewed'; end if;
  if decision = 'suspended' and target_profile.verification_status <> 'verified' then raise exception 'Only verified profiles can be suspended'; end if;
  update public.clinical_professional_profiles set
    verification_status = decision,
    reviewed_at = now(), reviewed_by_user_id = current_user_id,
    admin_notes = nullif(trim(reason), ''),
    verified_at = case when decision = 'verified' then now() else verified_at end,
    verification_expires_at = case when decision = 'verified' then next_verification_expires_at else verification_expires_at end
  where id = target_profile_id;
  insert into public.clinical_professional_verification_events (professional_profile_id, event_type, actor_user_id, reason)
  values (target_profile_id, decision, current_user_id, nullif(trim(reason), ''));
end;
$$;

revoke all on public.clinical_professional_profiles, public.clinical_professional_verification_events from anon, authenticated;
revoke all on function public.get_my_clinical_professional_context() from public;
revoke all on function public.upsert_my_clinical_professional_profile(text, text, text, text, text, uuid) from public;
revoke all on function public.submit_my_clinical_professional_profile() from public;
revoke all on function public.get_clinical_access_authenticated_context(text) from public;
revoke all on function public.list_pending_clinical_professionals_for_admin() from public;
revoke all on function public.review_clinical_professional_profile(uuid, text, text, timestamptz) from public;
grant execute on function public.get_my_clinical_professional_context() to authenticated;
grant execute on function public.upsert_my_clinical_professional_profile(text, text, text, text, text, uuid) to authenticated;
grant execute on function public.submit_my_clinical_professional_profile() to authenticated;
grant execute on function public.get_clinical_access_authenticated_context(text) to authenticated;
grant execute on function public.list_pending_clinical_professionals_for_admin() to authenticated;
grant execute on function public.review_clinical_professional_profile(uuid, text, text, timestamptz) to authenticated;
