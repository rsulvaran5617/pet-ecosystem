# Clinical authorization cycles - 2026-10-25

Base commit: 1194a6d. Changes are local and uncommitted. No production writes, migration application or deployment performed for this change.

- Migration: 20261025020000_clinical_authorization_cycle_closure.sql.
- 24 SQL regressions passed in PGlite; evidence in regression.json. Run: `node supabase/tests/clinical-authorization-cycles.test.mjs` (uses the same temporary PGlite installation as clinical-write-authorization.test.mjs).
- Web typecheck and ESLint passed. Final production build passed, including form reset/cancel, lint and type validation.
- Cases cover replacement, early revocation, exact expiry, residual permissions after encounter completion, independent professional verification, stale approvals, pending retries, new owner approval, unauthorized actors and helper EXECUTE privileges.
- Permission fixtures model owner membership in a test table. This is not live Supabase RLS/session QA; cryptographic helpers are test-only. No multi-connection contention, real browser interaction, native mobile QA or scheduled expiry worker was tested.
- Effective expiry remains enforced by the existing clock-based write/file guards. Read RPCs report effective terminal statuses without a scheduled physical row update. Request creation or QR replacement/revocation persists closure atomically. History is preserved.
- Existing published mobile clients consume unchanged DTOs; this change affects web and SQL only.
- Before deployment: verify the production migration baseline and function definitions, apply only this migration, publish the matching web change, then test revoke -> new request -> approve with QA identities. Do not renew a real professional profile implicitly.
