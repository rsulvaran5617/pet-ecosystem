create table public.pet_clinical_access_grants (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  token_hash text not null unique check (char_length(token_hash) = 64),
  access_scope text not null default 'read_only' check (access_scope = 'read_only'),
  duration_code text not null check (duration_code in ('1_hour', '1_day', '1_week')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0 check (access_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status = 'revoked') = (revoked_at is not null))
);

create table public.pet_clinical_access_events (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.pet_clinical_access_grants (id) on delete cascade,
  event_type text not null check (event_type in ('created', 'viewed', 'revoked', 'expired')),
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index pet_clinical_access_grants_pet_idx
  on public.pet_clinical_access_grants (pet_id, created_at desc);
create index pet_clinical_access_grants_active_idx
  on public.pet_clinical_access_grants (expires_at)
  where status = 'active';
create unique index pet_clinical_access_grants_one_active_pet_idx
  on public.pet_clinical_access_grants (pet_id)
  where status = 'active';
create index pet_clinical_access_events_grant_idx
  on public.pet_clinical_access_events (grant_id, created_at desc);

create trigger trg_pet_clinical_access_grants_updated_at
before update on public.pet_clinical_access_grants
for each row execute function public.set_updated_at();

alter table public.pet_clinical_access_grants enable row level security;
alter table public.pet_clinical_access_events enable row level security;

create policy pet_clinical_access_grants_select_owner
on public.pet_clinical_access_grants for select to authenticated
using (public.can_view_pet(pet_id, auth.uid()));

create policy pet_clinical_access_events_select_owner
on public.pet_clinical_access_events for select to authenticated
using (exists (
  select 1 from public.pet_clinical_access_grants grant_row
  where grant_row.id = grant_id
    and public.can_view_pet(grant_row.pet_id, auth.uid())
));

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
  if next_duration_code not in ('1_hour', '1_day', '1_week') then
    raise exception 'Invalid clinical access duration';
  end if;

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

create or replace function public.list_pet_clinical_access_grants(target_pet_id uuid)
returns table (
  id uuid,
  pet_id uuid,
  duration_code text,
  status text,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_view_pet(target_pet_id, auth.uid()) then
    raise exception 'Pet access required';
  end if;

  update public.pet_clinical_access_grants grant_row
  set status = 'expired'
  where grant_row.pet_id = target_pet_id
    and grant_row.status = 'active'
    and grant_row.expires_at <= now();

  return query
  select grant_row.id, grant_row.pet_id, grant_row.duration_code, grant_row.status,
    grant_row.expires_at, grant_row.revoked_at, grant_row.last_accessed_at,
    grant_row.access_count, grant_row.created_at
  from public.pet_clinical_access_grants grant_row
  where grant_row.pet_id = target_pet_id
  order by grant_row.created_at desc;
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

create or replace function public.get_public_pet_clinical_access(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_grant public.pet_clinical_access_grants;
  result jsonb;
begin
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Clinical access is invalid or expired';
  end if;

  select * into target_grant
  from public.pet_clinical_access_grants
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  for update;

  if target_grant.id is null or target_grant.status <> 'active' then
    raise exception 'Clinical access is invalid or expired';
  end if;
  if target_grant.expires_at <= now() then
    update public.pet_clinical_access_grants set status = 'expired' where id = target_grant.id;
    insert into public.pet_clinical_access_events (grant_id, event_type) values (target_grant.id, 'expired');
    raise exception 'Clinical access is invalid or expired';
  end if;

  update public.pet_clinical_access_grants
  set last_accessed_at = now(), access_count = access_count + 1
  where id = target_grant.id;
  insert into public.pet_clinical_access_events (grant_id, event_type) values (target_grant.id, 'viewed');

  select jsonb_build_object(
    'grant', jsonb_build_object(
      'scope', target_grant.access_scope,
      'expiresAt', target_grant.expires_at
    ),
    'pet', jsonb_build_object(
      'name', pet.name,
      'species', pet.species,
      'breed', profile.breed,
      'sex', profile.sex,
      'birthDate', profile.birth_date
    ),
    'vaccines', coalesce((select jsonb_agg(jsonb_build_object(
      'name', vaccine.name, 'administeredOn', vaccine.administered_on,
      'nextDueOn', vaccine.next_due_on, 'notes', vaccine.notes
    ) order by vaccine.administered_on desc) from public.pet_vaccines vaccine where vaccine.pet_id = pet.id), '[]'::jsonb),
    'allergies', coalesce((select jsonb_agg(jsonb_build_object(
      'allergen', allergy.allergen, 'reaction', allergy.reaction, 'notes', allergy.notes
    ) order by allergy.created_at) from public.pet_allergies allergy where allergy.pet_id = pet.id), '[]'::jsonb),
    'conditions', coalesce((select jsonb_agg(jsonb_build_object(
      'name', condition.name, 'status', condition.status, 'diagnosedOn', condition.diagnosed_on,
      'isCritical', condition.is_critical, 'notes', condition.notes
    ) order by condition.is_critical desc, condition.created_at) from public.pet_conditions condition where condition.pet_id = pet.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object(
      'title', document.title, 'documentType', document.document_type,
      'issuedAt', document.issued_at, 'expiresAt', document.expires_at
    ) order by document.created_at desc) from public.pet_documents document where document.pet_id = pet.id), '[]'::jsonb)
  ) into result
  from public.pets pet
  left join public.pet_profiles profile on profile.pet_id = pet.id
  where pet.id = target_grant.pet_id;

  return result;
end;
$$;

revoke all on public.pet_clinical_access_grants, public.pet_clinical_access_events from anon, authenticated;
grant select on public.pet_clinical_access_grants, public.pet_clinical_access_events to authenticated;
revoke all on function public.create_pet_clinical_access(uuid, text) from public;
revoke all on function public.list_pet_clinical_access_grants(uuid) from public;
revoke all on function public.revoke_pet_clinical_access(uuid) from public;
revoke all on function public.get_public_pet_clinical_access(text) from public;
grant execute on function public.create_pet_clinical_access(uuid, text) to authenticated;
grant execute on function public.list_pet_clinical_access_grants(uuid) to authenticated;
grant execute on function public.revoke_pet_clinical_access(uuid) to authenticated;
grant execute on function public.get_public_pet_clinical_access(text) to anon, authenticated;
