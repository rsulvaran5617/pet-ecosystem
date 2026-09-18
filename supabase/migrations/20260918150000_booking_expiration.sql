-- Deploy compatible clients before enabling the scheduler in the next migration.
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending_approval','confirmed','completed','cancelled','expired'));
alter table public.booking_status_history
  drop constraint booking_status_history_from_status_check,
  drop constraint booking_status_history_to_status_check,
  alter column changed_by_user_id drop not null;
alter table public.booking_status_history
  add constraint booking_status_history_from_status_check check (from_status is null or from_status in ('pending_approval','confirmed','completed','cancelled','expired')),
  add constraint booking_status_history_to_status_check check (to_status in ('pending_approval','confirmed','completed','cancelled','expired'));
alter table public.chat_threads drop constraint chat_threads_booking_status_check;
alter table public.chat_threads add constraint chat_threads_booking_status_check
  check (booking_status in ('pending_approval','confirmed','completed','cancelled','expired'));
alter table public.audit_logs alter column actor_user_id drop not null;

create index bookings_pending_expiration_idx on public.bookings(scheduled_start_at, id)
  where status = 'pending_approval';

-- Serialize concurrent approvals and expiration before reading current state.
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
  where id = target_booking_id
  for update;

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

  if target_booking.status = 'expired' then
    raise exception 'Expired bookings cannot be changed';
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

-- Row locking precedes this check, including when an approval waited for cron.
create or replace function public.guard_booking_expiration()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'expired' and new is distinct from old then
    raise exception 'Expired bookings cannot be changed';
  end if;
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    if old.status <> 'pending_approval' then
      raise exception 'Only pending approval bookings can be approved';
    end if;
    if old.scheduled_start_at <= clock_timestamp() then
      raise exception 'Booking approval deadline has passed';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_booking_expiration before update on public.bookings
  for each row execute function public.guard_booking_expiration();
revoke all on function public.guard_booking_expiration() from public, anon, authenticated;

create or replace function public.expire_unapproved_bookings()
returns integer language plpgsql security definer set search_path = public as $$
declare
  target public.bookings;
  expired_count integer := 0;
begin
  for target in
    select * from public.bookings
    where status = 'pending_approval' and scheduled_start_at <= clock_timestamp()
    order by scheduled_start_at, id limit 500 for update skip locked
  loop
    update public.bookings set status = 'expired', updated_at = clock_timestamp()
    where id = target.id;
    insert into public.booking_status_history(booking_id,from_status,to_status,changed_by_user_id,change_reason)
    values(target.id,'pending_approval','expired',null,'Solicitud expirada sin aprobacion al llegar la hora de inicio');
    insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,context)
    values(null,'booking',target.id,'booking_expired',jsonb_build_object(
      'actor_type','system','from_status','pending_approval','to_status','expired',
      'scheduled_start_at',target.scheduled_start_at,'provider_organization_id',target.provider_organization_id));
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$$;
revoke all on function public.expire_unapproved_bookings() from public, anon, authenticated;
grant execute on function public.expire_unapproved_bookings() to service_role;
