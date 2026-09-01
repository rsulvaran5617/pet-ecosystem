create table public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.clinical_write_authorizations (id) on delete restrict,
  pet_id uuid not null references public.pets (id) on delete restrict,
  professional_profile_id uuid not null references public.clinical_professional_profiles (id) on delete restrict,
  provider_organization_id uuid references public.provider_organizations (id) on delete set null,
  attended_at timestamptz not null,
  encounter_type text not null check (encounter_type in ('consultation','vaccination','follow_up','emergency','other')),
  summary text not null check (char_length(trim(summary)) between 3 and 2400),
  status text not null default 'finalized' check (status in ('finalized','corrected')),
  idempotency_key uuid not null,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (professional_profile_id, idempotency_key)
);

create table public.clinical_entries (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.clinical_encounters (id) on delete restrict,
  entry_type text not null check (entry_type in ('diagnosis','vaccine','recommendation','treatment','finding')),
  title text not null check (char_length(trim(title)) between 2 and 200),
  details text check (details is null or char_length(details) <= 4000),
  corrects_entry_id uuid references public.clinical_entries (id) on delete restrict,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.clinical_documents (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.clinical_encounters (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 200),
  document_type text not null check (document_type in ('prescription','lab_result','imaging_report','clinical_report','other')),
  storage_bucket text not null default 'clinical-documents',
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 15728640),
  checksum_sha256 text,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index clinical_encounters_pet_idx on public.clinical_encounters (pet_id, attended_at desc);
create index clinical_entries_encounter_idx on public.clinical_entries (encounter_id, created_at);
create index clinical_documents_encounter_idx on public.clinical_documents (encounter_id, created_at);
alter table public.clinical_encounters enable row level security;
alter table public.clinical_entries enable row level security;
alter table public.clinical_documents enable row level security;

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

revoke all on public.clinical_encounters, public.clinical_entries, public.clinical_documents from anon, authenticated;
revoke all on function public.finalize_clinical_encounter(uuid, uuid, timestamptz, text, text, jsonb) from public;
grant execute on function public.finalize_clinical_encounter(uuid, uuid, timestamptz, text, text, jsonb) to authenticated;
