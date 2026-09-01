alter table public.clinical_entries
  add column correction_reason text check (correction_reason is null or char_length(trim(correction_reason)) between 3 and 800);

alter table public.clinical_documents
  add column idempotency_key uuid,
  add column upload_status text not null default 'pending' check (upload_status in ('pending', 'ready', 'failed')),
  add column uploaded_at timestamptz;

create unique index clinical_documents_author_idempotency_idx
  on public.clinical_documents (created_by_user_id, idempotency_key);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinical-documents', 'clinical-documents', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_read_clinical_encounter(target_encounter_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clinical_encounters encounter
    join public.clinical_professional_profiles professional on professional.id = encounter.professional_profile_id
    where encounter.id = target_encounter_id
      and (public.can_view_pet(encounter.pet_id, target_user_id) or professional.user_id = target_user_id)
  );
$$;

create policy clinical_documents_storage_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinical-documents'
  and exists (
    select 1 from public.clinical_documents document
    join public.clinical_encounters encounter on encounter.id = document.encounter_id
    join public.clinical_professional_profiles professional on professional.id = encounter.professional_profile_id
    join public.clinical_write_authorizations authz on authz.id = encounter.authorization_id
    where document.storage_path = name
      and document.storage_bucket = bucket_id
      and document.created_by_user_id = auth.uid()
      and professional.user_id = auth.uid()
      and document.upload_status = 'pending'
      and authz.revoked_at is null
      and authz.expires_at > now()
      and 'upload_clinical_document' = any(authz.approved_scopes)
  )
);

create policy clinical_documents_storage_select_scoped
on storage.objects for select to authenticated
using (
  bucket_id = 'clinical-documents'
  and exists (
    select 1 from public.clinical_documents document
    where document.storage_path = name
      and document.storage_bucket = bucket_id
      and document.upload_status = 'ready'
      and public.can_read_clinical_encounter(document.encounter_id, auth.uid())
  )
);

create or replace function public.prepare_clinical_document_upload(
  target_encounter_id uuid, next_idempotency_key uuid, next_title text, next_document_type text,
  next_mime_type text, next_file_size_bytes bigint, next_checksum_sha256 text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); encounter_row public.clinical_encounters;
  professional public.clinical_professional_profiles; authz public.clinical_write_authorizations;
  document_row public.clinical_documents; extension text;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into encounter_row from public.clinical_encounters where id = target_encounter_id;
  select * into professional from public.clinical_professional_profiles where id = encounter_row.professional_profile_id;
  select * into authz from public.clinical_write_authorizations where id = encounter_row.authorization_id for update;
  if encounter_row.id is null or professional.user_id <> current_user_id then raise exception 'Clinical encounter is not available'; end if;
  if professional.verification_status <> 'verified' or (professional.verification_expires_at is not null and professional.verification_expires_at <= now()) then raise exception 'Verified professional identity required'; end if;
  if authz.id is null or authz.revoked_at is not null or authz.expires_at <= now() or not ('upload_clinical_document' = any(authz.approved_scopes)) then raise exception 'Active document authorization required'; end if;
  if next_document_type not in ('prescription','lab_result','imaging_report','clinical_report','other') then raise exception 'Invalid clinical document type'; end if;
  if next_mime_type not in ('application/pdf','image/jpeg','image/png') or next_file_size_bytes < 1 or next_file_size_bytes > 15728640 then raise exception 'Invalid clinical document file'; end if;
  if nullif(trim(next_title), '') is null or char_length(trim(next_title)) > 200 then raise exception 'Invalid clinical document title'; end if;
  if next_checksum_sha256 is not null and next_checksum_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid document checksum'; end if;
  extension := case next_mime_type when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' else 'png' end;
  insert into public.clinical_documents (encounter_id, title, document_type, storage_path, mime_type, file_size_bytes, checksum_sha256, created_by_user_id, idempotency_key)
  values (encounter_row.id, trim(next_title), next_document_type, encounter_row.pet_id || '/' || encounter_row.id || '/' || gen_random_uuid() || '.' || extension, next_mime_type, next_file_size_bytes, lower(next_checksum_sha256), current_user_id, next_idempotency_key)
  on conflict (created_by_user_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning * into document_row;
  return jsonb_build_object('documentId', document_row.id, 'bucket', document_row.storage_bucket, 'path', document_row.storage_path);
end; $$;

create or replace function public.finalize_clinical_document_upload(target_document_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare current_user_id uuid := auth.uid(); document_row public.clinical_documents; object_row storage.objects; actual_size bigint; actual_mime text;
begin
  select * into document_row from public.clinical_documents where id = target_document_id for update;
  if document_row.id is null or document_row.created_by_user_id <> current_user_id or document_row.upload_status <> 'pending' then raise exception 'Clinical document is not available'; end if;
  select * into object_row from storage.objects where bucket_id = document_row.storage_bucket and name = document_row.storage_path;
  actual_size := nullif(object_row.metadata->>'size', '')::bigint;
  actual_mime := lower(coalesce(object_row.metadata->>'mimetype', ''));
  if object_row.id is null or actual_size is distinct from document_row.file_size_bytes or actual_size > 15728640 or actual_mime <> document_row.mime_type then
    update public.clinical_documents set upload_status = 'failed' where id = document_row.id;
    raise exception 'Clinical document validation failed';
  end if;
  update public.clinical_documents set upload_status = 'ready', uploaded_at = now() where id = document_row.id;
  perform public.insert_audit_log('clinical_document', document_row.id, 'clinical_document_added', jsonb_build_object('encounter_id', document_row.encounter_id), current_user_id);
end; $$;

create or replace function public.get_clinical_document_access(target_document_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare document_row public.clinical_documents;
begin
  select * into document_row from public.clinical_documents where id = target_document_id and upload_status = 'ready';
  if document_row.id is null or not public.can_read_clinical_encounter(document_row.encounter_id, auth.uid()) then raise exception 'Clinical document is not available'; end if;
  return jsonb_build_object('bucket', document_row.storage_bucket, 'path', document_row.storage_path);
end; $$;

create or replace function public.create_clinical_entry_correction(
  target_entry_id uuid, target_request_id uuid, next_title text, next_details text, next_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); original public.clinical_entries; encounter_row public.clinical_encounters;
  request_row public.clinical_write_requests; authz public.clinical_write_authorizations; professional public.clinical_professional_profiles;
  created_id uuid; required_scope text;
begin
  select * into original from public.clinical_entries where id = target_entry_id;
  select * into encounter_row from public.clinical_encounters where id = original.encounter_id;
  select * into professional from public.clinical_professional_profiles where id = encounter_row.professional_profile_id;
  select * into request_row from public.clinical_write_requests where id = target_request_id for update;
  select * into authz from public.clinical_write_authorizations where request_id = target_request_id for update;
  if original.id is null or original.corrects_entry_id is not null or original.created_by_user_id <> current_user_id or professional.user_id <> current_user_id then raise exception 'Clinical entry cannot be corrected'; end if;
  if request_row.professional_user_id <> current_user_id or request_row.pet_id <> encounter_row.pet_id or request_row.status <> 'approved' then raise exception 'Active clinical authorization required'; end if;
  if authz.id is null or authz.revoked_at is not null or authz.expires_at <= now() then raise exception 'Clinical authorization is expired or revoked'; end if;
  required_scope := case original.entry_type when 'diagnosis' then 'record_diagnosis' when 'vaccine' then 'record_vaccine' when 'recommendation' then 'record_recommendation' when 'treatment' then 'record_treatment' else 'create_encounter' end;
  if not (required_scope = any(authz.approved_scopes)) then raise exception 'Clinical entry scope was not authorized'; end if;
  if nullif(trim(next_title), '') is null or nullif(trim(next_reason), '') is null then raise exception 'Correction title and reason are required'; end if;
  insert into public.clinical_entries (encounter_id, entry_type, title, details, corrects_entry_id, correction_reason, created_by_user_id)
  values (original.encounter_id, original.entry_type, trim(next_title), nullif(trim(next_details), ''), original.id, trim(next_reason), current_user_id)
  returning id into created_id;
  update public.clinical_encounters set status = 'corrected' where id = original.encounter_id;
  perform public.insert_audit_log('clinical_entry', created_id, 'clinical_entry_corrected', jsonb_build_object('encounter_id', original.encounter_id), current_user_id);
  return created_id;
end; $$;

create or replace function public.clinical_encounter_projection(encounter_row public.clinical_encounters)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', encounter_row.id, 'petId', encounter_row.pet_id, 'petName', pet.name,
    'attendedAt', encounter_row.attended_at, 'encounterType', encounter_row.encounter_type,
    'summary', encounter_row.summary, 'status', encounter_row.status, 'finalizedAt', encounter_row.finalized_at,
    'professionalName', professional.professional_name, 'organizationName', organization.name,
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id', entry.id, 'type', entry.entry_type, 'title', entry.title, 'details', entry.details, 'correctsEntryId', entry.corrects_entry_id, 'correctionReason', entry.correction_reason, 'createdAt', entry.created_at) order by entry.created_at) from public.clinical_entries entry where entry.encounter_id = encounter_row.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', document.id, 'title', document.title, 'type', document.document_type, 'mimeType', document.mime_type, 'fileSizeBytes', document.file_size_bytes, 'createdAt', document.created_at) order by document.created_at) from public.clinical_documents document where document.encounter_id = encounter_row.id and document.upload_status = 'ready'), '[]'::jsonb),
    'authorization', jsonb_build_object('requestId', request.id, 'requestedScopes', request.requested_scopes, 'approvedScopes', authz.approved_scopes, 'requestedAt', request.requested_at, 'reviewedAt', request.reviewed_at, 'expiresAt', authz.expires_at, 'revokedAt', authz.revoked_at, 'status', request.status)
  )
  from public.pets pet
  join public.clinical_professional_profiles professional on professional.id = encounter_row.professional_profile_id
  left join public.provider_organizations organization on organization.id = encounter_row.provider_organization_id
  join public.clinical_write_authorizations authz on authz.id = encounter_row.authorization_id
  join public.clinical_write_requests request on request.id = authz.request_id
  where pet.id = encounter_row.pet_id;
$$;

create or replace function public.list_pet_clinical_timeline(target_pet_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare encounter_row public.clinical_encounters;
begin
  if not public.can_view_pet(target_pet_id, auth.uid()) then raise exception 'Clinical history is not available'; end if;
  for encounter_row in select * from public.clinical_encounters where pet_id = target_pet_id order by attended_at desc loop
    return next public.clinical_encounter_projection(encounter_row);
  end loop;
end; $$;

create or replace function public.list_my_professional_encounters()
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare encounter_row public.clinical_encounters;
begin
  for encounter_row in select encounter.* from public.clinical_encounters encounter join public.clinical_professional_profiles professional on professional.id = encounter.professional_profile_id where professional.user_id = auth.uid() order by encounter.attended_at desc limit 100 loop
    return next public.clinical_encounter_projection(encounter_row);
  end loop;
end; $$;

create or replace function public.list_clinical_audit_events_for_admin()
returns table (id uuid, event text, occurred_at timestamptz, professional_name text, organization_name text, pet_reference text, authorization_status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'Administrative access required'; end if;
  return query
    select log.id, log.action, log.created_at, professional.professional_name, organization.name,
      case when pet.id is null then null else left(pet.name, 1) || ' - ' || left(pet.id::text, 8) end,
      request.status
    from public.audit_logs log
    left join public.clinical_encounters encounter on (log.entity_type = 'clinical_encounter' and encounter.id = log.entity_id) or encounter.id::text = log.context->>'encounter_id'
    left join public.clinical_entries entry on log.entity_type = 'clinical_entry' and entry.id = log.entity_id
    left join public.clinical_encounters entry_encounter on entry_encounter.id = entry.encounter_id
    left join public.clinical_write_authorizations authz on authz.id = coalesce(encounter.authorization_id, entry_encounter.authorization_id, nullif(log.context->>'authorization_id','')::uuid)
    left join public.clinical_write_requests request on request.id = coalesce(authz.request_id, case when log.entity_type = 'clinical_write_request' then log.entity_id end)
    left join public.clinical_professional_profiles professional on professional.id = coalesce(encounter.professional_profile_id, entry_encounter.professional_profile_id, request.professional_profile_id)
    left join public.provider_organizations organization on organization.id = coalesce(encounter.provider_organization_id, entry_encounter.provider_organization_id, request.provider_organization_id)
    left join public.pets pet on pet.id = coalesce(encounter.pet_id, entry_encounter.pet_id, request.pet_id, nullif(log.context->>'pet_id','')::uuid)
    where log.entity_type in ('clinical_write_request','clinical_encounter','clinical_entry','clinical_document')
    order by log.created_at desc limit 250;
end; $$;

revoke all on function public.can_read_clinical_encounter(uuid, uuid) from public;
revoke all on function public.prepare_clinical_document_upload(uuid, uuid, text, text, text, bigint, text) from public;
revoke all on function public.finalize_clinical_document_upload(uuid) from public;
revoke all on function public.get_clinical_document_access(uuid) from public;
revoke all on function public.create_clinical_entry_correction(uuid, uuid, text, text, text) from public;
revoke all on function public.clinical_encounter_projection(public.clinical_encounters) from public;
revoke all on function public.list_pet_clinical_timeline(uuid) from public;
revoke all on function public.list_my_professional_encounters() from public;
revoke all on function public.list_clinical_audit_events_for_admin() from public;
grant execute on function public.prepare_clinical_document_upload(uuid, uuid, text, text, text, bigint, text) to authenticated;
grant execute on function public.finalize_clinical_document_upload(uuid) to authenticated;
grant execute on function public.get_clinical_document_access(uuid) to authenticated;
grant execute on function public.create_clinical_entry_correction(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.list_pet_clinical_timeline(uuid) to authenticated;
grant execute on function public.list_my_professional_encounters() to authenticated;
grant execute on function public.list_clinical_audit_events_for_admin() to authenticated;

comment on table public.clinical_documents is 'Private clinical document metadata. Objects remain quarantined as pending until server validation. Future malware scanning must run before ready status.';
