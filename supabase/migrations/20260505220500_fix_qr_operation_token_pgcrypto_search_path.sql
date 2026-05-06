-- Fix QR operation token RPC pgcrypto resolution on Supabase.
-- pgcrypto functions live in the extensions schema in the remote project.

alter function public.create_booking_operation_token(uuid, text)
  set search_path = public, extensions;

alter function public.consume_booking_operation_token(text)
  set search_path = public, extensions;

alter function public.revoke_booking_operation_token(uuid)
  set search_path = public, extensions;
