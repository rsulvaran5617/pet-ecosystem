create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text,
  reminder_type text not null default 'manual' check (reminder_type in ('manual', 'vaccine')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  due_at timestamptz not null,
  completed_at timestamptz,
  source_record_type text check (source_record_type is null or source_record_type in ('pet_vaccine')),
  source_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_record_type, source_record_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null unique references public.reminders (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete cascade,
  event_type text not null default 'reminder' check (event_type in ('reminder')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_household_id_idx on public.reminders (household_id);
create index if not exists reminders_pet_id_idx on public.reminders (pet_id);
create index if not exists reminders_due_at_idx on public.reminders (due_at);
create index if not exists reminders_status_idx on public.reminders (status);
create index if not exists reminders_type_idx on public.reminders (reminder_type);
create index if not exists calendar_events_household_id_idx on public.calendar_events (household_id);
create index if not exists calendar_events_pet_id_idx on public.calendar_events (pet_id);
create index if not exists calendar_events_starts_at_idx on public.calendar_events (starts_at);
create index if not exists calendar_events_status_idx on public.calendar_events (status);

create or replace function public.create_reminder(
  target_household_id uuid,
  target_pet_id uuid default null,
  next_title text default null,
  next_due_at timestamptz default null,
  next_notes text default null
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
    due_at
  )
  values (
    target_household_id,
    target_pet_id,
    current_user_id,
    normalized_title,
    normalized_notes,
    'manual',
    'pending',
    next_due_at
  )
  returning * into created_reminder;

  return created_reminder;
end;
$$;

create or replace function public.complete_reminder(
  target_reminder_id uuid
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
    raise exception 'Authenticated user required to complete reminders';
  end if;

  select *
  into target_reminder
  from public.reminders
  where id = target_reminder_id;

  if target_reminder.id is null then
    raise exception 'Reminder not found or not accessible';
  end if;

  if not public.can_edit_household(target_reminder.household_id, current_user_id) then
    raise exception 'Household edit permission required to complete reminders';
  end if;

  update public.reminders
  set status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = target_reminder_id
  returning * into target_reminder;

  return target_reminder;
end;
$$;

create or replace function public.snooze_reminder(
  target_reminder_id uuid,
  next_due_at timestamptz
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
      completed_at = null,
      updated_at = now()
  returning * into upserted_reminder;

  return upserted_reminder;
end;
$$;

create or replace function public.sync_calendar_event_from_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calendar_events (
    reminder_id,
    household_id,
    pet_id,
    event_type,
    title,
    starts_at,
    status
  )
  values (
    new.id,
    new.household_id,
    new.pet_id,
    'reminder',
    new.title,
    new.due_at,
    case when new.status = 'completed' then 'completed' else 'scheduled' end
  )
  on conflict (reminder_id) do update
  set household_id = excluded.household_id,
      pet_id = excluded.pet_id,
      title = excluded.title,
      starts_at = excluded.starts_at,
      status = excluded.status,
      updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_vaccine_reminder_from_pet_vaccine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_vaccine_reminder(new.id);
  return new;
end;
$$;

create or replace function public.delete_vaccine_reminder_from_pet_vaccine()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reminders
  where source_record_type = 'pet_vaccine'
    and source_record_id = old.id;

  return old;
end;
$$;

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

drop trigger if exists trg_reminders_calendar_sync on public.reminders;
create trigger trg_reminders_calendar_sync
after insert or update on public.reminders
for each row
execute function public.sync_calendar_event_from_reminder();

drop trigger if exists trg_pet_vaccines_sync_reminder on public.pet_vaccines;
create trigger trg_pet_vaccines_sync_reminder
after insert or update on public.pet_vaccines
for each row
execute function public.sync_vaccine_reminder_from_pet_vaccine();

drop trigger if exists trg_pet_vaccines_delete_reminder on public.pet_vaccines;
create trigger trg_pet_vaccines_delete_reminder
after delete on public.pet_vaccines
for each row
execute function public.delete_vaccine_reminder_from_pet_vaccine();

alter table public.reminders enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists reminders_select_visible on public.reminders;
create policy reminders_select_visible
on public.reminders
for select
to authenticated
using (
  public.can_view_household(household_id, auth.uid())
  and (pet_id is null or public.can_view_pet(pet_id, auth.uid()))
);

drop policy if exists calendar_events_select_visible on public.calendar_events;
create policy calendar_events_select_visible
on public.calendar_events
for select
to authenticated
using (
  public.can_view_household(household_id, auth.uid())
  and (pet_id is null or public.can_view_pet(pet_id, auth.uid()))
);

do $$
declare
  vaccine_record record;
begin
  for vaccine_record in
    select id
    from public.pet_vaccines
  loop
    perform public.upsert_vaccine_reminder(vaccine_record.id);
  end loop;
end;
$$;

grant execute on function public.create_reminder(uuid, uuid, text, timestamptz, text) to authenticated;
grant execute on function public.complete_reminder(uuid) to authenticated;
grant execute on function public.snooze_reminder(uuid, timestamptz) to authenticated;
grant execute on function public.upsert_vaccine_reminder(uuid) to authenticated;
