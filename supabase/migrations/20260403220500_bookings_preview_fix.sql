create or replace function public.preview_booking(
  target_household_id uuid,
  target_pet_id uuid,
  target_provider_organization_id uuid,
  target_provider_service_id uuid,
  target_payment_method_id uuid default null
)
returns table (
  household_id uuid,
  pet_id uuid,
  provider_organization_id uuid,
  provider_service_id uuid,
  selected_payment_method_id uuid,
  booking_mode text,
  status_on_create text,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  cancellation_deadline_at timestamptz,
  cancellation_window_hours integer,
  currency_code text,
  unit_price_cents integer,
  subtotal_price_cents integer,
  total_price_cents integer,
  household_name text,
  pet_name text,
  provider_name text,
  service_name text,
  service_duration_minutes integer,
  payment_method_brand text,
  payment_method_last_4 text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  household_row public.households;
  pet_row public.pets;
  organization_row public.provider_organizations;
  service_row public.provider_services;
  payment_method_row public.payment_methods;
  resolved_window record;
  next_status text;
  computed_cancellation_deadline timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to preview bookings';
  end if;

  if not public.can_book_household(target_household_id, current_user_id) then
    raise exception 'Book permission is required for the selected household';
  end if;

  select *
  into household_row
  from public.households
  where id = target_household_id;

  if not found then
    raise exception 'Selected household was not found';
  end if;

  select *
  into pet_row
  from public.pets as pet
  where pet.id = target_pet_id
    and pet.household_id = target_household_id;

  if not found then
    raise exception 'Selected pet must belong to the selected household';
  end if;

  select *
  into organization_row
  from public.provider_organizations
  where id = target_provider_organization_id
    and public.is_provider_organization_visible(id);

  if not found then
    raise exception 'Selected provider is not publicly bookable';
  end if;

  select *
  into service_row
  from public.provider_services
  where id = target_provider_service_id
    and organization_id = target_provider_organization_id
    and is_public = true
    and is_active = true;

  if not found then
    raise exception 'Selected provider service is not publicly bookable';
  end if;

  if target_payment_method_id is not null then
    if not public.can_pay_household(target_household_id, current_user_id) then
      raise exception 'Pay permission is required to attach a saved payment method';
    end if;

    select *
    into payment_method_row
    from public.payment_methods
    where id = target_payment_method_id
      and user_id = current_user_id
      and status = 'active';

    if not found then
      raise exception 'Selected payment method is not available';
    end if;
  end if;

  select *
  into resolved_window
  from public.resolve_next_provider_service_window(target_provider_service_id)
  limit 1;

  if resolved_window.scheduled_start_at is null or resolved_window.scheduled_end_at is null then
    raise exception 'Selected provider service has no active availability yet';
  end if;

  next_status := case service_row.booking_mode when 'instant' then 'confirmed' else 'pending_approval' end;
  computed_cancellation_deadline :=
    resolved_window.scheduled_start_at - make_interval(hours => greatest(service_row.cancellation_window_hours, 0));

  return query
  select
    household_row.id,
    pet_row.id,
    organization_row.id,
    service_row.id,
    payment_method_row.id,
    service_row.booking_mode,
    next_status,
    resolved_window.scheduled_start_at,
    resolved_window.scheduled_end_at,
    computed_cancellation_deadline,
    service_row.cancellation_window_hours,
    service_row.currency_code,
    service_row.base_price_cents,
    service_row.base_price_cents,
    service_row.base_price_cents,
    household_row.name,
    pet_row.name,
    organization_row.name,
    service_row.name,
    service_row.duration_minutes,
    payment_method_row.brand::text,
    payment_method_row.last_4;
end;
$$;

grant execute on function public.preview_booking(uuid, uuid, uuid, uuid, uuid) to authenticated;
