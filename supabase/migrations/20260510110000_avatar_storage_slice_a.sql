alter table public.pet_profiles
  add column if not exists avatar_storage_bucket text,
  add column if not exists avatar_storage_path text unique;

alter table public.pet_profiles
  add constraint pet_profiles_avatar_bucket_check
  check (avatar_storage_bucket is null or avatar_storage_bucket = 'pet-avatars');

alter table public.provider_public_profiles
  add column if not exists avatar_storage_bucket text,
  add column if not exists avatar_storage_path text unique;

alter table public.provider_public_profiles
  add constraint provider_public_profiles_avatar_bucket_check
  check (avatar_storage_bucket is null or avatar_storage_bucket = 'provider-avatars');

create index if not exists pet_profiles_avatar_storage_idx
on public.pet_profiles (avatar_storage_bucket, avatar_storage_path);

create index if not exists provider_public_profiles_avatar_storage_idx
on public.provider_public_profiles (avatar_storage_bucket, avatar_storage_path);

create or replace function public.set_pet_avatar(
  target_pet_id uuid,
  next_avatar_storage_bucket text,
  next_avatar_storage_path text
)
returns public.pet_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.pet_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to update pet avatar';
  end if;

  if not public.can_edit_pet(target_pet_id, auth.uid()) then
    raise exception 'You do not have permission to update this pet avatar';
  end if;

  if next_avatar_storage_bucket <> 'pet-avatars' then
    raise exception 'Invalid pet avatar bucket';
  end if;

  if public.extract_pet_id_from_storage_path(next_avatar_storage_path) <> target_pet_id then
    raise exception 'Invalid pet avatar storage path';
  end if;

  update public.pet_profiles
  set avatar_storage_bucket = next_avatar_storage_bucket,
      avatar_storage_path = next_avatar_storage_path,
      updated_at = now()
  where pet_id = target_pet_id
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'Pet profile not found';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.set_provider_public_profile_avatar(
  target_organization_id uuid,
  next_avatar_storage_bucket text,
  next_avatar_storage_path text
)
returns public.provider_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.provider_public_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to update provider avatar';
  end if;

  if not public.can_manage_provider_organization(target_organization_id, auth.uid()) then
    raise exception 'You do not have permission to update this provider avatar';
  end if;

  if next_avatar_storage_bucket <> 'provider-avatars' then
    raise exception 'Invalid provider avatar bucket';
  end if;

  if public.extract_provider_organization_id_from_storage_path(next_avatar_storage_path) <> target_organization_id then
    raise exception 'Invalid provider avatar storage path';
  end if;

  update public.provider_public_profiles
  set avatar_storage_bucket = next_avatar_storage_bucket,
      avatar_storage_path = next_avatar_storage_path,
      avatar_url = null,
      updated_at = now()
  where organization_id = target_organization_id
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'Provider public profile not found';
  end if;

  return updated_profile;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-avatars', 'pet-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-avatars', 'provider-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pet_avatars_objects_select on storage.objects;
create policy pet_avatars_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pet-avatars'
  and public.can_view_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_avatars_objects_insert on storage.objects;
create policy pet_avatars_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-avatars'
  and public.can_edit_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

drop policy if exists pet_avatars_objects_delete on storage.objects;
create policy pet_avatars_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-avatars'
  and public.can_edit_pet(public.extract_pet_id_from_storage_path(name), auth.uid())
);

drop policy if exists provider_avatars_objects_select_public on storage.objects;
create policy provider_avatars_objects_select_public
on storage.objects
for select
to public
using (
  bucket_id = 'provider-avatars'
  and (
    public.is_provider_organization_visible(public.extract_provider_organization_id_from_storage_path(name))
    or public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
  )
);

drop policy if exists provider_avatars_objects_insert on storage.objects;
create policy provider_avatars_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-avatars'
  and public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
);

drop policy if exists provider_avatars_objects_delete on storage.objects;
create policy provider_avatars_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-avatars'
  and public.can_manage_provider_organization(public.extract_provider_organization_id_from_storage_path(name), auth.uid())
);

grant execute on function public.set_pet_avatar(uuid, text, text) to authenticated;
grant execute on function public.set_provider_public_profile_avatar(uuid, text, text) to authenticated;
grant execute on function public.extract_provider_organization_id_from_storage_path(text) to anon, authenticated;
