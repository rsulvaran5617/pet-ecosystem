-- Foster-3A hotfix: keep adoption listing creation audit-compatible
-- with the canonical insert_audit_log(entity, entity_id, action, context, actor) signature.

create or replace function public.create_pet_adoption_listing(target_pet_id uuid, target_household_id uuid)
returns public.pet_adoption_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pet public.pets%rowtype;
  protective_profile public.protective_household_profiles%rowtype;
  created_listing public.pet_adoption_listings%rowtype;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if not public.can_manage_household(target_household_id, current_user_id) then
    raise exception 'household management permission required';
  end if;

  if not public.is_approved_protective_household(target_household_id) then
    raise exception 'approved protective household required';
  end if;

  select * into selected_pet
  from public.pets
  where id = target_pet_id
    and household_id = target_household_id;

  if not found then
    raise exception 'pet not found in household';
  end if;

  if selected_pet.status = 'in_memory' then
    raise exception 'in-memory pets cannot be published for adoption';
  end if;

  select * into protective_profile
  from public.protective_household_profiles
  where household_id = target_household_id;

  insert into public.pet_adoption_listings (
    pet_id,
    household_id,
    title,
    city,
    state_region,
    country_code,
    created_by_user_id
  )
  values (
    target_pet_id,
    target_household_id,
    selected_pet.name || ' busca hogar',
    protective_profile.city,
    protective_profile.state_region,
    protective_profile.country_code,
    current_user_id
  )
  returning * into created_listing;

  perform public.insert_audit_log(
    'pet_adoption_listing',
    created_listing.id,
    'created',
    jsonb_build_object('pet_id', target_pet_id, 'household_id', target_household_id),
    current_user_id
  );

  return created_listing;
end;
$$;

grant execute on function public.create_pet_adoption_listing(uuid, uuid) to authenticated;
