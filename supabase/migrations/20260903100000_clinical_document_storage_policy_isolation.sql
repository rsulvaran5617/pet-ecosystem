create or replace function public.can_upload_clinical_document_object(
  target_bucket text,
  target_path text,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket = 'clinical-documents'
    and target_user_id is not null
    and exists (
      select 1
      from public.clinical_documents document
      join public.clinical_encounters encounter on encounter.id = document.encounter_id
      join public.clinical_professional_profiles professional on professional.id = encounter.professional_profile_id
      join public.clinical_write_authorizations authz on authz.id = encounter.authorization_id
      where document.storage_bucket = target_bucket
        and document.storage_path = target_path
        and document.created_by_user_id = target_user_id
        and professional.user_id = target_user_id
        and document.upload_status = 'pending'
        and authz.revoked_at is null
        and authz.expires_at > now()
        and 'upload_clinical_document' = any(authz.approved_scopes)
    );
$$;

create or replace function public.can_read_clinical_document_object(
  target_bucket text,
  target_path text,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket = 'clinical-documents'
    and target_user_id is not null
    and exists (
      select 1
      from public.clinical_documents document
      where document.storage_bucket = target_bucket
        and document.storage_path = target_path
        and document.upload_status = 'ready'
        and public.can_read_clinical_encounter(document.encounter_id, target_user_id)
    );
$$;

drop policy if exists clinical_documents_storage_insert_authorized on storage.objects;
create policy clinical_documents_storage_insert_authorized
on storage.objects for insert to authenticated
with check (public.can_upload_clinical_document_object(bucket_id, name, auth.uid()));

drop policy if exists clinical_documents_storage_select_scoped on storage.objects;
create policy clinical_documents_storage_select_scoped
on storage.objects for select to authenticated
using (public.can_read_clinical_document_object(bucket_id, name, auth.uid()));

revoke all on function public.can_upload_clinical_document_object(text, text, uuid) from public;
revoke all on function public.can_read_clinical_document_object(text, text, uuid) from public;
grant execute on function public.can_upload_clinical_document_object(text, text, uuid) to authenticated;
grant execute on function public.can_read_clinical_document_object(text, text, uuid) to authenticated;

comment on function public.can_read_clinical_document_object(text, text, uuid)
is 'Isolates private clinical-document authorization so unrelated Storage buckets do not require table privileges on clinical metadata.';
