# ENDPOINTS_BY_MODULE.md

## Core / Auth
- POST /auth/register
- POST /auth/verify-otp
- POST /auth/login
- POST /auth/recover-access
- POST /auth/recover-access/complete
- POST /auth/refresh
- POST /auth/logout

## Core / Me
- GET /me
- PATCH /me
- GET /me/preferences
- PATCH /me/preferences
- GET /me/roles
- POST /me/roles/switch
- GET /me/addresses
- POST /me/addresses
- PATCH /me/addresses/{addressId}
- GET /me/payment-methods
- POST /me/payment-methods
- PATCH /me/payment-methods/{paymentMethodId}/default

## Households
- GET /households
- POST /households
- GET /households/{id}
- POST /households/{id}/invitations
- PATCH /households/{id}/members/{memberId}/permissions

## Pets
- GET /pets
- POST /pets
- GET /pets/{id}
- PATCH /pets/{id}
- GET /pets/{id}/timeline

## Health
- GET /pets/{id}/vaccines
- POST /pets/{id}/vaccines
- GET /pets/{id}/allergies
- POST /pets/{id}/allergies
- GET /pets/{id}/conditions
- POST /pets/{id}/conditions

## Reminders
- GET /calendar
- POST /reminders
- POST /reminders/{id}/complete
- POST /reminders/{id}/snooze

## Marketplace
- GET /marketplace/home
- GET /marketplace/providers
- GET /marketplace/providers/{id}

## Bookings
- POST /bookings/preview
- POST /bookings
- GET /bookings
- POST /bookings/{id}/cancel
- POST /bookings/{id}/reschedule

## Messaging
- GET /chats
- GET /chats/{threadId}/messages
- POST /chats/{threadId}/messages

## Providers
- POST /provider/organization
- POST /provider/services
- POST /provider/availability
- GET /provider/dashboard
- POST /provider/bookings/{id}/accept
- POST /provider/bookings/{id}/reject

## Admin
- GET /admin/dashboard
- GET /admin/providers/pending
- POST /admin/providers/{id}/approve
- POST /admin/providers/{id}/reject
