alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending_approval', 'confirmed', 'completed', 'cancelled'));

alter table public.booking_status_history
  drop constraint if exists booking_status_history_from_status_check,
  drop constraint if exists booking_status_history_to_status_check;

alter table public.booking_status_history
  add constraint booking_status_history_from_status_check
  check (from_status is null or from_status in ('pending_approval', 'confirmed', 'completed', 'cancelled')),
  add constraint booking_status_history_to_status_check
  check (to_status in ('pending_approval', 'confirmed', 'completed', 'cancelled'));

alter table public.chat_threads
  drop constraint if exists chat_threads_booking_status_check;

alter table public.chat_threads
  add constraint chat_threads_booking_status_check
  check (booking_status in ('pending_approval', 'confirmed', 'completed', 'cancelled'));

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  provider_organization_id uuid not null references public.provider_organizations (id) on delete cascade,
  provider_service_id uuid not null references public.provider_services (id) on delete cascade,
  reviewer_user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment_text text not null check (char_length(trim(comment_text)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists reviews_provider_organization_id_idx on public.reviews (provider_organization_id);
create index if not exists reviews_provider_service_id_idx on public.reviews (provider_service_id);
create index if not exists reviews_reviewer_user_id_idx on public.reviews (reviewer_user_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

create or replace function public.can_complete_booking(target_booking_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as booking
    where booking.id = target_booking_id
      and public.can_manage_provider_organization(booking.provider_organization_id, target_user_id)
  );
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

  return updated_booking;
end;
$$;

create or replace function public.can_review_booking(target_booking_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings as booking
    where booking.id = target_booking_id
      and booking.booked_by_user_id = target_user_id
      and booking.status = 'completed'
      and not exists (
        select 1
        from public.reviews as review
        where review.booking_id = booking.id
      )
  );
$$;

create or replace function public.create_review(
  target_booking_id uuid,
  next_rating integer,
  next_comment_text text
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_booking public.bookings;
  normalized_comment_text text := nullif(trim(next_comment_text), '');
  created_review public.reviews;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create reviews';
  end if;

  if next_rating is null or next_rating < 1 or next_rating > 5 then
    raise exception 'Review rating must be between 1 and 5';
  end if;

  if normalized_comment_text is null then
    raise exception 'Review comment is required';
  end if;

  select *
  into target_booking
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking was not found';
  end if;

  if not public.can_review_booking(target_booking.id, current_user_id) then
    raise exception 'Only the booking customer can review a completed booking once';
  end if;

  insert into public.reviews (
    booking_id,
    household_id,
    pet_id,
    provider_organization_id,
    provider_service_id,
    reviewer_user_id,
    rating,
    comment_text
  )
  values (
    target_booking.id,
    target_booking.household_id,
    target_booking.pet_id,
    target_booking.provider_organization_id,
    target_booking.provider_service_id,
    current_user_id,
    next_rating,
    normalized_comment_text
  )
  returning * into created_review;

  return created_review;
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

  return updated_booking;
end;
$$;

alter table public.reviews enable row level security;

drop policy if exists reviews_select_visible on public.reviews;
create policy reviews_select_visible
on public.reviews
for select
to authenticated
using (
  reviewer_user_id = auth.uid()
  or public.can_manage_provider_organization(provider_organization_id, auth.uid())
);

grant execute on function public.can_complete_booking(uuid, uuid) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
grant execute on function public.can_review_booking(uuid, uuid) to authenticated;
grant execute on function public.create_review(uuid, integer, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
