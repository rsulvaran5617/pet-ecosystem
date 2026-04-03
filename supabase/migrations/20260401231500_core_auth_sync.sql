alter table if exists public.profiles
  add column if not exists email text;

alter table if exists public.profiles
  add column if not exists first_name text;

alter table if exists public.profiles
  add column if not exists last_name text;

alter table if exists public.profiles
  add column if not exists locale text;

alter table if exists public.profiles
  add column if not exists marketing_opt_in boolean;

alter table if exists public.profiles
  add column if not exists reminder_email_opt_in boolean;

alter table if exists public.profiles
  add column if not exists reminder_push_opt_in boolean;

update public.profiles as profile
set email = coalesce(
      nullif(trim(profile.email), ''),
      nullif(trim(auth_user.email), ''),
      concat(profile.id::text, '@pending.local')
    ),
    first_name = coalesce(
      nullif(trim(profile.first_name), ''),
      nullif(split_part(regexp_replace(coalesce(profile.full_name, ''), '\s+', ' ', 'g'), ' ', 1), ''),
      split_part(coalesce(nullif(trim(auth_user.email), ''), concat(profile.id::text, '@pending.local')), '@', 1)
    ),
    last_name = coalesce(
      nullif(trim(profile.last_name), ''),
      nullif(trim(regexp_replace(regexp_replace(coalesce(profile.full_name, ''), '\s+', ' ', 'g'), '^\S+\s*', '')), ''),
      ''
    ),
    locale = coalesce(nullif(trim(profile.locale), ''), 'es'),
    marketing_opt_in = coalesce(profile.marketing_opt_in, false),
    reminder_email_opt_in = coalesce(profile.reminder_email_opt_in, true),
    reminder_push_opt_in = coalesce(profile.reminder_push_opt_in, true),
    updated_at = now()
from auth.users as auth_user
where auth_user.id = profile.id;

alter table public.profiles
  alter column locale set default 'es';

alter table public.profiles
  alter column marketing_opt_in set default false;

alter table public.profiles
  alter column reminder_email_opt_in set default true;

alter table public.profiles
  alter column reminder_push_opt_in set default true;

alter table public.profiles
  alter column email set not null;

alter table public.profiles
  alter column first_name set not null;

alter table public.profiles
  alter column last_name set not null;

alter table public.profiles
  alter column locale set not null;

alter table public.profiles
  alter column marketing_opt_in set not null;

alter table public.profiles
  alter column reminder_email_opt_in set not null;

alter table public.profiles
  alter column reminder_push_opt_in set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_email_key'
  ) then
    alter table public.profiles
      add constraint profiles_email_key unique (email);
  end if;
end;
$$;

create or replace function public.set_single_active_user_role()
returns trigger
language plpgsql
as $$
begin
  if new.is_active then
    update public.user_roles
    set is_active = false,
        updated_at = now()
    where user_id = new.user_id
      and (new.id is null or id <> new.id);
  elsif not exists (
    select 1
    from public.user_roles
    where user_id = new.user_id
      and is_active
      and (new.id is null or id <> new.id)
  ) then
    new.is_active = true;
  end if;

  return new;
end;
$$;

create or replace function public.set_single_default_user_address()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.user_addresses
    set is_default = false,
        updated_at = now()
    where user_id = new.user_id
      and (new.id is null or id <> new.id);
  elsif not exists (
    select 1
    from public.user_addresses
    where user_id = new.user_id
      and is_default
      and (new.id is null or id <> new.id)
  ) then
    new.is_default = true;
  end if;

  return new;
end;
$$;

create or replace function public.set_single_default_payment_method()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.payment_methods
    set is_default = false,
        updated_at = now()
    where user_id = new.user_id
      and (new.id is null or id <> new.id);
  elsif not exists (
    select 1
    from public.payment_methods
    where user_id = new.user_id
      and is_default
      and (new.id is null or id <> new.id)
  ) then
    new.is_default = true;
  end if;

  return new;
end;
$$;

create or replace function public.sync_core_identity_from_auth(
  target_user_id uuid,
  target_email text,
  metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := coalesce(nullif(trim(target_email), ''), concat(target_user_id::text, '@pending.local'));
  normalized_first_name text := coalesce(nullif(trim(metadata ->> 'first_name'), ''), split_part(normalized_email, '@', 1));
  normalized_last_name text := coalesce(nullif(trim(metadata ->> 'last_name'), ''), '');
  normalized_locale text := coalesce(nullif(trim(metadata ->> 'locale'), ''), 'es');
  requested_roles text[];
  role_value text;
  role_position integer := 1;
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    locale
  )
  values (
    target_user_id,
    normalized_email,
    normalized_first_name,
    normalized_last_name,
    normalized_locale
  )
  on conflict (id) do update
  set email = excluded.email,
      first_name = case
        when coalesce(nullif(public.profiles.first_name, ''), '') = '' then excluded.first_name
        else public.profiles.first_name
      end,
      last_name = case
        when coalesce(nullif(public.profiles.last_name, ''), '') = '' then excluded.last_name
        else public.profiles.last_name
      end,
      locale = case
        when coalesce(nullif(public.profiles.locale, ''), '') = '' then excluded.locale
        else public.profiles.locale
      end,
      updated_at = now();

  requested_roles := coalesce(
    (
      select case
        when count(*) = 0 then array['pet_owner']
        else array_agg(role order by ord)
      end
      from (
        select distinct on (role) role, ord
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(coalesce(metadata -> 'requested_roles', '[]'::jsonb)) = 'array'
              then coalesce(metadata -> 'requested_roles', '[]'::jsonb)
            else '[]'::jsonb
          end
        ) with ordinality as requested(role, ord)
        where role in ('pet_owner', 'provider')
        order by role, ord
      ) filtered_roles
    ),
    array['pet_owner']
  );

  if not exists (
    select 1
    from public.user_roles
    where user_id = target_user_id
  ) then
    foreach role_value in array requested_roles
    loop
      insert into public.user_roles (
        user_id,
        role,
        is_active
      )
      values (
        target_user_id,
        role_value,
        role_position = 1
      )
      on conflict (user_id, role) do update
      set is_active = excluded.is_active,
          updated_at = now();

      role_position := role_position + 1;
    end loop;
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = target_user_id
      and is_active
  ) then
    update public.user_roles
    set is_active = true,
        updated_at = now()
    where id = (
      select id
      from public.user_roles
      where user_id = target_user_id
      order by created_at asc
      limit 1
    );
  end if;
end;
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_core_identity_from_auth(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );

  return new;
end;
$$;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_core_identity_from_auth(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

drop trigger if exists trg_auth_user_updated on auth.users;
create trigger trg_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.handle_auth_user_updated();

create or replace function public.switch_active_user_role(next_role text)
returns setof public.user_roles
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  switched_role_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to switch role';
  end if;

  if next_role not in ('pet_owner', 'provider') then
    raise exception 'Unsupported role: %', next_role;
  end if;

  update public.user_roles
  set is_active = true,
      updated_at = now()
  where user_id = current_user_id
    and role = next_role
  returning id into switched_role_id;

  if switched_role_id is null then
    insert into public.user_roles (
      user_id,
      role,
      is_active
    )
    values (
      current_user_id,
      next_role,
      true
    )
    returning id into switched_role_id;
  end if;

  return query
  select *
  from public.user_roles
  where user_id = current_user_id
  order by created_at asc;
end;
$$;

grant execute on function public.switch_active_user_role(text) to authenticated;

insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  locale
)
select
  auth_user.id,
  coalesce(nullif(trim(auth_user.email), ''), concat(auth_user.id::text, '@pending.local')),
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'first_name'), ''),
    split_part(coalesce(auth_user.email, auth_user.id::text), '@', 1)
  ),
  coalesce(nullif(trim(auth_user.raw_user_meta_data ->> 'last_name'), ''), ''),
  coalesce(nullif(trim(auth_user.raw_user_meta_data ->> 'locale'), ''), 'es')
from auth.users as auth_user
on conflict (id) do update
set email = excluded.email,
    updated_at = now();

insert into public.user_roles (
  user_id,
  role,
  is_active
)
select
  auth_user.id,
  'pet_owner',
  true
from auth.users as auth_user
where not exists (
  select 1
  from public.user_roles
  where user_roles.user_id = auth_user.id
)
on conflict (user_id, role) do nothing;
