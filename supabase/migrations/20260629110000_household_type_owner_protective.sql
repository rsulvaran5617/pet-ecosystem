alter table public.households
  add column if not exists household_type text not null default 'owner';

update public.households
set household_type = 'owner'
where household_type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'households_household_type_check'
      and conrelid = 'public.households'::regclass
  ) then
    alter table public.households
      add constraint households_household_type_check
      check (household_type in ('owner', 'protective'));
  end if;
end;
$$;

create index if not exists households_household_type_idx
  on public.households(household_type);

comment on column public.households.household_type is
  'Tipo operativo principal del hogar: owner para mascotas propias, protective para familia protectora/acogida.';

create or replace function public.create_household(
  next_name text,
  next_household_type text default 'owner'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_household_type text := coalesce(nullif(trim(next_household_type), ''), 'owner');
  created_household public.households;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create a household';
  end if;

  if normalized_name is null then
    raise exception 'Household name is required';
  end if;

  if normalized_household_type not in ('owner', 'protective') then
    raise exception 'Unsupported household type';
  end if;

  insert into public.households (
    name,
    household_type,
    created_by_user_id
  )
  values (
    normalized_name,
    normalized_household_type,
    current_user_id
  )
  returning * into created_household;

  insert into public.household_members (
    household_id,
    user_id,
    created_by_user_id,
    permissions
  )
  values (
    created_household.id,
    current_user_id,
    current_user_id,
    array['view', 'edit', 'book', 'pay', 'admin']::text[]
  );

  return created_household;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;

create or replace function public.is_protective_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households household
    where household.id = target_household_id
      and household.household_type = 'protective'
  );
$$;

grant execute on function public.is_protective_household(uuid) to authenticated;

create or replace function public.is_approved_protective_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households household
    join public.protective_household_profiles as profile
      on profile.household_id = household.id
    where household.id = target_household_id
      and household.household_type = 'protective'
      and profile.status = 'approved'
  );
$$;

grant execute on function public.is_approved_protective_household(uuid) to authenticated;

drop policy if exists protective_household_profiles_insert_household_admin on public.protective_household_profiles;
create policy protective_household_profiles_insert_household_admin
on public.protective_household_profiles
for insert
to authenticated
with check (
  public.can_manage_household(household_id, auth.uid())
  and public.is_protective_household(household_id)
  and created_by_user_id = auth.uid()
  and status in ('draft', 'pending_review')
  and review_notes is null
  and reviewed_by_user_id is null
  and reviewed_at is null
);

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

  if not public.is_protective_household(target_household_id) then
    raise exception 'Este hogar no esta configurado como familia protectora.';
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

grant execute on function public.submit_protective_household_profile(uuid) to authenticated;
