-- Expired platform verification requires a new manual review. Old consents
-- are closed before changing profile state, preserving clinical guard lock order.
create or replace function public.submit_my_clinical_professional_profile()
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target public.clinical_professional_profiles;
  pet_to_close uuid; is_renewal boolean;
begin
  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clinical-renewal:' || current_user_id::text,0));
  select * into target from public.clinical_professional_profiles where user_id = current_user_id;
  if target.id is null then raise exception 'Professional profile is not ready to submit'; end if;
  if target.verification_status = 'pending' then return public.get_my_clinical_professional_context(); end if;
  is_renewal := target.verification_status = 'expired' or
    (target.verification_status = 'verified' and target.verification_expires_at <= clock_timestamp());
  if target.verification_status <> 'draft' and not coalesce(is_renewal,false) then
    raise exception 'Professional profile is not ready to submit';
  end if;
  if is_renewal then
    for pet_to_close in select distinct pet_id from public.clinical_write_requests
      where professional_profile_id = target.id and status in ('requested','approved','completed') order by pet_id
    loop
      perform pg_advisory_xact_lock(hashtextextended('clinical-pet:' || pet_to_close::text,0));
      perform public.close_clinical_consent_cycles(pet_to_close,target.id,null,'Professional verification renewal');
    end loop;
  end if;
  select * into target from public.clinical_professional_profiles where id = target.id for update;
  if target.verification_status = 'pending' then return public.get_my_clinical_professional_context(); end if;
  if target.verification_status <> 'draft' and not coalesce((target.verification_status = 'expired' or
    (target.verification_status = 'verified' and target.verification_expires_at <= clock_timestamp())),false) then
    raise exception 'Professional profile is not ready to submit';
  end if;
  update public.clinical_professional_profiles set verification_status = 'pending', submitted_at = clock_timestamp()
    where id = target.id;
  insert into public.clinical_professional_verification_events(professional_profile_id,event_type,actor_user_id,reason)
    values(target.id,'submitted',current_user_id,case when is_renewal then 'Professional verification renewal' else null end);
  return public.get_my_clinical_professional_context();
end; $$;
revoke all on function public.submit_my_clinical_professional_profile() from public, anon;
grant execute on function public.submit_my_clinical_professional_profile() to authenticated;

-- Append the expiry field while keeping the RPC name and existing fields.
-- No CASCADE: unexpected database dependents must stop the migration.
drop function public.list_pending_clinical_professionals_for_admin();
create or replace function public.list_pending_clinical_professionals_for_admin()
returns table (
  id uuid, user_id uuid, professional_name text, professional_type text,
  license_reference text, jurisdiction text, country_code text,
  organization_name text, verification_status text, submitted_at timestamptz, verification_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select profile.id, profile.user_id, profile.professional_name, profile.professional_type,
    profile.license_reference, profile.jurisdiction, profile.country_code, organization.name,
    case when profile.verification_status = 'verified' and profile.verification_expires_at <= now() then 'expired' else profile.verification_status end, profile.submitted_at, profile.verification_expires_at
  from public.clinical_professional_profiles profile
  left join public.provider_organizations organization on organization.id = profile.provider_organization_id
  where public.is_platform_admin(auth.uid()) and profile.verification_status in ('pending', 'verified', 'expired')
  order by case when profile.verification_status = 'pending' then 0 else 1 end, profile.submitted_at;
$$;
revoke all on function public.list_pending_clinical_professionals_for_admin() from public, anon;
grant execute on function public.list_pending_clinical_professionals_for_admin() to authenticated;
