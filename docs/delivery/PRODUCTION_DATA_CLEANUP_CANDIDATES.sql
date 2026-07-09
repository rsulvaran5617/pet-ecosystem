-- Production data cleanup candidates generated from diagnostics.
-- Safe by default: review IDs before executing.
--
-- Diagnostic inputs:
-- - provider dependency diagnostic
-- - marketplace visibility
-- - transaction summary
--
-- Summary:
-- - 6 providers are visible in marketplace and have transactional history.
-- - These providers must NOT be deleted.
-- - Hide/deactivate only if they should not be visible in production.
-- - 1 provider is a physical delete candidate after manual review.

-- ============================================================
-- A. Visible providers with transactional history
-- ============================================================
-- Review product decision for each one:
-- - KEEP_PROD: leave unchanged.
-- - HIDE_DEMO: execute non-destructive hide block below.

select *
from (
  values
    ('afa94b88-7f67-49c3-9974-d5646de4dce0'::uuid, 'AMERICAN PETS', 16, 16, 0, 0, 12, 5),
    ('4f26e7ef-b9db-450e-a4de-ca93dcd78105'::uuid, 'American Pets local Sede', 2, 2, 0, 0, 2, 1),
    ('983e588c-fb4f-4a2a-9931-d44528a80789'::uuid, 'BLACK DOG BRISAS', 12, 12, 0, 1, 8, 3),
    ('0d244d4a-c96e-4dd0-9c02-c6d62901b6c9'::uuid, 'Grooming Cortar Pelos y cortar unas', 18, 18, 0, 0, 8, 1),
    ('ea6fc8cf-695e-4bfb-95c3-d79b46408335'::uuid, 'HUELLAS', 3, 3, 0, 0, 2, 1),
    ('d0a029ce-107b-4064-8ce6-707bf8746334'::uuid, 'Paseador', 4, 4, 1, 1, 2, 0)
) as candidate(
  organization_id,
  name,
  bookings,
  chat_threads,
  reviews,
  support_cases,
  booking_operations,
  booking_evidence
);

-- ============================================================
-- B. Non-destructive hide block
-- ============================================================
-- Instructions:
-- 1. Move only providers approved as HIDE_DEMO into target_organizations.
-- 2. Run inside an explicit transaction.
-- 3. Verify with the post-check query.
-- 4. Commit only after review.
--
-- This block preserves bookings, chats, reviews, support, evidence and audit logs.
--
-- begin;
--
-- with target_organizations(organization_id) as (
--   values
--     -- Example:
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_organizations as organization
-- set
--   is_public = false,
--   updated_at = now()
-- from target_organizations as target
-- where organization.id = target.organization_id;
--
-- with target_organizations(organization_id) as (
--   values
--     -- repeat same IDs here
-- )
-- update public.provider_public_profiles as profile
-- set
--   is_public = false,
--   updated_at = now()
-- from target_organizations as target
-- where profile.organization_id = target.organization_id;
--
-- with target_organizations(organization_id) as (
--   values
--     -- repeat same IDs here
-- )
-- update public.provider_public_locations as location
-- set
--   is_public = false,
--   updated_at = now()
-- from target_organizations as target
-- where location.organization_id = target.organization_id;
--
-- with target_organizations(organization_id) as (
--   values
--     -- repeat same IDs here
-- )
-- update public.provider_services as service
-- set
--   is_public = false,
--   is_active = false,
--   updated_at = now()
-- from target_organizations as target
-- where service.organization_id = target.organization_id;
--
-- with target_organizations(organization_id) as (
--   values
--     -- repeat same IDs here
-- )
-- update public.provider_availability as availability
-- set
--   is_active = false,
--   updated_at = now()
-- from target_organizations as target
-- where availability.organization_id = target.organization_id;
--
-- with target_organizations(organization_id) as (
--   values
--     -- repeat same IDs here
-- )
-- update public.provider_availability_rules as rule
-- set
--   is_active = false,
--   updated_at = now()
-- from target_organizations as target
-- where rule.organization_id = target.organization_id;
--
-- -- Post-check before commit:
-- select
--   organization.id,
--   organization.name,
--   organization.is_public as organization_is_public,
--   profile.is_public as profile_is_public,
--   location.is_public as location_is_public,
--   count(service.id) filter (where service.is_public and service.is_active) as public_active_services
-- from public.provider_organizations as organization
-- left join public.provider_public_profiles as profile
--   on profile.organization_id = organization.id
-- left join public.provider_public_locations as location
--   on location.organization_id = organization.id
-- left join public.provider_services as service
--   on service.organization_id = organization.id
-- where organization.id in (
--   -- repeat same IDs here
--   '00000000-0000-0000-0000-000000000000'::uuid
-- )
-- group by organization.id, organization.name, profile.is_public, location.is_public;
--
-- -- If correct:
-- -- commit;
-- -- If not:
-- -- rollback;

-- ============================================================
-- C. Physical delete candidate
-- ============================================================
-- Candidate has no bookings, chats, reviews, support, operations or evidence.
-- Still review manually before deleting.

select *
from (
  values
    ('cb941d3f-6eec-4b97-ba5f-bc087057040a'::uuid, 'Providers Reject 1775269588988')
) as candidate(organization_id, name);

-- Preferred delete path after explicit approval:
--
-- select public.delete_provider_organization(
--   'cb941d3f-6eec-4b97-ba5f-bc087057040a'::uuid
-- );
