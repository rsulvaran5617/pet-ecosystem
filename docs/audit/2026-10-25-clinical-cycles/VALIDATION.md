# Clinical authorization cycles - 2026-10-25

Source commit: d4ebf7cf4364a39cf4fa65222dd141ea5d876881, pushed to origin/master. User authorized migration and web deployment on 2026-10-25.

- Migration: 20261025020000_clinical_authorization_cycle_closure.sql.
- 24 SQL regressions passed in PGlite; evidence in regression.json. Run: `node supabase/tests/clinical-authorization-cycles.test.mjs` (uses the same temporary PGlite installation as clinical-write-authorization.test.mjs).
- Web typecheck and ESLint passed. Final production build passed, including form reset/cancel, lint and type validation.
- Cases cover replacement, early revocation, exact expiry, residual permissions after encounter completion, independent professional verification, stale approvals, pending retries, new owner approval, unauthorized actors and helper EXECUTE privileges.
- Permission fixtures model owner membership in a test table. This is not live Supabase RLS/session QA; cryptographic helpers are test-only. No multi-connection contention, native mobile QA or scheduled expiry worker was tested.
- Effective expiry remains enforced by the existing clock-based write/file guards. Read RPCs report effective terminal statuses without a scheduled physical row update. Request creation or QR replacement/revocation persists closure atomically. History is preserved.
- Existing published mobile clients consume unchanged DTOs; this change affects web and SQL only.
- Production baseline checked: six functions matched the expected versions, required prior migrations recorded. Only migration 20261025020000 applied; all eight resulting function bodies match. See migration-applied.json. No professional verification was renewed.
- 31 PostgreSQL integration assertions passed against installed functions using authenticated DB role/JWT subject and labeled QA fixtures; entire QA transaction rolled back. Covers private documents/Storage, new-request closure, approval and revocation. This is not an HTTP-auth-session or device test. See remote-qa.json.
- Seven browser assertions passed with the real React panel and simulated APIs: completed circuit, open/cancel preservation, checked scopes, pending submission and no premature write form. See browser-results.json.
- Mobile compatibility checked against published source 302a3d9: no diff in apps/mobile or clinical API/types; terminal states already handled. No new Android/iOS artifacts or distribution submissions required.

## Published web

Release /var/www/pet-releases/clinical-cycles-d4ebf7c-1792952254; build r1Vac-sJBdv18SGRoCLi4. HTTPS, candidate, PDF worker/font hashes, public manifest and active cwd verified. Panel source matches d4ebf7c. PM2 saved and candidate removed. Admin unchanged; Android beta redirect preserved.

Rollback: /var/www/pet-releases/clinical-auth-19ed1a2-1792944415. Backend lifecycle changes remain applied if web is rolled back; do not restore revoked consents.

Five additional checks passed against deployed assets in clean Chrome (synthetic clinical read response, actual Core login/register forms). Evidence: deployed-results.json and web-deploy.json. Full owner/vet HTTP-session workflow and physical-device QA remain unverified.
