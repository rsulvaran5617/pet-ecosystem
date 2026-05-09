-- Hardening for V2 Booking Capacity RPC grants.
-- The create RPC requires authenticated owner context and should not expose
-- EXECUTE to anon even though it guards auth.uid() internally.

revoke execute on function public.create_booking_from_slot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid
) from anon;

grant execute on function public.create_booking_from_slot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid
) to authenticated;
