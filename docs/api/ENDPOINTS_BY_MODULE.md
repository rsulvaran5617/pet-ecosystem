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

## Bookings

- `POST /bookings/preview`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{id}`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `POST /bookings/{id}/cancel`
- `GET /provider/bookings`

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
- `POST /provider/organizations/{id}/services`
- `PATCH /provider/services/{id}`
- `POST /provider/organizations/{id}/availability`
- `PATCH /provider/availability/{id}`
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
