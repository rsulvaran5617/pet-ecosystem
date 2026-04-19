create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid not null,
  action text not null check (char_length(trim(action)) between 1 and 120),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_actor_or_admin on public.audit_logs;
create policy audit_logs_select_actor_or_admin
on public.audit_logs
for select
to authenticated
using (
  actor_user_id = auth.uid()
  or public.is_platform_admin(auth.uid())
);

create or replace function public.insert_audit_log(
  target_entity_type text,
  target_entity_id uuid,
  next_action text,
  next_context jsonb default '{}'::jsonb,
  target_actor_user_id uuid default auth.uid()
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_entity_type text := nullif(trim(target_entity_type), '');
  normalized_action text := nullif(trim(next_action), '');
  inserted_log public.audit_logs;
begin
  if target_actor_user_id is null then
    raise exception 'Authenticated user required to insert audit logs';
  end if;

  if normalized_entity_type is null then
    raise exception 'Audit entity type is required';
  end if;

  if normalized_action is null then
    raise exception 'Audit action is required';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    context
  )
  values (
    target_actor_user_id,
    normalized_entity_type,
    target_entity_id,
    normalized_action,
    coalesce(next_context, '{}'::jsonb)
  )
  returning * into inserted_log;

  return inserted_log;
end;
$$;

drop policy if exists bookings_select_visible on public.bookings;
create policy bookings_select_visible
on public.bookings
for select
to authenticated
using (public.can_view_booking(id, auth.uid()));

create or replace function public.create_booking(
  target_household_id uuid,
  target_pet_id uuid,
  target_provider_organization_id uuid,
  target_provider_service_id uuid,
  target_payment_method_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  preview_row record;
  created_booking public.bookings;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create bookings';
  end if;

  select *
  into preview_row
  from public.preview_booking(
    target_household_id,
    target_pet_id,
    target_provider_organization_id,
    target_provider_service_id,
    target_payment_method_id
  )
  limit 1;

  insert into public.bookings (
    household_id,
    pet_id,
    provider_organization_id,
    provider_service_id,
    booked_by_user_id,
    selected_payment_method_id,
    booking_mode,
    status,
    scheduled_start_at,
    scheduled_end_at,
    cancellation_deadline_at,
    cancellation_window_hours
  )
  values (
    preview_row.household_id,
    preview_row.pet_id,
    preview_row.provider_organization_id,
    preview_row.provider_service_id,
    current_user_id,
    preview_row.selected_payment_method_id,
    preview_row.booking_mode,
    preview_row.status_on_create,
    preview_row.scheduled_start_at,
    preview_row.scheduled_end_at,
    preview_row.cancellation_deadline_at,
    preview_row.cancellation_window_hours
  )
  returning * into created_booking;

  insert into public.booking_pricing (
    booking_id,
    provider_service_id,
    service_name,
    currency_code,
    unit_price_cents,
    subtotal_price_cents,
    total_price_cents
  )
  values (
    created_booking.id,
    preview_row.provider_service_id,
    preview_row.service_name,
    preview_row.currency_code,
    preview_row.unit_price_cents,
    preview_row.subtotal_price_cents,
    preview_row.total_price_cents
  );

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    created_booking.id,
    null,
    created_booking.status,
    current_user_id,
    case
      when created_booking.status = 'confirmed' then 'Booking created with instant confirmation'
      else 'Booking created and waiting provider approval'
    end
  );

  perform public.insert_audit_log(
    'booking',
    created_booking.id,
    'booking_created',
    jsonb_build_object(
      'booking_mode', created_booking.booking_mode,
      'status', created_booking.status,
      'household_id', created_booking.household_id,
      'pet_id', created_booking.pet_id,
      'provider_organization_id', created_booking.provider_organization_id,
      'provider_service_id', created_booking.provider_service_id,
      'selected_payment_method_id', created_booking.selected_payment_method_id
    ),
    current_user_id
  );

  return created_booking;
end;
$$;

create or replace function public.approve_booking(target_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  updated_booking public.bookings;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to approve bookings';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_complete_booking(target_booking.id, current_user_id) then
    raise exception 'Provider organization ownership is required to approve this booking';
  end if;

  if target_booking.status = 'confirmed' then
    return target_booking;
  end if;

  if target_booking.status = 'completed' then
    raise exception 'Completed bookings cannot be approved again';
  end if;

  if target_booking.status = 'cancelled' then
    raise exception 'Cancelled bookings cannot be approved';
  end if;

  if target_booking.status <> 'pending_approval' then
    raise exception 'Only pending approval bookings can be approved';
  end if;

  update public.bookings
  set status = 'confirmed',
      updated_at = now()
  where id = target_booking_id
  returning * into updated_booking;

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    updated_booking.id,
    target_booking.status,
    updated_booking.status,
    current_user_id,
    'Booking approved by provider'
  );

  perform public.insert_audit_log(
    'booking',
    updated_booking.id,
    'booking_approved',
    jsonb_build_object(
      'from_status', target_booking.status,
      'to_status', updated_booking.status,
      'provider_organization_id', updated_booking.provider_organization_id
    ),
    current_user_id
  );

  return updated_booking;
end;
$$;

create or replace function public.reject_booking(
  target_booking_id uuid,
  next_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  updated_booking public.bookings;
  normalized_reason text := nullif(trim(next_reason), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to reject bookings';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_complete_booking(target_booking.id, current_user_id) then
    raise exception 'Provider organization ownership is required to reject this booking';
  end if;

  if target_booking.status = 'cancelled' then
    raise exception 'Booking has already been cancelled';
  end if;

  if target_booking.status = 'confirmed' or target_booking.status = 'completed' then
    raise exception 'Only pending approval bookings can be rejected';
  end if;

  if target_booking.status <> 'pending_approval' then
    raise exception 'Only pending approval bookings can be rejected';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = coalesce(normalized_reason, 'Booking request declined by provider'),
      updated_at = now()
  where id = target_booking_id
  returning * into updated_booking;

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    updated_booking.id,
    target_booking.status,
    updated_booking.status,
    current_user_id,
    coalesce(normalized_reason, 'Booking request declined by provider')
  );

  perform public.insert_audit_log(
    'booking',
    updated_booking.id,
    'booking_rejected',
    jsonb_build_object(
      'from_status', target_booking.status,
      'to_status', updated_booking.status,
      'reason', coalesce(normalized_reason, 'Booking request declined by provider'),
      'provider_organization_id', updated_booking.provider_organization_id
    ),
    current_user_id
  );

  return updated_booking;
end;
$$;

create or replace function public.cancel_booking(
  target_booking_id uuid,
  next_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  updated_booking public.bookings;
  normalized_reason text := nullif(trim(next_reason), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to cancel bookings';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_book_household(target_booking.household_id, current_user_id) then
    raise exception 'Book permission is required to cancel this booking';
  end if;

  if target_booking.status = 'cancelled' then
    raise exception 'Booking has already been cancelled';
  end if;

  if target_booking.status = 'completed' then
    raise exception 'Completed bookings cannot be cancelled';
  end if;

  if now() > target_booking.cancellation_deadline_at then
    raise exception 'The basic cancellation window has already passed';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = normalized_reason,
      updated_at = now()
  where id = target_booking_id
  returning * into updated_booking;

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    updated_booking.id,
    target_booking.status,
    updated_booking.status,
    current_user_id,
    coalesce(normalized_reason, 'Booking cancelled under the base household policy')
  );

  perform public.insert_audit_log(
    'booking',
    updated_booking.id,
    'booking_cancelled',
    jsonb_build_object(
      'from_status', target_booking.status,
      'to_status', updated_booking.status,
      'reason', coalesce(normalized_reason, 'Booking cancelled under the base household policy'),
      'household_id', updated_booking.household_id
    ),
    current_user_id
  );

  return updated_booking;
end;
$$;

create or replace function public.complete_booking(target_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  updated_booking public.bookings;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to complete bookings';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_complete_booking(target_booking.id, current_user_id) then
    raise exception 'Provider organization ownership is required to complete this booking';
  end if;

  if target_booking.status = 'cancelled' then
    raise exception 'Cancelled bookings cannot be completed';
  end if;

  if target_booking.status = 'pending_approval' then
    raise exception 'Pending approval bookings cannot be completed';
  end if;

  if target_booking.status = 'completed' then
    return target_booking;
  end if;

  update public.bookings
  set status = 'completed',
      updated_at = now()
  where id = target_booking_id
  returning * into updated_booking;

  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    changed_by_user_id,
    change_reason
  )
  values (
    updated_booking.id,
    target_booking.status,
    updated_booking.status,
    current_user_id,
    'Booking marked as completed for the MVP closure flow'
  );

  perform public.insert_audit_log(
    'booking',
    updated_booking.id,
    'booking_completed',
    jsonb_build_object(
      'from_status', target_booking.status,
      'to_status', updated_booking.status,
      'provider_organization_id', updated_booking.provider_organization_id
    ),
    current_user_id
  );

  return updated_booking;
end;
$$;

create or replace function public.create_support_case(
  target_booking_id uuid,
  next_subject text,
  next_description_text text
)
returns public.support_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  creator_profile public.profiles;
  target_pet public.pets;
  target_provider public.provider_organizations;
  target_pricing public.booking_pricing;
  normalized_subject text := nullif(trim(next_subject), '');
  normalized_description_text text := nullif(trim(next_description_text), '');
  created_case public.support_cases;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create support cases';
  end if;

  if normalized_subject is null then
    raise exception 'Support subject is required';
  end if;

  if normalized_description_text is null then
    raise exception 'Support description is required';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_create_support_case(target_booking.id, current_user_id) then
    raise exception 'Only the household-side booking participant can create support cases in this MVP';
  end if;

  if exists (
    select 1
    from public.support_cases
    where booking_id = target_booking.id
  ) then
    raise exception 'A support case already exists for this booking';
  end if;

  select *
  into creator_profile
  from public.profiles
  where id = current_user_id;

  if not found then
    raise exception 'Creator profile was not found';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_booking.pet_id;

  if not found then
    raise exception 'Booking pet was not found';
  end if;

  select *
  into target_provider
  from public.provider_organizations
  where id = target_booking.provider_organization_id;

  if not found then
    raise exception 'Booking provider organization was not found';
  end if;

  select *
  into target_pricing
  from public.booking_pricing
  where booking_id = target_booking.id;

  if not found then
    raise exception 'Booking pricing was not found';
  end if;

  insert into public.support_cases (
    booking_id,
    household_id,
    pet_id,
    provider_organization_id,
    provider_service_id,
    created_by_user_id,
    creator_email,
    creator_display_name,
    provider_name,
    service_name,
    pet_name,
    scheduled_start_at,
    scheduled_end_at,
    subject,
    description_text
  )
  values (
    target_booking.id,
    target_booking.household_id,
    target_booking.pet_id,
    target_booking.provider_organization_id,
    target_booking.provider_service_id,
    current_user_id,
    creator_profile.email,
    trim(concat_ws(' ', creator_profile.first_name, creator_profile.last_name)),
    target_provider.name,
    target_pricing.service_name,
    target_pet.name,
    target_booking.scheduled_start_at,
    target_booking.scheduled_end_at,
    normalized_subject,
    normalized_description_text
  )
  returning * into created_case;

  perform public.insert_audit_log(
    'support_case',
    created_case.id,
    'support_case_created',
    jsonb_build_object(
      'booking_id', created_case.booking_id,
      'status', created_case.status,
      'provider_organization_id', created_case.provider_organization_id
    ),
    current_user_id
  );

  return created_case;
end;
$$;

create or replace function public.update_support_case_admin(
  target_case_id uuid,
  next_status text,
  next_admin_note text default null,
  next_resolution_text text default null
)
returns public.support_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_case public.support_cases;
  normalized_status text := lower(coalesce(nullif(trim(next_status), ''), ''));
  normalized_admin_note text := nullif(trim(next_admin_note), '');
  normalized_resolution_text text := nullif(trim(next_resolution_text), '');
  updated_case public.support_cases;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to update support cases';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Platform admin role required to update support cases';
  end if;

  if normalized_status not in ('open', 'in_review', 'resolved') then
    raise exception 'Unsupported support case status';
  end if;

  select *
  into target_case
  from public.support_cases
  where id = target_case_id;

  if not found then
    raise exception 'Support case was not found';
  end if;

  if normalized_status = 'resolved'
    and coalesce(normalized_resolution_text, target_case.resolution_text) is null then
    raise exception 'A resolution is required to resolve the support case';
  end if;

  update public.support_cases
  set status = normalized_status,
      admin_note = coalesce(normalized_admin_note, admin_note),
      resolution_text = case
        when normalized_status = 'resolved' then coalesce(normalized_resolution_text, resolution_text)
        else null
      end,
      resolved_at = case
        when normalized_status = 'resolved' then coalesce(resolved_at, now())
        else null
      end,
      updated_at = now()
  where id = target_case_id
  returning * into updated_case;

  perform public.insert_audit_log(
    'support_case',
    updated_case.id,
    'support_case_admin_updated',
    jsonb_build_object(
      'from_status', target_case.status,
      'to_status', updated_case.status,
      'booking_id', updated_case.booking_id,
      'resolved_at', updated_case.resolved_at
    ),
    current_user_id
  );

  return updated_case;
end;
$$;

create or replace function public.approve_provider_organization(target_organization_id uuid)
returns public.provider_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to approve providers';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Admin role required to approve providers';
  end if;

  update public.provider_organizations
  set approval_status = 'approved',
      updated_at = now()
  where id = target_organization_id
  returning * into updated_organization;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  perform public.insert_audit_log(
    'provider_organization',
    updated_organization.id,
    'provider_approved',
    jsonb_build_object(
      'approval_status', updated_organization.approval_status,
      'is_public', updated_organization.is_public
    ),
    current_user_id
  );

  return updated_organization;
end;
$$;

create or replace function public.reject_provider_organization(target_organization_id uuid)
returns public.provider_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_organization public.provider_organizations;
begin
  if current_user_id is null then
    raise exception 'Authenticated admin user required to reject providers';
  end if;

  if not public.is_platform_admin(current_user_id) then
    raise exception 'Admin role required to reject providers';
  end if;

  update public.provider_organizations
  set approval_status = 'rejected',
      updated_at = now()
  where id = target_organization_id
  returning * into updated_organization;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  perform public.insert_audit_log(
    'provider_organization',
    updated_organization.id,
    'provider_rejected',
    jsonb_build_object(
      'approval_status', updated_organization.approval_status,
      'is_public', updated_organization.is_public
    ),
    current_user_id
  );

  return updated_organization;
end;
$$;

grant execute on function public.insert_audit_log(text, uuid, text, jsonb, uuid) to authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.approve_booking(uuid) to authenticated;
grant execute on function public.reject_booking(uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
grant execute on function public.create_support_case(uuid, text, text) to authenticated;
grant execute on function public.update_support_case_admin(uuid, text, text, text) to authenticated;
grant execute on function public.approve_provider_organization(uuid) to authenticated;
grant execute on function public.reject_provider_organization(uuid) to authenticated;
