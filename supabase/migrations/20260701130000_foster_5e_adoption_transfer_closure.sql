alter table public.pet_adoption_listings
  drop constraint if exists pet_adoption_listings_status_check;

alter table public.pet_adoption_listings
  add constraint pet_adoption_listings_status_check
  check (status in ('draft', 'pending_review', 'published', 'paused', 'closed', 'rejected', 'adopted'));

alter table public.pet_transfer_records
  add column if not exists adoption_application_id uuid references public.pet_adoption_applications(id) on delete set null;

create unique index if not exists pet_transfer_records_adoption_application_key
  on public.pet_transfer_records(adoption_application_id)
  where adoption_application_id is not null;

create index if not exists pet_transfer_records_adoption_application_status_idx
  on public.pet_transfer_records(adoption_application_id, status)
  where adoption_application_id is not null;

create or replace function public.start_pet_adoption_transfer(target_application_id uuid)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_application public.pet_adoption_applications%rowtype;
  target_listing public.pet_adoption_listings%rowtype;
  target_pet public.pets%rowtype;
  existing_transfer public.pet_transfer_records%rowtype;
  created_transfer public.pet_transfer_records%rowtype;
  snapshot jsonb;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select *
  into target_application
  from public.pet_adoption_applications
  where id = target_application_id
  for update;

  if target_application.id is null then
    raise exception 'Solicitud de adopcion no encontrada.';
  end if;

  if not public.can_manage_household(target_application.protective_household_id, current_user_id) then
    raise exception 'Solo la familia protectora puede iniciar la transferencia de adopcion.';
  end if;

  if target_application.status <> 'approved' then
    raise exception 'Solo una solicitud aprobada puede iniciar transferencia.';
  end if;

  select *
  into target_listing
  from public.pet_adoption_listings
  where id = target_application.listing_id
  for update;

  if target_listing.id is null then
    raise exception 'Publicacion de adopcion no encontrada.';
  end if;

  if target_listing.status = 'adopted' then
    raise exception 'Esta publicacion ya fue marcada como adoptada.';
  end if;

  if target_listing.status <> 'published' then
    raise exception 'La publicacion debe estar publicada para iniciar transferencia.';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_application.pet_id
  for update;

  if target_pet.id is null then
    raise exception 'Mascota no encontrada.';
  end if;

  if target_pet.household_id <> target_application.protective_household_id then
    raise exception 'La mascota ya no pertenece a la familia protectora.';
  end if;

  if target_pet.status = 'in_memory' then
    raise exception 'Una mascota En memoria no puede transferirse.';
  end if;

  select *
  into existing_transfer
  from public.pet_transfer_records
  where adoption_application_id = target_application.id
  order by created_at desc
  limit 1;

  if existing_transfer.id is not null then
    if existing_transfer.status in ('pending', 'accepted') then
      return existing_transfer;
    end if;

    raise exception 'Esta solicitud ya tiene una transferencia cerrada o cancelada.';
  end if;

  if exists (
    select 1
    from public.pet_transfer_records
    where pet_id = target_pet.id
      and status = 'pending'
  ) then
    raise exception 'Esta mascota ya tiene una transferencia pendiente.';
  end if;

  insert into public.pet_custody_contexts (
    pet_id,
    household_id,
    custody_type,
    status,
    started_at,
    created_by_user_id
  )
  select
    target_pet.id,
    target_pet.household_id,
    case when public.is_approved_protective_household(target_pet.household_id) then 'foster' else 'owner' end,
    'active',
    target_pet.created_at,
    target_pet.created_by_user_id
  where not exists (
    select 1
    from public.pet_custody_contexts
    where pet_id = target_pet.id
      and status = 'active'
  );

  snapshot := jsonb_build_object(
    'source', 'adoption_application',
    'adoption_application_id', target_application.id,
    'listing_id', target_application.listing_id,
    'pet_name', target_pet.name,
    'pet_species', target_pet.species,
    'document_count', (select count(*) from public.pet_documents where pet_id = target_pet.id),
    'vaccine_count', (select count(*) from public.pet_vaccines where pet_id = target_pet.id),
    'allergy_count', (select count(*) from public.pet_allergies where pet_id = target_pet.id),
    'condition_count', (select count(*) from public.pet_conditions where pet_id = target_pet.id),
    'shared_policy', 'pet_profile_health_and_authorized_documents',
    'excluded_data', jsonb_build_array('bookings', 'chats', 'payments', 'support', 'future_reminders')
  );

  insert into public.pet_transfer_records (
    pet_id,
    from_household_id,
    recipient_email,
    recipient_user_id,
    initiated_by_user_id,
    consent_snapshot,
    transfer_notes,
    adoption_application_id
  )
  values (
    target_pet.id,
    target_application.protective_household_id,
    lower(trim(target_application.applicant_email)),
    target_application.applicant_user_id,
    current_user_id,
    snapshot,
    'Transferencia iniciada desde solicitud de adopcion aprobada.',
    target_application.id
  )
  returning * into created_transfer;

  perform public.insert_audit_log(
    'pet_adoption_application',
    target_application.id,
    'pet_adoption_transfer_started',
    jsonb_build_object(
      'transfer_id', created_transfer.id,
      'listing_id', target_application.listing_id,
      'pet_id', target_application.pet_id
    ),
    current_user_id
  );

  return created_transfer;
end;
$$;

create or replace function public.accept_pet_transfer(
  target_transfer_id uuid,
  target_to_household_id uuid
)
returns public.pet_transfer_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  target_transfer public.pet_transfer_records;
  target_pet public.pets;
  linked_application public.pet_adoption_applications%rowtype;
  accepted_transfer public.pet_transfer_records;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select lower(email)
  into current_email
  from public.profiles
  where id = current_user_id;

  if not public.can_manage_household(target_to_household_id, current_user_id) then
    raise exception 'Solo un administrador del hogar receptor puede aceptar la transferencia.';
  end if;

  select *
  into target_transfer
  from public.pet_transfer_records
  where id = target_transfer_id
  for update;

  if target_transfer.id is null then
    raise exception 'Invitacion de transferencia no encontrada.';
  end if;

  if target_transfer.status <> 'pending' then
    raise exception 'Esta invitacion ya no esta pendiente.';
  end if;

  if target_transfer.expires_at <= now() then
    update public.pet_transfer_records
    set status = 'expired',
        expired_at = now()
    where id = target_transfer.id;

    raise exception 'Esta invitacion de transferencia expiro.';
  end if;

  if target_transfer.recipient_user_id is not null and target_transfer.recipient_user_id <> current_user_id then
    raise exception 'Esta invitacion fue dirigida a otro usuario.';
  end if;

  if target_transfer.recipient_user_id is null and current_email <> target_transfer.recipient_email then
    raise exception 'Esta invitacion fue dirigida a otro correo.';
  end if;

  select *
  into target_pet
  from public.pets
  where id = target_transfer.pet_id
  for update;

  if target_pet.id is null then
    raise exception 'Mascota no encontrada.';
  end if;

  if target_pet.household_id <> target_transfer.from_household_id then
    raise exception 'La mascota ya no pertenece al hogar emisor.';
  end if;

  if target_pet.status = 'in_memory' then
    raise exception 'Una mascota En memoria no puede transferirse.';
  end if;

  if target_transfer.adoption_application_id is not null then
    select *
    into linked_application
    from public.pet_adoption_applications
    where id = target_transfer.adoption_application_id
    for update;

    if linked_application.id is null then
      raise exception 'Solicitud de adopcion vinculada no encontrada.';
    end if;

    if linked_application.status <> 'approved' then
      raise exception 'La solicitud de adopcion vinculada ya no esta aprobada.';
    end if;
  end if;

  update public.pet_custody_contexts
  set status = 'transferred',
      ended_at = now()
  where pet_id = target_transfer.pet_id
    and household_id = target_transfer.from_household_id
    and status = 'active';

  update public.pets
  set household_id = target_to_household_id
  where id = target_transfer.pet_id;

  insert into public.pet_custody_contexts (
    pet_id,
    household_id,
    custody_type,
    status,
    started_at,
    created_by_user_id
  )
  values (
    target_transfer.pet_id,
    target_to_household_id,
    case when public.is_approved_protective_household(target_to_household_id) then 'foster' else 'owner' end,
    'active',
    now(),
    current_user_id
  );

  update public.pet_transfer_records
  set status = 'accepted',
      to_household_id = target_to_household_id,
      recipient_user_id = current_user_id,
      accepted_by_user_id = current_user_id,
      accepted_at = now()
  where id = target_transfer.id
  returning * into accepted_transfer;

  if linked_application.id is not null then
    update public.pet_adoption_applications
    set status = 'converted_to_transfer'
    where id = linked_application.id;

    insert into public.pet_adoption_application_status_history (
      application_id,
      from_status,
      to_status,
      changed_by_user_id,
      change_notes
    )
    values (
      linked_application.id,
      linked_application.status,
      'converted_to_transfer',
      current_user_id,
      'Transferencia privada aceptada por la familia receptora.'
    );

    update public.pet_adoption_listings
    set status = 'adopted',
        closed_at = now()
    where id = linked_application.listing_id
      and status = 'published';

    perform public.insert_audit_log(
      'pet_adoption_application',
      linked_application.id,
      'pet_adoption_transfer_accepted',
      jsonb_build_object(
        'transfer_id', accepted_transfer.id,
        'listing_id', linked_application.listing_id,
        'pet_id', linked_application.pet_id,
        'to_household_id', target_to_household_id
      ),
      current_user_id
    );
  end if;

  perform public.insert_audit_log(
    'pet_transfer',
    accepted_transfer.id,
    'pet_transfer_accepted',
    jsonb_build_object(
      'pet_id', accepted_transfer.pet_id,
      'from_household_id', accepted_transfer.from_household_id,
      'to_household_id', accepted_transfer.to_household_id,
      'adoption_application_id', accepted_transfer.adoption_application_id
    ),
    current_user_id
  );

  return accepted_transfer;
end;
$$;

create or replace function public.get_pet_adoption_closure_detail(target_application_id uuid)
returns table (
  application_id uuid,
  application_status text,
  listing_id uuid,
  listing_status text,
  pet_id uuid,
  pet_name text,
  protective_household_id uuid,
  protective_household_name text,
  applicant_user_id uuid,
  applicant_email text,
  transfer_id uuid,
  transfer_status text,
  transfer_created_at timestamptz,
  transfer_accepted_at timestamptz,
  to_household_id uuid,
  to_household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    application.id,
    application.status,
    listing.id,
    listing.status,
    pet.id,
    pet.name,
    application.protective_household_id,
    protective_household.name,
    application.applicant_user_id,
    application.applicant_email,
    transfer.id,
    transfer.status,
    transfer.created_at,
    transfer.accepted_at,
    transfer.to_household_id,
    receiver_household.name
  from public.pet_adoption_applications as application
  join public.pet_adoption_listings as listing
    on listing.id = application.listing_id
  join public.pets as pet
    on pet.id = application.pet_id
  join public.households as protective_household
    on protective_household.id = application.protective_household_id
  left join public.pet_transfer_records as transfer
    on transfer.adoption_application_id = application.id
  left join public.households as receiver_household
    on receiver_household.id = transfer.to_household_id
  where application.id = target_application_id
    and public.can_view_pet_adoption_application(application.id, auth.uid());
$$;

drop function if exists public.list_incoming_pet_transfer_invitations();
create function public.list_incoming_pet_transfer_invitations()
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  recipient_email text,
  recipient_user_id uuid,
  adoption_application_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  select lower(email)
  into current_email
  from public.profiles
  where id = current_user_id;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.adoption_application_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  where transfer.recipient_user_id = current_user_id
    or transfer.recipient_email = current_email
  order by transfer.created_at desc;
end;
$$;

drop function if exists public.list_outgoing_pet_transfer_records(uuid);
create function public.list_outgoing_pet_transfer_records(target_household_id uuid default null)
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  to_household_name text,
  recipient_email text,
  recipient_user_id uuid,
  adoption_application_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authenticated user required.';
  end if;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    to_household.name as to_household_name,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.adoption_application_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  left join public.households as to_household
    on to_household.id = transfer.to_household_id
  where public.can_view_household(transfer.from_household_id, current_user_id)
    and (target_household_id is null or transfer.from_household_id = target_household_id)
  order by transfer.created_at desc;
end;
$$;

drop function if exists public.list_pet_transfer_records_for_admin();
create function public.list_pet_transfer_records_for_admin()
returns table (
  id uuid,
  pet_id uuid,
  pet_name text,
  pet_species text,
  from_household_id uuid,
  from_household_name text,
  to_household_id uuid,
  to_household_name text,
  recipient_email text,
  recipient_user_id uuid,
  adoption_application_id uuid,
  status text,
  consent_snapshot jsonb,
  transfer_notes text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    transfer.id,
    transfer.pet_id,
    pet.name as pet_name,
    pet.species as pet_species,
    transfer.from_household_id,
    from_household.name as from_household_name,
    transfer.to_household_id,
    to_household.name as to_household_name,
    transfer.recipient_email,
    transfer.recipient_user_id,
    transfer.adoption_application_id,
    transfer.status,
    transfer.consent_snapshot,
    transfer.transfer_notes,
    transfer.expires_at,
    transfer.created_at,
    transfer.accepted_at,
    transfer.rejected_at,
    transfer.cancelled_at
  from public.pet_transfer_records as transfer
  join public.pets as pet
    on pet.id = transfer.pet_id
  join public.households as from_household
    on from_household.id = transfer.from_household_id
  left join public.households as to_household
    on to_household.id = transfer.to_household_id
  order by transfer.created_at desc
  limit 100;
end;
$$;

drop function if exists public.list_published_pet_adoption_listings();
create function public.list_published_pet_adoption_listings()
returns table (
  id uuid,
  pet_id uuid,
  household_id uuid,
  status text,
  public_slug text,
  share_status text,
  share_published_at timestamptz,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  published_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  household_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id,
    listing.pet_id,
    listing.household_id,
    listing.status,
    listing.public_slug,
    listing.share_status,
    listing.share_published_at,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.published_at,
    listing.paused_at,
    listing.closed_at,
    listing.reviewed_by_user_id,
    listing.reviewed_at,
    listing.review_notes,
    listing.created_by_user_id,
    listing.created_at,
    listing.updated_at,
    pet.name,
    pet.species,
    profile.breed,
    coalesce(profile.sex, 'unknown'),
    profile.birth_date,
    profile.is_sterilized,
    household.name
  from public.pet_adoption_listings listing
  join public.pets pet on pet.id = listing.pet_id
  left join public.pet_profiles profile on profile.pet_id = pet.id
  join public.households household on household.id = listing.household_id
  where listing.status = 'published'
    and listing.share_status = 'enabled'
  order by listing.published_at desc nulls last, listing.updated_at desc;
$$;

drop function if exists public.get_public_pet_adoption_listing_by_slug(text);
create function public.get_public_pet_adoption_listing_by_slug(target_slug text)
returns table (
  public_slug text,
  title text,
  public_story text,
  personality_notes text,
  public_health_summary text,
  adoption_requirements text,
  city text,
  state_region text,
  country_code text,
  compatibility_children text,
  compatibility_dogs text,
  compatibility_cats text,
  special_needs_notes text,
  share_published_at timestamptz,
  pet_name text,
  pet_species text,
  pet_breed text,
  pet_sex text,
  pet_birth_date date,
  pet_is_sterilized boolean,
  protective_profile_slug text,
  protective_display_name text,
  protective_mission text,
  protective_public_story text,
  protective_city text,
  protective_state_region text,
  protective_country_code text,
  contact_policy text,
  public_contact_label text,
  public_contact_value text,
  needs_summary text,
  listing_status text,
  media jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.public_slug,
    listing.title,
    listing.public_story,
    listing.personality_notes,
    listing.public_health_summary,
    listing.adoption_requirements,
    listing.city,
    listing.state_region,
    listing.country_code,
    listing.compatibility_children,
    listing.compatibility_dogs,
    listing.compatibility_cats,
    listing.special_needs_notes,
    listing.share_published_at,
    pet.name,
    pet.species,
    pet_profile.breed,
    coalesce(pet_profile.sex, 'unknown'),
    pet_profile.birth_date,
    pet_profile.is_sterilized,
    public_profile.public_slug,
    public_profile.display_name,
    public_profile.mission,
    public_profile.public_story,
    public_profile.city,
    public_profile.state_region,
    public_profile.country_code,
    public_profile.contact_policy,
    public_profile.public_contact_label,
    public_profile.public_contact_value,
    public_profile.needs_summary,
    listing.status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', media.id,
          'media_type', media.media_type,
          'storage_bucket', media.storage_bucket,
          'storage_path', media.storage_path,
          'file_name', media.file_name,
          'mime_type', media.mime_type,
          'display_order', media.display_order,
          'is_cover', media.is_cover
        )
        order by media.is_cover desc, media.display_order asc, media.created_at asc
      ) filter (where media.id is not null),
      '[]'::jsonb
    ) as media
  from public.pet_adoption_listings as listing
  join public.pets as pet on pet.id = listing.pet_id
  left join public.pet_profiles as pet_profile on pet_profile.pet_id = pet.id
  join public.households as household on household.id = listing.household_id
  join public.protective_household_profiles as protective_profile
    on protective_profile.household_id = household.id
  join public.protective_household_public_profiles as public_profile
    on public_profile.household_id = household.id
  left join public.pet_adoption_listing_media as media
    on media.listing_id = listing.id
    and media.moderation_status = 'approved'
  where listing.public_slug = public.normalize_public_slug(target_slug)
    and listing.status in ('published', 'adopted')
    and listing.share_status = 'enabled'
    and household.household_type = 'protective'
    and protective_profile.status = 'approved'
    and public_profile.moderation_status = 'approved'
    and public_profile.is_public = true
    and pet.status = 'active'
  group by
    listing.id,
    pet.id,
    pet_profile.pet_id,
    public_profile.id;
$$;

drop policy if exists pet_adoption_media_objects_public_select on storage.objects;
create policy pet_adoption_media_objects_public_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'pet-adoption-media'
  and exists (
    select 1
    from public.pet_adoption_listing_media media
    join public.pet_adoption_listings listing on listing.id = media.listing_id
    join public.households household on household.id = listing.household_id
    join public.protective_household_profiles protective_profile
      on protective_profile.household_id = household.id
    join public.protective_household_public_profiles public_profile
      on public_profile.household_id = household.id
    where media.storage_bucket = storage.objects.bucket_id
      and media.storage_path = storage.objects.name
      and media.moderation_status = 'approved'
      and listing.status in ('published', 'adopted')
      and listing.share_status = 'enabled'
      and household.household_type = 'protective'
      and protective_profile.status = 'approved'
      and public_profile.moderation_status = 'approved'
      and public_profile.is_public = true
  )
);

grant execute on function public.start_pet_adoption_transfer(uuid) to authenticated;
grant execute on function public.get_pet_adoption_closure_detail(uuid) to authenticated;
grant execute on function public.accept_pet_transfer(uuid, uuid) to authenticated;
grant execute on function public.list_published_pet_adoption_listings() to authenticated;
grant execute on function public.get_public_pet_adoption_listing_by_slug(text) to anon, authenticated;
