# Professional verification renewal - 2026-10-26

Base commit d11be90. Local changes only; no migration applied, commit/push or deployment in this task. Real doctor profile and consents unchanged.

- Reproduced the missing action on the actual Android doctor device before implementation; see ../2026-10-26-clinical-device/VALIDATION.md.
- 17 PGlite regression cases PASS: expired/draft submissions, idempotency, anonymous/foreign/suspended/rejected denial, admin-only review, effective expiry/date, closure of residual rights and no revival after verification. Membership is modeled; single connection, no live RLS or contention test.
- 11 Chrome assertions PASS with real professional/admin React components and simulated APIs: renewal CTA, visible expiry, pending transition, fresh owner request after verification, admin expired state/date and review action. No live-profile renewal executed.
- Workspace typechecks PASS, including mobile; lint PASS for web/admin/API/types.
- Web and admin production builds PASS (including lint/type validation and static page generation).
- New migration: 20261027010000_clinical_professional_renewal.sql; requires 20261025020000. Admin-list RPC gains nullable expiry, recreated without CASCADE and with authenticated-only grants. Verify production dependencies/baseline before applying.
- No mobile screen/native changes. Added optional admin DTO field does not require new mobile binaries.
- Publish migration before web and admin. Then renew using the professional account, review using admin, and request/approve a fresh owner consent on a live QR. Do not auto-renew the real profile or restore old consent rows.
