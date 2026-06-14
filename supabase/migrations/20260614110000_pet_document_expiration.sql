alter table public.pet_documents
  add column if not exists has_expiration boolean not null default false,
  add column if not exists issued_at date,
  add column if not exists expires_at date,
  add column if not exists expiration_warning_days integer not null default 30;

alter table public.pet_documents
  drop constraint if exists pet_documents_expiration_warning_days_check;

alter table public.pet_documents
  add constraint pet_documents_expiration_warning_days_check
  check (expiration_warning_days in (7, 15, 30, 60, 90));

alter table public.pet_documents
  drop constraint if exists pet_documents_expiration_dates_check;

alter table public.pet_documents
  add constraint pet_documents_expiration_dates_check
  check (issued_at is null or expires_at is null or expires_at >= issued_at);

create index if not exists pet_documents_expires_at_idx
on public.pet_documents (expires_at)
where has_expiration = true;

drop policy if exists pet_documents_update_editable on public.pet_documents;
create policy pet_documents_update_editable
on public.pet_documents
for update
to authenticated
using (public.can_edit_pet(pet_id, auth.uid()))
with check (
  storage_bucket = 'pet-documents'
  and public.can_edit_pet(pet_id, auth.uid())
);
