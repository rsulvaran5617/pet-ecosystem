-- Lifecycle RPCs serialize per pet and lock requests before the parent QR,
-- preserving the request -> authorization -> profile -> grant order of write guards.
create or replace function public.close_clinical_consent_cycles(target_pet_id uuid, target_professional_id uuid, target_grant_id uuid, closure_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare item public.clinical_write_requests; closed_status text;
begin
  for item in select * from public.clinical_write_requests r where r.pet_id = target_pet_id
    and (target_professional_id is null or r.professional_profile_id = target_professional_id)
    and (target_grant_id is null or r.grant_id = target_grant_id)
    and r.status in ('requested','approved','completed') order by r.id for update
  loop
    perform 1 from public.clinical_write_authorizations where request_id = item.id for update;
    closed_status := case when item.expires_at <= clock_timestamp() then 'expired' else 'revoked' end;
    update public.clinical_write_authorizations set revoked_at = clock_timestamp(), revoked_by_user_id = auth.uid(), revocation_reason = closure_reason where request_id = item.id and revoked_at is null;
    update public.clinical_write_requests set status = closed_status, decision_note = closure_reason where id = item.id;
    perform public.insert_audit_log('clinical_write_request', item.id, 'clinical_write_' || closed_status, jsonb_build_object('pet_id', target_pet_id, 'reason', closure_reason), auth.uid());
  end loop;
end; $$;
revoke all on function public.close_clinical_consent_cycles(uuid,uuid,uuid,text) from public, anon, authenticated;

-- Deadlines are enforced without depending on a scheduled worker.
create or replace function public.effective_clinical_request_status(request_row public.clinical_write_requests)
returns text language sql stable security definer set search_path = public as $$
  select case when request_row.status not in ('requested','approved','completed') then request_row.status
    when g.status = 'revoked' or g.revoked_at is not null or a.revoked_at is not null then 'revoked'
    when g.status = 'expired' or least(request_row.expires_at,g.expires_at,a.expires_at,p.verification_expires_at) <= now() then 'expired'
    when p.verification_status <> 'verified' then 'revoked' else request_row.status end
  from public.pet_clinical_access_grants g
  join public.clinical_professional_profiles p on p.id = request_row.professional_profile_id
  left join public.clinical_write_authorizations a on a.request_id = request_row.id where g.id = request_row.grant_id;
$$;
revoke all on function public.effective_clinical_request_status(public.clinical_write_requests) from public, anon, authenticated;


create or replace function public.create_pet_clinical_access(
  target_pet_id uuid,
  next_duration_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_pet public.pets;
  raw_token text;
  next_expires_at timestamptz;
  created_grant public.pet_clinical_access_grants;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;
  if not public.can_edit_pet(target_pet_id, current_user_id) then
    raise exception 'Pet edit permission required';
  end if;
  if next_duration_code is null or next_duration_code not in ('1_hour', '1_day', '1_week') then
    raise exception 'Invalid clinical access duration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('clinical-pet:' || target_pet_id::text, 0));
  perform public.close_clinical_consent_cycles(target_pet_id,null,null,'QR replaced');
  select * into target_pet from public.pets where id = target_pet_id;
  if target_pet.id is null then
    raise exception 'Pet not found';
  end if;

  next_expires_at := now() + case next_duration_code
    when '1_hour' then interval '1 hour'
    when '1_day' then interval '1 day'
    else interval '7 days'
  end;
  raw_token := encode(gen_random_bytes(32), 'hex');

  update public.pet_clinical_access_grants
  set status = 'revoked', revoked_at = now()
  where pet_id = target_pet_id and status = 'active';

  insert into public.pet_clinical_access_grants (
    pet_id, household_id, created_by_user_id, token_hash, duration_code, expires_at
  ) values (
    target_pet.id, target_pet.household_id, current_user_id,
    encode(digest(raw_token, 'sha256'), 'hex'), next_duration_code, next_expires_at
  ) returning * into created_grant;

  insert into public.pet_clinical_access_events (grant_id, event_type, actor_user_id)
  values (created_grant.id, 'created', current_user_id);

  return jsonb_build_object(
    'id', created_grant.id,
    'petId', created_grant.pet_id,
    'token', raw_token,
    'durationCode', created_grant.duration_code,
    'status', created_grant.status,
    'expiresAt', created_grant.expires_at,
    'revokedAt', created_grant.revoked_at,
    'lastAccessedAt', created_grant.last_accessed_at,
    'accessCount', created_grant.access_count,
    'createdAt', created_grant.created_at
  );
end;
$$;

create or replace function public.revoke_pet_clinical_access(target_grant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_grant public.pet_clinical_access_grants;
begin
  select * into target_grant from public.pet_clinical_access_grants where id = target_grant_id;
  if target_grant.id is null or not public.can_edit_pet(target_grant.pet_id, auth.uid()) then
    raise exception 'Clinical access not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('clinical-pet:' || target_grant.pet_id::text,0));
  perform public.close_clinical_consent_cycles(target_grant.pet_id,null,target_grant_id,'QR revoked');
  select * into target_grant from public.pet_clinical_access_grants where id = target_grant_id;
  if target_grant.status <> 'active' then
    return;
  end if;

  update public.pet_clinical_access_grants
  set status = 'revoked', revoked_at = now()
  where id = target_grant_id;
  insert into public.pet_clinical_access_events (grant_id, event_type, actor_user_id)
  values (target_grant_id, 'revoked', auth.uid());
end;
$$;

create or replace function public.request_clinical_write_access(raw_token text, next_scopes text[], next_note text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  current_user_id uuid := auth.uid(); target_grant public.pet_clinical_access_grants;
  professional public.clinical_professional_profiles; created_request public.clinical_write_requests; existing_request public.clinical_write_requests;
  allowed_scopes constant text[] := array['create_encounter','record_diagnosis','record_vaccine','record_recommendation','record_treatment','upload_clinical_document'];
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Clinical access is invalid or expired'; end if;
  if cardinality(next_scopes) is null or cardinality(next_scopes) < 1 or not next_scopes <@ allowed_scopes then raise exception 'Invalid clinical write scopes'; end if;
  select * into target_grant from public.pet_clinical_access_grants where token_hash = encode(digest(raw_token, 'sha256'), 'hex');
  if target_grant.id is null or target_grant.status <> 'active' or target_grant.expires_at <= now() then raise exception 'Clinical access is invalid or expired'; end if;
  select * into professional from public.clinical_professional_profiles where user_id = current_user_id;
  if professional.id is null or professional.verification_status <> 'verified' or (professional.verification_expires_at is not null and professional.verification_expires_at <= now()) then raise exception 'Verified professional identity required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clinical-pet:' || target_grant.pet_id::text,0));
  -- Repeated submission of the same pending request is idempotent.
  select * into existing_request from public.clinical_write_requests r
    where r.grant_id = target_grant.id and r.professional_profile_id = professional.id
    and r.status = 'requested' and r.expires_at > clock_timestamp()
    and r.requested_scopes @> next_scopes and r.requested_scopes <@ next_scopes
    and r.request_note is not distinct from nullif(trim(next_note),'') order by r.created_at desc limit 1;
  if existing_request.id is not null and public.effective_clinical_request_status(existing_request) = 'requested' then return existing_request.id; end if;
  perform public.close_clinical_consent_cycles(target_grant.pet_id,professional.id,null,'New consent request');
  select * into professional from public.clinical_professional_profiles where id = professional.id for share;
  select * into target_grant from public.pet_clinical_access_grants where id = target_grant.id for share;
  if professional.verification_status <> 'verified' or professional.verification_expires_at <= clock_timestamp() then raise exception 'Verified professional identity required'; end if;
  if target_grant.status <> 'active' or target_grant.revoked_at is not null or target_grant.expires_at <= clock_timestamp()
    or not exists(select 1 from public.pets where id = target_grant.pet_id and household_id = target_grant.household_id)
    then raise exception 'Clinical access is invalid or expired'; end if;
  insert into public.clinical_write_requests (grant_id, pet_id, household_id, professional_profile_id, professional_user_id, provider_organization_id, requested_scopes, request_note, expires_at)
  values (target_grant.id, target_grant.pet_id, target_grant.household_id, professional.id, current_user_id, professional.provider_organization_id, array(select distinct unnest(next_scopes)), nullif(trim(next_note), ''), least(target_grant.expires_at,professional.verification_expires_at))
  returning * into created_request;
  perform public.insert_audit_log('clinical_write_request', created_request.id, 'clinical_write_requested', jsonb_build_object('pet_id', target_grant.pet_id, 'scopes', created_request.requested_scopes), current_user_id);
  return created_request.id;
end; $$;

create or replace function public.review_clinical_write_request(target_request_id uuid, decision text, next_approved_scopes text[] default null, next_decision_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_request public.clinical_write_requests; professional public.clinical_professional_profiles; target_grant public.pet_clinical_access_grants;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  if decision is null or decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into target_request from public.clinical_write_requests where id = target_request_id;
  if target_request.id is null or not public.can_edit_pet(target_request.pet_id, current_user_id) then raise exception 'Clinical write request not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clinical-pet:' || target_request.pet_id::text,0));
  select * into target_request from public.clinical_write_requests where id = target_request_id for update;
  if target_request.status <> 'requested' or target_request.expires_at <= now() then raise exception 'Clinical write request is no longer active'; end if;
  if decision = 'approved' and (cardinality(next_approved_scopes) is null or cardinality(next_approved_scopes) < 1 or not next_approved_scopes <@ target_request.requested_scopes) then raise exception 'Approved scopes must be requested scopes'; end if;
  select * into professional from public.clinical_professional_profiles where id = target_request.professional_profile_id for share;
  select * into target_grant from public.pet_clinical_access_grants where id = target_request.grant_id for share;
  if public.effective_clinical_request_status(target_request) <> 'requested'
    or not exists(select 1 from public.pets where id = target_request.pet_id and household_id = target_grant.household_id)
    then raise exception 'Clinical write request is no longer active'; end if;
  target_request.expires_at := least(target_request.expires_at,target_grant.expires_at,professional.verification_expires_at);
  if target_request.expires_at <= clock_timestamp() then raise exception 'Clinical write request is no longer active'; end if;
  update public.clinical_write_requests set status = decision, expires_at = target_request.expires_at, reviewed_at = now(), reviewed_by_user_id = current_user_id, decision_note = nullif(trim(next_decision_note), '') where id = target_request_id;
  if decision = 'approved' then
    insert into public.clinical_write_authorizations (request_id, grant_id, pet_id, professional_profile_id, approved_scopes, authorized_by_user_id, expires_at)
    values (target_request.id, target_request.grant_id, target_request.pet_id, target_request.professional_profile_id, array(select distinct unnest(next_approved_scopes)), current_user_id, target_request.expires_at);
  end if;
  perform public.insert_audit_log('clinical_write_request', target_request.id, 'clinical_write_' || decision, jsonb_build_object('pet_id', target_request.pet_id), current_user_id);
end; $$;

create or replace function public.get_my_clinical_write_request(raw_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare target_grant public.pet_clinical_access_grants; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authenticated user required'; end if;
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Clinical access is invalid or expired'; end if;
  select * into target_grant from public.pet_clinical_access_grants where token_hash = encode(digest(raw_token, 'sha256'), 'hex');
  if target_grant.id is null then raise exception 'Clinical access is invalid or expired'; end if;
  select jsonb_build_object('id', request.id, 'status', public.effective_clinical_request_status(request),
    'requestedScopes', request.requested_scopes, 'requestNote', request.request_note, 'expiresAt', request.expires_at, 'decisionNote', request.decision_note)
  into result from public.clinical_write_requests request where request.grant_id = target_grant.id and request.professional_user_id = auth.uid() order by request.created_at desc limit 1;
  return result;
end; $$;

create or replace function public.list_pet_clinical_write_requests(target_pet_id uuid)
returns table (id uuid, professional_name text, professional_type text, organization_name text, requested_scopes text[], request_note text, status text, requested_at timestamptz, expires_at timestamptz, decision_note text)
language sql stable security definer set search_path = public as $$
  select request.id, professional.professional_name, professional.professional_type, organization.name,
    request.requested_scopes, request.request_note,
    public.effective_clinical_request_status(request),
    request.requested_at, request.expires_at, request.decision_note
  from public.clinical_write_requests request
  join public.clinical_professional_profiles professional on professional.id = request.professional_profile_id
  left join public.provider_organizations organization on organization.id = request.provider_organization_id
  where request.pet_id = target_pet_id and public.can_view_pet(target_pet_id, auth.uid())
  order by request.requested_at desc;
$$;

-- Preserve the authenticated-only RPC boundary explicitly.
revoke all on function public.create_pet_clinical_access(uuid,text) from public, anon;
grant execute on function public.create_pet_clinical_access(uuid,text) to authenticated;
revoke all on function public.revoke_pet_clinical_access(uuid) from public, anon;
grant execute on function public.revoke_pet_clinical_access(uuid) to authenticated;
revoke all on function public.request_clinical_write_access(text,text[],text) from public, anon;
grant execute on function public.request_clinical_write_access(text,text[],text) to authenticated;
revoke all on function public.review_clinical_write_request(uuid,text,text[],text) from public, anon;
grant execute on function public.review_clinical_write_request(uuid,text,text[],text) to authenticated;
revoke all on function public.get_my_clinical_write_request(text) from public, anon;
grant execute on function public.get_my_clinical_write_request(text) to authenticated;
revoke all on function public.list_pet_clinical_write_requests(uuid) from public, anon;
grant execute on function public.list_pet_clinical_write_requests(uuid) to authenticated;
