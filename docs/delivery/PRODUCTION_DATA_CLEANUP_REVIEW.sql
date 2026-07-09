-- Production data cleanup review for Pet Ecosystem.
-- Purpose: diagnose provider data before a production/pilot cleanup.
-- Safe by default: this file must not execute destructive changes automatically.
--
-- Rules:
-- - Run SELECT diagnostics first.
-- - Export results to CSV.
-- - Review provider IDs manually.
-- - Do not run UPDATE/DELETE blocks without explicit approval.
-- - Prefer hiding/deactivating over deleting.
-- - Preserve bookings, chats, support, reviews, evidence and audit logs.

-- ============================================================
-- A. Provider dependency diagnostic
-- ============================================================

with provider_base as (
  select
    organization.id as organization_id,
    organization.owner_user_id,
    organization.name,
    organization.slug,
    organization.city,
    organization.country_code,
    organization.approval_status,
    organization.is_public as organization_is_public,
    organization.created_at,
    organization.updated_at,
    public_profile.is_public as profile_is_public,
    public_location.is_public as location_is_public,
    public_location.display_label as location_display_label,
    public_location.latitude as location_latitude,
    public_location.longitude as location_longitude
  from public.provider_organizations as organization
  left join public.provider_public_profiles as public_profile
    on public_profile.organization_id = organization.id
  left join public.provider_public_locations as public_location
    on public_location.organization_id = organization.id
),
provider_counts as (
  select
    provider.organization_id,
    count(distinct service.id) as service_count,
    count(distinct service.id) filter (where service.is_public and service.is_active) as public_active_service_count,
    count(distinct service.id) filter (where service.is_active) as active_service_count,
    count(distinct availability.id) as legacy_availability_count,
    count(distinct availability.id) filter (where availability.is_active) as active_legacy_availability_count,
    count(distinct rule.id) as availability_rule_count,
    count(distinct rule.id) filter (where rule.is_active) as active_availability_rule_count,
    count(distinct exception.id) as availability_exception_count,
    count(distinct document.id) as provider_document_count,
    count(distinct booking.id) as booking_count,
    count(distinct booking.id) filter (where booking.status = 'pending_approval') as booking_pending_approval_count,
    count(distinct booking.id) filter (where booking.status = 'confirmed') as booking_confirmed_count,
    count(distinct booking.id) filter (where booking.status = 'completed') as booking_completed_count,
    count(distinct booking.id) filter (where booking.status = 'cancelled') as booking_cancelled_count,
    count(distinct thread.id) as chat_thread_count,
    count(distinct message.id) as chat_message_count,
    count(distinct review.id) as review_count,
    count(distinct support.id) as support_case_count,
    count(distinct operation.id) as booking_operation_count,
    count(distinct evidence.id) as booking_operation_evidence_count,
    max(greatest(
      coalesce(service.updated_at, '-infinity'::timestamptz),
      coalesce(availability.updated_at, '-infinity'::timestamptz),
      coalesce(rule.updated_at, '-infinity'::timestamptz),
      coalesce(exception.updated_at, '-infinity'::timestamptz),
      coalesce(document.updated_at, '-infinity'::timestamptz),
      coalesce(booking.updated_at, '-infinity'::timestamptz),
      coalesce(thread.updated_at, '-infinity'::timestamptz),
      coalesce(message.updated_at, '-infinity'::timestamptz),
      coalesce(review.created_at, '-infinity'::timestamptz),
      coalesce(support.updated_at, '-infinity'::timestamptz),
      coalesce(operation.updated_at, '-infinity'::timestamptz),
      coalesce(evidence.created_at, '-infinity'::timestamptz)
    )) as last_related_activity_at
  from provider_base as provider
  left join public.provider_services as service
    on service.organization_id = provider.organization_id
  left join public.provider_availability as availability
    on availability.organization_id = provider.organization_id
  left join public.provider_availability_rules as rule
    on rule.organization_id = provider.organization_id
  left join public.provider_availability_exceptions as exception
    on exception.organization_id = provider.organization_id
  left join public.provider_documents as document
    on document.organization_id = provider.organization_id
  left join public.bookings as booking
    on booking.provider_organization_id = provider.organization_id
  left join public.chat_threads as thread
    on thread.provider_organization_id = provider.organization_id
  left join public.chat_messages as message
    on message.thread_id = thread.id
  left join public.reviews as review
    on review.provider_organization_id = provider.organization_id
  left join public.support_cases as support
    on support.provider_organization_id = provider.organization_id
  left join public.booking_operations as operation
    on operation.booking_id = booking.id
  left join public.booking_operation_evidence as evidence
    on evidence.booking_id = booking.id
  group by provider.organization_id
)
select
  provider.organization_id,
  provider.owner_user_id,
  provider.name,
  provider.slug,
  provider.city,
  provider.country_code,
  provider.approval_status,
  provider.organization_is_public,
  coalesce(provider.profile_is_public, false) as profile_is_public,
  coalesce(provider.location_is_public, false) as location_is_public,
  provider.location_display_label,
  provider.location_latitude,
  provider.location_longitude,
  coalesce(counts.service_count, 0) as service_count,
  coalesce(counts.public_active_service_count, 0) as public_active_service_count,
  coalesce(counts.active_service_count, 0) as active_service_count,
  coalesce(counts.legacy_availability_count, 0) as legacy_availability_count,
  coalesce(counts.active_legacy_availability_count, 0) as active_legacy_availability_count,
  coalesce(counts.availability_rule_count, 0) as availability_rule_count,
  coalesce(counts.active_availability_rule_count, 0) as active_availability_rule_count,
  coalesce(counts.availability_exception_count, 0) as availability_exception_count,
  coalesce(counts.provider_document_count, 0) as provider_document_count,
  coalesce(counts.booking_count, 0) as booking_count,
  coalesce(counts.booking_pending_approval_count, 0) as booking_pending_approval_count,
  coalesce(counts.booking_confirmed_count, 0) as booking_confirmed_count,
  coalesce(counts.booking_completed_count, 0) as booking_completed_count,
  coalesce(counts.booking_cancelled_count, 0) as booking_cancelled_count,
  coalesce(counts.chat_thread_count, 0) as chat_thread_count,
  coalesce(counts.chat_message_count, 0) as chat_message_count,
  coalesce(counts.review_count, 0) as review_count,
  coalesce(counts.support_case_count, 0) as support_case_count,
  coalesce(counts.booking_operation_count, 0) as booking_operation_count,
  coalesce(counts.booking_operation_evidence_count, 0) as booking_operation_evidence_count,
  nullif(counts.last_related_activity_at, '-infinity'::timestamptz) as last_related_activity_at,
  case
    when coalesce(counts.booking_count, 0) > 0
      or coalesce(counts.chat_thread_count, 0) > 0
      or coalesce(counts.review_count, 0) > 0
      or coalesce(counts.support_case_count, 0) > 0
      or coalesce(counts.booking_operation_count, 0) > 0
      or coalesce(counts.booking_operation_evidence_count, 0) > 0
      then 'HIDE_RECOMMENDED'
    when provider.approval_status = 'approved'
      and provider.organization_is_public
      and coalesce(provider.profile_is_public, false)
      and coalesce(counts.public_active_service_count, 0) > 0
      then 'KEEP_REVIEW'
    when coalesce(counts.service_count, 0) = 0
      and coalesce(counts.provider_document_count, 0) = 0
      and coalesce(provider.profile_is_public, false) = false
      and coalesce(provider.location_is_public, false) = false
      then 'DELETE_CANDIDATE'
    else 'REVIEW_MANUAL'
  end as suggested_action
from provider_base as provider
left join provider_counts as counts
  on counts.organization_id = provider.organization_id
order by
  suggested_action,
  provider.name;

-- ============================================================
-- B. Marketplace visibility review
-- ============================================================

select
  organization.id as organization_id,
  organization.name,
  organization.approval_status,
  organization.is_public as organization_is_public,
  coalesce(profile.is_public, false) as profile_is_public,
  coalesce(location.is_public, false) as location_is_public,
  count(service.id) filter (where service.is_public and service.is_active) as public_active_service_count,
  case
    when organization.approval_status = 'approved'
      and organization.is_public
      and coalesce(profile.is_public, false)
      and count(service.id) filter (where service.is_public and service.is_active) > 0
      then true
    else false
  end as visible_in_marketplace_by_rules
from public.provider_organizations as organization
left join public.provider_public_profiles as profile
  on profile.organization_id = organization.id
left join public.provider_public_locations as location
  on location.organization_id = organization.id
left join public.provider_services as service
  on service.organization_id = organization.id
group by
  organization.id,
  organization.name,
  organization.approval_status,
  organization.is_public,
  profile.is_public,
  location.is_public
order by visible_in_marketplace_by_rules desc, organization.name;

-- ============================================================
-- C. Booking and history detail for a single provider
-- Replace the UUID before running.
-- ============================================================

-- select
--   booking.id as booking_id,
--   booking.status,
--   booking.booking_mode,
--   booking.scheduled_start_at,
--   booking.scheduled_end_at,
--   booking.provider_service_id,
--   pricing.total_price_cents,
--   pricing.currency_code,
--   thread.id as chat_thread_id,
--   review.id as review_id,
--   support.id as support_case_id
-- from public.bookings as booking
-- left join public.booking_pricing as pricing
--   on pricing.booking_id = booking.id
-- left join public.chat_threads as thread
--   on thread.booking_id = booking.id
-- left join public.reviews as review
--   on review.booking_id = booking.id
-- left join public.support_cases as support
--   on support.booking_id = booking.id
-- where booking.provider_organization_id = '00000000-0000-0000-0000-000000000000'
-- order by booking.scheduled_start_at desc;

-- ============================================================
-- D. Storage review
-- Requires permission to read storage.objects.
-- If unavailable for the current session, skip and use Supabase dashboard.
-- ============================================================

-- select
--   object.bucket_id,
--   split_part(object.name, '/', 1) as organization_id_prefix,
--   count(*) as object_count,
--   max(object.updated_at) as last_storage_update_at
-- from storage.objects as object
-- where object.bucket_id in ('provider-documents', 'provider-avatars', 'booking-operation-evidence')
-- group by object.bucket_id, split_part(object.name, '/', 1)
-- order by object.bucket_id, object_count desc;

-- ============================================================
-- E. NON-DESTRUCTIVE cleanup template
-- DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL.
-- Review IDs first. Keep this block commented by default.
-- ============================================================

-- begin;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_organizations as organization
-- set
--   is_public = false,
--   updated_at = now()
-- from target_providers
-- where organization.id = target_providers.organization_id;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_public_profiles as profile
-- set
--   is_public = false,
--   updated_at = now()
-- from target_providers
-- where profile.organization_id = target_providers.organization_id;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_public_locations as location
-- set
--   is_public = false,
--   updated_at = now()
-- from target_providers
-- where location.organization_id = target_providers.organization_id;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_services as service
-- set
--   is_public = false,
--   is_active = false,
--   updated_at = now()
-- from target_providers
-- where service.organization_id = target_providers.organization_id;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_availability as availability
-- set
--   is_active = false,
--   updated_at = now()
-- from target_providers
-- where availability.organization_id = target_providers.organization_id;
--
-- with target_providers(organization_id) as (
--   values
--     -- ('00000000-0000-0000-0000-000000000000'::uuid)
-- )
-- update public.provider_availability_rules as rule
-- set
--   is_active = false,
--   updated_at = now()
-- from target_providers
-- where rule.organization_id = target_providers.organization_id;
--
-- -- Inspect effects before commit:
-- -- select * from public.provider_organizations where id in (select organization_id from target_providers);
--
-- rollback;
-- -- commit; -- Replace rollback with commit only after approval.

-- ============================================================
-- F. DESTRUCTIVE cleanup template
-- DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL.
-- Prefer RPC delete_provider_organization and only for DELETE_CANDIDATE.
-- This block intentionally remains commented.
-- ============================================================

-- select public.delete_provider_organization('00000000-0000-0000-0000-000000000000'::uuid);

-- ============================================================
-- G. Post-update verification
-- ============================================================

-- Providers still visible in marketplace-like rules:
-- select
--   organization.id,
--   organization.name,
--   organization.approval_status,
--   organization.is_public,
--   profile.is_public as profile_is_public,
--   count(service.id) filter (where service.is_public and service.is_active) as public_active_services
-- from public.provider_organizations as organization
-- join public.provider_public_profiles as profile
--   on profile.organization_id = organization.id
-- left join public.provider_services as service
--   on service.organization_id = organization.id
-- where organization.approval_status = 'approved'
--   and organization.is_public
--   and profile.is_public
-- group by organization.id, organization.name, organization.approval_status, organization.is_public, profile.is_public
-- having count(service.id) filter (where service.is_public and service.is_active) > 0
-- order by organization.name;

-- Historical bookings for hidden providers:
-- select
--   organization.id as organization_id,
--   organization.name,
--   organization.is_public,
--   count(booking.id) as booking_count
-- from public.provider_organizations as organization
-- join public.bookings as booking
--   on booking.provider_organization_id = organization.id
-- where organization.is_public = false
-- group by organization.id, organization.name, organization.is_public
-- order by booking_count desc;
