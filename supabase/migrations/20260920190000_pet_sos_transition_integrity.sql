-- SOS Foundation-1C integrity slice. No existing reports or history are rewritten.
alter table public.pet_alert_moderation_cases
  add column target_status_at_action text;
comment on column public.pet_alert_moderation_cases.target_status_at_action is
  'Locked resource status at moderation action. NULL for legacy actions; never infer a restore state.';

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
  if next_status is null or next_status not in ('approved', 'rejected') then raise exception 'PET_ALERT_INVALID_CLAIM_STATUS'; end if;
  select * into selected_claim from public.pet_alert_community_claims where id = target_claim_id for update;
  select * into selected_report from public.pet_alert_community_sightings
    where id = selected_claim.community_sighting_id for update;
  if current_user_id is null or selected_claim.id is null or selected_report.id is null or selected_report.reporter_user_id is distinct from current_user_id then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if selected_claim.status <> 'pending' then raise exception 'PET_ALERT_CLAIM_NOT_PENDING'; end if;
  -- Serialize report decisions and reject stale approvals without reopening terminal reports.
  if next_status = 'approved' and (
    selected_report.status not in ('sighting_open', 'sheltered_by_reporter', 'possible_owner_claim')
    or selected_report.expires_at <= now()
    or not selected_report.share_enabled
  ) then raise exception 'PET_ALERT_REPORT_NOT_AVAILABLE'; end if;

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
  where id = selected_report.id
    and (next_status = 'approved' or selected_report.status = 'possible_owner_claim')
    and not exists (
      select 1 from public.pet_alert_community_claims c
      where c.community_sighting_id = selected_report.id
        and c.id <> target_claim_id and c.status = 'approved'
    );
  insert into public.pet_alert_community_claim_history (claim_id, old_status, new_status, changed_by_user_id, reason)
  values (updated_claim.id, 'pending', next_status, current_user_id, next_decision_reason);
  perform public.insert_audit_log('pet_alert_community_claim', updated_claim.id, 'pet_alert_claim_reviewed',
    jsonb_build_object('status', next_status), current_user_id);
  return updated_claim;
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
  current_target_status text;
  latest_flag public.pet_alert_moderation_cases;
begin
  if public.is_platform_admin(current_user_id) is not true then raise exception 'PET_ALERT_UNAUTHORIZED'; end if;
  if next_action is null or next_action not in ('flag', 'restore', 'close', 'reject_claim', 'dismiss') then raise exception 'PET_ALERT_INVALID_MODERATION_ACTION'; end if;
  if next_resolution_reason is null or char_length(trim(next_resolution_reason)) not between 5 and 1000 then
    raise exception 'PET_ALERT_MODERATION_REASON_REQUIRED';
  end if;

  select * into selected_case from public.pet_alert_moderation_cases where id = target_case_id for update;
  if selected_case.id is null then raise exception 'PET_ALERT_NOT_FOUND'; end if;
  if selected_case.status <> 'open' then raise exception 'PET_ALERT_MODERATION_ALREADY_REVIEWED'; end if;

  -- Lock the resource before checking or recording the effective state.
  if selected_case.target_type = 'lost_pet_alert' then
    select status into current_target_status from public.pet_alert_lost_pets
      where id = selected_case.target_id for update;
  elsif selected_case.target_type = 'community_sighting' then
    select status into current_target_status from public.pet_alert_community_sightings
      where id = selected_case.target_id for update;
  else
    select status into current_target_status from public.pet_alert_community_claims
      where id = selected_case.target_id for update;
  end if;
  if current_target_status is null then raise exception 'PET_ALERT_NOT_FOUND'; end if;

  if current_target_status = 'flagged' then
    select * into latest_flag from public.pet_alert_moderation_cases
    where target_type = selected_case.target_type and target_id = selected_case.target_id
      and status = 'resolved' and resolution_action = 'flag'
    order by reviewed_at desc, id desc limit 1;
  end if;

  if next_action = 'flag' and current_target_status = 'flagged' then
    raise exception 'PET_ALERT_MODERATION_STALE_STATE';
  end if;
  if next_action = 'restore' then
    if current_target_status <> 'flagged' or latest_flag.id is null
      or latest_flag.target_status_at_action is null
      or latest_flag.target_status_at_action = 'flagged'
      or selected_case.created_at < latest_flag.reviewed_at then
      raise exception 'PET_ALERT_MODERATION_STALE_STATE';
    end if;
    restored_status := latest_flag.target_status_at_action;
  end if;
  if next_action = 'close' and (
    current_target_status in ('found', 'reunited', 'closed', 'expired', 'withdrawn', 'rejected')
    or (current_target_status = 'flagged' and (
      latest_flag.target_status_at_action is null
      or latest_flag.target_status_at_action in ('found', 'reunited', 'closed', 'expired', 'withdrawn', 'rejected')
    ))
  ) then raise exception 'PET_ALERT_MODERATION_STALE_STATE'; end if;
  if next_action = 'reject_claim' and current_target_status <> 'pending' then
    raise exception 'PET_ALERT_CLAIM_NOT_PENDING';
  end if;

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
    target_status_at_action = current_target_status,
    status = case when next_action = 'dismiss' then 'dismissed' else 'resolved' end,
    resolution_action = next_action,
    resolution_reason = trim(next_resolution_reason),
    reviewed_by_user_id = current_user_id,
    reviewed_at = clock_timestamp()
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

revoke all on function public.review_pet_alert_community_claim(uuid, text, text) from public, anon;
revoke all on function public.moderate_pet_alert_content(uuid, text, text) from public, anon;
grant execute on function public.review_pet_alert_community_claim(uuid, text, text) to authenticated;
grant execute on function public.moderate_pet_alert_content(uuid, text, text) to authenticated;
