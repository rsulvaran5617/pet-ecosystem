-- Transactional fixture: runner must wrap this in BEGIN / ROLLBACK.
do $$
declare
  fn regprocedure := 'public.create_external_pet_alert_report(uuid,text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text)'::regprocedure;
begin
  if has_function_privilege('anon', fn, 'EXECUTE') or has_function_privilege('authenticated', fn, 'EXECUTE') then
    raise exception 'Client can bypass external Edge entry point';
  end if;
  if not has_function_privilege('service_role', fn, 'EXECUTE') then
    raise exception 'Service cannot create external alert';
  end if;
end;
$$;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare
  reporter_id uuid := gen_random_uuid();
  created public.pet_alert_lost_pets;
begin
  insert into public.pet_alert_external_reporters
    (id, email_normalized, contact_name, email_verified_at, terms_version, privacy_version, consented_at)
  values (reporter_id, reporter_id::text || '@example.invalid', 'Rollback fixture', now(),
    'pet-alert-external-v1', 'pet-alert-external-v1', now());
  select * into created from public.create_external_pet_alert_report(
    reporter_id, 'QA Rollback', 'Perro', '', 'unknown', 'unknown', '', now(),
    'Ciudad QA', '', 'PA', '', 'Fixture transaccional no publicada', '', '', '',
    'pet-alert-external-v1', 'pet-alert-external-v1');
  if created.id is null or created.status <> 'pending_review'
    or created.alert_slug !~ '^qa-rollback-[0-9a-f]{12}$'
    or created.external_reporter_id <> reporter_id then
    raise exception 'Invalid external report result';
  end if;
  if not exists (select 1 from public.pet_alert_status_history where lost_pet_alert_id=created.id and new_status='pending_review') then
    raise exception 'Missing history';
  end if;
  perform public.set_pet_alert_lost_pet_location(created.id, 8.99, -79.52, 100, 'device', now(), true);
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    perform public.set_pet_alert_lost_pet_location(created.id, 8.99, -79.52, 100, 'device', now(), true);
    raise exception 'Unrelated actor changed external location';
  exception when raise_exception then
    if sqlerrm <> 'PET_ALERT_UNAUTHORIZED' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('request.jwt.claim.role', '', true);
  begin
    perform public.set_pet_alert_lost_pet_location(created.id, 8.99, -79.52, 100, 'device', now(), true);
    raise exception 'Null actor changed external location';
  exception when raise_exception then
    if sqlerrm <> 'PET_ALERT_UNAUTHORIZED' then raise; end if;
  end;
end;
$$;
reset role;

-- Even an otherwise privileged invocation must reject a missing JWT role.
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.role', '', true);
do $$
begin
  begin
    perform public.create_external_pet_alert_report(
      gen_random_uuid(), 'QA', 'Perro', '', 'unknown', 'unknown', '', now(),
      'Ciudad', '', 'PA', '', 'Fixture', '', '', '', 'v1', 'v1');
    raise exception 'Null role incorrectly accepted';
  exception when raise_exception then
    if sqlerrm <> 'PET_ALERT_SERVICE_ROLE_REQUIRED' then raise; end if;
  end;
end;
$$;
