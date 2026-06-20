create table if not exists public.protective_household_profiles (
  household_id uuid primary key references public.households(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
  display_name text not null check (char_length(trim(display_name)) > 0),
  organization_type text not null
    check (organization_type in ('individual_rescuer', 'foster_home', 'foundation', 'temporary_home', 'other')),
  city text not null check (char_length(trim(city)) > 0),
  state_region text null,
  country_code text not null default 'PA' check (country_code ~ '^[A-Z]{2}$'),
  contact_notes text null,
  public_notes text null,
  review_notes text null,
  submitted_at timestamptz null,
  reviewed_by_user_id uuid null references auth.users(id),
  reviewed_at timestamptz null,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protective_household_profiles_review_state_check check (
    (
      status not in ('approved', 'rejected', 'suspended')
      or (reviewed_by_user_id is not null and reviewed_at is not null)
    )
  ),
  constraint protective_household_profiles_submitted_state_check check (
    status <> 'pending_review'
    or submitted_at is not null
  )
);

create index if not exists protective_household_profiles_status_idx
  on public.protective_household_profiles(status);

create index if not exists protective_household_profiles_location_idx
  on public.protective_household_profiles(country_code, city);

create index if not exists protective_household_profiles_reviewer_idx
  on public.protective_household_profiles(reviewed_by_user_id)
  where reviewed_by_user_id is not null;

drop trigger if exists trg_protective_household_profiles_updated_at on public.protective_household_profiles;
create trigger trg_protective_household_profiles_updated_at
before update on public.protective_household_profiles
for each row
execute function public.set_updated_at();

alter table public.protective_household_profiles enable row level security;

drop policy if exists protective_household_profiles_select_household_or_admin on public.protective_household_profiles;
create policy protective_household_profiles_select_household_or_admin
on public.protective_household_profiles
for select
to authenticated
using (
  public.can_view_household(household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists protective_household_profiles_insert_household_admin on public.protective_household_profiles;
create policy protective_household_profiles_insert_household_admin
on public.protective_household_profiles
for insert
to authenticated
with check (
  public.can_manage_household(household_id, auth.uid())
  and created_by_user_id = auth.uid()
  and status in ('draft', 'pending_review')
  and review_notes is null
  and reviewed_by_user_id is null
  and reviewed_at is null
);

drop policy if exists protective_household_profiles_update_household_admin on public.protective_household_profiles;
create policy protective_household_profiles_update_household_admin
on public.protective_household_profiles
for update
to authenticated
using (
  public.can_manage_household(household_id, auth.uid())
  and status in ('draft', 'rejected')
)
with check (
  public.can_manage_household(household_id, auth.uid())
  and status in ('draft', 'rejected')
);

drop policy if exists protective_household_profiles_update_admin on public.protective_household_profiles;
create policy protective_household_profiles_update_admin
on public.protective_household_profiles
for update
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

create or replace function public.submit_protective_household_profile(target_household_id uuid)
returns public.protective_household_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  submitted_profile public.protective_household_profiles;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to submit protective household profile';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'Household admin required to submit protective household profile';
  end if;

  update public.protective_household_profiles
  set
    status = 'pending_review',
    submitted_at = now(),
    review_notes = null,
    reviewed_by_user_id = null,
    reviewed_at = null,
    updated_at = now()
  where household_id = target_household_id
    and status in ('draft', 'rejected')
  returning * into submitted_profile;

  if submitted_profile.household_id is null then
    raise exception 'Protective household profile must exist in draft or rejected state before submit';
  end if;

  perform public.insert_audit_log(
    'protective_household_profile',
    submitted_profile.household_id,
    'protective_household_profile_submitted',
    jsonb_build_object('status', submitted_profile.status),
    current_user_id
  );

  return submitted_profile;
end;
$$;

create or replace function public.review_protective_household_profile(
  target_household_id uuid,
  decision text,
  notes text default null
)
returns public.protective_household_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_decision text := lower(trim(decision));
  normalized_notes text := nullif(trim(coalesce(notes, '')), '');
  current_profile public.protective_household_profiles;
  reviewed_profile public.protective_household_profiles;
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to review protective household profile';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Platform admin role required to review protective household profile';
  end if;

  if normalized_decision not in ('approved', 'rejected', 'suspended') then
    raise exception 'Unsupported protective household review decision';
  end if;

  if normalized_decision in ('rejected', 'suspended') and normalized_notes is null then
    raise exception 'Review notes are required for rejection or suspension';
  end if;

  select *
  into current_profile
  from public.protective_household_profiles
  where household_id = target_household_id
  for update;

  if current_profile.household_id is null then
    raise exception 'Protective household profile not found';
  end if;

  if normalized_decision in ('approved', 'rejected') and current_profile.status <> 'pending_review' then
    raise exception 'Only pending protective household profiles can be approved or rejected';
  end if;

  if normalized_decision = 'suspended' and current_profile.status not in ('approved', 'pending_review') then
    raise exception 'Only approved or pending protective household profiles can be suspended';
  end if;

  update public.protective_household_profiles
  set
    status = normalized_decision,
    review_notes = normalized_notes,
    reviewed_by_user_id = current_user_id,
    reviewed_at = now(),
    updated_at = now()
  where household_id = target_household_id
  returning * into reviewed_profile;

  perform public.insert_audit_log(
    'protective_household_profile',
    reviewed_profile.household_id,
    'protective_household_profile_reviewed',
    jsonb_build_object('decision', normalized_decision, 'notes', normalized_notes),
    current_user_id
  );

  return reviewed_profile;
end;
$$;

create or replace function public.list_pending_protective_household_profiles()
returns table (
  household_id uuid,
  status text,
  display_name text,
  organization_type text,
  city text,
  state_region text,
  country_code text,
  contact_notes text,
  public_notes text,
  review_notes text,
  submitted_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  household_name text,
  created_by_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to list protective household profiles';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Platform admin role required to list protective household profiles';
  end if;

  return query
  select
    profile.household_id,
    profile.status,
    profile.display_name,
    profile.organization_type,
    profile.city,
    profile.state_region,
    profile.country_code,
    profile.contact_notes,
    profile.public_notes,
    profile.review_notes,
    profile.submitted_at,
    profile.reviewed_by_user_id,
    profile.reviewed_at,
    profile.created_by_user_id,
    profile.created_at,
    profile.updated_at,
    household.name as household_name,
    creator.email as created_by_email
  from public.protective_household_profiles as profile
  left join public.households as household
    on household.id = profile.household_id
  left join public.profiles as creator
    on creator.id = profile.created_by_user_id
  where profile.status = 'pending_review'
  order by profile.submitted_at asc nulls last, profile.created_at asc;
end;
$$;

grant select, insert, update on public.protective_household_profiles to authenticated;
grant execute on function public.submit_protective_household_profile(uuid) to authenticated;
grant execute on function public.review_protective_household_profile(uuid, text, text) to authenticated;
grant execute on function public.list_pending_protective_household_profiles() to authenticated;
