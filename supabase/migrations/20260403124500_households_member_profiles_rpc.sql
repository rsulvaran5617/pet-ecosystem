create or replace function public.get_household_member_profiles(target_household_id uuid)
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to load household member profiles';
  end if;

  if not public.can_view_household(target_household_id, auth.uid()) then
    raise exception 'Household membership required to load member profiles';
  end if;

  return query
  select
    profile.id,
    profile.email,
    profile.first_name,
    profile.last_name
  from public.profiles as profile
  inner join public.household_members as membership
    on membership.user_id = profile.id
  where membership.household_id = target_household_id
  order by membership.created_at asc;
end;
$$;

grant execute on function public.get_household_member_profiles(uuid) to authenticated;
