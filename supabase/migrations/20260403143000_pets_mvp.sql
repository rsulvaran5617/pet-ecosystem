do $$
declare
  legacy_pets_id_type text;
begin
  select data_type
  into legacy_pets_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pets'
    and column_name = 'id';

  if legacy_pets_id_type = 'bigint' then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'pets_legacy'
    ) then
      raise exception 'Legacy pets table already moved to public.pets_legacy';
    end if;

    alter table public.pets rename to pets_legacy;
  end if;
end;
$$;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  species text not null check (char_length(trim(species)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_profiles (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  breed text,
  sex text not null default 'unknown' check (sex in ('female', 'male', 'unknown')),
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (breed is null or char_length(trim(breed)) between 1 and 120)
);

create table if not exists public.pet_documents (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  document_type text not null check (document_type in ('vaccination_record', 'medical_record', 'identity', 'insurance', 'other')),
  file_name text not null check (char_length(trim(file_name)) between 1 and 240),
  storage_bucket text not null default 'pet-documents',
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pets_household_id_idx on public.pets (household_id);
create index if not exists pets_created_by_user_id_idx on public.pets (created_by_user_id);
create index if not exists pet_documents_pet_id_idx on public.pet_documents (pet_id);
create index if not exists pet_documents_document_type_idx on public.pet_documents (document_type);

create or replace function public.can_edit_household(target_household_id uuid, target_user_id uuid default auth.uid())
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
      and (
        membership.permissions @> array['edit']::text[]
        or membership.permissions @> array['admin']::text[]
      )
  );
$$;

create or replace function public.can_view_pet(target_pet_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets as pet
    where pet.id = target_pet_id
      and public.can_view_household(pet.household_id, target_user_id)
  );
$$;

create or replace function public.can_edit_pet(target_pet_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets as pet
    where pet.id = target_pet_id
      and public.can_edit_household(pet.household_id, target_user_id)
  );
$$;

create or replace function public.extract_pet_id_from_storage_path(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  pet_id_text text := split_part(object_name, '/', 1);
begin
  if pet_id_text is null or pet_id_text = '' then
    return null;
  end if;

  return pet_id_text::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.create_pet(
  target_household_id uuid,
  next_name text,
  next_species text,
  next_breed text default null,
  next_sex text default 'unknown',
  next_birth_date date default null,
  next_notes text default null
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
    notes
  )
  values (
    created_pet.id,
    normalized_breed,
    normalized_sex,
    next_birth_date,
    normalized_notes
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
  next_notes text default null
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
    notes
  )
  values (
    target_pet_id,
    normalized_breed,
    normalized_sex,
    next_birth_date,
    normalized_notes
  )
  on conflict (pet_id) do update
  set breed = excluded.breed,
      sex = excluded.sex,
      birth_date = excluded.birth_date,
      notes = excluded.notes,
      updated_at = now();

  return target_pet;
end;
$$;

drop trigger if exists trg_pets_updated_at on public.pets;
create trigger trg_pets_updated_at
before update on public.pets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pet_profiles_updated_at on public.pet_profiles;
create trigger trg_pet_profiles_updated_at
before update on public.pet_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pet_documents_updated_at on public.pet_documents;
create trigger trg_pet_documents_updated_at
before update on public.pet_documents
for each row
execute function public.set_updated_at();

alter table public.pets enable row level security;
alter table public.pet_profiles enable row level security;
alter table public.pet_documents enable row level security;

drop policy if exists pets_select_visible on public.pets;
create policy pets_select_visible
on public.pets
for select
to authenticated
using (public.can_view_household(household_id, auth.uid()));

drop policy if exists pet_profiles_select_visible on public.pet_profiles;
create policy pet_profiles_select_visible
on public.pet_profiles
for select
to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

drop policy if exists pet_documents_select_visible on public.pet_documents;
create policy pet_documents_select_visible
on public.pet_documents
for select
to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

drop policy if exists pet_documents_insert_editable on public.pet_documents;
create policy pet_documents_insert_editable
on public.pet_documents
for insert
to authenticated
with check (
  auth.uid() = created_by_user_id
  and storage_bucket = 'pet-documents'
  and public.can_edit_pet(pet_id, auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('pet-documents', 'pet-documents', false, 10485760)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists pet_documents_objects_select on storage.objects;
create policy pet_documents_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-documents'
  and public.can_view_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_documents_objects_insert on storage.objects;
create policy pet_documents_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-documents'
  and public.can_edit_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_documents_objects_delete on storage.objects;
create policy pet_documents_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-documents'
  and public.can_edit_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

grant execute on function public.can_edit_household(uuid, uuid) to authenticated;
grant execute on function public.can_view_pet(uuid, uuid) to authenticated;
grant execute on function public.can_edit_pet(uuid, uuid) to authenticated;
grant execute on function public.extract_pet_id_from_storage_path(text) to authenticated;
grant execute on function public.create_pet(uuid, text, text, text, text, date, text) to authenticated;
grant execute on function public.update_pet(uuid, text, text, text, text, date, text) to authenticated;
