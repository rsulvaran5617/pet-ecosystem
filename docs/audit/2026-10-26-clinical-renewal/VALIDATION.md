# Professional verification renewal - 2026-10-26

Source commit 71dc8b99db15d2af905dd4af08ed3d1b04af833a, pushed to origin/master. Deployment authorized by user. The agent did not submit renewal or administrative decisions for the real doctor.

- Reproduced the missing action on the actual Android doctor device before implementation; see ../2026-10-26-clinical-device/VALIDATION.md.
- 17 PGlite regression cases PASS: expired/draft submissions, idempotency, anonymous/foreign/suspended/rejected denial, admin-only review, effective expiry/date, closure of residual rights and no revival after verification. Membership is modeled; single connection, no live RLS or contention test.
- 11 Chrome assertions PASS with real professional/admin React components and simulated APIs: renewal CTA, visible expiry, pending transition, fresh owner request after verification, admin expired state/date and review action. No live-profile renewal executed.
- Workspace typechecks PASS, including mobile; lint PASS for web/admin/API/types.
- Web and admin production builds PASS (including lint/type validation and static page generation).
- New migration: 20261027010000_clinical_professional_renewal.sql; requires 20261025020000. Admin-list RPC gains nullable expiry, recreated without CASCADE and with authenticated-only grants. Verify production dependencies/baseline before applying.
- No mobile screen/native changes. Added optional admin DTO field does not require new mobile binaries.
- Migration 20261027010000 applied after baseline comparison and eight production PostgreSQL QA assertions in complete rollback. Installed function bodies verified; read-only authenticated admin DB-role check confirms effective expired status and expiry field. See preflight-qa.json, migration-applied.json and installed-admin-check.json.
- Actual connected Android Chrome verified after publication: signed-in expired profile shows enabled renewal button, expiry date and document renewal guidance. No button clicked and no errors. See device-results.json.
- During subsequent observation the phone displayed renewal sent, and a read-only check found one renewal event and a verified profile. This happened through the live user flow; the agent did not click renewal or review buttons. Fresh owner consent is still required; no clinical entry or file mutation was performed by the agent.

## Published surfaces

- web: /var/www/pet-releases/clinical-renewal-71dc8b9-1793064065; build 1jTTorkAf_OufrGAJdwyr. Source hash and public manifest verified. Rollback: /var/www/pet-releases/clinical-cycles-d4ebf7c-1792952254.
- admin: /var/www/pet-releases/clinical-renewal-admin-71dc8b9-1793064272; build Va4itS3IAo5jyatJ5hJu4. Source hash and public manifest verified. Rollback: /var/www/pet-releases/admin-bc7eb81-1792856680.

Both PM2 processes online and saved; candidate processes removed. Web PDF assets verified by deployment script. Actual Android doctor session verified before the user submitted renewal. Published admin verified with a real QA admin HTTP session in Chrome, read-only navigation: server state label, expiry field and Panama timezone explanation PASS. QA browser session signed out locally. See admin-browser-results.json and deployment.json.

Migration applied: 20261027010000. No new mobile binaries required. Rollback of clients does not restore old consents or revert user-submitted renewal.
