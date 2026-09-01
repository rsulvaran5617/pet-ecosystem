create table public.clinical_write_requests (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.pet_clinical_access_grants (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  professional_profile_id uuid not null references public.clinical_professional_profiles (id) on delete restrict,
  professional_user_id uuid not null references auth.users (id) on delete restrict,
  provider_organization_id uuid references public.provider_organizations (id) on delete set null,
  requested_scopes text[] not null check (cardinality(requested_scopes) between 1 and 6),
  request_note text check (request_note is null or char_length(request_note) <= 800),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'revoked', 'expired', 'completed')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users (id) on delete set null,
  decision_note text check (decision_note is null or char_length(decision_note) <= 800),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_scopes <@ array['create_encounter','record_diagnosis','record_vaccine','record_recommendation','record_treatment','upload_clinical_document']::text[])
);

create table public.clinical_write_authorizations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.clinical_write_requests (id) on delete cascade,
  grant_id uuid not null references public.pet_clinical_access_grants (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  professional_profile_id uuid not null references public.clinical_professional_profiles (id) on delete restrict,
  approved_scopes text[] not null check (cardinality(approved_scopes) between 1 and 6),
  consent_version text not null default 'clinical-write-consent-v1',
  authorized_by_user_id uuid not null references auth.users (id) on delete restrict,
  authorized_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users (id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > authorized_at)
);

create unique index clinical_write_requests_one_open_idx on public.clinical_write_requests (grant_id, professional_profile_id) where status in ('requested', 'approved');
create index clinical_write_requests_pet_idx on public.clinical_write_requests (pet_id, requested_at desc);
create index clinical_write_requests_professional_idx on public.clinical_write_requests (professional_user_id, requested_at desc);
create index clinical_write_authorizations_pet_idx on public.clinical_write_authorizations (pet_id, authorized_at desc);

create trigger trg_clinical_write_requests_updated_at before update on public.clinical_write_requests for each row execute function public.set_updated_at();
create trigger trg_clinical_write_authorizations_updated_at before update on public.clinical_write_authorizations for each row execute function public.set_updated_at();

alter table public.clinical_write_requests enable row level security;
alter table public.clinical_write_authorizations enable row level security;

create or replace function public.request_clinical_write_access(raw_token text, next_scopes text[], next_note text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  current_user_id uuid := auth.uid(); target_grant public.pet_clinical_access_grants;
  professional public.clinical_professional_profiles; created_request public.clinical_write_requests;
  allowed_scopes constant text[] := array['create_encounter','record_diagnosis','record_vaccine','record_recommendation','record_treatment','upload_clinical_document'];
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Clinical access is invalid or expired'; end if;
  if cardinality(next_scopes) is null or cardinality(next_scopes) < 1 or not next_scopes <@ allowed_scopes then raise exception 'Invalid clinical write scopes'; end if;
  select * into target_grant from public.pet_clinical_access_grants where token_hash = encode(digest(raw_token, 'sha256'), 'hex') for update;
  if target_grant.id is null or target_grant.status <> 'active' or target_grant.expires_at <= now() then raise exception 'Clinical access is invalid or expired'; end if;
  select * into professional from public.clinical_professional_profiles where user_id = current_user_id;
  if professional.id is null or professional.verification_status <> 'verified' or (professional.verification_expires_at is not null and professional.verification_expires_at <= now()) then raise exception 'Verified professional identity required'; end if;
  insert into public.clinical_write_requests (grant_id, pet_id, household_id, professional_profile_id, professional_user_id, provider_organization_id, requested_scopes, request_note, expires_at)
  values (target_grant.id, target_grant.pet_id, target_grant.household_id, professional.id, current_user_id, professional.provider_organization_id, array(select distinct unnest(next_scopes)), nullif(trim(next_note), ''), target_grant.expires_at)
  returning * into created_request;
  perform public.insert_audit_log('clinical_write_request', created_request.id, 'clinical_write_requested', jsonb_build_object('pet_id', target_grant.pet_id, 'scopes', created_request.requested_scopes), current_user_id);
  return created_request.id;
end; $$;

create or replace function public.get_my_clinical_write_request(raw_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare target_grant public.pet_clinical_access_grants; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authenticated user required'; end if;
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Clinical access is invalid or expired'; end if;
  select * into target_grant from public.pet_clinical_access_grants where token_hash = encode(digest(raw_token, 'sha256'), 'hex');
  if target_grant.id is null then raise exception 'Clinical access is invalid or expired'; end if;
  select jsonb_build_object('id', request.id, 'status', case when request.status in ('requested','approved') and request.expires_at <= now() then 'expired' else request.status end,
    'requestedScopes', request.requested_scopes, 'requestNote', request.request_note, 'expiresAt', request.expires_at, 'decisionNote', request.decision_note)
  into result from public.clinical_write_requests request where request.grant_id = target_grant.id and request.professional_user_id = auth.uid() order by request.created_at desc limit 1;
  return result;
end; $$;

create or replace function public.list_pet_clinical_write_requests(target_pet_id uuid)
returns table (id uuid, professional_name text, professional_type text, organization_name text, requested_scopes text[], request_note text, status text, requested_at timestamptz, expires_at timestamptz, decision_note text)
language sql stable security definer set search_path = public as $$
  select request.id, professional.professional_name, professional.professional_type, organization.name,
    request.requested_scopes, request.request_note,
    case when request.status in ('requested','approved') and request.expires_at <= now() then 'expired' else request.status end,
    request.requested_at, request.expires_at, request.decision_note
  from public.clinical_write_requests request
  join public.clinical_professional_profiles professional on professional.id = request.professional_profile_id
  left join public.provider_organizations organization on organization.id = request.provider_organization_id
  where request.pet_id = target_pet_id and public.can_view_pet(target_pet_id, auth.uid())
  order by request.requested_at desc;
$$;

create or replace function public.review_clinical_write_request(target_request_id uuid, decision text, next_approved_scopes text[] default null, next_decision_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_request public.clinical_write_requests;
begin
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into target_request from public.clinical_write_requests where id = target_request_id for update;
  if target_request.id is null or not public.can_edit_pet(target_request.pet_id, current_user_id) then raise exception 'Clinical write request not found'; end if;
  if target_request.status <> 'requested' or target_request.expires_at <= now() then raise exception 'Clinical write request is no longer active'; end if;
  if decision = 'approved' and (cardinality(next_approved_scopes) is null or cardinality(next_approved_scopes) < 1 or not next_approved_scopes <@ target_request.requested_scopes) then raise exception 'Approved scopes must be requested scopes'; end if;
  update public.clinical_write_requests set status = decision, reviewed_at = now(), reviewed_by_user_id = current_user_id, decision_note = nullif(trim(next_decision_note), '') where id = target_request_id;
  if decision = 'approved' then
    insert into public.clinical_write_authorizations (request_id, grant_id, pet_id, professional_profile_id, approved_scopes, authorized_by_user_id, expires_at)
    values (target_request.id, target_request.grant_id, target_request.pet_id, target_request.professional_profile_id, array(select distinct unnest(next_approved_scopes)), current_user_id, target_request.expires_at);
  end if;
  perform public.insert_audit_log('clinical_write_request', target_request.id, 'clinical_write_' || decision, jsonb_build_object('pet_id', target_request.pet_id), current_user_id);
end; $$;

create or replace function public.revoke_clinical_write_authorization(target_request_id uuid, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_request public.clinical_write_requests;
begin
  select * into target_request from public.clinical_write_requests where id = target_request_id for update;
  if target_request.id is null or not public.can_edit_pet(target_request.pet_id, current_user_id) then raise exception 'Clinical write authorization not found'; end if;
  if target_request.status <> 'approved' then raise exception 'Clinical write authorization is not active'; end if;
  update public.clinical_write_requests set status = 'revoked', decision_note = coalesce(nullif(trim(reason), ''), decision_note) where id = target_request_id;
  update public.clinical_write_authorizations set revoked_at = now(), revoked_by_user_id = current_user_id, revocation_reason = nullif(trim(reason), '') where request_id = target_request_id and revoked_at is null;
  perform public.insert_audit_log('clinical_write_request', target_request.id, 'clinical_write_revoked', jsonb_build_object('pet_id', target_request.pet_id), current_user_id);
end; $$;

revoke all on public.clinical_write_requests, public.clinical_write_authorizations from anon, authenticated;
revoke all on function public.request_clinical_write_access(text, text[], text) from public;
revoke all on function public.get_my_clinical_write_request(text) from public;
revoke all on function public.list_pet_clinical_write_requests(uuid) from public;
revoke all on function public.review_clinical_write_request(uuid, text, text[], text) from public;
revoke all on function public.revoke_clinical_write_authorization(uuid, text) from public;
grant execute on function public.request_clinical_write_access(text, text[], text) to authenticated;
grant execute on function public.get_my_clinical_write_request(text) to authenticated;
grant execute on function public.list_pet_clinical_write_requests(uuid) to authenticated;
grant execute on function public.review_clinical_write_request(uuid, text, text[], text) to authenticated;
grant execute on function public.revoke_clinical_write_authorization(uuid, text) to authenticated;
