-- Fix ambiguous "id" reference in transfer invitation RPCs.
-- In PL/pgSQL functions that return a table with an `id` column, unqualified
-- `id` inside SQL statements may resolve ambiguously. Qualify all table ids.

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
  adoption_application_id uuid,
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

  select lower(profile.email)
  into current_email
  from public.profiles as profile
  where profile.id = current_user_id;

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
    transfer.adoption_application_id,
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
  adoption_application_id uuid,
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
    transfer.adoption_application_id,
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

grant execute on function public.list_incoming_pet_transfer_invitations() to authenticated;
grant execute on function public.list_outgoing_pet_transfer_records(uuid) to authenticated;
