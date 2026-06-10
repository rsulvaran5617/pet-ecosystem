alter table public.pet_profiles
  add column if not exists is_sterilized boolean;

create or replace function public.create_pet(
  target_household_id uuid,
  next_name text,
  next_species text,
  next_breed text default null,
  next_sex text default 'unknown',
  next_birth_date date default null,
  next_notes text default null,
  next_is_sterilized boolean default null
)
returns public.pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_species text := nullif(trim(next_species), '');
  normalized_breed text := nullif(trim(next_breed), '');
  normalized_sex text := coalesce(lower(nullif(trim(next_sex), '')), 'unknown');
  normalized_notes text := nullif(trim(next_notes), '');
  created_pet public.pets;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create pets';
  end if;

  if not public.can_edit_household(target_household_id, current_user_id) then
    raise exception 'Household edit permission required to create pets';
  end if;

  if normalized_name is null then
    raise exception 'Pet name is required';
  end if;

  if normalized_species is null then
    raise exception 'Pet species is required';
  end if;

  if normalized_sex not in ('female', 'male', 'unknown') then
    raise exception 'Unsupported pet sex';
  end if;

  insert into public.pets (
    household_id,
    created_by_user_id,
    name,
    species
  )
  values (
    target_household_id,
    current_user_id,
    normalized_name,
    normalized_species
  )
  returning * into created_pet;

  insert into public.pet_profiles (
    pet_id,
    breed,
    sex,
    birth_date,
    notes,
    is_sterilized
  )
  values (
    created_pet.id,
    normalized_breed,
    normalized_sex,
    next_birth_date,
    normalized_notes,
    next_is_sterilized
  );

  return created_pet;
end;
$$;

create or replace function public.update_pet(
  target_pet_id uuid,
  next_name text,
  next_species text,
  next_breed text default null,
  next_sex text default 'unknown',
  next_birth_date date default null,
  next_notes text default null,
  next_is_sterilized boolean default null
)
returns public.pets
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_species text := nullif(trim(next_species), '');
  normalized_breed text := nullif(trim(next_breed), '');
  normalized_sex text := coalesce(lower(nullif(trim(next_sex), '')), 'unknown');
  normalized_notes text := nullif(trim(next_notes), '');
  target_pet public.pets;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update pets';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_pet_id;

  if target_pet.id is null then
    raise exception 'Pet not found or not accessible';
  end if;

  if not public.can_edit_household(target_pet.household_id, current_user_id) then
    raise exception 'Household edit permission required to update pets';
  end if;

  if normalized_name is null then
    raise exception 'Pet name is required';
  end if;

  if normalized_species is null then
    raise exception 'Pet species is required';
  end if;

  if normalized_sex not in ('female', 'male', 'unknown') then
    raise exception 'Unsupported pet sex';
  end if;

  update public.pets
  set name = normalized_name,
      species = normalized_species,
      updated_at = now()
  where id = target_pet_id
  returning * into target_pet;

  insert into public.pet_profiles (
    pet_id,
    breed,
    sex,
    birth_date,
    notes,
    is_sterilized
  )
  values (
    target_pet_id,
    normalized_breed,
    normalized_sex,
    next_birth_date,
    normalized_notes,
    next_is_sterilized
  )
  on conflict (pet_id) do update
  set breed = excluded.breed,
      sex = excluded.sex,
      birth_date = excluded.birth_date,
      notes = excluded.notes,
      is_sterilized = excluded.is_sterilized,
      updated_at = now();

  return target_pet;
end;
$$;
