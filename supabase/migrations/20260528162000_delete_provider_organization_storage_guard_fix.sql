create or replace function public.delete_provider_organization(
  target_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_organization public.provider_organizations;
  linked_booking_count integer := 0;
  linked_chat_thread_count integer := 0;
  linked_review_count integer := 0;
  linked_support_case_count integer := 0;
  linked_document_count integer := 0;
  linked_service_count integer := 0;
  linked_availability_count integer := 0;
  linked_availability_rule_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to delete provider organizations';
  end if;

  select *
  into target_organization
  from public.provider_organizations
  where id = target_organization_id;

  if not found then
    raise exception 'Provider organization not found';
  end if;

  if not public.can_manage_provider_organization(target_organization.id, current_user_id) then
    raise exception 'Provider organization ownership required to delete organizations';
  end if;

  select count(*)
  into linked_booking_count
  from public.bookings
  where provider_organization_id = target_organization.id;

  if linked_booking_count > 0 then
    raise exception 'Este negocio tiene historial de reservas. Desactivalo u ocultalo en lugar de eliminarlo.';
  end if;

  select count(*)
  into linked_chat_thread_count
  from public.chat_threads
  where provider_organization_id = target_organization.id;

  if linked_chat_thread_count > 0 then
    raise exception 'Este negocio tiene conversaciones asociadas. Desactivalo u ocultalo en lugar de eliminarlo.';
  end if;

  select count(*)
  into linked_review_count
  from public.reviews
  where provider_organization_id = target_organization.id;

  if linked_review_count > 0 then
    raise exception 'Este negocio tiene resenas asociadas. Desactivalo u ocultalo en lugar de eliminarlo.';
  end if;

  select count(*)
  into linked_support_case_count
  from public.support_cases
  where provider_organization_id = target_organization.id;

  if linked_support_case_count > 0 then
    raise exception 'Este negocio tiene casos de soporte asociados. Desactivalo u ocultalo en lugar de eliminarlo.';
  end if;

  select count(*)
  into linked_document_count
  from public.provider_documents
  where organization_id = target_organization.id;

  select count(*)
  into linked_service_count
  from public.provider_services
  where organization_id = target_organization.id;

  select count(*)
  into linked_availability_count
  from public.provider_availability
  where organization_id = target_organization.id;

  select count(*)
  into linked_availability_rule_count
  from public.provider_availability_rules
  where organization_id = target_organization.id;

  perform public.insert_audit_log(
    'provider_organization',
    target_organization.id,
    'provider_organization.deleted',
    jsonb_build_object(
      'name', target_organization.name,
      'slug', target_organization.slug,
      'city', target_organization.city,
      'approval_status', target_organization.approval_status,
      'is_public', target_organization.is_public,
      'deleted_master_counts', jsonb_build_object(
        'documents', linked_document_count,
        'services', linked_service_count,
        'availability', linked_availability_count,
        'availability_rules', linked_availability_rule_count
      )
    ),
    current_user_id
  );

  delete from public.provider_organizations
  where id = target_organization.id;

  return true;
end;
$$;

grant execute on function public.delete_provider_organization(uuid) to authenticated;
