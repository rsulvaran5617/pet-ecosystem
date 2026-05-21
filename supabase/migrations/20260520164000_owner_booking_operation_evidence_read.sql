-- Owner read access for operational booking evidence.
-- Scope: read-only visibility for the household side of its own booking.
-- No provider write behavior changes. Internal notes remain provider/admin only.

drop policy if exists booking_operations_select_owner on public.booking_operations;
create policy booking_operations_select_owner
on public.booking_operations
for select
to authenticated
using (public.can_view_booking(booking_id, auth.uid()));

drop policy if exists booking_operation_evidence_select_owner on public.booking_operation_evidence;
create policy booking_operation_evidence_select_owner
on public.booking_operation_evidence
for select
to authenticated
using (public.can_view_booking(booking_id, auth.uid()));

drop policy if exists booking_operation_evidence_objects_select_owner on storage.objects;
create policy booking_operation_evidence_objects_select_owner
on storage.objects
for select
to authenticated
using (
  bucket_id = 'booking-operation-evidence'
  and public.can_view_booking(public.extract_booking_id_from_operation_storage_path(name), auth.uid())
);
