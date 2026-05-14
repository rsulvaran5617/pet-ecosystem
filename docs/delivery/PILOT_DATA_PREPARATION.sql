-- PILOT_DATA_PREPARATION.sql
--
-- Objetivo:
-- Diagnosticar y preparar visibilidad de datos para un piloto controlado
-- con 3 proveedores y 3 propietarios sin borrar datos historicos.
--
-- IMPORTANTE:
-- - No ejecutar este archivo completo sin revision.
-- - Los UPDATE estan comentados a proposito.
-- - Sustituir los IDs placeholder por los proveedores reales del piloto.
-- - No incluir credenciales ni datos sensibles.

begin;

-- ============================================================
-- 1. Diagnostico de proveedores visibles en marketplace
-- ============================================================

select
  po.id,
  po.name,
  po.slug,
  po.city,
  po.country_code,
  po.approval_status,
  po.is_public as organization_is_public,
  ppp.is_public as profile_is_public,
  ppl.is_public as location_is_public,
  ppl.latitude,
  ppl.longitude,
  count(distinct ps.id) filter (where ps.is_public = true and ps.is_active = true) as active_public_services
from public.provider_organizations po
left join public.provider_public_profiles ppp on ppp.organization_id = po.id
left join public.provider_public_locations ppl on ppl.organization_id = po.id
left join public.provider_services ps on ps.organization_id = po.id
group by
  po.id,
  po.name,
  po.slug,
  po.city,
  po.country_code,
  po.approval_status,
  po.is_public,
  ppp.is_public,
  ppl.is_public,
  ppl.latitude,
  ppl.longitude
order by po.created_at desc;

-- ============================================================
-- 2. Diagnostico de servicios publicos/activos
-- ============================================================

select
  po.id as organization_id,
  po.name as organization_name,
  ps.id as service_id,
  ps.name as service_name,
  ps.category,
  ps.booking_mode,
  ps.duration_minutes,
  ps.base_price_cents,
  ps.currency_code,
  ps.is_public,
  ps.is_active
from public.provider_services ps
join public.provider_organizations po on po.id = ps.organization_id
order by po.name, ps.name;

-- ============================================================
-- 3. Diagnostico de reglas de capacidad
-- ============================================================

select
  po.id as organization_id,
  po.name as organization_name,
  ps.id as service_id,
  ps.name as service_name,
  par.id as availability_rule_id,
  par.day_of_week,
  par.starts_at,
  par.ends_at,
  par.capacity,
  par.is_active
from public.provider_availability_rules par
join public.provider_services ps on ps.id = par.provider_service_id
join public.provider_organizations po on po.id = par.organization_id
order by po.name, ps.name, par.day_of_week, par.starts_at;

-- ============================================================
-- 4. Candidatos historicos/demo a ocultar
-- ============================================================
--
-- Completar manualmente despues de revisar el diagnostico.
-- Ejemplo observado previamente:
-- - HUELLAS
-- - BLACK DOG BRISAS
-- - AMERICAN PETS
-- - PROVEEDOR PASEADOR DE MASCOTAS
-- - Paseador
-- - Grooming Cortar Pelos y cortar unas
--
-- Mantener visibles SOLO los 3 proveedores piloto.

-- Crear una lista temporal de proveedores piloto aprobados para conservar visibles.
-- Sustituir los UUID por los IDs definitivos.

-- with pilot_providers(id) as (
--   values
--     ('00000000-0000-0000-0000-000000000001'::uuid),
--     ('00000000-0000-0000-0000-000000000002'::uuid),
--     ('00000000-0000-0000-0000-000000000003'::uuid)
-- )
-- select po.id, po.name
-- from public.provider_organizations po
-- where po.id not in (select id from pilot_providers)
--   and po.is_public = true;

-- ============================================================
-- 5. Updates opcionales NO destructivos
-- ============================================================
--
-- Opcion A: ocultar organizaciones fuera del piloto.
-- Reversible cambiando is_public a true.

-- with pilot_providers(id) as (
--   values
--     ('00000000-0000-0000-0000-000000000001'::uuid),
--     ('00000000-0000-0000-0000-000000000002'::uuid),
--     ('00000000-0000-0000-0000-000000000003'::uuid)
-- )
-- update public.provider_organizations po
-- set is_public = false,
--     updated_at = now()
-- where po.id not in (select id from pilot_providers)
--   and po.is_public = true;

-- Opcion B: ocultar perfiles publicos fuera del piloto.
-- Usar si se quiere conservar organization.is_public pero retirar discovery.

-- with pilot_providers(id) as (
--   values
--     ('00000000-0000-0000-0000-000000000001'::uuid),
--     ('00000000-0000-0000-0000-000000000002'::uuid),
--     ('00000000-0000-0000-0000-000000000003'::uuid)
-- )
-- update public.provider_public_profiles ppp
-- set is_public = false,
--     updated_at = now()
-- where ppp.organization_id not in (select id from pilot_providers)
--   and ppp.is_public = true;

-- Opcion C: ocultar/desactivar servicios fuera del piloto.
-- Usar con cuidado porque afecta reservas futuras, no historicas.

-- with pilot_providers(id) as (
--   values
--     ('00000000-0000-0000-0000-000000000001'::uuid),
--     ('00000000-0000-0000-0000-000000000002'::uuid),
--     ('00000000-0000-0000-0000-000000000003'::uuid)
-- )
-- update public.provider_services ps
-- set is_public = false,
--     is_active = false,
--     updated_at = now()
-- where ps.organization_id not in (select id from pilot_providers)
--   and (ps.is_public = true or ps.is_active = true);

-- ============================================================
-- 6. Verificacion post-update
-- ============================================================

select
  po.id,
  po.name,
  po.approval_status,
  po.is_public as organization_is_public,
  ppp.is_public as profile_is_public,
  count(distinct ps.id) filter (where ps.is_public = true and ps.is_active = true) as active_public_services
from public.provider_organizations po
left join public.provider_public_profiles ppp on ppp.organization_id = po.id
left join public.provider_services ps on ps.organization_id = po.id
group by po.id, po.name, po.approval_status, po.is_public, ppp.is_public
order by po.name;

rollback;

-- Cambiar rollback por commit solo despues de revision/aprobacion explicita.
