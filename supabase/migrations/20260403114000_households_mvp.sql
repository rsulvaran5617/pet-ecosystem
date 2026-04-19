create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  permissions text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id),
  check (
    cardinality(permissions) > 0
    and permissions <@ array['view', 'edit', 'book', 'pay', 'admin']::text[]
  )
);

create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_user_id uuid not null references auth.users (id) on delete cascade,
  invited_email text not null,
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  permissions text[] not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    cardinality(permissions) > 0
    and permissions <@ array['view', 'edit', 'book', 'pay', 'admin']::text[]
  )
);

create index if not exists households_created_by_user_id_idx on public.households (created_by_user_id);
create index if not exists household_members_household_id_idx on public.household_members (household_id);
create index if not exists household_members_user_id_idx on public.household_members (user_id);
create index if not exists household_invitations_household_id_idx on public.household_invitations (household_id);
create index if not exists household_invitations_invited_user_id_idx on public.household_invitations (invited_user_id);
create unique index if not exists household_invitations_pending_unique_idx
  on public.household_invitations (household_id, invited_user_id)
  where status = 'pending';

create or replace function public.normalize_household_permissions(next_permissions text[])
returns text[]
language plpgsql
immutable
as $$
declare
  allowed_permissions text[] := array['view', 'edit', 'book', 'pay', 'admin']::text[];
  normalized_permissions text[] := '{}'::text[];
  permission text;
begin
  if next_permissions is null or cardinality(next_permissions) = 0 then
    raise exception 'At least one household permission is required';
  end if;

  if exists (
    select 1
    from unnest(next_permissions) as requested(permission_value)
    where requested.permission_value <> all (allowed_permissions)
  ) then
    raise exception 'Unsupported household permission';
  end if;

  if 'admin' = any (next_permissions) then
    return allowed_permissions;
  end if;

  foreach permission in array allowed_permissions
  loop
    if permission = any (next_permissions) then
      normalized_permissions := array_append(normalized_permissions, permission);
    end if;
  end loop;

  if cardinality(normalized_permissions) = 0 then
    raise exception 'At least one household permission is required';
  end if;

  return normalized_permissions;
end;
$$;

create or replace function public.can_view_household(target_household_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members as membership
    where membership.household_id = target_household_id
      and membership.user_id = target_user_id
  );
$$;

create or replace function public.can_manage_household(target_household_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members as membership
    where membership.household_id = target_household_id
      and membership.user_id = target_user_id
      and membership.permissions @> array['admin']::text[]
  );
$$;

create or replace function public.prevent_household_without_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.permissions @> array['admin']::text[]
      and not exists (
        select 1
        from public.household_members as membership
        where membership.household_id = old.household_id
          and membership.id <> old.id
          and membership.permissions @> array['admin']::text[]
      ) then
      raise exception 'A household must keep at least one admin';
    end if;

    return old;
  end if;

  if old.permissions @> array['admin']::text[]
    and not new.permissions @> array['admin']::text[]
    and not exists (
      select 1
      from public.household_members as membership
      where membership.household_id = old.household_id
        and membership.id <> old.id
        and membership.permissions @> array['admin']::text[]
    ) then
    raise exception 'A household must keep at least one admin';
  end if;

  return new;
end;
$$;

create or replace function public.create_household(next_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  created_household public.households;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create a household';
  end if;

  if normalized_name is null then
    raise exception 'Household name is required';
  end if;

  insert into public.households (
    name,
    created_by_user_id
  )
  values (
    normalized_name,
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

create or replace function public.invite_household_member(
  target_household_id uuid,
  invitee_email text,
  next_permissions text[]
)
returns public.household_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(nullif(trim(invitee_email), ''));
  normalized_permissions text[] := public.normalize_household_permissions(next_permissions);
  invited_profile public.profiles;
  upserted_invitation public.household_invitations;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to invite household members';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'Household admin required to invite members';
  end if;

  if normalized_email is null then
    raise exception 'Invitation email is required';
  end if;

  select *
  into invited_profile
  from public.profiles
  where lower(email) = normalized_email
  limit 1;

  if invited_profile.id is null then
    raise exception 'Invited user must already have a verified core account';
  end if;

  if invited_profile.id = current_user_id then
    raise exception 'You are already a member of this household';
  end if;

  if exists (
    select 1
    from public.household_members as membership
    where membership.household_id = target_household_id
      and membership.user_id = invited_profile.id
  ) then
    raise exception 'User is already a household member';
  end if;

  update public.household_invitations
  set permissions = normalized_permissions,
      invited_by_user_id = current_user_id,
      invited_email = invited_profile.email,
      responded_at = null,
      updated_at = now()
  where household_id = target_household_id
    and invited_user_id = invited_profile.id
    and status = 'pending'
  returning * into upserted_invitation;

  if upserted_invitation.id is null then
    insert into public.household_invitations (
      household_id,
      invited_user_id,
      invited_email,
      invited_by_user_id,
      permissions
    )
    values (
      target_household_id,
      invited_profile.id,
      invited_profile.email,
      current_user_id,
      normalized_permissions
    )
    returning * into upserted_invitation;
  end if;

  return upserted_invitation;
end;
$$;

create or replace function public.accept_household_invitation(target_invitation_id uuid)
returns public.household_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_invitation public.household_invitations;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to accept invitations';
  end if;

  select *
  into target_invitation
  from public.household_invitations
  where id = target_invitation_id
    and status = 'pending';

  if target_invitation.id is null then
    raise exception 'Invitation not found or no longer pending';
  end if;

  if target_invitation.invited_user_id <> current_user_id then
    raise exception 'Only the invited user can accept this invitation';
  end if;

  insert into public.household_members (
    household_id,
    user_id,
    created_by_user_id,
    permissions
  )
  values (
    target_invitation.household_id,
    target_invitation.invited_user_id,
    target_invitation.invited_by_user_id,
    target_invitation.permissions
  )
  on conflict (household_id, user_id) do update
  set permissions = excluded.permissions,
      updated_at = now();

  update public.household_invitations
  set status = 'accepted',
      responded_at = now(),
      updated_at = now()
  where id = target_invitation_id
  returning * into target_invitation;

  return target_invitation;
end;
$$;

create or replace function public.reject_household_invitation(target_invitation_id uuid)
returns public.household_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_invitation public.household_invitations;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to reject invitations';
  end if;

  select *
  into target_invitation
  from public.household_invitations
  where id = target_invitation_id
    and status = 'pending';

  if target_invitation.id is null then
    raise exception 'Invitation not found or no longer pending';
  end if;

  if target_invitation.invited_user_id <> current_user_id then
    raise exception 'Only the invited user can reject this invitation';
  end if;

  update public.household_invitations
  set status = 'rejected',
      responded_at = now(),
      updated_at = now()
  where id = target_invitation_id
  returning * into target_invitation;

  return target_invitation;
end;
$$;

create or replace function public.update_household_member_permissions(
  target_household_id uuid,
  target_member_id uuid,
  next_permissions text[]
)
returns public.household_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_permissions text[] := public.normalize_household_permissions(next_permissions);
  target_member public.household_members;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to manage household permissions';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'Household admin required to update member permissions';
  end if;

  select *
  into target_member
  from public.household_members
  where id = target_member_id
    and household_id = target_household_id;

  if target_member.id is null then
    raise exception 'Household member not found';
  end if;

  if target_member.permissions @> array['admin']::text[]
    and not normalized_permissions @> array['admin']::text[]
    and not exists (
      select 1
      from public.household_members as membership
      where membership.household_id = target_household_id
        and membership.id <> target_member.id
        and membership.permissions @> array['admin']::text[]
    ) then
    raise exception 'A household must keep at least one admin';
  end if;

  update public.household_members
  set permissions = normalized_permissions,
      updated_at = now()
  where id = target_member_id
  returning * into target_member;

  return target_member;
end;
$$;

drop trigger if exists trg_households_updated_at on public.households;
create trigger trg_households_updated_at
before update on public.households
for each row
execute function public.set_updated_at();

drop trigger if exists trg_household_members_updated_at on public.household_members;
create trigger trg_household_members_updated_at
before update on public.household_members
for each row
execute function public.set_updated_at();

drop trigger if exists trg_household_invitations_updated_at on public.household_invitations;
create trigger trg_household_invitations_updated_at
before update on public.household_invitations
for each row
execute function public.set_updated_at();

drop trigger if exists trg_household_members_require_admin on public.household_members;
create trigger trg_household_members_require_admin
before update or delete on public.household_members
for each row
execute function public.prevent_household_without_admin();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;

drop policy if exists households_select_visible on public.households;
create policy households_select_visible
on public.households
for select
to authenticated
using (public.can_view_household(id, auth.uid()));

drop policy if exists household_members_select_visible on public.household_members;
create policy household_members_select_visible
on public.household_members
for select
to authenticated
using (public.can_view_household(household_id, auth.uid()));

drop policy if exists household_invitations_select_visible on public.household_invitations;
create policy household_invitations_select_visible
on public.household_invitations
for select
to authenticated
using (
  invited_user_id = auth.uid()
  or public.can_manage_household(household_id, auth.uid())
);

grant execute on function public.can_view_household(uuid, uuid) to authenticated;
grant execute on function public.can_manage_household(uuid, uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.invite_household_member(uuid, text, text[]) to authenticated;
grant execute on function public.accept_household_invitation(uuid) to authenticated;
grant execute on function public.reject_household_invitation(uuid) to authenticated;
grant execute on function public.update_household_member_permissions(uuid, uuid, text[]) to authenticated;
