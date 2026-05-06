-- V2 booking operations QR tokens.
-- Creates short-lived, single-use tokens for owner-assisted provider check-in/check-out.

create extension if not exists pgcrypto;

create table if not exists public.booking_operation_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  operation_type text not null check (operation_type in ('check_in', 'check_out')),
  token_hash text not null,
  token_preview text,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id),
  constraint booking_operation_tokens_expires_after_created_check check (expires_at > created_at),
  constraint booking_operation_tokens_used_state_check check (
    status <> 'used'
    or (used_at is not null and used_by_user_id is not null)
  ),
  constraint booking_operation_tokens_revoked_state_check check (
    status <> 'revoked'
    or (revoked_at is not null and revoked_by_user_id is not null)
  )
);

create unique index if not exists booking_operation_tokens_token_hash_key
  on public.booking_operation_tokens(token_hash);

create index if not exists booking_operation_tokens_booking_id_idx
  on public.booking_operation_tokens(booking_id);

create index if not exists booking_operation_tokens_operation_type_idx
  on public.booking_operation_tokens(operation_type);

create index if not exists booking_operation_tokens_status_idx
  on public.booking_operation_tokens(status);

create index if not exists booking_operation_tokens_expires_at_idx
  on public.booking_operation_tokens(expires_at);

create unique index if not exists booking_operation_tokens_one_active_per_booking_operation_idx
  on public.booking_operation_tokens(booking_id, operation_type)
  where status = 'active';

alter table public.booking_operation_tokens enable row level security;

revoke all on table public.booking_operation_tokens from anon, authenticated;
grant select on table public.booking_operation_tokens to authenticated;

drop policy if exists booking_operation_tokens_select_admin on public.booking_operation_tokens;
create policy booking_operation_tokens_select_admin
  on public.booking_operation_tokens
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

create or replace function public.create_booking_operation_token(
  target_booking_id uuid,
  target_operation_type text
)
returns table (
  token text,
  token_preview text,
  expires_at timestamptz,
  operation_type text,
  booking_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings%rowtype;
  plain_token text;
  hashed_token text;
  preview_value text;
  next_expires_at timestamptz := now() + interval '10 minutes';
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if target_operation_type not in ('check_in', 'check_out') then
    raise exception 'Invalid booking operation type';
  end if;

  select b.*
    into target_booking
    from public.bookings b
   where b.id = target_booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;

  if target_booking.status <> 'confirmed' then
    raise exception 'Booking must be confirmed before creating an operation QR token';
  end if;

  if not public.can_view_household(target_booking.household_id, current_user_id) then
    raise exception 'User is not allowed to create operation QR tokens for this booking';
  end if;

  if target_operation_type = 'check_in' then
    if exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_in'
    ) then
      raise exception 'Check-in is already registered for this booking';
    end if;
  end if;

  if target_operation_type = 'check_out' then
    if not exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_in'
    ) then
      raise exception 'Check-in must be registered before creating a check-out QR token';
    end if;

    if exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_out'
    ) then
      raise exception 'Check-out is already registered for this booking';
    end if;
  end if;

  update public.booking_operation_tokens bot
     set status = 'revoked',
         revoked_at = now(),
         revoked_by_user_id = current_user_id
   where bot.booking_id = target_booking.id
     and bot.operation_type = target_operation_type
     and bot.status = 'active';

  loop
    plain_token := encode(gen_random_bytes(32), 'hex');
    hashed_token := encode(digest(plain_token, 'sha256'), 'hex');
    exit when not exists (
      select 1
        from public.booking_operation_tokens bot
       where bot.token_hash = hashed_token
    );
  end loop;

  preview_value := left(plain_token, 6) || '...' || right(plain_token, 4);

  insert into public.booking_operation_tokens (
    booking_id,
    operation_type,
    token_hash,
    token_preview,
    expires_at,
    created_by_user_id
  ) values (
    target_booking.id,
    target_operation_type,
    hashed_token,
    preview_value,
    next_expires_at,
    current_user_id
  );

  return query
    select
      plain_token,
      preview_value,
      next_expires_at,
      target_operation_type,
      target_booking.id;
end;
$$;

create or replace function public.consume_booking_operation_token(raw_token text)
returns table (
  success boolean,
  booking_id uuid,
  operation_type text,
  operation_id uuid,
  used_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  hashed_token text;
  target_token public.booking_operation_tokens%rowtype;
  target_booking public.bookings%rowtype;
  created_operation_id uuid;
  consumed_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if raw_token is null or length(trim(raw_token)) = 0 then
    raise exception 'QR token is required';
  end if;

  hashed_token := encode(digest(trim(raw_token), 'sha256'), 'hex');

  select bot.*
    into target_token
    from public.booking_operation_tokens bot
   where bot.token_hash = hashed_token
   for update;

  if not found then
    raise exception 'QR token is invalid';
  end if;

  if target_token.status <> 'active' then
    raise exception 'QR token is not active';
  end if;

  if target_token.expires_at < consumed_at then
    update public.booking_operation_tokens bot
       set status = 'expired'
     where bot.id = target_token.id
       and bot.status = 'active';

    raise exception 'QR token has expired';
  end if;

  select b.*
    into target_booking
    from public.bookings b
   where b.id = target_token.booking_id;

  if not found then
    raise exception 'Booking not found for QR token';
  end if;

  if target_booking.status <> 'confirmed' then
    raise exception 'Booking must be confirmed before consuming an operation QR token';
  end if;

  if not public.can_manage_provider_organization(target_booking.provider_organization_id, current_user_id) then
    raise exception 'Provider is not allowed to consume this operation QR token';
  end if;

  if target_token.operation_type = 'check_in' then
    if exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_in'
    ) then
      raise exception 'Check-in is already registered for this booking';
    end if;
  end if;

  if target_token.operation_type = 'check_out' then
    if not exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_in'
    ) then
      raise exception 'Check-in must be registered before check-out';
    end if;

    if exists (
      select 1
        from public.booking_operations bo
       where bo.booking_id = target_booking.id
         and bo.operation_type = 'check_out'
    ) then
      raise exception 'Check-out is already registered for this booking';
    end if;
  end if;

  insert into public.booking_operations (
    booking_id,
    operation_type,
    created_by_user_id
  ) values (
    target_booking.id,
    target_token.operation_type,
    current_user_id
  )
  returning id into created_operation_id;

  update public.booking_operation_tokens bot
     set status = 'used',
         used_at = consumed_at,
         used_by_user_id = current_user_id
   where bot.id = target_token.id;

  return query
    select
      true,
      target_booking.id,
      target_token.operation_type,
      created_operation_id,
      consumed_at;
end;
$$;

create or replace function public.revoke_booking_operation_token(target_token_id uuid)
returns table (
  token_id uuid,
  booking_id uuid,
  operation_type text,
  status text,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_token public.booking_operation_tokens%rowtype;
  target_booking public.bookings%rowtype;
  revoked_at_value timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select bot.*
    into target_token
    from public.booking_operation_tokens bot
   where bot.id = target_token_id
   for update;

  if not found then
    raise exception 'QR token not found';
  end if;

  if target_token.status <> 'active' then
    raise exception 'Only active QR tokens can be revoked';
  end if;

  select b.*
    into target_booking
    from public.bookings b
   where b.id = target_token.booking_id;

  if not found then
    raise exception 'Booking not found for QR token';
  end if;

  if not (
    public.can_view_household(target_booking.household_id, current_user_id)
    or public.is_platform_admin(current_user_id)
  ) then
    raise exception 'User is not allowed to revoke this operation QR token';
  end if;

  update public.booking_operation_tokens bot
     set status = 'revoked',
         revoked_at = revoked_at_value,
         revoked_by_user_id = current_user_id
   where bot.id = target_token.id;

  return query
    select
      target_token.id,
      target_token.booking_id,
      target_token.operation_type,
      'revoked'::text,
      revoked_at_value;
end;
$$;

revoke all on function public.create_booking_operation_token(uuid, text) from public;
revoke all on function public.consume_booking_operation_token(text) from public;
revoke all on function public.revoke_booking_operation_token(uuid) from public;

grant execute on function public.create_booking_operation_token(uuid, text) to authenticated;
grant execute on function public.consume_booking_operation_token(text) to authenticated;
grant execute on function public.revoke_booking_operation_token(uuid) to authenticated;
