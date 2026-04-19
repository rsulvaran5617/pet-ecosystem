do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pet_vaccines'
      and column_name = 'vaccine_name'
  ) then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'pet_vaccines_legacy'
    ) then
      raise exception 'Legacy pet_vaccines table already moved to public.pet_vaccines_legacy';
    end if;

    alter table public.pet_vaccines rename to pet_vaccines_legacy;
  end if;
end;
$$;

create table if not exists public.pet_vaccines (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  administered_on date not null,
  next_due_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_due_on is null or next_due_on >= administered_on)
);

create table if not exists public.pet_allergies (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  allergen text not null check (char_length(trim(allergen)) between 1 and 160),
  reaction text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reaction is null or char_length(trim(reaction)) between 1 and 240)
);

create table if not exists public.pet_conditions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'managed', 'resolved')),
  diagnosed_on date,
  is_critical boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_vaccines_pet_id_idx on public.pet_vaccines (pet_id);
create index if not exists pet_vaccines_administered_on_idx on public.pet_vaccines (administered_on desc);
create index if not exists pet_allergies_pet_id_idx on public.pet_allergies (pet_id);
create index if not exists pet_conditions_pet_id_idx on public.pet_conditions (pet_id);
create index if not exists pet_conditions_status_idx on public.pet_conditions (status);
create index if not exists pet_conditions_is_critical_idx on public.pet_conditions (is_critical);

create or replace function public.create_pet_vaccine(
  target_pet_id uuid,
  next_name text,
  next_administered_on date,
  next_due_on date default null,
  next_notes text default null
)
returns public.pet_vaccines
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_notes text := nullif(trim(next_notes), '');
  created_vaccine public.pet_vaccines;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to register vaccines';
  end if;

  if not public.can_edit_pet(target_pet_id, current_user_id) then
    raise exception 'Pet edit permission required to register vaccines';
  end if;

  if normalized_name is null then
    raise exception 'Vaccine name is required';
  end if;

  if next_administered_on is null then
    raise exception 'Administration date is required';
  end if;

  insert into public.pet_vaccines (
    pet_id,
    created_by_user_id,
    name,
    administered_on,
    next_due_on,
    notes
  )
  values (
    target_pet_id,
    current_user_id,
    normalized_name,
    next_administered_on,
    next_due_on,
    normalized_notes
  )
  returning * into created_vaccine;

  return created_vaccine;
end;
$$;

create or replace function public.update_pet_vaccine(
  target_vaccine_id uuid,
  next_name text,
  next_administered_on date,
  next_due_on date default null,
  next_notes text default null
)
returns public.pet_vaccines
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_notes text := nullif(trim(next_notes), '');
  target_vaccine public.pet_vaccines;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to edit vaccines';
  end if;

  select *
  into target_vaccine
  from public.pet_vaccines
  where id = target_vaccine_id;

  if target_vaccine.id is null then
    raise exception 'Vaccine not found or not accessible';
  end if;

  if not public.can_edit_pet(target_vaccine.pet_id, current_user_id) then
    raise exception 'Pet edit permission required to edit vaccines';
  end if;

  if normalized_name is null then
    raise exception 'Vaccine name is required';
  end if;

  if next_administered_on is null then
    raise exception 'Administration date is required';
  end if;

  update public.pet_vaccines
  set name = normalized_name,
      administered_on = next_administered_on,
      next_due_on = next_due_on,
      notes = normalized_notes,
      updated_at = now()
  where id = target_vaccine_id
  returning * into target_vaccine;

  return target_vaccine;
end;
$$;

create or replace function public.create_pet_allergy(
  target_pet_id uuid,
  next_allergen text,
  next_reaction text default null,
  next_notes text default null
)
returns public.pet_allergies
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_allergen text := nullif(trim(next_allergen), '');
  normalized_reaction text := nullif(trim(next_reaction), '');
  normalized_notes text := nullif(trim(next_notes), '');
  created_allergy public.pet_allergies;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to register allergies';
  end if;

  if not public.can_edit_pet(target_pet_id, current_user_id) then
    raise exception 'Pet edit permission required to register allergies';
  end if;

  if normalized_allergen is null then
    raise exception 'Allergen name is required';
  end if;

  insert into public.pet_allergies (
    pet_id,
    created_by_user_id,
    allergen,
    reaction,
    notes
  )
  values (
    target_pet_id,
    current_user_id,
    normalized_allergen,
    normalized_reaction,
    normalized_notes
  )
  returning * into created_allergy;

  return created_allergy;
end;
$$;

create or replace function public.update_pet_allergy(
  target_allergy_id uuid,
  next_allergen text,
  next_reaction text default null,
  next_notes text default null
)
returns public.pet_allergies
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_allergen text := nullif(trim(next_allergen), '');
  normalized_reaction text := nullif(trim(next_reaction), '');
  normalized_notes text := nullif(trim(next_notes), '');
  target_allergy public.pet_allergies;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to edit allergies';
  end if;

  select *
  into target_allergy
  from public.pet_allergies
  where id = target_allergy_id;

  if target_allergy.id is null then
    raise exception 'Allergy not found or not accessible';
  end if;

  if not public.can_edit_pet(target_allergy.pet_id, current_user_id) then
    raise exception 'Pet edit permission required to edit allergies';
  end if;

  if normalized_allergen is null then
    raise exception 'Allergen name is required';
  end if;

  update public.pet_allergies
  set allergen = normalized_allergen,
      reaction = normalized_reaction,
      notes = normalized_notes,
      updated_at = now()
  where id = target_allergy_id
  returning * into target_allergy;

  return target_allergy;
end;
$$;

create or replace function public.create_pet_condition(
  target_pet_id uuid,
  next_name text,
  next_status text default 'active',
  next_diagnosed_on date default null,
  next_is_critical boolean default false,
  next_notes text default null
)
returns public.pet_conditions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_status text := coalesce(lower(nullif(trim(next_status), '')), 'active');
  normalized_notes text := nullif(trim(next_notes), '');
  created_condition public.pet_conditions;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to register conditions';
  end if;

  if not public.can_edit_pet(target_pet_id, current_user_id) then
    raise exception 'Pet edit permission required to register conditions';
  end if;

  if normalized_name is null then
    raise exception 'Condition name is required';
  end if;

  if normalized_status not in ('active', 'managed', 'resolved') then
    raise exception 'Unsupported condition status';
  end if;

  insert into public.pet_conditions (
    pet_id,
    created_by_user_id,
    name,
    status,
    diagnosed_on,
    is_critical,
    notes
  )
  values (
    target_pet_id,
    current_user_id,
    normalized_name,
    normalized_status,
    next_diagnosed_on,
    coalesce(next_is_critical, false),
    normalized_notes
  )
  returning * into created_condition;

  return created_condition;
end;
$$;

create or replace function public.update_pet_condition(
  target_condition_id uuid,
  next_name text,
  next_status text default 'active',
  next_diagnosed_on date default null,
  next_is_critical boolean default false,
  next_notes text default null
)
returns public.pet_conditions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_status text := coalesce(lower(nullif(trim(next_status), '')), 'active');
  normalized_notes text := nullif(trim(next_notes), '');
  target_condition public.pet_conditions;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to edit conditions';
  end if;

  select *
  into target_condition
  from public.pet_conditions
  where id = target_condition_id;

  if target_condition.id is null then
    raise exception 'Condition not found or not accessible';
  end if;

  if not public.can_edit_pet(target_condition.pet_id, current_user_id) then
    raise exception 'Pet edit permission required to edit conditions';
  end if;

  if normalized_name is null then
    raise exception 'Condition name is required';
  end if;

  if normalized_status not in ('active', 'managed', 'resolved') then
    raise exception 'Unsupported condition status';
  end if;

  update public.pet_conditions
  set name = normalized_name,
      status = normalized_status,
      diagnosed_on = next_diagnosed_on,
      is_critical = coalesce(next_is_critical, false),
      notes = normalized_notes,
      updated_at = now()
  where id = target_condition_id
  returning * into target_condition;

  return target_condition;
end;
$$;

drop trigger if exists trg_pet_vaccines_updated_at on public.pet_vaccines;
create trigger trg_pet_vaccines_updated_at
before update on public.pet_vaccines
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pet_allergies_updated_at on public.pet_allergies;
create trigger trg_pet_allergies_updated_at
before update on public.pet_allergies
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pet_conditions_updated_at on public.pet_conditions;
create trigger trg_pet_conditions_updated_at
before update on public.pet_conditions
for each row
execute function public.set_updated_at();

alter table public.pet_vaccines enable row level security;
alter table public.pet_allergies enable row level security;
alter table public.pet_conditions enable row level security;

drop policy if exists pet_vaccines_select_visible on public.pet_vaccines;
create policy pet_vaccines_select_visible
on public.pet_vaccines
for select
to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

drop policy if exists pet_allergies_select_visible on public.pet_allergies;
create policy pet_allergies_select_visible
on public.pet_allergies
for select
to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

drop policy if exists pet_conditions_select_visible on public.pet_conditions;
create policy pet_conditions_select_visible
on public.pet_conditions
for select
to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

grant execute on function public.create_pet_vaccine(uuid, text, date, date, text) to authenticated;
grant execute on function public.update_pet_vaccine(uuid, text, date, date, text) to authenticated;
grant execute on function public.create_pet_allergy(uuid, text, text, text) to authenticated;
grant execute on function public.update_pet_allergy(uuid, text, text, text) to authenticated;
grant execute on function public.create_pet_condition(uuid, text, text, date, boolean, text) to authenticated;
grant execute on function public.update_pet_condition(uuid, text, text, date, boolean, text) to authenticated;
