-- Run only against a disposable/local database after applying the 8B migration.
-- These assertions are read-only and intentionally avoid creating PII fixtures.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'pet_alert_external_reporters',
    'pet_alert_external_verification_challenges',
    'pet_alert_external_access_tokens'
  ] loop
    if not exists (
      select 1 from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = target_table
        and relation.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for public.%', target_table;
    end if;
    if has_table_privilege('anon', format('public.%I', target_table), 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'anon unexpectedly has direct privileges on public.%', target_table;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.consume_pet_alert_external_challenge(uuid,text)', 'EXECUTE') then
    raise exception 'anon can consume external verification challenges';
  end if;
  if has_function_privilege('authenticated', 'public.create_external_pet_alert_report(uuid,text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'authenticated can bypass the Edge Function and create external reports';
  end if;
  if not has_function_privilege('service_role', 'public.consume_pet_alert_external_challenge(uuid,text)', 'EXECUTE') then
    raise exception 'service_role cannot consume external verification challenges';
  end if;
end;
$$;
