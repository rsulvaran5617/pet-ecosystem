# SUPABASE_SCHEMA.md

## Objetivo
Definir el modelo de datos canonico del baseline MVP sobre Supabase/PostgreSQL.

## Principios
- PK `uuid`
- nombres en `snake_case`
- `created_at timestamptz default now()`
- `updated_at timestamptz` cuando aplique
- RLS desde el diseno inicial
- relaciones explicitas
- trazabilidad minima en mutaciones criticas

## Tablas MVP implementadas
- `profiles`
- `user_roles`
- `user_addresses`
- `payment_methods`
- `households`
- `household_members`
- `household_invitations`
- `pets`
- `pet_profiles`
- `pet_documents`
- `pet_vaccines`
- `pet_allergies`
- `pet_conditions`
- `reminders`
- `calendar_events`
- `provider_organizations`
- `provider_public_profiles`
- `provider_services`
- `provider_availability`
- `provider_documents`
- `bookings`
- `booking_pricing`
- `booking_status_history`
- `chat_threads`
- `chat_messages`
- `reviews`
- `support_cases`
- `audit_logs`

## Tablas no implementadas en este baseline
- `payments`
- tablas de `clinic`
- tablas de `commerce`
- tablas de `pharmacy`
- tablas de `finance`
- tablas de `benefits`
- tablas de `telecare`

## Notas de modelo activas
- `payment_methods` almacena solo metodos guardados del usuario. El MVP queda en modo `payment-ready`; no existe captura real de pago.
- `provider_organizations` controla ownership, estado de aprobacion y visibilidad base.
- `provider_public_profiles`, `provider_services` y `provider_availability` alimentan discovery publico.
- `bookings` soporta `pending_approval`, `confirmed`, `completed` y `cancelled`.
- `booking_pricing` congela el snapshot economico al momento de crear la reserva.
- `booking_status_history` conserva la trazabilidad funcional del booking.
- `chat_threads` y `chat_messages` modelan el canal transaccional cliente-proveedor ligado 1:1 a la reserva.
- `reviews` permite una sola review por booking completado.
- `support_cases` permite un solo caso por booking en el MVP actual.
- `audit_logs` registra mutaciones criticas de bookings, approvals de proveedores y soporte admin.

## Regla de cambio
No crear tablas fuera del modelo oficial sin actualizar esta documentacion.
