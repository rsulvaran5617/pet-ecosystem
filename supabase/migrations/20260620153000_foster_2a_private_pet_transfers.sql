create table if not exists public.pet_custody_contexts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete restrict,
  custody_type text not null default 'owner' check (custody_type in ('owner', 'foster', 'rescue', 'temporary')),
  status text not null default 'active' check (status in ('active', 'ended', 'transferred', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and ended_at is null) or (status <> 'active' and ended_at is not null))
);

create unique index if not exists pet_custody_contexts_one_active_pet_idx
  on public.pet_custody_contexts(pet_id)
  where status = 'active';

create index if not exists pet_custody_contexts_pet_status_idx
  on public.pet_custody_contexts(pet_id, status);

create index if not exists pet_custody_contexts_household_status_idx
  on public.pet_custody_contexts(household_id, status);

drop trigger if exists trg_pet_custody_contexts_updated_at on public.pet_custody_contexts;
create trigger trg_pet_custody_contexts_updated_at
before update on public.pet_custody_contexts
for each row execute function public.set_updated_at();

create table if not exists public.pet_transfer_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete restrict,
  from_household_id uuid not null references public.households(id) on delete restrict,
  to_household_id uuid references public.households(id) on delete restrict,
  recipient_email text not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  initiated_by_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  consent_snapshot jsonb not null default '{}'::jsonb,
  transfer_notes text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_email = lower(trim(recipient_email))),
  check ((status = 'accepted' and accepted_at is not null and to_household_id is not null and accepted_by_user_id is not null) or status <> 'accepted'),
  check ((status = 'rejected' and rejected_at is not null) or status <> 'rejected'),
  check ((status = 'cancelled' and cancelled_at is not null) or status <> 'cancelled'),
  check ((status = 'expired' and expired_at is not null) or status <> 'expired')
);

create unique index if not exists pet_transfer_records_one_pending_pet_idx
  on public.pet_transfer_records(pet_id)
  where status = 'pending';

create index if not exists pet_transfer_records_pet_status_idx
  on public.pet_transfer_records(pet_id, status);

create index if not exists pet_transfer_records_from_household_status_idx
  on public.pet_transfer_records(from_household_id, status);

create index if not exists pet_transfer_records_recipient_email_status_idx
  on public.pet_transfer_records(recipient_email, status);

create index if not exists pet_transfer_records_recipient_user_status_idx
  on public.pet_transfer_records(recipient_user_id, status)
  where recipient_user_id is not null;

drop trigger if exists trg_pet_transfer_records_updated_at on public.pet_transfer_records;
create trigger trg_pet_transfer_records_updated_at
before update on public.pet_transfer_records
for each row execute function public.set_updated_at();

alter table public.pet_custody_contexts enable row level security;
alter table public.pet_transfer_records enable row level security;

create or replace function public.is_approved_protective_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.protective_household_profiles as profile
    where profile.household_id = target_household_id
      and profile.status = 'approved'
  );
$$;

grant execute on function public.is_approved_protective_household(uuid) to authenticated;

drop policy if exists pet_custody_contexts_select_involved_or_admin on public.pet_custody_contexts;
create policy pet_custody_contexts_select_involved_or_admin
on public.pet_custody_contexts
for select
to authenticated
using (
  public.can_view_household(household_id, auth.uid())
  or public.can_view_pet(pet_id, auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists pet_transfer_records_select_involved_or_admin on public.pet_transfer_records;
create policy pet_transfer_records_select_involved_or_admin
on public.pet_transfer_records
for select
to authenticated
using (
  public.can_view_household(from_household_id, auth.uid())
  or (to_household_id is not null and public.can_view_household(to_household_id, auth.uid()))
  or recipient_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and lower(profile.email) = recipient_email
  )
  or public.is_platform_admin(auth.uid())
);

grant select on public.pet_custody_contexts to authenticated;
grant select on public.pet_transfer_records to authenticated;

create or replace function public.create_pet_transfer_invitation(
  target_pet_id uuid,
  target_from_household_id uuid,
  target_recipient_email text,
  notes text default null
)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(target_recipient_email));
  target_pet public.pets;
  created_transfer public.pet_transfer_records;
  recipient_profile public.profiles;
  snapshot jsonb;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  if normalized_email is null or normalized_email = '' or position('@' in normalized_email) = 0 then
    raise exception 'Ingresa un correo valido para la familia receptora.';
  end if;

  if not public.can_manage_household(target_from_household_id, current_user_id) then
    raise exception 'Solo un administrador del hogar puede transferir mascotas.';
  end if;

  if not public.is_approved_protective_household(target_from_household_id) then
    raise exception 'Solo una familia protectora aprobada puede iniciar transferencias privadas.';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_pet_id
  for update;

  if target_pet.id is null then
    raise exception 'Mascota no encontrada.';
  end if;

  if target_pet.household_id <> target_from_household_id then
    raise exception 'La mascota no pertenece al hogar emisor.';
  end if;

  if target_pet.status = 'in_memory' then
    raise exception 'Una mascota En memoria no puede transferirse.';
  end if;

  if exists (
    select 1
    from public.pet_transfer_records
    where pet_id = target_pet_id
      and status = 'pending'
  ) then
    raise exception 'Esta mascota ya tiene una transferencia pendiente.';
  end if;

  select *
  into recipient_profile
  from public.profiles
  where lower(email) = normalized_email
  limit 1;

  insert into public.pet_custody_contexts (
    pet_id,
    household_id,
    custody_type,
    status,
    started_at,
    created_by_user_id
  )
  select
    target_pet.id,
    target_pet.household_id,
    case when public.is_approved_protective_household(target_pet.household_id) then 'foster' else 'owner' end,
    'active',
    target_pet.created_at,
    target_pet.created_by_user_id
  where not exists (
    select 1
    from public.pet_custody_contexts
    where pet_id = target_pet.id
      and status = 'active'
  );

  snapshot := jsonb_build_object(
    'pet_name', target_pet.name,
    'pet_species', target_pet.species,
    'document_count', (select count(*) from public.pet_documents where pet_id = target_pet.id),
    'vaccine_count', (select count(*) from public.pet_vaccines where pet_id = target_pet.id),
    'allergy_count', (select count(*) from public.pet_allergies where pet_id = target_pet.id),
    'condition_count', (select count(*) from public.pet_conditions where pet_id = target_pet.id),
    'pending_reminder_count', (
      select count(*)
      from public.reminders
      where pet_id = target_pet.id
        and household_id = target_pet.household_id
        and status = 'pending'
        and due_at >= now()
    ),
    'shared_policy', 'pet_profile_health_and_authorized_documents',
    'excluded_data', jsonb_build_array('bookings', 'chats', 'payments', 'support', 'future_reminders')
  );

  insert into public.pet_transfer_records (
    pet_id,
    from_household_id,
    recipient_email,
    recipient_user_id,
    initiated_by_user_id,
    consent_snapshot,
    transfer_notes
  )
  values (
    target_pet.id,
    target_from_household_id,
    normalized_email,
    recipient_profile.id,
    current_user_id,
    snapshot,
    nullif(trim(notes), '')
  )
  returning * into created_transfer;

  perform public.insert_audit_log(
    'pet_transfer',
    created_transfer.id,
    'pet_transfer_invited',
    jsonb_build_object(
      'pet_id', created_transfer.pet_id,
      'from_household_id', created_transfer.from_household_id,
      'recipient_email', created_transfer.recipient_email
    ),
    current_user_id
  );

  return created_transfer;
end;
$$;

create or replace function public.accept_pet_transfer(
  target_transfer_id uuid,
  target_to_household_id uuid
)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  target_transfer public.pet_transfer_records;
  target_pet public.pets;
  accepted_transfer public.pet_transfer_records;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select lower(email)
  into current_email
  from public.profiles
  where id = current_user_id;

  if not public.can_manage_household(target_to_household_id, current_user_id) then
    raise exception 'Solo un administrador del hogar receptor puede aceptar la transferencia.';
  end if;

  select *
  into target_transfer
  from public.pet_transfer_records
  where id = target_transfer_id
  for update;

  if target_transfer.id is null then
    raise exception 'Invitacion de transferencia no encontrada.';
  end if;

  if target_transfer.status <> 'pending' then
    raise exception 'Esta invitacion ya no esta pendiente.';
  end if;

  if target_transfer.expires_at <= now() then
    update public.pet_transfer_records
    set status = 'expired',
        expired_at = now()
    where id = target_transfer.id;

    raise exception 'Esta invitacion de transferencia expiro.';
  end if;

  if target_transfer.recipient_user_id is not null and target_transfer.recipient_user_id <> current_user_id then
    raise exception 'Esta invitacion fue dirigida a otro usuario.';
  end if;

  if target_transfer.recipient_user_id is null and current_email <> target_transfer.recipient_email then
    raise exception 'Esta invitacion fue dirigida a otro correo.';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_transfer.pet_id
  for update;

  if target_pet.id is null then
    raise exception 'Mascota no encontrada.';
  end if;

  if target_pet.household_id <> target_transfer.from_household_id then
    raise exception 'La mascota ya no pertenece al hogar emisor.';
  end if;

  if target_pet.status = 'in_memory' then
    raise exception 'Una mascota En memoria no puede transferirse.';
  end if;

  update public.pet_custody_contexts
  set status = 'transferred',
      ended_at = now()
  where pet_id = target_transfer.pet_id
    and household_id = target_transfer.from_household_id
    and status = 'active';

  update public.pets
  set household_id = target_to_household_id
  where id = target_transfer.pet_id;

  insert into public.pet_custody_contexts (
    pet_id,
    household_id,
    custody_type,
    status,
    started_at,
    created_by_user_id
  )
  values (
    target_transfer.pet_id,
    target_to_household_id,
    case when public.is_approved_protective_household(target_to_household_id) then 'foster' else 'owner' end,
    'active',
    now(),
    current_user_id
  );

  update public.pet_transfer_records
  set status = 'accepted',
      to_household_id = target_to_household_id,
      recipient_user_id = current_user_id,
      accepted_by_user_id = current_user_id,
      accepted_at = now()
  where id = target_transfer.id
  returning * into accepted_transfer;

  perform public.insert_audit_log(
    'pet_transfer',
    accepted_transfer.id,
    'pet_transfer_accepted',
    jsonb_build_object(
      'pet_id', accepted_transfer.pet_id,
      'from_household_id', accepted_transfer.from_household_id,
      'to_household_id', accepted_transfer.to_household_id
    ),
    current_user_id
  );

  return accepted_transfer;
end;
$$;

create or replace function public.reject_pet_transfer(target_transfer_id uuid)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  target_transfer public.pet_transfer_records;
  rejected_transfer public.pet_transfer_records;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select lower(email)
  into current_email
  from public.profiles
  where id = current_user_id;

  select *
  into target_transfer
  from public.pet_transfer_records
  where id = target_transfer_id
  for update;

  if target_transfer.id is null then
    raise exception 'Invitacion de transferencia no encontrada.';
  end if;

  if target_transfer.status <> 'pending' then
    raise exception 'Esta invitacion ya no esta pendiente.';
  end if;

  if target_transfer.recipient_user_id is not null and target_transfer.recipient_user_id <> current_user_id then
    raise exception 'Esta invitacion fue dirigida a otro usuario.';
  end if;

  if target_transfer.recipient_user_id is null and current_email <> target_transfer.recipient_email then
    raise exception 'Esta invitacion fue dirigida a otro correo.';
  end if;

  update public.pet_transfer_records
  set status = 'rejected',
      recipient_user_id = coalesce(recipient_user_id, current_user_id),
      rejected_at = now()
  where id = target_transfer.id
  returning * into rejected_transfer;

  perform public.insert_audit_log(
    'pet_transfer',
    rejected_transfer.id,
    'pet_transfer_rejected',
    jsonb_build_object('pet_id', rejected_transfer.pet_id),
    current_user_id
  );

  return rejected_transfer;
end;
$$;

create or replace function public.cancel_pet_transfer(target_transfer_id uuid)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_transfer public.pet_transfer_records;
  cancelled_transfer public.pet_transfer_records;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select *
  into target_transfer
  from public.pet_transfer_records
  where id = target_transfer_id
  for update;

  if target_transfer.id is null then
    raise exception 'Invitacion de transferencia no encontrada.';
  end if;

  if target_transfer.status <> 'pending' then
    raise exception 'Esta invitacion ya no esta pendiente.';
  end if;

  if not public.can_manage_household(target_transfer.from_household_id, current_user_id) then
    raise exception 'Solo el hogar emisor puede cancelar la transferencia.';
  end if;

  update public.pet_transfer_records
  set status = 'cancelled',
      cancelled_at = now()
  where id = target_transfer.id
  returning * into cancelled_transfer;

  perform public.insert_audit_log(
    'pet_transfer',
    cancelled_transfer.id,
    'pet_transfer_cancelled',
    jsonb_build_object('pet_id', cancelled_transfer.pet_id),
    current_user_id
  );

  return cancelled_transfer;
end;
$$;

create or replace function public.list_incoming_pet_transfer_invitations()
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  recipient_email text,
  recipient_user_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select lower(email)
  into current_email
  from public.profiles
  where id = current_user_id;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  where transfer.recipient_user_id = current_user_id
    or transfer.recipient_email = current_email
  order by transfer.created_at desc;
end;
$$;

create or replace function public.list_outgoing_pet_transfer_records(target_household_id uuid default null)
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  to_household_name text,
  recipient_email text,
  recipient_user_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    to_household.name as to_household_name,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  left join public.households as to_household
    on to_household.id = transfer.to_household_id
  where public.can_view_household(transfer.from_household_id, current_user_id)
    and (target_household_id is null or transfer.from_household_id = target_household_id)
  order by transfer.created_at desc;
end;
$$;

create or replace function public.list_pet_custody_history(target_pet_id uuid)
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  household_name text,
  custody_type text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required.';
  end if;

  if not public.can_view_pet(target_pet_id, auth.uid()) and not public.is_platform_admin(auth.uid()) then
    raise exception 'No tienes permiso para ver el historial de custodia de esta mascota.';
  end if;

  return query
  select
    context.id,
    context.pet_id,
    context.household_id,
    household.name as household_name,
    context.custody_type,
    context.status,
    context.started_at,
    context.ended_at,
    context.created_by_user_id,
    context.created_at,
    context.updated_at
  from public.pet_custody_contexts as context
  join public.households as household
    on household.id = context.household_id
  where context.pet_id = target_pet_id
  order by context.started_at desc;
end;
$$;

create or replace function public.list_pet_transfer_records_for_admin()
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  to_household_name text,
  recipient_email text,
  recipient_user_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    to_household.name as to_household_name,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  left join public.households as to_household
    on to_household.id = transfer.to_household_id
  order by transfer.created_at desc
  limit 100;
end;
$$;

grant execute on function public.create_pet_transfer_invitation(uuid, uuid, text, text) to authenticated;
grant execute on function public.accept_pet_transfer(uuid, uuid) to authenticated;
grant execute on function public.reject_pet_transfer(uuid) to authenticated;
grant execute on function public.cancel_pet_transfer(uuid) to authenticated;
grant execute on function public.list_incoming_pet_transfer_invitations() to authenticated;
grant execute on function public.list_outgoing_pet_transfer_records(uuid) to authenticated;
grant execute on function public.list_pet_custody_history(uuid) to authenticated;
grant execute on function public.list_pet_transfer_records_for_admin() to authenticated;
