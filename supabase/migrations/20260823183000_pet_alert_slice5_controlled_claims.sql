create table public.pet_alert_community_claims (
  id uuid primary key default gen_random_uuid(),
  community_sighting_id uuid not null references public.pet_alert_community_sightings (id) on delete restrict,
  claimant_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  claimed_pet_id uuid references public.pets (id) on delete restrict,
  claimant_name text not null check (char_length(trim(claimant_name)) between 2 and 120),
  claimant_email text not null check (char_length(trim(claimant_email)) between 3 and 254),
  claimant_phone text check (claimant_phone is null or char_length(trim(claimant_phone)) <= 40),
  private_details text not null check (char_length(trim(private_details)) between 20 and 1500),
  lost_at timestamptz,
  lost_city text check (lost_city is null or char_length(trim(lost_city)) <= 120),
  contact_consent boolean not null default false,
  authorized_reporter_name text,
  authorized_reporter_email text,
  authorized_reporter_phone text,
  reviewed_by_user_id uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(trim(decision_reason)) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('approved', 'rejected')) = (reviewed_at is not null)),
  check (status <> 'approved' or contact_consent)
);

create unique index pet_alert_community_claims_active_claimant_idx
  on public.pet_alert_community_claims (community_sighting_id, claimant_user_id)
  where status in ('pending', 'approved');
create unique index pet_alert_community_claims_one_approved_idx
  on public.pet_alert_community_claims (community_sighting_id)
  where status = 'approved';
create index pet_alert_community_claims_report_idx
  on public.pet_alert_community_claims (community_sighting_id, status, created_at desc);
create index pet_alert_community_claims_claimant_idx
  on public.pet_alert_community_claims (claimant_user_id, created_at desc);

create table public.pet_alert_community_claim_history (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.pet_alert_community_claims (id) on delete restrict,
  old_status text,
  new_status text not null,
  changed_by_user_id uuid not null references auth.users (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now()
);

create index pet_alert_community_claim_history_claim_idx
  on public.pet_alert_community_claim_history (claim_id, created_at desc);

create trigger trg_pet_alert_community_claims_updated_at
before update on public.pet_alert_community_claims
for each row execute function public.set_updated_at();

create or replace function public.create_pet_alert_community_claim(
  target_report_slug text,
  target_claimed_pet_id uuid default null,
  next_private_details text default null,
  next_lost_at timestamptz default null,
  next_lost_city text default null,
  next_contact_consent boolean default false
)
returns public.pet_alert_community_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_report public.pet_alert_community_sightings;
  current_profile public.profiles;
  created_claim public.pet_alert_community_claims;
begin
  if current_user_id is null then raise exception 'PET_ALERT_AUTH_REQUIRED'; end if;
  if char_length(trim(coalesce(next_private_details, ''))) < 20 then raise exception 'PET_ALERT_CLAIM_DETAILS_REQUIRED'; end if;
  if not next_contact_consent then raise exception 'PET_ALERT_CONTACT_CONSENT_REQUIRED'; end if;

  select * into selected_report from public.pet_alert_community_sightings
  where report_slug = target_report_slug for update;
  if selected_report.id is null or not selected_report.share_enabled
    or selected_report.status not in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim')
    or selected_report.expires_at <= now() then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;
  if selected_report.reporter_user_id = current_user_id then raise exception 'PET_ALERT_SELF_CLAIM_NOT_ALLOWED'; end if;
  if target_claimed_pet_id is not null and not public.can_view_pet(target_claimed_pet_id, current_user_id) then
    raise exception 'PET_ALERT_PET_NOT_ACCESSIBLE';
  end if;
  if (select count(*) from public.pet_alert_community_claims
      where claimant_user_id = current_user_id and created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'PET_ALERT_CLAIM_RATE_LIMIT';
  end if;

  select * into current_profile from public.profiles where id = current_user_id;
  insert into public.pet_alert_community_claims (
    community_sighting_id, claimant_user_id, claimed_pet_id, claimant_name, claimant_email,
    claimant_phone, private_details, lost_at, lost_city, contact_consent
  ) values (
    selected_report.id, current_user_id, target_claimed_pet_id,
    coalesce(nullif(trim(concat_ws(' ', current_profile.first_name, current_profile.last_name)), ''), 'Usuario PET ALERT'),
    current_profile.email, nullif(trim(current_profile.phone), ''), trim(next_private_details),
    next_lost_at, nullif(trim(next_lost_city), ''), true
  ) returning * into created_claim;

  update public.pet_alert_community_sightings set status = 'possible_owner_claim'
  where id = selected_report.id and status in ('sighting_open', 'sheltered_by_reporter');
  insert into public.pet_alert_community_claim_history (claim_id, new_status, changed_by_user_id, reason)
  values (created_claim.id, 'pending', current_user_id, 'claim_created');
  perform public.insert_audit_log('pet_alert_community_claim', created_claim.id, 'pet_alert_claim_created',
    jsonb_build_object('community_sighting_id', selected_report.id), current_user_id);
  return created_claim;
end;
$$;

create or replace function public.list_my_pet_alert_community_claims()
returns table (
  id uuid, community_sighting_id uuid, report_slug text, claimant_user_id uuid, status text,
  claimed_pet_id uuid, claimant_name text, claimant_email text, claimant_phone text,
  private_details text, lost_at timestamptz, lost_city text, contact_consent boolean,
  authorized_reporter_name text, authorized_reporter_email text, authorized_reporter_phone text,
  reviewed_at timestamptz, decision_reason text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select claim.id, claim.community_sighting_id, report.report_slug, claim.claimant_user_id, claim.status,
    claim.claimed_pet_id, claim.claimant_name, claim.claimant_email, claim.claimant_phone,
    claim.private_details, claim.lost_at, claim.lost_city, claim.contact_consent,
    case when claim.status = 'approved' then claim.authorized_reporter_name end,
    case when claim.status = 'approved' then claim.authorized_reporter_email end,
    case when claim.status = 'approved' then claim.authorized_reporter_phone end,
    claim.reviewed_at, claim.decision_reason, claim.created_at, claim.updated_at
  from public.pet_alert_community_claims claim
  join public.pet_alert_community_sightings report on report.id = claim.community_sighting_id
  where claim.claimant_user_id = auth.uid()
  order by claim.created_at desc;
$$;

create or replace function public.list_claims_for_my_pet_alert_community_sightings()
returns table (
  id uuid, community_sighting_id uuid, report_slug text, claimant_user_id uuid, status text,
  claimed_pet_id uuid, claimant_name text, claimant_email text, claimant_phone text,
  private_details text, lost_at timestamptz, lost_city text, contact_consent boolean,
  authorized_reporter_name text, authorized_reporter_email text, authorized_reporter_phone text,
  reviewed_at timestamptz, decision_reason text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select claim.id, claim.community_sighting_id, report.report_slug, claim.claimant_user_id, claim.status,
    claim.claimed_pet_id, claim.claimant_name, claim.claimant_email, claim.claimant_phone,
    claim.private_details, claim.lost_at, claim.lost_city, claim.contact_consent,
    null::text, null::text, null::text, claim.reviewed_at, claim.decision_reason,
    claim.created_at, claim.updated_at
  from public.pet_alert_community_claims claim
  join public.pet_alert_community_sightings report on report.id = claim.community_sighting_id
  where report.reporter_user_id = auth.uid()
  order by case claim.status when 'pending' then 0 else 1 end, claim.created_at desc;
$$;

create or replace function public.review_pet_alert_community_claim(
  target_claim_id uuid,
  next_status text,
  next_decision_reason text default null
)
returns public.pet_alert_community_claims
language plpgsql security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_claim public.pet_alert_community_claims;
  selected_report public.pet_alert_community_sightings;
  reporter_profile public.profiles;
  updated_claim public.pet_alert_community_claims;
begin
  if next_status not in ('approved', 'rejected') then raise exception 'PET_ALERT_INVALID_CLAIM_STATUS'; end if;
  select * into selected_claim from public.pet_alert_community_claims where id = target_claim_id for update;
  select * into selected_report from public.pet_alert_community_sightings
    where id = selected_claim.community_sighting_id for update;
  if current_user_id is null or selected_report.reporter_user_id <> current_user_id then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if selected_claim.status <> 'pending' then raise exception 'PET_ALERT_CLAIM_NOT_PENDING'; end if;
  select * into reporter_profile from public.profiles where id = current_user_id;

  update public.pet_alert_community_claims set
    status = next_status, reviewed_by_user_id = current_user_id, reviewed_at = now(),
    decision_reason = nullif(trim(next_decision_reason), ''),
    authorized_reporter_name = case when next_status = 'approved' then coalesce(nullif(trim(concat_ws(' ', reporter_profile.first_name, reporter_profile.last_name)), ''), 'Reportante PET ALERT') end,
    authorized_reporter_email = case when next_status = 'approved' then reporter_profile.email end,
    authorized_reporter_phone = case when next_status = 'approved' then nullif(trim(reporter_profile.phone), '') end
  where id = target_claim_id returning * into updated_claim;

  update public.pet_alert_community_sightings
  set status = case when next_status = 'approved' then 'owner_verified'
    when exists (select 1 from public.pet_alert_community_claims c where c.community_sighting_id = selected_report.id and c.id <> target_claim_id and c.status = 'pending') then 'possible_owner_claim'
    else 'sighting_open' end
  where id = selected_report.id;
  insert into public.pet_alert_community_claim_history (claim_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_claim.id, 'pending', next_status, current_user_id, next_decision_reason);
  perform public.insert_audit_log('pet_alert_community_claim', updated_claim.id, 'pet_alert_claim_reviewed',
    jsonb_build_object('status', next_status), current_user_id);
  return updated_claim;
end;
$$;

create or replace function public.cancel_pet_alert_community_claim(target_claim_id uuid)
returns public.pet_alert_community_claims
language plpgsql security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid(); selected_claim public.pet_alert_community_claims;
  updated_claim public.pet_alert_community_claims;
begin
  select * into selected_claim from public.pet_alert_community_claims where id = target_claim_id for update;
  if current_user_id is null or selected_claim.claimant_user_id <> current_user_id then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if selected_claim.status <> 'pending' then raise exception 'PET_ALERT_CLAIM_NOT_PENDING'; end if;
  update public.pet_alert_community_claims set status = 'cancelled' where id = target_claim_id returning * into updated_claim;
  update public.pet_alert_community_sightings report
  set status = 'sighting_open'
  where report.id = selected_claim.community_sighting_id
    and report.status = 'possible_owner_claim'
    and not exists (
      select 1 from public.pet_alert_community_claims other_claim
      where other_claim.community_sighting_id = report.id
        and other_claim.id <> target_claim_id
        and other_claim.status = 'pending'
    );
  insert into public.pet_alert_community_claim_history (claim_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_claim.id, 'pending', 'cancelled', current_user_id, 'claim_cancelled');
  perform public.insert_audit_log('pet_alert_community_claim', updated_claim.id, 'pet_alert_claim_cancelled', '{}'::jsonb, current_user_id);
  return updated_claim;
end;
$$;

alter table public.pet_alert_community_claims enable row level security;
alter table public.pet_alert_community_claim_history enable row level security;

create policy pet_alert_community_claims_select_authorized on public.pet_alert_community_claims
for select to authenticated using (
  claimant_user_id = auth.uid() or public.is_platform_admin(auth.uid()) or exists (
    select 1 from public.pet_alert_community_sightings report
    where report.id = community_sighting_id and report.reporter_user_id = auth.uid()
  )
);
create policy pet_alert_community_claim_history_select_authorized on public.pet_alert_community_claim_history
for select to authenticated using (exists (
  select 1 from public.pet_alert_community_claims claim
  join public.pet_alert_community_sightings report on report.id = claim.community_sighting_id
  where claim.id = pet_alert_community_claim_history.claim_id and (
    claim.claimant_user_id = auth.uid() or report.reporter_user_id = auth.uid() or public.is_platform_admin(auth.uid())
  )
));

revoke all on public.pet_alert_community_claims, public.pet_alert_community_claim_history from anon, authenticated;
grant select on public.pet_alert_community_claims, public.pet_alert_community_claim_history to authenticated;
revoke all on function public.create_pet_alert_community_claim(text, uuid, text, timestamptz, text, boolean) from public;
revoke all on function public.list_my_pet_alert_community_claims() from public;
revoke all on function public.list_claims_for_my_pet_alert_community_sightings() from public;
revoke all on function public.review_pet_alert_community_claim(uuid, text, text) from public;
revoke all on function public.cancel_pet_alert_community_claim(uuid) from public;
grant execute on function public.create_pet_alert_community_claim(text, uuid, text, timestamptz, text, boolean) to authenticated;
grant execute on function public.list_my_pet_alert_community_claims() to authenticated;
grant execute on function public.list_claims_for_my_pet_alert_community_sightings() to authenticated;
grant execute on function public.review_pet_alert_community_claim(uuid, text, text) to authenticated;
grant execute on function public.cancel_pet_alert_community_claim(uuid) to authenticated;
