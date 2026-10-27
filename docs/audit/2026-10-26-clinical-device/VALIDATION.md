# Controlled doctor-device check - 2026-10-26

Actual connected Android/Chrome clinical tab inspected, then reloaded with cache bypass. Existing session preserved; no mock APIs. No clinical writes, consent changes or professional verification changes performed.

Times below are America/Panama (UTC-05:00): current QR created October 26 at 20:06:45, expires 21:06:45, active and not revoked at inspection 20:08:43. Professional verification still expires October 24 at 23:59:59. No request exists for this QR/professional pair.

- PASS: signed-in identity recognized and basic QR record readable (RPC 200).
- BLOCKED: request/registration action absent; panel reports expired professional verification and offers logout only.
- PASS security / BLOCKED usability: protected documents RPC denied (400); recovery link returns to the same panel without renewal action.
- NOT_RUN: fresh owner approval, protected file viewing and new clinical entry; prerequisite verification is expired.

Conclusion: a new valid QR does not renew platform verification. The missing recovery route reported October 25 remains unresolved; this run independently reproduces it on a newly generated link. Renewal must be administratively reviewed and must not restore previous consents. No clock discrepancy inferred from the UTC/Panama date boundary. Screenshot, account identifiers and QR tokens are not committed.
