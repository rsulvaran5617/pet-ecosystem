create table public.pet_alert_moderation_cases (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('lost_pet_alert', 'community_sighting', 'community_claim')),
  target_id uuid not null,
  reported_by_user_id uuid not null references auth.users (id) on delete restrict,
  reason_code text not null check (reason_code in ('sensitive_content', 'false_information', 'fraud', 'harassment', 'animal_safety', 'other')),
  report_details text check (report_details is null or char_length(trim(report_details)) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  target_previous_status text not null,
  resolution_action text check (resolution_action is null or resolution_action in ('flag', 'restore', 'close', 'reject_claim', 'dismiss')),
  resolution_reason text check (resolution_reason is null or char_length(trim(resolution_reason)) between 5 and 1000),
  reviewed_by_user_id uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'open') = (reviewed_at is null))
);

create unique index pet_alert_moderation_cases_open_reporter_target_idx
  on public.pet_alert_moderation_cases (target_type, target_id, reported_by_user_id)
  where status = 'open';
create index pet_alert_moderation_cases_queue_idx
  on public.pet_alert_moderation_cases (status, created_at desc);

create table public.pet_alert_moderation_history (
  id uuid primary key default gen_random_uuid(),
  moderation_case_id uuid not null references public.pet_alert_moderation_cases (id) on delete restrict,
  old_status text,
  new_status text not null,
  action text not null,
  reason text,
  changed_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index pet_alert_moderation_history_case_idx
  on public.pet_alert_moderation_history (moderation_case_id, created_at desc);

create trigger trg_pet_alert_moderation_cases_updated_at
before update on public.pet_alert_moderation_cases
for each row execute function public.set_updated_at();

create or replace function public.report_pet_alert_content(
  next_target_type text,
  next_target_id uuid,
  next_reason_code text,
  next_report_details text default null
)
returns public.pet_alert_moderation_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_target_status text;
  created_case public.pet_alert_moderation_cases;
begin
  if current_user_id is null then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if next_target_type not in ('lost_pet_alert', 'community_sighting', 'community_claim') then
    raise exception 'PET_ALERT_INVALID_MODERATION_TARGET';
  end if;
  if next_reason_code not in ('sensitive_content', 'false_information', 'fraud', 'harassment', 'animal_safety', 'other') then
    raise exception 'PET_ALERT_INVALID_MODERATION_REASON';
  end if;
  if next_report_details is not null and char_length(trim(next_report_details)) not between 10 and 1000 then
    raise exception 'PET_ALERT_INVALID_MODERATION_DETAILS';
  end if;

  if next_target_type = 'lost_pet_alert' then
    select status into current_target_status from public.pet_alert_lost_pets where id = next_target_id;
  elsif next_target_type = 'community_sighting' then
    select status into current_target_status from public.pet_alert_community_sightings where id = next_target_id;
  else
    select status into current_target_status from public.pet_alert_community_claims where id = next_target_id;
  end if;

  if current_target_status is null then raise exception 'PET_ALERT_NOT_FOUND'; end if;

  insert into public.pet_alert_moderation_cases (
    target_type, target_id, reported_by_user_id, reason_code, report_details, target_previous_status
  ) values (
    next_target_type, next_target_id, current_user_id, next_reason_code, nullif(trim(next_report_details), ''), current_target_status
  ) returning * into created_case;

  insert into public.pet_alert_moderation_history (
    moderation_case_id, new_status, action, reason, changed_by_user_id
  ) values (created_case.id, 'open', 'reported', next_report_details, current_user_id);

  perform public.insert_audit_log(
    'pet_alert_moderation_case', created_case.id, 'pet_alert_content_reported',
    jsonb_build_object('target_type', next_target_type, 'target_id', next_target_id, 'reason_code', next_reason_code),
    current_user_id
  );
  return created_case;
exception
  when unique_violation then raise exception 'PET_ALERT_MODERATION_ALREADY_OPEN';
end;
$$;

create or replace function public.list_pet_alert_moderation_queue(filter_status text default 'open')
returns table (
  case_id uuid, target_type text, target_id uuid, target_status text, target_title text,
  target_summary text, reason_code text, report_details text, case_status text,
  resolution_action text, resolution_reason text, reported_at timestamptz, reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if filter_status not in ('all', 'open', 'resolved', 'dismissed') then raise exception 'PET_ALERT_INVALID_MODERATION_STATUS'; end if;

  return query
  select moderation.id, moderation.target_type, moderation.target_id,
    coalesce(lost.status, community.status, claim.status),
    case moderation.target_type
      when 'lost_pet_alert' then lost.pet_name
      when 'community_sighting' then concat(community.animal_species, ' vista en ', community.city)
      else concat('Solicitud de ', claim.claimant_name)
    end,
    case moderation.target_type
      when 'lost_pet_alert' then lost.public_description
      when 'community_sighting' then community.observed_situation
      else claim.private_details
    end,
    moderation.reason_code, moderation.report_details, moderation.status,
    moderation.resolution_action, moderation.resolution_reason, moderation.created_at, moderation.reviewed_at
  from public.pet_alert_moderation_cases moderation
  left join public.pet_alert_lost_pets lost
    on moderation.target_type = 'lost_pet_alert' and lost.id = moderation.target_id
  left join public.pet_alert_community_sightings community
    on moderation.target_type = 'community_sighting' and community.id = moderation.target_id
  left join public.pet_alert_community_claims claim
    on moderation.target_type = 'community_claim' and claim.id = moderation.target_id
  where filter_status = 'all' or moderation.status = filter_status
  order by case when moderation.status = 'open' then 0 else 1 end, moderation.created_at desc;
end;
$$;

create or replace function public.moderate_pet_alert_content(
  target_case_id uuid,
  next_action text,
  next_resolution_reason text
)
returns public.pet_alert_moderation_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_case public.pet_alert_moderation_cases;
  updated_case public.pet_alert_moderation_cases;
  restored_status text;
begin
  if not public.is_platform_admin(current_user_id) then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if next_action not in ('flag', 'restore', 'close', 'reject_claim', 'dismiss') then raise exception 'PET_ALERT_INVALID_MODERATION_ACTION'; end if;
  if next_resolution_reason is null or char_length(trim(next_resolution_reason)) not between 5 and 1000 then
    raise exception 'PET_ALERT_MODERATION_REASON_REQUIRED';
  end if;

  select * into selected_case from public.pet_alert_moderation_cases where id = target_case_id for update;
  if selected_case.id is null then raise exception 'PET_ALERT_NOT_FOUND'; end if;
  if selected_case.status <> 'open' then raise exception 'PET_ALERT_MODERATION_ALREADY_REVIEWED'; end if;

  restored_status := selected_case.target_previous_status;

  if next_action = 'flag' then
    if selected_case.target_type = 'lost_pet_alert' then
      update public.pet_alert_lost_pets set status = 'flagged' where id = selected_case.target_id;
    elsif selected_case.target_type = 'community_sighting' then
      update public.pet_alert_community_sightings set status = 'flagged' where id = selected_case.target_id;
    else
      raise exception 'PET_ALERT_INVALID_MODERATION_ACTION';
    end if;
  elsif next_action = 'restore' then
    if selected_case.target_type = 'lost_pet_alert' then
      update public.pet_alert_lost_pets set status = restored_status where id = selected_case.target_id and status = 'flagged';
    elsif selected_case.target_type = 'community_sighting' then
      update public.pet_alert_community_sightings set status = restored_status where id = selected_case.target_id and status = 'flagged';
    else
      raise exception 'PET_ALERT_INVALID_MODERATION_ACTION';
    end if;
  elsif next_action = 'close' then
    if selected_case.target_type = 'lost_pet_alert' then
      update public.pet_alert_lost_pets set status = 'closed', closed_at = now(), close_reason = 'closed_not_found' where id = selected_case.target_id;
    elsif selected_case.target_type = 'community_sighting' then
      update public.pet_alert_community_sightings set status = 'closed', closed_at = now(), close_reason = 'closed_other' where id = selected_case.target_id;
    else
      raise exception 'PET_ALERT_INVALID_MODERATION_ACTION';
    end if;
  elsif next_action = 'reject_claim' then
    if selected_case.target_type <> 'community_claim' then raise exception 'PET_ALERT_INVALID_MODERATION_ACTION'; end if;
    update public.pet_alert_community_claims set status = 'rejected', reviewed_by_user_id = current_user_id,
      reviewed_at = now(), decision_reason = trim(next_resolution_reason)
    where id = selected_case.target_id and status = 'pending';
  end if;

  update public.pet_alert_moderation_cases set
    status = case when next_action = 'dismiss' then 'dismissed' else 'resolved' end,
    resolution_action = next_action,
    resolution_reason = trim(next_resolution_reason),
    reviewed_by_user_id = current_user_id,
    reviewed_at = now()
  where id = selected_case.id returning * into updated_case;

  insert into public.pet_alert_moderation_history (
    moderation_case_id, old_status, new_status, action, reason, changed_by_user_id
  ) values (selected_case.id, 'open', updated_case.status, next_action, trim(next_resolution_reason), current_user_id);

  perform public.insert_audit_log(
    'pet_alert_moderation_case', updated_case.id, 'pet_alert_content_moderated',
    jsonb_build_object('target_type', updated_case.target_type, 'target_id', updated_case.target_id, 'action', next_action),
    current_user_id
  );
  return updated_case;
end;
$$;

create or replace function public.list_pet_alert_moderation_history(target_case_id uuid)
returns setof public.pet_alert_moderation_history
language sql
security definer
set search_path = public
as $$
  select history.* from public.pet_alert_moderation_history history
  where public.is_platform_admin(auth.uid()) and history.moderation_case_id = target_case_id
  order by history.created_at asc;
$$;

alter table public.pet_alert_moderation_cases enable row level security;
alter table public.pet_alert_moderation_history enable row level security;

create policy pet_alert_moderation_cases_select_admin on public.pet_alert_moderation_cases
for select to authenticated using (public.is_platform_admin(auth.uid()));
create policy pet_alert_moderation_cases_select_reporter on public.pet_alert_moderation_cases
for select to authenticated using (reported_by_user_id = auth.uid());
create policy pet_alert_moderation_history_select_admin on public.pet_alert_moderation_history
for select to authenticated using (public.is_platform_admin(auth.uid()));

revoke all on public.pet_alert_moderation_cases, public.pet_alert_moderation_history from anon, authenticated;
grant select on public.pet_alert_moderation_cases to authenticated;
grant select on public.pet_alert_moderation_history to authenticated;
revoke all on function public.report_pet_alert_content(text, uuid, text, text) from public;
revoke all on function public.list_pet_alert_moderation_queue(text) from public;
revoke all on function public.moderate_pet_alert_content(uuid, text, text) from public;
revoke all on function public.list_pet_alert_moderation_history(uuid) from public;
grant execute on function public.report_pet_alert_content(text, uuid, text, text) to authenticated;
grant execute on function public.list_pet_alert_moderation_queue(text) to authenticated;
grant execute on function public.moderate_pet_alert_content(uuid, text, text) to authenticated;
grant execute on function public.list_pet_alert_moderation_history(uuid) to authenticated;
