alter table public.adoption_public_requests
  drop constraint if exists adoption_public_requests_status_check;

alter table public.adoption_public_requests
  add constraint adoption_public_requests_status_check
  check (status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'converted_to_application', 'rejected', 'cancelled', 'expired'));

alter table public.adoption_public_request_status_history
  drop constraint if exists adoption_public_request_history_status_check;

alter table public.adoption_public_request_status_history
  add constraint adoption_public_request_history_status_check
  check (
    (from_status is null or from_status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'converted_to_application', 'rejected', 'cancelled', 'expired'))
    and to_status in ('submitted', 'in_review', 'preselected', 'invited_to_app', 'converted_to_application', 'rejected', 'cancelled', 'expired')
  );

alter table public.adoption_invites
  add column if not exists formal_application_id uuid references public.pet_adoption_applications(id) on delete set null;

create unique index if not exists adoption_invites_formal_application_unique_idx
  on public.adoption_invites(formal_application_id)
  where formal_application_id is not null;

create or replace function public.claim_adoption_invite(raw_token text)
returns table (
  invite_id uuid,
  public_request_id uuid,
  listing_id uuid,
  invite_status text,
  next_step text,
  pet_name text,
  protective_display_name text,
  requester_name text,
  requester_email text,
  requester_phone text,
  requester_city text,
  housing_type text,
  has_children boolean,
  has_other_pets boolean,
  experience text,
  motivation text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  hashed_token text := encode(digest(trim(coalesce(raw_token, '')), 'sha256'), 'hex');
  target_invite public.adoption_invites%rowtype;
  target_request public.adoption_public_requests%rowtype;
  target_pet_name text;
  target_protective_name text;
  owner_household_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion como propietario para continuar.';
  end if;

  select lower(trim(coalesce(user_record.email, '')))
  into current_user_email
  from auth.users as user_record
  where user_record.id = current_user_id;

  select invite.*
  into target_invite
  from public.adoption_invites as invite
  where invite.invite_token_hash = hashed_token
  for update;

  if target_invite.id is null then
    raise exception 'La invitacion no existe o el enlace es incorrecto.';
  end if;

  if target_invite.status in ('created', 'sent', 'opened') and target_invite.expires_at <= now() then
    update public.adoption_invites set status = 'expired' where id = target_invite.id;
    raise exception 'La invitacion vencio. Solicita un enlace nuevo a la Familia Protectora.';
  end if;

  if target_invite.status in ('expired', 'revoked') then
    raise exception 'La invitacion ya no esta disponible.';
  end if;

  if target_invite.status = 'claimed' and target_invite.claimed_by_user_id <> current_user_id then
    raise exception 'La invitacion ya fue utilizada por otra cuenta.';
  end if;

  if lower(trim(target_invite.recipient_email)) <> current_user_email then
    raise exception 'Inicia sesion con el mismo correo que recibio la invitacion.';
  end if;

  select request.*
  into target_request
  from public.adoption_public_requests as request
  where request.id = target_invite.public_request_id;

  if target_request.id is null or target_request.status not in ('invited_to_app', 'converted_to_application') then
    raise exception 'El contacto asociado ya no puede continuar por esta invitacion.';
  end if;

  if target_invite.status <> 'claimed' then
    update public.adoption_invites
    set status = 'claimed',
        claimed_by_user_id = current_user_id,
        claimed_at = now()
    where id = target_invite.id;
    target_invite.status := 'claimed';
    target_invite.claimed_by_user_id := current_user_id;

    perform public.insert_audit_log(
      'adoption_invite', target_invite.id, 'adoption_invite_claimed',
      jsonb_build_object('public_request_id', target_request.id), current_user_id
    );
  end if;

  select exists (
    select 1
    from public.households as household
    where household.household_type = 'owner'
      and public.can_manage_household(household.id, current_user_id)
  ) into owner_household_exists;

  select pet.name, public_profile.display_name
  into target_pet_name, target_protective_name
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = listing.household_id
  where listing.id = target_invite.listing_id;

  return query select
    target_invite.id,
    target_request.id,
    target_invite.listing_id,
    target_invite.status,
    case when target_invite.formal_application_id is not null then 'completed'
         when owner_household_exists then 'complete_application'
         else 'create_household' end,
    target_pet_name,
    target_protective_name,
    target_request.requester_name,
    target_request.requester_email,
    target_request.requester_phone,
    target_request.requester_city,
    target_request.housing_type,
    target_request.has_children,
    target_request.has_other_pets,
    target_request.experience,
    target_request.motivation;
end;
$$;

create or replace function public.convert_public_request_to_adoption_application(
  target_invite_id uuid,
  target_applicant_household_id uuid,
  next_applicant_name text,
  next_applicant_email text,
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
  target_invite public.adoption_invites%rowtype;
  target_request public.adoption_public_requests%rowtype;
  created_application public.pet_adoption_applications%rowtype;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesion como propietario para continuar.';
  end if;

  select invite.*
  into target_invite
  from public.adoption_invites as invite
  where invite.id = target_invite_id
  for update;

  if target_invite.id is null
     or target_invite.status <> 'claimed'
     or target_invite.claimed_by_user_id <> current_user_id then
    raise exception 'Primero debes reclamar una invitacion valida con esta cuenta.';
  end if;

  if target_invite.formal_application_id is not null then
    select application.* into created_application
    from public.pet_adoption_applications as application
    where application.id = target_invite.formal_application_id;
    return created_application;
  end if;

  if not exists (
    select 1 from public.households as household
    where household.id = target_applicant_household_id
      and household.household_type = 'owner'
      and public.can_manage_household(household.id, current_user_id)
  ) then
    raise exception 'Selecciona un hogar familiar que puedas administrar.';
  end if;

  select request.* into target_request
  from public.adoption_public_requests as request
  where request.id = target_invite.public_request_id
  for update;

  select application.* into created_application
  from public.pet_adoption_applications as application
  where application.listing_id = target_invite.listing_id
    and application.applicant_user_id = current_user_id
    and application.status not in ('withdrawn', 'rejected')
  order by application.created_at desc
  limit 1;

  if created_application.id is null then
    select application_result.* into created_application
    from public.create_pet_adoption_application(
      target_invite.listing_id,
      target_applicant_household_id,
      next_applicant_name,
      next_applicant_email,
      next_applicant_phone,
      next_housing_type,
      next_has_children,
      next_has_other_pets,
      next_pet_experience,
      next_motivation,
      next_availability_notes,
      next_commitment_acknowledged
    ) as application_result;
  end if;

  update public.adoption_invites
  set formal_application_id = created_application.id
  where id = target_invite.id;

  if target_request.status <> 'converted_to_application' then
    update public.adoption_public_requests
    set status = 'converted_to_application'
    where id = target_request.id;

    insert into public.adoption_public_request_status_history (
      public_request_id, from_status, to_status, changed_by_user_id, change_reason
    ) values (
      target_request.id, target_request.status, 'converted_to_application', current_user_id,
      'Interes convertido en solicitud formal desde invitacion.'
    );
  end if;

  perform public.insert_audit_log(
    'adoption_invite', target_invite.id, 'formal_application_completed_from_invite',
    jsonb_build_object('application_id', created_application.id, 'public_request_id', target_request.id),
    current_user_id
  );

  return created_application;
end;
$$;

revoke execute on function public.claim_adoption_invite(text) from public;
revoke execute on function public.convert_public_request_to_adoption_application(uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean) from public;
grant execute on function public.claim_adoption_invite(text) to authenticated;
grant execute on function public.convert_public_request_to_adoption_application(uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean) to authenticated;

comment on function public.claim_adoption_invite(text) is
  'Claims an adoption invite for the authenticated recipient without creating custody or a formal application.';

comment on function public.convert_public_request_to_adoption_application(uuid, uuid, text, text, text, text, boolean, boolean, text, text, text, boolean) is
  'Converts a claimed public request into an existing formal adoption application; custody remains unchanged.';
