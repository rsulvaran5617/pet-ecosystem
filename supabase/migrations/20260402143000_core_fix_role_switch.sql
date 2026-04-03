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
