create or replace function public.get_booking_participant_summaries(target_booking_ids uuid[])
returns table (
  booking_id uuid,
  household_name text,
  customer_display_name text,
  pet_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    booking.id as booking_id,
    coalesce(nullif(household.name, ''), 'Hogar') as household_name,
    coalesce(
      nullif(trim(concat_ws(' ', profile.first_name, profile.last_name)), ''),
      profile.email,
      'Cliente'
    ) as customer_display_name,
    coalesce(nullif(pet.name, ''), 'Mascota') as pet_name
  from public.bookings as booking
  left join public.households as household
    on household.id = booking.household_id
  left join public.profiles as profile
    on profile.id = booking.booked_by_user_id
  left join public.pets as pet
    on pet.id = booking.pet_id
  where booking.id = any(target_booking_ids)
    and public.can_view_booking(booking.id, auth.uid());
$$;

grant execute on function public.get_booking_participant_summaries(uuid[]) to authenticated;
