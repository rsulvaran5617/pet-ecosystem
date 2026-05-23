create or replace function public.delete_provider_service(
  target_service_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_service public.provider_services;
  linked_booking_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required to delete provider services';
  end if;

  select *
  into target_service
  from public.provider_services
  where id = target_service_id;

  if not found then
    raise exception 'Provider service not found';
  end if;

  if not public.can_manage_provider_organization(target_service.organization_id, current_user_id) then
    raise exception 'Provider organization ownership required to delete services';
  end if;

  select count(*)
  into linked_booking_count
  from public.bookings
  where provider_service_id = target_service_id;

  if linked_booking_count > 0 then
    raise exception 'Este servicio tiene historial de reservas. Desactivalo u ocultalo en lugar de eliminarlo.';
  end if;

  perform public.insert_audit_log(
    'provider_service',
    target_service.id,
    'provider_service.deleted',
    jsonb_build_object(
      'organization_id', target_service.organization_id,
      'name', target_service.name,
      'category', target_service.category
    ),
    current_user_id
  );

  delete from public.provider_services
  where id = target_service_id;

  return true;
end;
$$;

grant execute on function public.delete_provider_service(uuid) to authenticated;
