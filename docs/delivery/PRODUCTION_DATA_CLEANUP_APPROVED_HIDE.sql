-- Production cleanup approved visibility plan.
-- Decision:
-- - KEEP_PROD:
--   - AMERICAN PETS
--   - American Pets local Sede
--   - BLACK DOG BRISAS
-- - Hide/deactivate all other current providers.
--
-- Safety:
-- - This script is non-destructive.
-- - It preserves bookings, chats, reviews, support, evidence and audit logs.
-- - It runs as a dry-run transaction by default and ends with ROLLBACK.
-- - Review the post-check output before changing ROLLBACK to COMMIT.

begin;

create temp table cleanup_keep_prod (
  organization_id uuid primary key,
  name text not null
) on commit drop;

insert into cleanup_keep_prod (organization_id, name)
values
  ('afa94b88-7f67-49c3-9974-d5646de4dce0'::uuid, 'AMERICAN PETS'),
  ('4f26e7ef-b9db-450e-a4de-ca93dcd78105'::uuid, 'American Pets local Sede'),
  ('983e588c-fb4f-4a2a-9931-d44528a80789'::uuid, 'BLACK DOG BRISAS');

create temp table cleanup_hide_targets (
  organization_id uuid primary key,
  name text not null
) on commit drop;

insert into cleanup_hide_targets (organization_id, name)
values
  ('0c1cc269-e5ed-4f1f-86a0-eb5bec5b6d22'::uuid, 'American Pets'),
  ('18b3b678-7b19-4169-b21c-75cf95857ef3'::uuid, 'Booking Provider 1775255578700'),
  ('4a8d7f96-68d8-422f-8196-47fade599158'::uuid, 'Booking Provider 1775255664577'),
  ('9d8312ea-c89e-4a62-a40a-af971c50dd7f'::uuid, 'cuidamos tu mascota en casa'),
  ('0d244d4a-c96e-4dd0-9c02-c6d62901b6c9'::uuid, 'Grooming Cortar Pelos y cortar unas'),
  ('bd593dd7-21a2-46d1-907a-375337756648'::uuid, 'Hidden Provider 1775252705814'),
  ('169478a1-33c2-460d-b417-591806388aa0'::uuid, 'Hidden Provider 1775253066021'),
  ('ea6fc8cf-695e-4bfb-95c3-d79b46408335'::uuid, 'HUELLAS'),
  ('20db4a17-5707-42bb-837c-fd16db8bbfa9'::uuid, 'Marketplace Provider 1775252705814'),
  ('a20c3283-54ad-4c72-912e-3e6e5c178172'::uuid, 'Marketplace Provider 1775253066021'),
  ('e0d5180f-4ab2-4f6d-9126-deb84ac753e1'::uuid, 'Messaging Provider 1775257661058'),
  ('8dd6778a-62b8-45ac-a1d3-dc463ebb6e9d'::uuid, 'Messaging Provider 1775257728640'),
  ('3523bbff-db1a-4f49-abce-4b4b223a7dc2'::uuid, 'Messaging Provider 1775272880514'),
  ('9312dfab-27c7-46ac-afb2-a2d3840aa265'::uuid, 'negocio de prueba con horarios y cupos'),
  ('d0a029ce-107b-4064-8ce6-707bf8746334'::uuid, 'Paseador'),
  ('64a16b7f-a244-425e-9744-15bf181dd366'::uuid, 'Pilot Critical Provider 1775273034074'),
  ('4ef55e5c-62ce-4fe6-8009-a6835296de5d'::uuid, 'Pilot Critical Provider 1775318771414'),
  ('01cca716-aa43-4dd4-b640-41d82ab2ed4f'::uuid, 'Pilot Critical Provider 1776616312661'),
  ('5a100fa3-a267-4624-aa24-9b9fea66f316'::uuid, 'Pilot Critical Provider 1776616545387'),
  ('95a547b5-a069-41fb-a539-0f1117130c00'::uuid, 'Pilot Critical Provider 1776616636783'),
  ('57b7794a-d52e-48f5-8eb5-107ba239b687'::uuid, 'Pilot Critical Provider 1776623992136'),
  ('4a00744f-d799-469d-91cd-58545fc7f30b'::uuid, 'Pilot Critical Provider 1776624010649'),
  ('c15738e8-9aa7-4184-ba22-1d37b96dee78'::uuid, 'Pilot Critical Provider 1776624081727'),
  ('00116022-2ce8-4106-95d1-4e3f8a6af8a3'::uuid, 'Pilot Critical Provider 1776624214144'),
  ('ad277337-8f35-4403-8a5d-a59c4e4e22dd'::uuid, 'Pilot Critical Provider 1776627188774'),
  ('a32be159-3cb5-4705-a889-f78776d5e105'::uuid, 'Pilot Critical Provider 1776627189382'),
  ('1099ee62-e0a7-4888-a833-93fabe659776'::uuid, 'Pilot Critical Provider 1776627219314'),
  ('65ab4ed0-4e07-4302-80c7-28bce4a3cbcd'::uuid, 'Pilot Critical Provider 1776631831365'),
  ('738a5a81-2f04-4ad3-8b61-12a8eaaf9f7f'::uuid, 'Pilot Critical Provider 1776631851848'),
  ('f5e36401-2cf6-4345-8cfb-dfb381d7a43c'::uuid, 'Pilot Critical Provider 1776631852371'),
  ('7b5fd8f0-c937-4d3b-8c53-27f76f6a8c71'::uuid, 'Pilot Critical Provider 1776631899473'),
  ('ced3d89f-42cc-4354-a48e-c6df273e6a4e'::uuid, 'Pilot Critical Provider 1777833535760'),
  ('ec4d07ed-7b18-4550-bddf-02cffaea19d3'::uuid, 'Pilot Critical Provider 1777833581080'),
  ('31942b02-d15a-44f7-91fb-3465d2148a3c'::uuid, 'Pilot Critical Provider 1777833610874'),
  ('43231d4b-097e-402e-9c58-99a38b848853'::uuid, 'Pilot Critical Provider 1777833611279'),
  ('0c9304db-2f37-4983-8969-b67fd50ccaaa'::uuid, 'Pilot Critical Provider 1777847460819'),
  ('3e821f1a-f43d-4343-adad-5e403913ed88'::uuid, 'Pilot Critical Provider 1777847483838'),
  ('4476f15e-c11b-4543-bd92-ca476d2cf392'::uuid, 'PROVEEDOR PASEADOR DE MASCOTAS'),
  ('c04d5f58-4f9b-4ac7-9e0e-af998acc5ab0'::uuid, 'Providers Base 1775269318873 Updated'),
  ('45a62b21-ba91-4447-971c-a665bd11633d'::uuid, 'Providers Base 1775269588988 Updated'),
  ('cb941d3f-6eec-4b97-ba5f-bc087057040a'::uuid, 'Providers Reject 1775269588988'),
  ('6cb667c5-3a89-4196-93ff-c9cacf01f5cf'::uuid, 'Reviews Provider 1775259406807'),
  ('637ba088-0e71-4859-8fc9-6f4eba8e617e'::uuid, 'Reviews Provider 1775259470129'),
  ('c7414ee1-cd55-4d88-a15c-28396c4ba0ab'::uuid, 'servicio de entrenamiento'),
  ('0ad0b29a-8702-4ff9-bb71-6d54b414f2b9'::uuid, 'Servicio de hospedaje'),
  ('6bb44f1a-ddcc-485c-902e-0c4aae40b32e'::uuid, 'Servicio de Peluqueria'),
  ('fb90796b-5922-4adb-9aae-359ff107c3ba'::uuid, 'Support Provider 1775266287461');

-- Guard: make sure keep and hide lists do not overlap.
do $$
begin
  if exists (
    select 1
    from cleanup_keep_prod as keep_prod
    inner join cleanup_hide_targets as hide_target
      on hide_target.organization_id = keep_prod.organization_id
  ) then
    raise exception 'Cleanup guard failed: keep and hide lists overlap';
  end if;
end $$;

update public.provider_organizations as organization
set
  is_public = false,
  updated_at = now()
from cleanup_hide_targets as target
where organization.id = target.organization_id;

update public.provider_public_profiles as profile
set
  is_public = false,
  updated_at = now()
from cleanup_hide_targets as target
where profile.organization_id = target.organization_id;

update public.provider_public_locations as location
set
  is_public = false,
  updated_at = now()
from cleanup_hide_targets as target
where location.organization_id = target.organization_id;

update public.provider_services as service
set
  is_public = false,
  is_active = false,
  updated_at = now()
from cleanup_hide_targets as target
where service.organization_id = target.organization_id;

update public.provider_availability as availability
set
  is_active = false,
  updated_at = now()
from cleanup_hide_targets as target
where availability.organization_id = target.organization_id;

update public.provider_availability_rules as rule
set
  is_active = false,
  updated_at = now()
from cleanup_hide_targets as target
where rule.organization_id = target.organization_id;

-- Post-check: only KEEP_PROD should remain visible by marketplace rules.
select
  organization.id as organization_id,
  organization.name,
  organization.approval_status,
  organization.is_public as organization_is_public,
  profile.is_public as profile_is_public,
  location.is_public as location_is_public,
  count(service.id) filter (where service.is_public and service.is_active) as public_active_services,
  case
    when organization.approval_status = 'approved'
      and organization.is_public
      and coalesce(profile.is_public, false)
      and count(service.id) filter (where service.is_public and service.is_active) > 0
      then true
    else false
  end as visible_in_marketplace_by_rules,
  case
    when keep_prod.organization_id is not null then 'KEEP_PROD'
    when hide_target.organization_id is not null then 'HIDE_TARGET'
    else 'OUT_OF_SCOPE'
  end as cleanup_scope
from public.provider_organizations as organization
left join public.provider_public_profiles as profile
  on profile.organization_id = organization.id
left join public.provider_public_locations as location
  on location.organization_id = organization.id
left join public.provider_services as service
  on service.organization_id = organization.id
left join cleanup_keep_prod as keep_prod
  on keep_prod.organization_id = organization.id
left join cleanup_hide_targets as hide_target
  on hide_target.organization_id = organization.id
group by
  organization.id,
  organization.name,
  organization.approval_status,
  organization.is_public,
  profile.is_public,
  location.is_public,
  keep_prod.organization_id,
  hide_target.organization_id
order by cleanup_scope, organization.name;

-- Dry-run by default. Review post-check output before committing.
rollback;

-- To apply for real after review:
-- 1. Re-run this script.
-- 2. Replace the ROLLBACK above with COMMIT.

-- Optional destructive cleanup, not part of the default hide plan:
-- Only after explicit approval, the rejected provider below can be deleted through the guarded RPC.
--
-- select public.delete_provider_organization(
--   'cb941d3f-6eec-4b97-ba5f-bc087057040a'::uuid
-- );
