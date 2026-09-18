-- H04/H05: immutable retry receipts and revocable residual document access.
create or replace function public.finalize_clinical_encounter(
  target_request_id uuid, next_idempotency_key uuid, next_attended_at timestamptz,
  next_encounter_type text, next_summary text, next_entries jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); request_row public.clinical_write_requests;
  authorization_row public.clinical_write_authorizations; professional public.clinical_professional_profiles;
  created_encounter public.clinical_encounters; entry jsonb; required_scope text;
  submitted_entries jsonb; stored_entries jsonb;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into request_row from public.clinical_write_requests where id = target_request_id for update;
  select * into authorization_row from public.clinical_write_authorizations where request_id = target_request_id for update;
  select * into professional from public.clinical_professional_profiles where id = request_row.professional_profile_id;
  if request_row.id is null or request_row.professional_user_id is distinct from current_user_id
    or professional.user_id is distinct from current_user_id or authorization_row.id is null then
    raise exception 'Active clinical authorization required';
  end if;
  if next_idempotency_key is null or next_entries is null or jsonb_typeof(next_entries) <> 'array' then
    raise exception 'Invalid clinical entries or idempotency key';
  end if;
  if jsonb_array_length(next_entries) > 20 then raise exception 'Invalid clinical entries'; end if;

  -- The request lock serializes simultaneous retries of this operation. A receipt
  -- reads a prior result only; it never revives expired/revoked writing authority.
  select * into created_encounter from public.clinical_encounters
  where professional_profile_id = professional.id and idempotency_key = next_idempotency_key;
  if found then
    if created_encounter.authorization_id is distinct from authorization_row.id then
      raise exception 'Idempotency key belongs to another clinical operation';
    end if;
    select coalesce(jsonb_agg(item order by item::text), '[]'::jsonb) into submitted_entries
    from (select jsonb_build_object('type', value->>'type', 'title', trim(value->>'title'),
      'details', nullif(trim(value->>'details'), '')) as item from jsonb_array_elements(next_entries)) normalized;
    select coalesce(jsonb_agg(item order by item::text), '[]'::jsonb) into stored_entries
    from (select jsonb_build_object('type', entry_type, 'title', title, 'details', details) as item
      from public.clinical_entries where encounter_id = created_encounter.id and corrects_entry_id is null) normalized;
    if created_encounter.attended_at is distinct from next_attended_at
      or created_encounter.encounter_type is distinct from next_encounter_type
      or created_encounter.summary is distinct from trim(next_summary)
      or stored_entries is distinct from submitted_entries then
      raise exception 'Idempotency payload mismatch';
    end if;
    return created_encounter.id;
  end if;

  if request_row.status <> 'approved' then raise exception 'Active clinical authorization required'; end if;
  perform public.assert_clinical_write_authorization(authorization_row.id, request_row.pet_id, 'create_encounter');
  if next_encounter_type not in ('consultation','vaccination','follow_up','emergency','other')
    or nullif(trim(next_summary), '') is null then raise exception 'Invalid encounter data'; end if;
  insert into public.clinical_encounters (authorization_id, pet_id, professional_profile_id, provider_organization_id, attended_at, encounter_type, summary, idempotency_key)
  values (authorization_row.id, request_row.pet_id, professional.id, request_row.provider_organization_id, next_attended_at, next_encounter_type, trim(next_summary), next_idempotency_key)
  returning * into created_encounter;
  for entry in select * from jsonb_array_elements(next_entries) loop
    required_scope := case entry->>'type' when 'diagnosis' then 'record_diagnosis' when 'vaccine' then 'record_vaccine' when 'recommendation' then 'record_recommendation' when 'treatment' then 'record_treatment' else 'create_encounter' end;
    if not (required_scope = any(authorization_row.approved_scopes)) then raise exception 'Clinical entry scope was not authorized'; end if;
    if entry->>'type' not in ('diagnosis','vaccine','recommendation','treatment','finding') or nullif(trim(entry->>'title'), '') is null then raise exception 'Invalid clinical entry'; end if;
    insert into public.clinical_entries (encounter_id, entry_type, title, details, created_by_user_id)
    values (created_encounter.id, entry->>'type', trim(entry->>'title'), nullif(trim(entry->>'details'), ''), current_user_id);
  end loop;
  update public.clinical_write_requests set status = 'completed' where id = target_request_id;
  perform public.insert_audit_log('clinical_encounter', created_encounter.id, 'clinical_encounter_finalized', jsonb_build_object('pet_id', request_row.pet_id, 'authorization_id', authorization_row.id), current_user_id);
  return created_encounter.id;
end; $$;

create or replace function public.revoke_clinical_write_authorization(target_request_id uuid, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_request public.clinical_write_requests;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into target_request from public.clinical_write_requests where id = target_request_id for update;
  if target_request.id is null or not public.can_edit_pet(target_request.pet_id, current_user_id) then raise exception 'Clinical write authorization not found'; end if;
  if target_request.status = 'revoked' then return; end if;
  if target_request.status not in ('approved', 'completed') then raise exception 'Clinical write authorization is not active'; end if;
  update public.clinical_write_authorizations set revoked_at = now(), revoked_by_user_id = current_user_id,
    revocation_reason = nullif(trim(reason), '') where request_id = target_request_id and revoked_at is null;
  update public.clinical_write_requests set status = 'revoked', decision_note = coalesce(nullif(trim(reason), ''), decision_note) where id = target_request_id;
  perform public.insert_audit_log('clinical_write_request', target_request.id, 'clinical_write_revoked', jsonb_build_object('pet_id', target_request.pet_id), current_user_id);
end; $$;

create or replace function public.finalize_clinical_document_upload(target_document_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare current_user_id uuid := auth.uid(); document_row public.clinical_documents; object_row storage.objects;
  actual_size bigint; actual_mime text; encounter_row public.clinical_encounters;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into document_row from public.clinical_documents where id = target_document_id;
  if document_row.id is null or document_row.created_by_user_id is distinct from current_user_id then raise exception 'Clinical document is not available'; end if;
  -- Completed receipt is safe to repeat even after permission withdrawal.
  if document_row.upload_status = 'ready' then return; end if;
  select * into encounter_row from public.clinical_encounters where id = document_row.encounter_id;
  perform public.assert_clinical_write_authorization(encounter_row.authorization_id, encounter_row.pet_id, 'upload_clinical_document');
  select * into document_row from public.clinical_documents where id = target_document_id for update;
  if document_row.upload_status = 'ready' then return; end if;
  if document_row.upload_status <> 'pending' then raise exception 'Clinical document is not available'; end if;
  select * into object_row from storage.objects where bucket_id = document_row.storage_bucket and name = document_row.storage_path;
  actual_size := nullif(object_row.metadata->>'size', '')::bigint;
  actual_mime := lower(coalesce(object_row.metadata->>'mimetype', ''));
  if object_row.id is null or actual_size is distinct from document_row.file_size_bytes or actual_size > 15728640 or actual_mime <> document_row.mime_type then
    raise exception 'Clinical document validation failed';
  end if;
  update public.clinical_documents set upload_status = 'ready', uploaded_at = now() where id = document_row.id;
  perform public.insert_audit_log('clinical_document', document_row.id, 'clinical_document_added', jsonb_build_object('encounter_id', document_row.encounter_id), current_user_id);
end; $$;

-- Document preparation retries bind the key to the original metadata.
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
  if next_idempotency_key is null then raise exception 'Document idempotency key is required'; end if;
  select * into document_row from public.clinical_documents
  where created_by_user_id = current_user_id and idempotency_key = next_idempotency_key;
  if found then
    if document_row.encounter_id is distinct from encounter_row.id
      or document_row.title is distinct from trim(next_title)
      or document_row.document_type is distinct from next_document_type
      or document_row.mime_type is distinct from next_mime_type
      or document_row.file_size_bytes is distinct from next_file_size_bytes
      or document_row.checksum_sha256 is distinct from lower(next_checksum_sha256) then
      raise exception 'Idempotency payload mismatch';
    end if;
    return jsonb_build_object('documentId', document_row.id, 'bucket', document_row.storage_bucket, 'path', document_row.storage_path);
  end if;
  extension := case next_mime_type when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' else 'png' end;
  insert into public.clinical_documents (encounter_id, title, document_type, storage_path, mime_type, file_size_bytes, checksum_sha256, created_by_user_id, idempotency_key)
  values (encounter_row.id, trim(next_title), next_document_type, encounter_row.pet_id || '/' || encounter_row.id || '/' || gen_random_uuid() || '.' || extension, next_mime_type, next_file_size_bytes, lower(next_checksum_sha256), current_user_id, next_idempotency_key)
  returning * into document_row;
  return jsonb_build_object('documentId', document_row.id, 'bucket', document_row.storage_bucket, 'path', document_row.storage_path);
end; $$;
