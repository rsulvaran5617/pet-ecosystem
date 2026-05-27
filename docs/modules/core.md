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
- `pet_owner` y `provider` siguen siendo roles autogestionables; `admin` solo se provisiona de forma administrativa
- las preferencias forman parte del perfil base del usuario
- las direcciones pertenecen al usuario, no al hogar
- los metodos de pago guardados pertenecen al usuario
- verificacion y recuperacion se apoyan en Supabase Auth
- la verificacion manual por OTP usa el codigo de email de Supabase Auth y `POST /auth/verify-otp` lo valida con `email + token`
- el acceso mobile debe presentar login por defecto y mantener registro, verificacion OTP y recuperacion como paneles separados para evitar confusion y solicitudes repetidas de correo
- el acceso web sin sesion debe presentar registro, login, verificacion OTP y recuperacion como paneles separados; no debe mostrar todos los formularios a la vez
- la recuperacion de contrasena debe aparecer como accion secundaria del login con una pregunta clara para el usuario
- la experiencia owner web debe usar navegacion lateral por seccion activa; al seleccionar una opcion, solo se muestra el modulo correspondiente para evitar sobrecarga visual
- la pantalla mobile sin sesion debe comportarse como flujo de autenticacion puro; no debe renderizar marketplace, contexto de hogar, proveedores ni modulos que requieran usuario autenticado
- el login exitoso no debe mostrar un aviso global persistente; la app debe llevar al usuario directamente a su contexto y reservar mensajes visibles para errores o acciones que requieran atencion
- el reenvio de OTP de registro usa Supabase Auth `resend` y debe mostrarse como accion controlada para evitar `email rate limit exceeded`
- la recuperacion incluye solicitud de email y actualizacion de password dentro de la sesion recovery de Supabase Auth
- `public.profiles` se sincroniza desde `auth.users` mediante trigger y backfill en base de datos
- la orquestacion de cobro real queda para `bookings` y `payments`

## APIs esperadas
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-otp`
- `POST /auth/resend-verification`
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
