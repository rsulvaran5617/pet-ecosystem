# Payments MVP+ Design

## Objetivo

Disenar el frente de pagos reales para Pet Ecosystem sin implementarlo todavia.

El baseline actual esta en modo `payment-ready`: guarda metodos de pago y los referencia en reservas, pero no captura dinero, no procesa refunds, no concilia pagos y no liquida a proveedores.

Payments MVP+ debe convertir esa preparacion en un flujo financiero controlado, auditable y seguro.

## Estado actual

### Ya existe

- Tabla `payment_methods` con tarjetas guardadas en modo referencial.
- RLS: cada usuario ve y modifica solo sus propios metodos guardados.
- `bookings.selected_payment_method_id` referencia opcionalmente un metodo guardado.
- `booking_pricing` congela precio del servicio al crear la reserva.
- `preview_booking`, `create_booking` y `create_booking_from_slot` validan `payment_method_id` si se adjunta.
- UI owner permite seleccionar `Sin tarjeta` o un metodo guardado.
- Copy actual aclara que no hay cobro real.

### No existe

- Tabla transaccional `payments`.
- Captura real de cobro.
- Autorizacion o intent de pago.
- Webhooks del proveedor de pago.
- Refunds o cancelaciones financieras.
- Chargebacks/disputas financieras.
- Payouts/liquidaciones a proveedores.
- Pantalla admin de pagos.
- Reconciliacion contable.

## Decision de alcance

Payments MVP+ debe abrirse como frente separado posterior al piloto operativo inicial.

No debe mezclarse con:

- booking capacity
- QR check-in/check-out
- evidencia documental
- geolocalizacion/mapa
- pet memory
- avatares
- clinic/commerce/pharmacy
- memberships o telecare

## Proveedor de pago recomendado

### Recomendacion inicial

Evaluar primero un proveedor con:

- tokenizacion/checkout compatible con mobile
- soporte para merchant en el pais operativo
- webhooks confiables
- refunds
- metadata por reserva
- dashboard operativo
- documentacion robusta
- capacidad futura para marketplace/payouts

Para una primera etapa controlada, la opcion preferida es usar un proveedor con checkout/tokenizacion hospedada o SDK oficial y evitar almacenar PAN/CVV en la app.

### Candidatos

| Proveedor | Uso potencial | Notas |
| --- | --- | --- |
| Stripe | Checkout/payment intents, webhooks, refunds, metadata | Confirmar disponibilidad merchant para Panama antes de implementar. |
| PayPal | Checkout con cuenta/tarjeta segun pais, webhooks | Puede ser alternativa si Stripe no esta disponible para el merchant local. |
| Procesador local/bancario | Tarjetas locales y liquidacion local | Requiere revisar APIs, ambiente sandbox, webhooks y soporte tecnico. |

Decision Payments-0.1: Wompi Panama queda como candidato principal para evaluacion MVP+, sin ser decision irreversible. Antes de crear migraciones se debe validar cuenta comercio, sandbox, contrato, refunds/voids, tiempos de autorizacion y liquidacion.

## Principio de seguridad

La app no debe almacenar ni procesar datos sensibles completos de tarjeta.

Permitido:

- `brand`
- `last4`
- `exp_month`
- `exp_year`
- `cardholder_name`
- `processor_reference`
- tokens/ids generados por el proveedor

No permitido:

- PAN completo
- CVV
- datos de banda/chip
- credenciales secretas en mobile
- secretos del procesador en variables `EXPO_PUBLIC_*`

Las llaves secretas solo deben vivir en backend seguro, preferiblemente Supabase Edge Functions o servidor equivalente.

## Modelo de datos propuesto

### payments

Entidad transaccional principal.

Campos propuestos:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null references bookings(id)`
- `household_id uuid not null references households(id)`
- `payer_user_id uuid not null references auth.users(id)`
- `provider_organization_id uuid not null references provider_organizations(id)`
- `payment_method_id uuid null references payment_methods(id) on delete set null`
- `processor text not null`
- `processor_payment_id text null`
- `processor_client_secret text null` solo si se necesita devolver al cliente y no es secreto de servidor
- `status text not null`
- `currency_code text not null`
- `amount_cents integer not null check (amount_cents >= 0)`
- `application_fee_cents integer not null default 0`
- `provider_net_cents integer not null default 0`
- `failure_code text null`
- `failure_message text null`
- `authorized_at timestamptz null`
- `captured_at timestamptz null`
- `cancelled_at timestamptz null`
- `refunded_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Estados iniciales:

- `requires_payment_method`
- `requires_confirmation`
- `authorized`
- `captured`
- `failed`
- `cancelled`
- `refunded`
- `partially_refunded`

### payment_events

Bitacora append-only de eventos internos y webhooks.

Campos propuestos:

- `id uuid primary key default gen_random_uuid()`
- `payment_id uuid null references payments(id)`
- `booking_id uuid null references bookings(id)`
- `processor text not null`
- `processor_event_id text null`
- `event_type text not null`
- `payload jsonb not null default '{}'::jsonb`
- `received_at timestamptz not null default now()`
- `processed_at timestamptz null`
- `processing_error text null`

Regla: `processor_event_id` debe ser unico cuando exista para evitar reprocesar webhooks.

### payment_refunds

Refunds totales o parciales.

Campos propuestos:

- `id uuid primary key default gen_random_uuid()`
- `payment_id uuid not null references payments(id)`
- `booking_id uuid not null references bookings(id)`
- `processor_refund_id text null`
- `amount_cents integer not null check (amount_cents > 0)`
- `currency_code text not null`
- `reason text null`
- `status text not null`
- `requested_by_user_id uuid null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Estados:

- `pending`
- `succeeded`
- `failed`
- `cancelled`

## Relacion con bookings

### Servicios instant

Opcion recomendada:

1. Owner selecciona slot/servicio.
2. Owner genera preview.
3. App crea/confirmar pago o autorizacion.
4. Reserva se crea o confirma solo si el pago queda autorizado/capturado segun politica.

Decision pendiente:

- Capturar al confirmar reserva.
- Autorizar al confirmar y capturar al check-in o al completion.

Para piloto comercial simple, capturar al confirmar es mas directo.

### Servicios con aprobacion

Opcion recomendada:

1. Owner selecciona slot/servicio.
2. Owner genera preview.
3. Owner confirma solicitud con metodo de pago.
4. Sistema crea reserva `pending_approval`.
5. Pago queda `authorized` o `requires_capture`, no capturado.
6. Provider aprueba.
7. Sistema captura pago y mueve reserva a `confirmed`.
8. Si provider rechaza, se cancela autorizacion.

Si el proveedor de pago no permite autorizaciones suficientemente largas, usar captura diferida no es segura y debe cambiarse el flujo.

## Flujo owner propuesto

### Guardar metodo

1. Owner abre Cuenta > Metodos de pago.
2. App abre componente/tokenizacion del proveedor.
3. Backend recibe token seguro.
4. Backend crea/actualiza customer en procesador.
5. Backend guarda `payment_methods.processor_reference`, marca default si aplica.
6. UI muestra marca, ultimos 4 y vencimiento.

### Pagar reserva

1. Owner selecciona servicio/slot.
2. Owner selecciona metodo de pago.
3. Preview muestra:
   - precio
   - metodo
   - politica de cancelacion
   - si se cobrara ahora o al aprobar
4. Confirmar reserva inicia pago.
5. UI muestra resultado claro:
   - `Pago autorizado`
   - `Pago capturado`
   - `No se pudo procesar el pago`
   - `Reserva pendiente de aprobacion`

## Flujo provider propuesto

### Provider approval requerido

- Si el servicio requiere aprobacion, el provider debe ver que la solicitud tiene pago autorizado antes de aprobar.
- Al aprobar, el sistema intenta captura.
- Si captura falla, la reserva no debe pasar a confirmada sin accion clara.

### Provider visible

El provider no debe ver datos completos de tarjeta.

Puede ver:

- estado de pago
- total
- metodo resumido, por ejemplo `VISA 4242`
- si esta pagado, autorizado o pendiente

No debe ver:

- PAN completo
- CVV
- secretos

## Flujo admin propuesto

Admin debe poder ver:

- reserva
- payment id
- processor id
- status
- amount
- fecha/hora
- fallos
- eventos/webhooks
- refunds

Admin MVP+ no debe ejecutar conciliacion compleja todavia, pero si debe poder diagnosticar.

## RLS esperado

### payments

- Owner/payer puede leer pagos de sus bookings/hogares.
- Miembros del hogar con permiso `pay` o `admin` pueden leer pagos del hogar.
- Provider owner puede leer pagos de bookings de su organizacion, con informacion acotada.
- Admin puede leer todos los pagos.
- Inserts/updates directos por cliente deben estar bloqueados.
- Mutaciones criticas deben entrar por RPC/Edge Function.

### payment_events

- No lectura directa para owner/provider en MVP+.
- Admin puede leer.
- Inserts desde backend/webhook seguro.

### payment_refunds

- Owner puede leer refunds de sus pagos.
- Provider puede leer refunds de bookings de su organizacion.
- Admin puede leer y operar segun politica.
- Creacion de refund desde backend/admin action, no directo desde mobile.

## API propuesta

### Core / payment methods

- `GET /me/payment-methods`
- `POST /me/payment-methods/setup-intent`
- `POST /me/payment-methods/attach`
- `PATCH /me/payment-methods/{id}/default`
- `PATCH /me/payment-methods/{id}/disable`

### Booking payments

- `POST /bookings/{id}/payments/prepare`
- `POST /bookings/{id}/payments/confirm`
- `GET /bookings/{id}/payments`
- `POST /payments/{id}/capture`
- `POST /payments/{id}/cancel`
- `POST /payments/{id}/refund`

### Webhooks

- `POST /payments/webhooks/{processor}`

Los webhooks deben validar firma del proveedor.

## Variables de entorno futuras

No agregarlas hasta seleccionar proveedor.

Variables esperadas:

- `PAYMENT_PROVIDER`
- `PAYMENT_SECRET_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_PUBLIC_KEY` si aplica para web/admin
- `EXPO_PUBLIC_PAYMENT_PUBLIC_KEY` solo si el SDK mobile lo requiere y la llave es publicable

Nunca exponer secret keys en mobile.

## Slices recomendados

### Payments-0.1 Documentacion y decision de proveedor

- Documentado en `docs/payments/PAYMENTS_DECISION_RECORD.md`.
- Piloto controlado queda sin cobro dentro de la app.
- Wompi Panama queda como candidato principal para evaluacion.
- Politica objetivo: captura inmediata para `instant`; preautorizacion/captura para `approval_required` si el proveedor lo confirma.

### Payments-1 Modelo y RLS

- Crear `payments`, `payment_events`, `payment_refunds`.
- Agregar tipos compartidos.
- Agregar RLS.
- Dry-run antes de remoto.

### Payments-2 Payment methods reales

- Integrar tokenizacion/setup intent.
- Reemplazar ingreso manual de tarjeta por flujo seguro del proveedor.
- Guardar solo referencias seguras.

### Payments-3 Checkout booking

- Preparar/confirmar pago durante confirmacion de reserva.
- Mantener booking capacity sin sobreventa.
- No consumir cupo por preview.
- Definir rollback si pago falla.

### Payments-4 Provider approval con captura

- Para `approval_required`, autorizar primero y capturar al aprobar.
- Cancelar autorizacion al rechazar.
- Manejar expiracion de autorizacion.

### Payments-5 Admin payments console

- Ver pagos, eventos, fallos y refunds.
- Acciones controladas de soporte.

### Payments-6 Refunds y cancelaciones

- Politica de cancelacion financiera.
- Refund parcial/total.
- Relacion con `cancellation_deadline_at`.

### Payments-7 Payouts/settlement

- Diferido.
- Requiere datos legales/bancarios del proveedor.
- No mezclar con el primer checkout real.

## Riesgos

- Disponibilidad real del proveedor de pago para el pais operativo.
- Cumplimiento PCI si se maneja tarjeta incorrectamente.
- Reservas con aprobacion pueden requerir autorizaciones que expiran.
- Fallos de webhook pueden dejar estados inconsistentes si no hay idempotencia.
- Reembolsos y cancelaciones requieren politica clara antes de cobrar.
- Payouts introducen obligaciones legales y contables.
- App mobile no debe contener secretos.

## Criterios de aceptacion de Payments-0

- Documento de diseno aprobado.
- Proveedor de pago seleccionado o decision pendiente registrada.
- Politica de captura definida.
- Modelo propuesto revisado.
- RLS esperado documentado.
- Slices pequenos acordados.
- No hay cambios de codigo funcional.
- No hay migraciones aplicadas.

## Recomendacion de siguiente paso

Antes de implementar:

1. Confirmar cuenta comercio/sandbox Wompi Panama o proveedor alterno.
2. Confirmar pais fiscal/merchant y moneda inicial.
3. Validar politica objetivo:
   - captura inmediata para servicios instant
   - autorizacion y captura al aprobar para servicios `approval_required`
4. Abrir Payments-1 solo despues de esas decisiones.
