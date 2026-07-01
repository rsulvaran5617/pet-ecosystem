alter table public.pet_adoption_applications
  drop constraint if exists pet_adoption_applications_status_check;

alter table public.pet_adoption_applications
  add constraint pet_adoption_applications_status_check
  check (status in ('submitted', 'withdrawn', 'in_review', 'interview', 'rejected', 'approved', 'converted_to_transfer'));

create table if not exists public.pet_adoption_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pet_adoption_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  change_notes text,
  created_at timestamptz not null default now(),
  constraint pet_adoption_application_status_history_to_status_check
    check (to_status in ('submitted', 'withdrawn', 'in_review', 'interview', 'rejected', 'approved', 'converted_to_transfer')),
  constraint pet_adoption_application_status_history_from_status_check
    check (from_status is null or from_status in ('submitted', 'withdrawn', 'in_review', 'interview', 'rejected', 'approved', 'converted_to_transfer'))
);

create index if not exists pet_adoption_application_status_history_application_created_idx
  on public.pet_adoption_application_status_history(application_id, created_at desc);

create index if not exists pet_adoption_application_status_history_actor_created_idx
  on public.pet_adoption_application_status_history(changed_by_user_id, created_at desc);

create index if not exists pet_adoption_application_status_history_status_created_idx
  on public.pet_adoption_application_status_history(to_status, created_at desc);

alter table public.pet_adoption_application_status_history enable row level security;

create or replace function public.can_view_pet_adoption_application(
  target_application_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_adoption_applications as application
    where application.id = target_application_id
      and (
        application.applicant_user_id = target_user_id
        or public.can_view_household(application.protective_household_id, target_user_id)
        or public.is_platform_admin(target_user_id)
      )
  );
$$;

drop policy if exists pet_adoption_application_status_history_select_scoped
  on public.pet_adoption_application_status_history;
create policy pet_adoption_application_status_history_select_scoped
on public.pet_adoption_application_status_history
for select
using (public.can_view_pet_adoption_application(application_id, auth.uid()));

insert into public.pet_adoption_application_status_history (
  application_id,
  from_status,
  to_status,
  changed_by_user_id,
  change_notes,
  created_at
)
select
  application.id,
  null,
  application.status,
  application.applicant_user_id,
  'Solicitud registrada.',
  application.submitted_at
from public.pet_adoption_applications as application
where not exists (
  select 1
  from public.pet_adoption_application_status_history as history
  where history.application_id = application.id
);

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

  insert into public.pet_adoption_application_status_history (
    application_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_notes,
    created_at
  )
  values (
    created_application.id,
    null,
    created_application.status,
    current_user_id,
    'Solicitud registrada.',
    created_application.submitted_at
  );

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

create or replace function public.get_pet_adoption_application_detail(target_application_id uuid)
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
  where application.id = target_application_id
    and public.can_view_pet_adoption_application(application.id, auth.uid());
$$;

create or replace function public.update_pet_adoption_application_status(
  target_application_id uuid,
  next_status text,
  notes text default null
)
returns public.pet_adoption_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_application public.pet_adoption_applications%rowtype;
  updated_application public.pet_adoption_applications%rowtype;
  is_applicant boolean := false;
  is_protective_manager boolean := false;
  normalized_notes text := nullif(trim(coalesce(notes, '')), '');
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion para cambiar el estado de una solicitud.';
  end if;

  if next_status not in ('withdrawn', 'in_review', 'interview', 'rejected', 'approved') then
    raise exception 'Estado de solicitud no permitido en Foster-5D.';
  end if;

  select *
  into current_application
  from public.pet_adoption_applications
  where id = target_application_id
  for update;

  if current_application.id is null then
    raise exception 'Solicitud de adopcion no encontrada.';
  end if;

  is_applicant := current_application.applicant_user_id = current_user_id;
  is_protective_manager := public.can_view_household(current_application.protective_household_id, current_user_id);

  if current_application.status = next_status then
    raise exception 'La solicitud ya tiene ese estado.';
  end if;

  if current_application.status in ('withdrawn', 'rejected', 'approved', 'converted_to_transfer') then
    raise exception 'Esta solicitud ya esta cerrada para cambios de Foster-5D.';
  end if;

  if next_status = 'withdrawn' then
    if not is_applicant or current_application.status not in ('submitted', 'in_review') then
      raise exception 'Solo el solicitante puede retirar solicitudes enviadas o en revision.';
    end if;
  elsif next_status = 'in_review' then
    if not is_protective_manager or current_application.status <> 'submitted' then
      raise exception 'Solo la familia protectora puede marcar en revision una solicitud enviada.';
    end if;
  elsif next_status = 'interview' then
    if not is_protective_manager or current_application.status <> 'in_review' then
      raise exception 'Solo la familia protectora puede coordinar entrevista desde una solicitud en revision.';
    end if;
  elsif next_status = 'approved' then
    if not is_protective_manager or current_application.status <> 'interview' then
      raise exception 'Solo la familia protectora puede aprobar despues de entrevista.';
    end if;
  elsif next_status = 'rejected' then
    if not is_protective_manager or current_application.status not in ('submitted', 'in_review', 'interview') then
      raise exception 'Solo la familia protectora puede rechazar solicitudes activas.';
    end if;

    if normalized_notes is null then
      raise exception 'La nota es obligatoria para rechazar una solicitud.';
    end if;
  end if;

  update public.pet_adoption_applications
  set
    status = next_status,
    withdrawn_at = case when next_status = 'withdrawn' then now() else withdrawn_at end
  where id = current_application.id
  returning *
  into updated_application;

  insert into public.pet_adoption_application_status_history (
    application_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_notes
  )
  values (
    updated_application.id,
    current_application.status,
    updated_application.status,
    current_user_id,
    normalized_notes
  );

  perform public.insert_audit_log(
    'pet_adoption_application',
    updated_application.id,
    'pet_adoption_application_status_changed',
    jsonb_build_object(
      'from_status', current_application.status,
      'to_status', updated_application.status,
      'listing_id', updated_application.listing_id,
      'pet_id', updated_application.pet_id
    ),
    current_user_id
  );

  return updated_application;
end;
$$;

create or replace function public.withdraw_pet_adoption_application(target_application_id uuid)
returns public.pet_adoption_applications
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.update_pet_adoption_application_status(target_application_id, 'withdrawn', 'Solicitud retirada por el solicitante.');
end;
$$;

create or replace function public.list_pet_adoption_application_status_history(target_application_id uuid)
returns table (
  id uuid,
  application_id uuid,
  from_status text,
  to_status text,
  changed_by_user_id uuid,
  changed_by_email text,
  change_notes text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    history.id,
    history.application_id,
    history.from_status,
    history.to_status,
    history.changed_by_user_id,
    profile.email as changed_by_email,
    history.change_notes,
    history.created_at
  from public.pet_adoption_application_status_history as history
  left join public.profiles as profile
    on profile.id = history.changed_by_user_id
  where history.application_id = target_application_id
    and public.can_view_pet_adoption_application(history.application_id, auth.uid())
  order by history.created_at asc;
$$;

grant select on public.pet_adoption_application_status_history to authenticated;
grant execute on function public.can_view_pet_adoption_application(uuid, uuid) to authenticated;
grant execute on function public.get_pet_adoption_application_detail(uuid) to authenticated;
grant execute on function public.update_pet_adoption_application_status(uuid, text, text) to authenticated;
grant execute on function public.list_pet_adoption_application_status_history(uuid) to authenticated;
