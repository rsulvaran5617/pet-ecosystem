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
      and is_active
      and (new.id is null or id <> new.id);

    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.user_roles
      where user_id = new.user_id
        and is_active
    ) then
      new.is_active = true;
    end if;

    return new;
  end if;

  if coalesce(old.is_active, false)
    and pg_trigger_depth() = 1
    and not exists (
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
      and is_default
      and (new.id is null or id <> new.id);

    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.user_addresses
      where user_id = new.user_id
        and is_default
    ) then
      new.is_default = true;
    end if;

    return new;
  end if;

  if coalesce(old.is_default, false)
    and pg_trigger_depth() = 1
    and not exists (
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
      and is_default
      and (new.id is null or id <> new.id);

    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.payment_methods
      where user_id = new.user_id
        and is_default
    ) then
      new.is_default = true;
    end if;

    return new;
  end if;

  if coalesce(old.is_default, false)
    and pg_trigger_depth() = 1
    and not exists (
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
