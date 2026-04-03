create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
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
      and id <> new.id;
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
      and id <> new.id;
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
      and id <> new.id;
  end if;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_url text,
  locale text not null default 'es',
  marketing_opt_in boolean not null default false,
  reminder_email_opt_in boolean not null default true,
  reminder_push_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('pet_owner', 'provider')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (label in ('home', 'work', 'other')),
  recipient_name text not null,
  line_1 text not null,
  line_2 text,
  city text not null,
  state_region text not null,
  postal_code text not null,
  country_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('card')),
  brand text not null check (brand in ('visa', 'mastercard', 'amex')),
  last_4 text not null check (char_length(last_4) = 4),
  exp_month integer not null check (exp_month between 1 and 12),
  exp_year integer not null check (exp_year >= 2024),
  cardholder_name text not null,
  processor_reference text,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_addresses_user_id_idx on public.user_addresses (user_id);
create index if not exists payment_methods_user_id_idx on public.payment_methods (user_id);
create unique index if not exists user_roles_active_role_idx on public.user_roles (user_id) where is_active;
create unique index if not exists user_addresses_default_idx on public.user_addresses (user_id) where is_default;
create unique index if not exists payment_methods_default_idx on public.payment_methods (user_id) where is_default;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_addresses_updated_at on public.user_addresses;
create trigger trg_user_addresses_updated_at
before update on public.user_addresses
for each row
execute function public.set_updated_at();

drop trigger if exists trg_payment_methods_updated_at on public.payment_methods;
create trigger trg_payment_methods_updated_at
before update on public.payment_methods
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_roles_single_active on public.user_roles;
create trigger trg_user_roles_single_active
before insert or update on public.user_roles
for each row
execute function public.set_single_active_user_role();

drop trigger if exists trg_user_addresses_single_default on public.user_addresses;
create trigger trg_user_addresses_single_default
before insert or update on public.user_addresses
for each row
execute function public.set_single_default_user_address();

drop trigger if exists trg_payment_methods_single_default on public.payment_methods;
create trigger trg_payment_methods_single_default
before insert or update on public.payment_methods
for each row
execute function public.set_single_default_payment_method();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_addresses enable row level security;
alter table public.payment_methods enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_roles_insert_own on public.user_roles;
create policy user_roles_insert_own
on public.user_roles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_roles_update_own on public.user_roles;
create policy user_roles_update_own
on public.user_roles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_addresses_select_own on public.user_addresses;
create policy user_addresses_select_own
on public.user_addresses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_addresses_insert_own on public.user_addresses;
create policy user_addresses_insert_own
on public.user_addresses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_addresses_update_own on public.user_addresses;
create policy user_addresses_update_own
on public.user_addresses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists payment_methods_select_own on public.payment_methods;
create policy payment_methods_select_own
on public.payment_methods
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own
on public.payment_methods
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own
on public.payment_methods
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
