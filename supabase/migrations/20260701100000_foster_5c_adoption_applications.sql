create table if not exists public.pet_adoption_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.pet_adoption_listings(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete restrict,
  protective_household_id uuid not null references public.households(id) on delete restrict,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  applicant_household_id uuid references public.households(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text,
  housing_type text not null,
  has_children boolean,
  has_other_pets boolean,
  pet_experience text not null,
  motivation text not null,
  availability_notes text,
  commitment_acknowledged boolean not null default false,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pet_adoption_applications_status_check
    check (status in ('submitted', 'withdrawn', 'in_review', 'rejected', 'approved', 'converted_to_transfer')),
  constraint pet_adoption_applications_required_text_check
    check (
      length(trim(applicant_name)) > 0
      and length(trim(applicant_email)) > 0
      and length(trim(housing_type)) > 0
      and length(trim(pet_experience)) > 0
      and length(trim(motivation)) > 0
    ),
  constraint pet_adoption_applications_commitment_check
    check (commitment_acknowledged = true),
  constraint pet_adoption_applications_withdrawn_check
    check ((status = 'withdrawn' and withdrawn_at is not null) or (status <> 'withdrawn'))
);

create unique index if not exists pet_adoption_applications_one_active_per_user_listing_idx
  on public.pet_adoption_applications(listing_id, applicant_user_id)
  where status not in ('withdrawn', 'rejected');

create index if not exists pet_adoption_applications_applicant_created_idx
  on public.pet_adoption_applications(applicant_user_id, created_at desc);

create index if not exists pet_adoption_applications_household_status_created_idx
  on public.pet_adoption_applications(protective_household_id, status, created_at desc);

create index if not exists pet_adoption_applications_listing_created_idx
  on public.pet_adoption_applications(listing_id, created_at desc);

drop trigger if exists set_pet_adoption_applications_updated_at on public.pet_adoption_applications;
create trigger set_pet_adoption_applications_updated_at
before update on public.pet_adoption_applications
for each row execute function public.set_updated_at();

alter table public.pet_adoption_applications enable row level security;

drop policy if exists pet_adoption_applications_select_scoped on public.pet_adoption_applications;
create policy pet_adoption_applications_select_scoped
on public.pet_adoption_applications
for select
using (
  applicant_user_id = auth.uid()
  or public.can_view_household(protective_household_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

create or replace function public.can_apply_to_pet_adoption_listing(target_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_adoption_listings as listing
    join public.households as household
      on household.id = listing.household_id
    join public.pets as pet
      on pet.id = listing.pet_id
    join public.protective_household_profiles as protective_profile
      on protective_profile.household_id = listing.household_id
    join public.protective_household_public_profiles as public_profile
      on public_profile.household_id = listing.household_id
    where listing.id = target_listing_id
      and listing.status = 'published'
      and listing.share_status = 'enabled'
      and household.household_type = 'protective'
      and pet.status = 'active'
      and protective_profile.status = 'approved'
      and public_profile.moderation_status = 'approved'
      and public_profile.is_public = true
  );
$$;

create or replace function public.create_pet_adoption_application(
  target_listing_id uuid,
  target_applicant_household_id uuid default null,
  next_applicant_name text default '',
  next_applicant_email text default '',
  next_applicant_phone text default null,
  next_housing_type text default '',
  next_has_children boolean default null,
  next_has_other_pets boolean default null,
  next_pet_experience text default '',
  next_motivation text default '',
  next_availability_notes text default null,
  next_commitment_acknowledged boolean default false
)
returns public.pet_adoption_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_listing public.pet_adoption_listings%rowtype;
  created_application public.pet_adoption_applications%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para enviar una solicitud de adopcion.';
  end if;

  if not public.can_apply_to_pet_adoption_listing(target_listing_id) then
    raise exception 'Esta publicacion no esta disponible para solicitudes de adopcion.';
  end if;

  select *
  into target_listing
  from public.pet_adoption_listings
  where id = target_listing_id;

  if target_applicant_household_id is not null
     and not public.can_view_household(target_applicant_household_id, current_user_id) then
    raise exception 'No tienes permiso para usar ese hogar como solicitante.';
  end if;

  if exists (
    select 1
    from public.pet_adoption_applications as application
    where application.listing_id = target_listing_id
      and application.applicant_user_id = current_user_id
      and application.status not in ('withdrawn', 'rejected')
  ) then
    raise exception 'Ya tienes una solicitud activa para esta mascota.';
  end if;

  if length(trim(next_applicant_name)) = 0
     or length(trim(next_applicant_email)) = 0
     or length(trim(next_housing_type)) = 0
     or length(trim(next_pet_experience)) = 0
     or length(trim(next_motivation)) = 0 then
    raise exception 'Completa los datos basicos de la solicitud.';
  end if;

  if next_commitment_acknowledged is not true then
    raise exception 'Confirma el compromiso responsable antes de enviar la solicitud.';
  end if;

  insert into public.pet_adoption_applications (
    listing_id,
    pet_id,
    protective_household_id,
    applicant_user_id,
    applicant_household_id,
    applicant_name,
    applicant_email,
    applicant_phone,
    housing_type,
    has_children,
    has_other_pets,
    pet_experience,
    motivation,
    availability_notes,
    commitment_acknowledged
  )
  values (
    target_listing.id,
    target_listing.pet_id,
    target_listing.household_id,
    current_user_id,
    target_applicant_household_id,
    trim(next_applicant_name),
    lower(trim(next_applicant_email)),
    nullif(trim(coalesce(next_applicant_phone, '')), ''),
    trim(next_housing_type),
    next_has_children,
    next_has_other_pets,
    trim(next_pet_experience),
    trim(next_motivation),
    nullif(trim(coalesce(next_availability_notes, '')), ''),
    true
  )
  returning *
  into created_application;

  perform public.insert_audit_log(
    'pet_adoption_application',
    created_application.id,
    'pet_adoption_application_submitted',
    jsonb_build_object(
      'listing_id', created_application.listing_id,
      'pet_id', created_application.pet_id,
      'protective_household_id', created_application.protective_household_id
    ),
    current_user_id
  );

  return created_application;
end;
$$;

create or replace function public.list_my_pet_adoption_applications()
returns table (
  id uuid,
  listing_id uuid,
  pet_id uuid,
  protective_household_id uuid,
  applicant_user_id uuid,
  applicant_household_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  housing_type text,
  has_children boolean,
  has_other_pets boolean,
  pet_experience text,
  motivation text,
  availability_notes text,
  commitment_acknowledged boolean,
  status text,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  listing_title text,
  pet_name text,
  pet_species text,
  pet_breed text,
  protective_household_name text
)
language sql
security definer
set search_path = public
as $$
  select
    application.id,
    application.listing_id,
    application.pet_id,
    application.protective_household_id,
    application.applicant_user_id,
    application.applicant_household_id,
    application.applicant_name,
    application.applicant_email,
    application.applicant_phone,
    application.housing_type,
    application.has_children,
    application.has_other_pets,
    application.pet_experience,
    application.motivation,
    application.availability_notes,
    application.commitment_acknowledged,
    application.status,
    application.submitted_at,
    application.withdrawn_at,
    application.created_at,
    application.updated_at,
    listing.title as listing_title,
    pet.name as pet_name,
    pet.species as pet_species,
    profile.breed as pet_breed,
    household.name as protective_household_name
  from public.pet_adoption_applications as application
  join public.pet_adoption_listings as listing
    on listing.id = application.listing_id
  join public.pets as pet
    on pet.id = application.pet_id
  left join public.pet_profiles as profile
    on profile.pet_id = pet.id
  join public.households as household
    on household.id = application.protective_household_id
  where application.applicant_user_id = auth.uid()
  order by application.created_at desc;
$$;

create or replace function public.list_received_pet_adoption_applications(target_household_id uuid default null)
returns table (
  id uuid,
  listing_id uuid,
  pet_id uuid,
  protective_household_id uuid,
  applicant_user_id uuid,
  applicant_household_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  housing_type text,
  has_children boolean,
  has_other_pets boolean,
  pet_experience text,
  motivation text,
  availability_notes text,
  commitment_acknowledged boolean,
  status text,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  listing_title text,
  pet_name text,
  pet_species text,
  pet_breed text,
  protective_household_name text
)
language sql
security definer
set search_path = public
as $$
  select
    application.id,
    application.listing_id,
    application.pet_id,
    application.protective_household_id,
    application.applicant_user_id,
    application.applicant_household_id,
    application.applicant_name,
    application.applicant_email,
    application.applicant_phone,
    application.housing_type,
    application.has_children,
    application.has_other_pets,
    application.pet_experience,
    application.motivation,
    application.availability_notes,
    application.commitment_acknowledged,
    application.status,
    application.submitted_at,
    application.withdrawn_at,
    application.created_at,
    application.updated_at,
    listing.title as listing_title,
    pet.name as pet_name,
    pet.species as pet_species,
    profile.breed as pet_breed,
    household.name as protective_household_name
  from public.pet_adoption_applications as application
  join public.pet_adoption_listings as listing
    on listing.id = application.listing_id
  join public.pets as pet
    on pet.id = application.pet_id
  left join public.pet_profiles as profile
    on profile.pet_id = pet.id
  join public.households as household
    on household.id = application.protective_household_id
  where public.can_view_household(application.protective_household_id, auth.uid())
    and (target_household_id is null or application.protective_household_id = target_household_id)
  order by application.created_at desc;
$$;

create or replace function public.withdraw_pet_adoption_application(target_application_id uuid)
returns public.pet_adoption_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  withdrawn_application public.pet_adoption_applications%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para retirar una solicitud.';
  end if;

  update public.pet_adoption_applications
  set
    status = 'withdrawn',
    withdrawn_at = now()
  where id = target_application_id
    and applicant_user_id = current_user_id
    and status in ('submitted', 'in_review')
  returning *
  into withdrawn_application;

  if withdrawn_application.id is null then
    raise exception 'No se pudo retirar la solicitud. Verifica que siga activa y te pertenezca.';
  end if;

  perform public.insert_audit_log(
    'pet_adoption_application',
    withdrawn_application.id,
    'pet_adoption_application_withdrawn',
    jsonb_build_object('listing_id', withdrawn_application.listing_id),
    current_user_id
  );

  return withdrawn_application;
end;
$$;

create or replace function public.list_pet_adoption_applications_for_admin()
returns table (
  id uuid,
  listing_id uuid,
  pet_id uuid,
  protective_household_id uuid,
  applicant_user_id uuid,
  applicant_household_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  housing_type text,
  has_children boolean,
  has_other_pets boolean,
  pet_experience text,
  motivation text,
  availability_notes text,
  commitment_acknowledged boolean,
  status text,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  listing_title text,
  pet_name text,
  pet_species text,
  pet_breed text,
  protective_household_name text
)
language sql
security definer
set search_path = public
as $$
  select
    application.id,
    application.listing_id,
    application.pet_id,
    application.protective_household_id,
    application.applicant_user_id,
    application.applicant_household_id,
    application.applicant_name,
    application.applicant_email,
    application.applicant_phone,
    application.housing_type,
    application.has_children,
    application.has_other_pets,
    application.pet_experience,
    application.motivation,
    application.availability_notes,
    application.commitment_acknowledged,
    application.status,
    application.submitted_at,
    application.withdrawn_at,
    application.created_at,
    application.updated_at,
    listing.title as listing_title,
    pet.name as pet_name,
    pet.species as pet_species,
    profile.breed as pet_breed,
    household.name as protective_household_name
  from public.pet_adoption_applications as application
  join public.pet_adoption_listings as listing
    on listing.id = application.listing_id
  join public.pets as pet
    on pet.id = application.pet_id
  left join public.pet_profiles as profile
    on profile.pet_id = pet.id
  join public.households as household
    on household.id = application.protective_household_id
  where public.is_platform_admin(auth.uid())
  order by application.created_at desc
  limit 200;
$$;

grant select on public.pet_adoption_applications to authenticated;
grant execute on function public.can_apply_to_pet_adoption_listing(uuid) to anon, authenticated;
grant execute on function public.create_pet_adoption_application(uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean) to authenticated;
grant execute on function public.list_my_pet_adoption_applications() to authenticated;
grant execute on function public.list_received_pet_adoption_applications(uuid) to authenticated;
grant execute on function public.withdraw_pet_adoption_application(uuid) to authenticated;
grant execute on function public.list_pet_adoption_applications_for_admin() to authenticated;
