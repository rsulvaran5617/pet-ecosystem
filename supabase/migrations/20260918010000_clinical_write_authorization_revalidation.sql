-- H01-H03: revalidate clinical writes under locks; preserve finalized history.
create or replace function public.assert_clinical_write_authorization(
  target_authorization_id uuid,
  target_pet_id uuid,
  required_scope text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  authorization_row public.clinical_write_authorizations;
  request_row public.clinical_write_requests;
  professional_row public.clinical_professional_profiles;
  grant_row public.pet_clinical_access_grants;
  current_household_id uuid;
  checked_at timestamptz;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;

  -- Match the request -> authorization order used by consent RPCs. Callers
  -- already holding the request lock may reacquire it in the same transaction.
  select * into authorization_row from public.clinical_write_authorizations where id = target_authorization_id;
  if authorization_row.id is null then raise exception 'Active clinical authorization required'; end if;
  select * into request_row from public.clinical_write_requests where id = authorization_row.request_id for update;
  select * into authorization_row from public.clinical_write_authorizations where id = target_authorization_id for update;
  select * into professional_row from public.clinical_professional_profiles where id = authorization_row.professional_profile_id for share;
  select * into grant_row from public.pet_clinical_access_grants where id = authorization_row.grant_id for share;
  select household_id into current_household_id from public.pets where id = target_pet_id for share;
  checked_at := clock_timestamp();

  if request_row.id is null or request_row.professional_user_id is distinct from current_user_id
    or professional_row.user_id is distinct from current_user_id
    or request_row.professional_profile_id is distinct from professional_row.id
    or authorization_row.pet_id is distinct from target_pet_id
    or request_row.pet_id is distinct from target_pet_id
    or request_row.grant_id is distinct from grant_row.id
    or request_row.status not in ('approved', 'completed') then
    raise exception 'Active clinical authorization required';
  end if;
  if professional_row.verification_status is distinct from 'verified'
    or professional_row.verification_expires_at <= checked_at then
    raise exception 'Verified professional identity required';
  end if;
  if grant_row.id is null or grant_row.status is distinct from 'active'
    or grant_row.revoked_at is not null or grant_row.expires_at <= checked_at
    or grant_row.pet_id is distinct from target_pet_id
    or grant_row.household_id is distinct from current_household_id
    or request_row.household_id is distinct from current_household_id then
    raise exception 'Clinical access is invalid or expired';
  end if;
  if authorization_row.revoked_at is not null or authorization_row.expires_at <= checked_at
    or request_row.expires_at <= checked_at then
    raise exception 'Clinical authorization is expired or revoked';
  end if;
  if required_scope is null or not coalesce(required_scope = any(authorization_row.approved_scopes), false) then
    raise exception 'Clinical entry scope was not authorized';
  end if;
end;
$$;

revoke all on function public.assert_clinical_write_authorization(uuid, uuid, text) from public, anon, authenticated;

comment on function public.assert_clinical_write_authorization(uuid, uuid, text)
is 'Internal clinical write guard. Locks request, authorization, professional, grant and pet until commit; no direct client execution.';

-- Replaced entry points retain their signatures and grants.

create or replace function public.finalize_clinical_encounter(
  target_request_id uuid, next_idempotency_key uuid, next_attended_at timestamptz,
  next_encounter_type text, next_summary text, next_entries jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); request_row public.clinical_write_requests;
  authorization_row public.clinical_write_authorizations; professional public.clinical_professional_profiles;
  created_encounter public.clinical_encounters; entry jsonb; required_scope text;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into request_row from public.clinical_write_requests where id = target_request_id for update;
  select * into authorization_row from public.clinical_write_authorizations where request_id = target_request_id for update;
  select * into professional from public.clinical_professional_profiles where id = request_row.professional_profile_id;
  if request_row.id is null or request_row.professional_user_id <> current_user_id or request_row.status <> 'approved' then raise exception 'Active clinical authorization required'; end if;
  if authorization_row.id is null or authorization_row.revoked_at is not null or authorization_row.expires_at <= now() then raise exception 'Clinical authorization is expired or revoked'; end if;
  if professional.verification_status <> 'verified' or (professional.verification_expires_at is not null and professional.verification_expires_at <= now()) then raise exception 'Verified professional identity required'; end if;
  perform public.assert_clinical_write_authorization(authorization_row.id, request_row.pet_id, 'create_encounter');
  if not ('create_encounter' = any(authorization_row.approved_scopes)) then raise exception 'Encounter scope was not authorized'; end if;
  if next_encounter_type not in ('consultation','vaccination','follow_up','emergency','other') or nullif(trim(next_summary), '') is null then raise exception 'Invalid encounter data'; end if;
  if jsonb_typeof(next_entries) <> 'array' or jsonb_array_length(next_entries) > 20 then raise exception 'Invalid clinical entries'; end if;

  insert into public.clinical_encounters (authorization_id, pet_id, professional_profile_id, provider_organization_id, attended_at, encounter_type, summary, idempotency_key)
  values (authorization_row.id, request_row.pet_id, professional.id, request_row.provider_organization_id, next_attended_at, next_encounter_type, trim(next_summary), next_idempotency_key)
  on conflict (professional_profile_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning * into created_encounter;

  if not exists (select 1 from public.clinical_entries where encounter_id = created_encounter.id) then
    for entry in select * from jsonb_array_elements(next_entries) loop
      required_scope := case entry->>'type' when 'diagnosis' then 'record_diagnosis' when 'vaccine' then 'record_vaccine' when 'recommendation' then 'record_recommendation' when 'treatment' then 'record_treatment' else 'create_encounter' end;
      if not (required_scope = any(authorization_row.approved_scopes)) then raise exception 'Clinical entry scope was not authorized'; end if;
      if entry->>'type' not in ('diagnosis','vaccine','recommendation','treatment','finding') or nullif(trim(entry->>'title'), '') is null then raise exception 'Invalid clinical entry'; end if;
      insert into public.clinical_entries (encounter_id, entry_type, title, details, created_by_user_id)
      values (created_encounter.id, entry->>'type', trim(entry->>'title'), nullif(trim(entry->>'details'), ''), current_user_id);
    end loop;
    update public.clinical_write_requests set status = 'completed' where id = target_request_id;
    perform public.insert_audit_log('clinical_encounter', created_encounter.id, 'clinical_encounter_finalized', jsonb_build_object('pet_id', request_row.pet_id, 'authorization_id', authorization_row.id), current_user_id);
  end if;
  return created_encounter.id;
end; $$;

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
  select * into authz from public.clinical_write_authorizations where id = encounter_row.authorization_id;
  if encounter_row.id is null or professional.user_id <> current_user_id then raise exception 'Clinical encounter is not available'; end if;
  if professional.verification_status <> 'verified' or (professional.verification_expires_at is not null and professional.verification_expires_at <= now()) then raise exception 'Verified professional identity required'; end if;
  if authz.id is null or authz.revoked_at is not null or authz.expires_at <= now() or not ('upload_clinical_document' = any(authz.approved_scopes)) then raise exception 'Active document authorization required'; end if;
  perform public.assert_clinical_write_authorization(authz.id, encounter_row.pet_id, 'upload_clinical_document');
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
declare current_user_id uuid := auth.uid(); document_row public.clinical_documents; object_row storage.objects; actual_size bigint; actual_mime text; encounter_row public.clinical_encounters;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into document_row from public.clinical_documents where id = target_document_id;
  if document_row.id is null or document_row.created_by_user_id is distinct from current_user_id then raise exception 'Clinical document is not available'; end if;
  select * into encounter_row from public.clinical_encounters where id = document_row.encounter_id;
  perform public.assert_clinical_write_authorization(encounter_row.authorization_id, encounter_row.pet_id, 'upload_clinical_document');
  -- Same lock order as preparation: authorization before document.
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
  perform public.assert_clinical_write_authorization(authz.id, encounter_row.pet_id, required_scope);
  if not (required_scope = any(authz.approved_scopes)) then raise exception 'Clinical entry scope was not authorized'; end if;
  if nullif(trim(next_title), '') is null or nullif(trim(next_reason), '') is null then raise exception 'Correction title and reason are required'; end if;
  insert into public.clinical_entries (encounter_id, entry_type, title, details, corrects_entry_id, correction_reason, created_by_user_id)
  values (original.encounter_id, original.entry_type, trim(next_title), nullif(trim(next_details), ''), original.id, trim(next_reason), current_user_id)
  returning id into created_id;
  update public.clinical_encounters set status = 'corrected' where id = original.encounter_id;
  perform public.insert_audit_log('clinical_entry', created_id, 'clinical_entry_corrected', jsonb_build_object('encounter_id', original.encounter_id), current_user_id);
  return created_id;
end; $$;

create or replace function public.can_upload_clinical_document_object(
  target_bucket text, target_path text, target_user_id uuid default auth.uid()
)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare encounter_row public.clinical_encounters;
begin
  if target_bucket is distinct from 'clinical-documents' or target_user_id is null
    or target_user_id is distinct from auth.uid() then return false; end if;
  select encounter.* into encounter_row
  from public.clinical_documents document
  join public.clinical_encounters encounter on encounter.id = document.encounter_id
  where document.storage_bucket = target_bucket and document.storage_path = target_path
    and document.created_by_user_id = target_user_id and document.upload_status = 'pending';
  if encounter_row.id is null then return false; end if;
  perform public.assert_clinical_write_authorization(encounter_row.authorization_id, encounter_row.pet_id, 'upload_clinical_document');
  return exists (select 1 from public.clinical_documents where storage_bucket = target_bucket
    and storage_path = target_path and created_by_user_id = target_user_id and upload_status = 'pending');
exception when raise_exception then
  return false;
end;
$$;

revoke all on function public.can_upload_clinical_document_object(text, text, uuid) from public;
grant execute on function public.can_upload_clinical_document_object(text, text, uuid) to authenticated;
