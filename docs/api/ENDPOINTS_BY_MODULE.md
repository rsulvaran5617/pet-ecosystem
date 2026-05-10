# ENDPOINTS_BY_MODULE.md

## Core / Auth

- `POST /auth/register`
- `POST /auth/verify-otp`
- `POST /auth/login`
- `POST /auth/recover-access`
- `POST /auth/recover-access/complete`
- `POST /auth/logout`

## Core / Me

- `GET /me`
- `PATCH /me`
- `GET /me/preferences`
- `PATCH /me/preferences`
- `GET /me/roles`
- `POST /me/roles/switch`
- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/{addressId}`
- `GET /me/payment-methods`
- `POST /me/payment-methods`
- `PATCH /me/payment-methods/{paymentMethodId}/default`

## Households

- `GET /households`
- `POST /households`
- `GET /households/{id}`
- `GET /household-invitations`
- `POST /households/{id}/invitations`
- `POST /household-invitations/{id}/accept`
- `POST /household-invitations/{id}/reject`
- `PATCH /households/{id}/members/{memberId}/permissions`

## Pets / Health / Reminders

- `GET /pets`
- `POST /pets`
- `GET /pets/{id}`
- `PATCH /pets/{id}`
- `POST /pets/{id}/avatar`
- `GET /pets/{id}/documents`
- `POST /pets/{id}/documents`
- `GET /pets/{id}/health`
- `GET /pets/{id}/vaccines`
- `POST /pets/{id}/vaccines`
- `PATCH /pets/{id}/vaccines/{vaccineId}`
- `GET /pets/{id}/allergies`
- `POST /pets/{id}/allergies`
- `PATCH /pets/{id}/allergies/{allergyId}`
- `GET /pets/{id}/conditions`
- `POST /pets/{id}/conditions`
- `PATCH /pets/{id}/conditions/{conditionId}`
- `GET /calendar`
- `POST /reminders`
- `POST /reminders/{id}/complete`
- `POST /reminders/{id}/snooze`

## Marketplace

- `GET /marketplace/home`
- `GET /marketplace/providers`
- `GET /marketplace/providers/{id}`
- `GET /marketplace/provider-locations` (V2 Geo-0)

## Bookings

- `POST /bookings/preview`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{id}`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `POST /bookings/{id}/cancel`
- `GET /bookings/services/{serviceId}/slots` (V2 booking capacity, propuesto)
- `POST /bookings/from-slot` (V2 booking capacity, propuesto)
- `GET /provider/bookings`
- `GET /bookings/{id}/operations`
- `POST /bookings/{id}/operations/check-in`
- `POST /bookings/{id}/operations/check-out`
- `POST /bookings/{id}/operations/tokens` (QR create token, propuesto)
- `POST /bookings/{id}/operations/tokens/consume` (QR consume token, propuesto)
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` (QR revoke token, opcional)
- `GET /bookings/{id}/operations/evidence`
- `POST /bookings/{id}/operations/evidence`
- `GET /bookings/{id}/operations/report-card`
- `PUT /bookings/{id}/operations/report-card`
- `GET /bookings/{id}/operations/internal-notes`
- `POST /bookings/{id}/operations/internal-notes`

Nota: `operations` pertenece a V2 provider operations no financiero; no habilita pagos reales ni payouts. El flujo principal futuro para check-in/check-out sera QR temporal owner -> provider; endpoints manuales quedan como fallback piloto mientras se implementa QR.

Nota V2 booking capacity: `slots` proyecta disponibilidad/capacidad para owner, pero la reserva final debe entrar por RPC transaccional `create_booking_from_slot`; la UI no es fuente de verdad para cupos.

## Messaging

- `GET /chats`
- `GET /chats/{threadId}/messages`
- `POST /chats/{threadId}/messages`

## Reviews

- `GET /bookings/{id}/review`
- `POST /bookings/{id}/review`

## Support

- `GET /support-cases`
- `POST /support-cases`
- `GET /support-cases/{id}`

## Providers

- `GET /provider/organizations`
- `POST /provider/organizations`
- `GET /provider/organizations/{id}`
- `PATCH /provider/organizations/{id}`
- `PUT /provider/organizations/{id}/public-profile`
- `POST /provider/organizations/{id}/public-profile/avatar`
- `PUT /provider/organizations/{id}/public-location` (V2 Geo-0)
- `POST /provider/organizations/{id}/services`
- `PATCH /provider/services/{id}`
- `POST /provider/organizations/{id}/availability`
- `PATCH /provider/availability/{id}`
- `POST /provider/organizations/{id}/availability-rules` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-rules/{ruleId}` (V2 booking capacity, propuesto)
- `POST /provider/availability-rules/{ruleId}/exceptions` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-exceptions/{exceptionId}` (V2 booking capacity, propuesto)
- `GET /provider/organizations/{id}/documents`
- `POST /provider/organizations/{id}/documents`
- `GET /provider/organizations/{id}/approval-status`

## Admin

- `GET /admin/providers/pending`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `GET /admin/support-cases`
- `GET /admin/support-cases/{id}`
- `PATCH /admin/support-cases/{id}`
