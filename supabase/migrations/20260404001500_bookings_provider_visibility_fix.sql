create or replace function public.can_view_booking(target_booking_id uuid, target_user_id uuid default auth.uid())
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
      and (
        public.can_view_household(booking.household_id, target_user_id)
        or public.can_manage_provider_organization(booking.provider_organization_id, target_user_id)
      )
  );
$$;

grant execute on function public.can_view_booking(uuid, uuid) to authenticated;
