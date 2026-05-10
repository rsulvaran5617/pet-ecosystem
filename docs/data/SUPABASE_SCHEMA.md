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
- `provider_public_locations` (V2 Geo-0)
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
- `provider_public_locations` prepara marketplace geolocalizado V2 con PostGIS y precision publica controlada; no usa ni expone direcciones privadas de owners.
- `pet_profiles` puede referenciar avatar privado mediante `avatar_storage_bucket` y `avatar_storage_path` en bucket `pet-avatars`.
- `pets.status` permite `active` e `in_memory`; `in_memory_at` registra el cierre sensible sin borrar datos ni historial.
- `provider_public_profiles` puede referenciar avatar publico controlado mediante `avatar_storage_bucket` y `avatar_storage_path` en bucket privado `provider-avatars`; `avatar_url` queda solo como compatibilidad legacy.
- Geo-0 habilita extension PostGIS y `provider_public_locations.geo_point geography(Point, 4326)` para futura busqueda por cercania/mapa.
- V2 booking capacity propone reglas de disponibilidad por servicio con capacidad y excepciones por fecha; `provider_availability` actual se conserva para compatibilidad hasta migrar.
- `bookings` soporta `pending_approval`, `confirmed`, `completed` y `cancelled`.
- `booking_pricing` congela el snapshot economico al momento de crear la reserva.
- `booking_status_history` conserva la trazabilidad funcional del booking.
- `chat_threads` y `chat_messages` modelan el canal transaccional cliente-proveedor ligado 1:1 a la reserva.
- `reviews` permite una sola review por booking completado.
- `support_cases` permite un solo caso por booking en el MVP actual.
- `audit_logs` registra mutaciones criticas de bookings, approvals de proveedores y soporte admin.

## Regla de cambio
No crear tablas fuera del modelo oficial sin actualizar esta documentacion.

## Tablas V2 propuestas pendientes de migracion

### provider_availability_rules

Entidad propuesta para V2 booking capacity. Representa reglas recurrentes por servicio, no bookings concretos.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references provider_organizations(id) on delete cascade`
- `provider_service_id uuid not null references provider_services(id) on delete cascade`
- `day_of_week smallint not null check (day_of_week between 0 and 6)`
- `starts_at time not null`
- `ends_at time not null`
- `capacity integer not null check (capacity > 0)`
- `is_active boolean not null default true`
- `effective_from date null`
- `effective_until date null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reglas conceptuales:

- la regla pertenece al owner de la organizacion del servicio.
- `ends_at` debe ser posterior a `starts_at`.
- `provider_service_id` debe pertenecer a `organization_id`.
- CAP-1 debe decidir si permite solapamiento de reglas del mismo servicio/dia; recomendacion inicial: bloquear solapamientos activos.
- la capacidad configura cupos maximos por slot proyectado.

### provider_availability_exceptions

Entidad propuesta para cerrar o ajustar fechas concretas sin borrar la regla recurrente.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `availability_rule_id uuid not null references provider_availability_rules(id) on delete cascade`
- `exception_date date not null`
- `is_available boolean not null default false`
- `capacity_override integer null check (capacity_override is null or capacity_override >= 0)`
- `starts_at_override time null`
- `ends_at_override time null`
- `reason text null`
- `created_by_user_id uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reglas conceptuales:

- una excepcion puede cerrar la fecha (`is_available = false`) o ajustar capacidad/horario.
- capacity `0` o `is_available = false` vuelve el slot `unavailable`.
- debe existir unicidad por regla y fecha.

### bookings slot fields

Campos propuestos sobre `bookings` para trazabilidad V2:

- `availability_rule_id uuid null references provider_availability_rules(id) on delete set null`
- `slot_start_at timestamptz null`
- `slot_end_at timestamptz null`

Reglas conceptuales:

- bookings existentes conservan `null` en estos campos.
- bookings creados por `create_booking_from_slot` deben guardar regla e intervalo.
- `scheduled_start_at`/`scheduled_end_at` siguen siendo el rango canonico operacional.
- `slot_start_at`/`slot_end_at` permiten conteo de cupos y auditoria del slot seleccionado.

### booking_operations

Entidad propuesta para V2 provider operations. La migracion relacionada es `supabase/migrations/20260504140000_booking_operations_v2.sql`.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null references bookings(id) on delete cascade`
- `operation_type text not null check (operation_type in ('check_in', 'check_out'))`
- `created_by_user_id uuid not null references auth.users(id) on delete cascade`
- `location_latitude numeric(9,6) null`
- `location_longitude numeric(9,6) null`
- `location_label text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reglas conceptuales:

- representa eventos de ejecucion operacional de una reserva
- check-in y check-out pertenecen al provider owner de la organizacion del booking
- se permite un unico check-in y un unico check-out por booking mediante indices unicos parciales
- las mutaciones directas quedan limitadas a provider owner sobre bookings `confirmed`
- no cambia `bookings.status` por si sola

### booking_operation_evidence

Entidad propuesta para metadata de evidencia operacional.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null references bookings(id) on delete cascade`
- `storage_bucket text not null default 'booking-operation-evidence'`
- `storage_path text not null`
- `file_name text not null`
- `file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 52428800)`
- `mime_type text null`
- `uploaded_by_user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`

Reglas conceptuales:

- guarda metadata relacional de evidencia; el archivo vive en el bucket privado `booking-operation-evidence`
- `storage_path` debe iniciar con el `booking_id` para permitir scoping por RLS/storage
- owner no lee evidencia en esta iteracion conservadora
- evidencia queda limitada a provider/admin hasta definir visibilidad de cliente
- la primera iteracion limita la cantidad de evidencias por booking desde API client, pero debe evaluarse si requiere constraint o RPC server-side
- en el modelo QR, evidencia no es prueba principal de presencia; documenta actividad posterior a check-in/check-out

### booking_operation_tokens

Entidad propuesta para QR-1 provider operations. Permite que el owner/familia muestre un QR temporal para check-in/check-out y que el proveedor lo consuma sin exponer `booking_id` plano ni permitir replay.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null references bookings(id) on delete cascade`
- `operation_type text not null check (operation_type in ('check_in', 'check_out'))`
- `token_hash text not null unique`
- `token_preview text null`
- `status text not null check (status in ('active', 'used', 'expired', 'revoked'))`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `used_by_user_id uuid null references auth.users(id)`
- `created_by_user_id uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `revoked_at timestamptz null`
- `revoked_by_user_id uuid null references auth.users(id)`

Reglas conceptuales:

- no guardar token plano de forma persistente
- el token plano se devuelve solo al crear el QR
- token single-use con expiracion corta
- revocar tokens activos previos del mismo booking y `operation_type` al crear uno nuevo
- consumo valida booking `confirmed`, secuencia operacional y ownership provider
- owner genera tokens solo para reservas de su hogar
- provider consume tokens solo para reservas de su organizacion

### booking_operation_report

Entidad propuesta para report card operacional.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null unique references bookings(id) on delete cascade`
- `report_text text check (char_length(report_text) <= 500)`
- `created_by_user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reglas conceptuales:

- existe como maximo un report card por booking
- lo crea o actualiza el provider owner de la organizacion del booking
- admin puede leerlo para soporte o auditoria operativa
- en esta migracion conservadora owner no lee report card hasta que exista una decision explicita de visibilidad

### booking_operation_notes

Entidad propuesta para notas internas operativas.

Campos conceptuales:

- `id uuid primary key default gen_random_uuid()`
- `booking_id uuid not null references bookings(id) on delete cascade`
- `note_text text not null check (char_length(note_text) > 0 and char_length(note_text) <= 1000)`
- `created_by_user_id uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Reglas conceptuales:

- las notas son internas para provider/admin
- owner no debe verlas
- no reemplazan chat ni soporte
- deben quedar protegidas por RLS antes de aplicar migracion.
