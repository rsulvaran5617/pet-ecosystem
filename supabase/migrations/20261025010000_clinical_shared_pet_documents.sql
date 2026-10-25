-- Private owner files are readable only during an owner-approved professional session.
-- No changes to anonymous QR responses or direct Storage/table policies.
create or replace function public.assert_clinical_document_read_access(raw_token text)
returns public.clinical_write_authorizations
language plpgsql security definer set search_path = public, extensions as $$
declare
  authorization_row public.clinical_write_authorizations;
begin
  if auth.uid() is null or raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Clinical document access denied';
  end if;
  select authz.* into authorization_row
  from public.clinical_write_authorizations authz
  join public.clinical_write_requests request on request.id = authz.request_id
  join public.pet_clinical_access_grants access on access.id = authz.grant_id
  where access.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
    and request.professional_user_id = auth.uid()
    and request.status in ('approved', 'completed')
    and authz.revoked_at is null and authz.expires_at > clock_timestamp()
  order by authz.authorized_at desc limit 1;
  if authorization_row.id is null then raise exception 'Clinical document access denied'; end if;
  -- Reuse the transactional identity/consent/grant/household guard. Reading
  -- supporting records accompanies any approved clinical action, not upload scope.
  perform public.assert_clinical_write_authorization(
    authorization_row.id, authorization_row.pet_id, authorization_row.approved_scopes[1]);
  return authorization_row;
end;
$$;
revoke all on function public.assert_clinical_document_read_access(text) from public, anon, authenticated;

create or replace function public.list_shared_pet_clinical_documents(raw_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare authorization_row public.clinical_write_authorizations; result jsonb; valid_until timestamptz;
begin
  authorization_row := public.assert_clinical_document_read_access(raw_token);
  select least(authorization_row.expires_at, request.expires_at, access.expires_at, professional.verification_expires_at)
    into valid_until
  from public.clinical_write_requests request
  join public.pet_clinical_access_grants access on access.id = request.grant_id
  join public.clinical_professional_profiles professional on professional.id = request.professional_profile_id
  where request.id = authorization_row.request_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', document.id, 'title', document.title, 'documentType', document.document_type,
    'mimeType', document.mime_type, 'issuedAt', document.issued_at, 'expiresAt', document.expires_at
  ) order by document.created_at desc), '[]'::jsonb) into result
  from public.pet_documents document
  where document.pet_id = authorization_row.pet_id and document.storage_bucket = 'pet-documents';
  return jsonb_build_object('expiresAt', valid_until, 'documents', result);
end;
$$;

create or replace function public.get_shared_pet_clinical_document(raw_token text, target_document_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare authorization_row public.clinical_write_authorizations; document_row public.pet_documents;
begin
  authorization_row := public.assert_clinical_document_read_access(raw_token);
  select * into document_row from public.pet_documents
  where id = target_document_id and pet_id = authorization_row.pet_id
    and storage_bucket = 'pet-documents'
    -- Owner metadata is editable: never trust a locator pointing at another pet.
    -- Match the canonical uploader path; reject URL escapes/traversal as well.
    and storage_path ~ ('^' || authorization_row.pet_id::text || '/[a-zA-Z0-9_-][a-zA-Z0-9._-]*$')
    for share;
  if document_row.id is null then raise exception 'Clinical document access denied'; end if;
  perform public.insert_audit_log('pet_document', document_row.id, 'clinical_owner_document_accessed',
    jsonb_build_object('authorization_id', authorization_row.id), auth.uid());
  -- Only the gateway consumes this locator. Storage remains inaccessible to
  -- professionals directly, including attempts to mint signed URLs.
  return jsonb_build_object('bucket', document_row.storage_bucket, 'path', document_row.storage_path,
    'mimeType', document_row.mime_type);
end;
$$;
revoke all on function public.list_shared_pet_clinical_documents(text) from public, anon;
revoke all on function public.get_shared_pet_clinical_document(text, uuid) from public, anon;
grant execute on function public.list_shared_pet_clinical_documents(text) to authenticated;
grant execute on function public.get_shared_pet_clinical_document(text, uuid) to authenticated;
