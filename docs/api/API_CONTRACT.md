# API_CONTRACT.md

## Nota de implementacion

El baseline actual no expone un backend REST dedicado. El contrato canonicamente se modela como operaciones tipadas sobre Supabase consumidas desde `packages/api-client`.

## Convenciones

- JSON
- UUID
- fechas ISO 8601
- errores consistentes
- contratos alineados a `packages/types`

## Modulos

### Auth

- `POST /auth/register`
- `POST /auth/verify-otp`
- `POST /auth/login`
- `POST /auth/recover-access`
- `POST /auth/recover-access/complete`
- `POST /auth/logout`

### Me

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

### Households

- `GET /households`
- `POST /households`
- `GET /households/{id}`
- `GET /household-invitations`
- `POST /households/{id}/invitations`
- `POST /household-invitations/{id}/accept`
- `POST /household-invitations/{id}/reject`
- `PATCH /households/{id}/members/{memberId}/permissions`

### Pets / Health / Reminders

- `GET /pets`
- `POST /pets`
- `GET /pets/{id}`
- `PATCH /pets/{id}`
- `POST /pets/{id}/memory-status`
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

### Marketplace

- `GET /marketplace/home`
- `GET /marketplace/providers`
- `GET /marketplace/providers/{id}`
- `GET /marketplace/provider-locations` (V2 Geo-0)

### Bookings

- `POST /bookings/preview`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{id}`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `POST /bookings/{id}/cancel`
- `GET /bookings/services/{serviceId}/slots`
- `POST /bookings/from-slot`
- `GET /provider/bookings`
- `GET /bookings/{id}/operations`
- `POST /bookings/{id}/operations/check-in`
- `POST /bookings/{id}/operations/check-out`
- `POST /bookings/{id}/operations/tokens`
- `POST /bookings/{id}/operations/tokens/consume`
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` (opcional)
- `GET /bookings/{id}/operations/evidence`
- `POST /bookings/{id}/operations/evidence`
- `GET /bookings/{id}/operations/report-card`
- `PUT /bookings/{id}/operations/report-card`
- `GET /bookings/{id}/operations/internal-notes`
- `POST /bookings/{id}/operations/internal-notes`

Notas:

- los avatares de mascotas y proveedores usan storage controlado con `storage_bucket` y `storage_path`
- mascotas exponen avatar privado mediante URL firmada temporal
- proveedores exponen avatar publico desde `provider-avatars` mediante URL firmada temporal solo para perfiles/organizaciones visibles
- no se agregan nuevas URLs externas arbitrarias para avatares
- ubicacion publica de proveedor usa `provider_public_locations`, PostGIS y precision `exact | approximate | city`
- Geo-0 no pide permisos de ubicacion, no guarda ubicacion actual del owner y no habilita tracking
- `GET /marketplace/providers` puede recibir `nearLatitude`, `nearLongitude` y `maxDistanceKm` como filtros opcionales tipados; Geo-2 calcula `distanceKm` aproximado en cliente/API solo cuando llegan coordenadas de origen ya disponibles, sin pedir permisos ni exponer direcciones privadas del owner
- Geo-3 construye esos filtros desde una zona aproximada controlada; direcciones privadas del owner quedan diferidas porque el contrato actual de `user_addresses` no expone coordenadas. El contrato no devuelve ni publica `user_addresses`
- `memory-status` permite alternar `active` / `in_memory` sin borrar mascotas ni historiales
- reservas nuevas deben rechazar mascotas `in_memory`
- `approve/reject` aplican solo a `pending_approval`
- `complete` aplica al owner proveedor sobre `confirmed`
- el booking puede referenciar un `payment_method` guardado, pero no captura pago real
- `operations` pertenece a V2 provider operations no financiero
- el timeline operacional devuelve check-in, check-out, evidencia, report card, internal notes y estado operacional derivado
- check-in/check-out deben migrar a flujo principal QR: owner genera token temporal y provider lo consume via RPC/server-side; botones manuales quedan fallback piloto
- evidencia, report card e internal notes solo pueden mutarse por el owner proveedor de la organizacion del booking o por flujos server-side equivalentes
- admin puede leer operaciones para soporte o auditoria operativa
- owner no tiene lectura directa inicial de operaciones
- internal notes no son visibles para owner
- evidencia usa `storage_bucket` y `storage_path`, no URL arbitraria

Contratos V2 booking capacity propuestos:
- `GET /bookings/services/{serviceId}/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` proyecta slots desde reglas de disponibilidad/capacidad y devuelve solo informacion bookable para owner: `slot_start_at`, `slot_end_at`, `availability_rule_id`, `capacity_total`, `available_count`, `status`.
- `POST /bookings/from-slot` crea una reserva desde un slot elegido. Debe ejecutarse como RPC transaccional y validar household/pet, servicio publico, provider aprobado, regla activa, capacidad disponible, precio snapshot y permisos de payment method opcional.
- `POST /bookings/preview` y `POST /bookings` quedan como flujo legacy/compatibilidad hasta que la UI owner migre totalmente a slots.
- `validate_slot_capacity` queda como helper interno; no debe exponerse como mutacion confiable para UI.
- `hold_booking_slot` queda diferido salvo que checkout/pagos reales requieran retencion temporal antes de crear booking.

Estados V2 booking capacity:
- slot `available`: cupos disponibles suficientes.
- slot `low_capacity`: ultimo cupo o umbral bajo.
- slot `full`: sin cupo disponible.
- slot `unavailable`: regla inactiva o excepcion cierra la fecha.
- slot `expired`: inicio en el pasado.

Reglas de cupo:
- `pending_approval` consume cupo.
- `confirmed` consume cupo.
- `completed` mantiene cupo consumido historicamente.
- `cancelled`, `rejected`, `expired` y `provider_cancelled` antes del inicio liberan cupo.
- `no_show` consume cupo por defecto porque el recurso fue reservado.

Contratos QR propuestos:
- `POST /bookings/{id}/operations/tokens` crea un token temporal para `check_in` o `check_out`; solo owner elegible del hogar del booking; devuelve token plano una sola vez y metadata segura.
- `POST /bookings/{id}/operations/tokens/consume` consume token temporal; solo provider elegible de la organizacion del booking; valida hash, expiracion, status, operacion y booking `confirmed`; registra `booking_operations`.
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` revoca token activo; owner elegible/admin; opcional para QR-1.
- Ningun contrato debe exponer `token_hash` a UI normal.

### Messaging / Reviews / Support

- `GET /chats`
- `GET /chats/{threadId}/messages`
- `POST /chats/{threadId}/messages`
- `GET /bookings/{id}/review`
- `POST /bookings/{id}/review`
- `GET /support-cases`
- `POST /support-cases`
- `GET /support-cases/{id}`

### Providers

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
- `GET /provider/organizations/{id}/documents`
- `POST /provider/organizations/{id}/documents`
- `GET /provider/organizations/{id}/approval-status`
- `POST /provider/organizations/{id}/availability-rules` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-rules/{ruleId}` (V2 booking capacity, propuesto)
- `POST /provider/availability-rules/{ruleId}/exceptions` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-exceptions/{exceptionId}` (V2 booking capacity, propuesto)

### Admin

- `GET /admin/providers/pending`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `GET /admin/support-cases`
- `GET /admin/support-cases/{id}`
- `PATCH /admin/support-cases/{id}`
