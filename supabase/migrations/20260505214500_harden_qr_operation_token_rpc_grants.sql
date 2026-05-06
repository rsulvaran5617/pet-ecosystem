-- Hardening for QR booking operation token RPC grants.
-- QR RPCs require authenticated users; anon must not have execute privileges.

revoke execute on function public.create_booking_operation_token(uuid, text) from anon;
revoke execute on function public.consume_booking_operation_token(text) from anon;
revoke execute on function public.revoke_booking_operation_token(uuid) from anon;

grant execute on function public.create_booking_operation_token(uuid, text) to authenticated;
grant execute on function public.consume_booking_operation_token(text) to authenticated;
grant execute on function public.revoke_booking_operation_token(uuid) to authenticated;
