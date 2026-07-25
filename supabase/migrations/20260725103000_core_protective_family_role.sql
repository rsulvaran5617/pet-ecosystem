alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('pet_owner', 'provider', 'protective_family', 'admin'));

drop policy if exists user_roles_insert_own on public.user_roles;
create policy user_roles_insert_own
on public.user_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role in ('pet_owner', 'provider', 'protective_family')
);

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
        where role in ('pet_owner', 'provider', 'protective_family')
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
end;
$$;

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

  if next_role not in ('pet_owner', 'provider', 'protective_family', 'admin') then
    raise exception 'Unsupported role: %', next_role;
  end if;

  update public.user_roles
  set is_active = true,
      updated_at = now()
  where user_id = current_user_id
    and role = next_role
  returning id into switched_role_id;

  if switched_role_id is null then
    if next_role = 'admin' then
      raise exception 'Admin role must be provisioned administratively';
    end if;

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
