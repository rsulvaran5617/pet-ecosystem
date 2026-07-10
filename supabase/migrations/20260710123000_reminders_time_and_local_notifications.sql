alter table public.reminders
  add column if not exists remind_time_enabled boolean not null default false;

drop function if exists public.create_reminder(uuid, uuid, text, timestamptz, text);
drop function if exists public.snooze_reminder(uuid, timestamptz);

create or replace function public.create_reminder(
  target_household_id uuid,
  target_pet_id uuid default null,
  next_title text default null,
  next_due_at timestamptz default null,
  next_notes text default null,
  next_remind_time_enabled boolean default false
)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(next_title), '');
  normalized_notes text := nullif(trim(next_notes), '');
  target_pet public.pets;
  created_reminder public.reminders;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to create reminders';
  end if;

  if not public.can_edit_household(target_household_id, current_user_id) then
    raise exception 'Household edit permission required to create reminders';
  end if;

  if normalized_title is null then
    raise exception 'Reminder title is required';
  end if;

  if next_due_at is null then
    raise exception 'Reminder due date is required';
  end if;

  if target_pet_id is not null then
    select *
    into target_pet
    from public.pets
    where id = target_pet_id;

    if target_pet.id is null then
      raise exception 'Pet not found or not accessible';
    end if;

    if target_pet.household_id <> target_household_id then
      raise exception 'Reminder pet must belong to the selected household';
    end if;
  end if;

  insert into public.reminders (
    household_id,
    pet_id,
    created_by_user_id,
    title,
    notes,
    reminder_type,
    status,
    due_at,
    remind_time_enabled
  )
  values (
    target_household_id,
    target_pet_id,
    current_user_id,
    normalized_title,
    normalized_notes,
    'manual',
    'pending',
    next_due_at,
    coalesce(next_remind_time_enabled, false)
  )
  returning * into created_reminder;

  return created_reminder;
end;
$$;

create or replace function public.snooze_reminder(
  target_reminder_id uuid,
  next_due_at timestamptz,
  next_remind_time_enabled boolean default false
)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_reminder public.reminders;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to snooze reminders';
  end if;

  if next_due_at is null then
    raise exception 'New due date is required to snooze reminders';
  end if;

  select *
  into target_reminder
  from public.reminders
  where id = target_reminder_id;

  if target_reminder.id is null then
    raise exception 'Reminder not found or not accessible';
  end if;

  if not public.can_edit_household(target_reminder.household_id, current_user_id) then
    raise exception 'Household edit permission required to snooze reminders';
  end if;

  update public.reminders
  set due_at = next_due_at,
      remind_time_enabled = coalesce(next_remind_time_enabled, false),
      status = 'pending',
      completed_at = null,
      updated_at = now()
  where id = target_reminder_id
  returning * into target_reminder;

  return target_reminder;
end;
$$;

create or replace function public.upsert_vaccine_reminder(
  target_vaccine_id uuid
)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  vaccine_row public.pet_vaccines;
  pet_row public.pets;
  upserted_reminder public.reminders;
begin
  select *
  into vaccine_row
  from public.pet_vaccines
  where id = target_vaccine_id;

  if vaccine_row.id is null then
    delete from public.reminders
    where source_record_type = 'pet_vaccine'
      and source_record_id = target_vaccine_id;

    return null;
  end if;

  select *
  into pet_row
  from public.pets
  where id = vaccine_row.pet_id;

  if pet_row.id is null or vaccine_row.next_due_on is null then
    delete from public.reminders
    where source_record_type = 'pet_vaccine'
      and source_record_id = target_vaccine_id;

    return null;
  end if;

  insert into public.reminders (
    household_id,
    pet_id,
    created_by_user_id,
    title,
    notes,
    reminder_type,
    status,
    due_at,
    remind_time_enabled,
    completed_at,
    source_record_type,
    source_record_id
  )
  values (
    pet_row.household_id,
    pet_row.id,
    vaccine_row.created_by_user_id,
    concat('Vaccine due: ', vaccine_row.name),
    'Automatic reminder generated from the vaccine due date.',
    'vaccine',
    'pending',
    vaccine_row.next_due_on::timestamptz,
    false,
    null,
    'pet_vaccine',
    target_vaccine_id
  )
  on conflict (source_record_type, source_record_id) do update
  set household_id = excluded.household_id,
      pet_id = excluded.pet_id,
      created_by_user_id = excluded.created_by_user_id,
      title = excluded.title,
      notes = excluded.notes,
      reminder_type = excluded.reminder_type,
      status = 'pending',
      due_at = excluded.due_at,
      remind_time_enabled = false,
      completed_at = null,
      updated_at = now()
  returning * into upserted_reminder;

  return upserted_reminder;
end;
$$;

grant execute on function public.create_reminder(uuid, uuid, text, timestamptz, text, boolean) to authenticated;
grant execute on function public.snooze_reminder(uuid, timestamptz, boolean) to authenticated;
