# core.md

## Objetivo del modulo
Gestionar identidad, acceso, perfil base y configuracion personal del usuario dentro del MVP.

## Alcance MVP
- onboarding basico
- registro
- login
- verificacion
- recuperacion de acceso end-to-end
- perfil de usuario
- preferencias
- direcciones
- cambio de rol basico
- metodos de pago guardados a nivel usuario

## Fuera de alcance en este modulo
- households
- pets
- marketplace
- bookings
- checkout y captura de pagos
- 2FA
- seguridad reforzada de V2
- `audit_logs`
- `consents`

## Entidades canonicamente asociadas
- `profiles`
- `user_roles`
- `user_addresses`
- `payment_methods`

## Reglas
- un usuario puede tener multiples roles
- solo puede existir un rol activo por usuario
- el rol activo define el contexto visible
- las preferencias forman parte del perfil base del usuario
- las direcciones pertenecen al usuario, no al hogar
- los metodos de pago guardados pertenecen al usuario
- verificacion y recuperacion se apoyan en Supabase Auth
- la verificacion manual por OTP usa el codigo de email de Supabase Auth y `POST /auth/verify-otp` lo valida con `email + token`
- la recuperacion incluye solicitud de email y actualizacion de password dentro de la sesion recovery de Supabase Auth
- `public.profiles` se sincroniza desde `auth.users` mediante trigger y backfill en base de datos
- la orquestacion de cobro real queda para `bookings` y `payments`

## APIs esperadas
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-otp`
- `POST /auth/recover-access`
- `POST /auth/recover-access/complete`
- `POST /auth/refresh`
- `POST /auth/logout`
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

## Dependencias
- Supabase Auth
- `profiles`
- `user_roles`
- `packages/types`
- `packages/api-client`

## Regla de implementacion
No duplicar autenticacion fuera de Supabase Auth y no avanzar desde este modulo a hogares, mascotas o pagos transaccionales.
