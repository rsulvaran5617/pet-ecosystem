drop policy if exists pet_documents_delete_editable on public.pet_documents;
create policy pet_documents_delete_editable
on public.pet_documents
for delete
to authenticated
using (
  storage_bucket = 'pet-documents'
  and public.can_edit_pet(pet_id, auth.uid())
);
