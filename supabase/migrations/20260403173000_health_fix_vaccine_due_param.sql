create or replace function public.create_pet_vaccine(
  target_pet_id uuid,
  next_name text,
  next_administered_on date,
  next_due_on date default null,
  next_notes text default null
)
returns public.pet_vaccines
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_notes text := nullif(trim(next_notes), '');
  resolved_next_due_on date := next_due_on;
  created_vaccine public.pet_vaccines;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to register vaccines';
  end if;

  if not public.can_edit_pet(target_pet_id, current_user_id) then
    raise exception 'Pet edit permission required to register vaccines';
  end if;

  if normalized_name is null then
    raise exception 'Vaccine name is required';
  end if;

  if next_administered_on is null then
    raise exception 'Administration date is required';
  end if;

  insert into public.pet_vaccines (
    pet_id,
    created_by_user_id,
    name,
    administered_on,
    next_due_on,
    notes
  )
  values (
    target_pet_id,
    current_user_id,
    normalized_name,
    next_administered_on,
    resolved_next_due_on,
    normalized_notes
  )
  returning * into created_vaccine;

  return created_vaccine;
end;
$$;

create or replace function public.update_pet_vaccine(
  target_vaccine_id uuid,
  next_name text,
  next_administered_on date,
  next_due_on date default null,
  next_notes text default null
)
returns public.pet_vaccines
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(next_name), '');
  normalized_notes text := nullif(trim(next_notes), '');
  resolved_next_due_on date := next_due_on;
  target_vaccine public.pet_vaccines;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to edit vaccines';
  end if;

  select *
  into target_vaccine
  from public.pet_vaccines
  where id = target_vaccine_id;

  if target_vaccine.id is null then
    raise exception 'Vaccine not found or not accessible';
  end if;

  if not public.can_edit_pet(target_vaccine.pet_id, current_user_id) then
    raise exception 'Pet edit permission required to edit vaccines';
  end if;

  if normalized_name is null then
    raise exception 'Vaccine name is required';
  end if;

  if next_administered_on is null then
    raise exception 'Administration date is required';
  end if;

  update public.pet_vaccines
  set name = normalized_name,
      administered_on = next_administered_on,
      next_due_on = resolved_next_due_on,
      notes = normalized_notes,
      updated_at = now()
  where id = target_vaccine_id
  returning * into target_vaccine;

  return target_vaccine;
end;
$$;

grant execute on function public.create_pet_vaccine(uuid, text, date, date, text) to authenticated;
grant execute on function public.update_pet_vaccine(uuid, text, date, date, text) to authenticated;
