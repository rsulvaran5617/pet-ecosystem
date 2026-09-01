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
  - `role text`: `pet_owner`, `provider`, `protective_family` o `admin`.
  - Role-Foster-A permite `protective_family` como rol autogestionable de experiencia; no concede por si solo permisos Foster.
- `user_addresses`
- `payment_methods`
- `households`
- `household_members`
- `household_invitations`
- `pets`
- `pet_profiles`
  - `foster_intake_date date null`: fecha real de ingreso a acogida para mascotas bajo hogares `protective`; nullable para mascotas owner e historicas, sin backfill automatico desde `pets.created_at`.
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

## Reminders

- `reminders`
  - `due_at timestamptz` conserva la fecha/hora canonica del recordatorio.
  - `remind_time_enabled boolean default false` indica si el usuario activo una hora explicita para avisos locales.
  - recordatorios existentes quedan compatibles con `remind_time_enabled = false`.
- `calendar_events`
  - sigue reflejando `reminders.due_at` como `starts_at`.
  - no incorpora bookings ni push remoto.

## Foster-3A/3B adopcion controlada

- `pet_adoption_listings`
  - publicacion responsable para una mascota existente.
  - referencia `pet_id` a `pets(id)` y `household_id` a `households(id)`.
  - estados: `draft`, `pending_review` legacy, `published`, `paused`, `closed`, `rejected`, `adopted`.
  - campos publicos seguros: historia, personalidad, resumen de salud publico, requisitos, compatibilidades, necesidades especiales, ciudad y pais.
  - `responsibility_acknowledged_at` / `responsibility_acknowledged_by_user_id` registran la aceptacion de responsabilidad al publicar sin revision previa por ficha.
- `pet_adoption_listing_media`
  - galeria de la publicacion.
  - bucket privado `pet-adoption-media`, path privado, portada, orden y estado de moderacion.
  - Foster-3B permite hasta 8 fotos por publicacion.
  - desde FOSTER-MEDIA-DIRECT-1, fotos nuevas de Familias Protectoras aprobadas quedan `approved` bajo responsabilidad directa y no cambian el estado de la publicacion.
  - solo media `approved` es visible para adoptantes; owner/admin conservan trazabilidad de estados historicos o moderados.

RPCs Foster-3B:
- `set_pet_adoption_listing_cover(target_media_id)`
- `review_pet_adoption_listing_media(target_media_id, decision, notes)`
- `submit_pet_adoption_listing(target_listing_id, responsibility_acknowledged)` publica directo bajo responsabilidad de la Familia Protectora aprobada y habilita `share_status`.

No hay duplicacion de mascotas ni transferencia automatica de custodia en Foster-3A/3B.

FOSTER-INTAKE-DATE-1 propone migracion local `20260813170000_foster_pet_intake_date.sql`: agrega `pet_profiles.foster_intake_date` y amplia `create_pet` / `update_pet` con `next_foster_intake_date` opcional. No requiere policy nueva porque hereda permisos de mascota/perfil.

FOSTER-PET-DOCUMENTS-1 no agrega migracion: las mascotas bajo acogida usan `pet_documents` y el bucket privado `pet-documents` con las mismas funciones de documento existentes.

FOSTER-EXPENSES-1 propone migracion local `20260813190000_foster_pet_expenses.sql`: crea `foster_pet_expenses` para gastos privados de mascotas bajo acogida, con `receipt_document_id` opcional hacia `pet_documents`. No publica gastos ni crea pagos.

## Foster-5 adopcion responsable operativa

Tablas y cambios locales:

- `protective_household_public_profiles`
  - perfil publico moderado de la familia protectora.
  - separado de `protective_household_profiles`, que conserva revision interna/admin.
  - debe usar `public_slug`, ciudad/pais, historia/mision, necesidades y politica de contacto controlada.
  - puede usar logo controlado con `logo_storage_bucket` / `logo_storage_path` en bucket privado `protective-household-logos`; cambiarlo requiere nueva moderacion.
  - puede declarar redes sociales publicas opcionales (`website_url`, `instagram_url`, `facebook_url`, `tiktok_url`, `whatsapp_url`) para mostrarlas solo en el detalle de adopcion.
  - FOSTER-DONATIONS-1 agrega informacion opcional de apoyo declarada por la familia protectora: `donations_enabled`, `donation_title`, `donation_description`, `donation_ach_details`, `donation_yappy_details`, `donation_paypal_details`, `donation_external_url`, `donation_other_details` y `donation_disclaimer`.
  - `donation_external_url` debe ser `https://` cuando existe.
  - editar datos de apoyo usa el mismo RPC de perfil publico y vuelve el perfil a `draft`, `is_public = false`, con nueva revision admin requerida.
- `pet_adoption_applications`
  - solicitud formal de adopcion para una publicacion aprobada.
  - no cambia custodia ni mueve `pets.household_id`.
  - exige usuario autenticado y compromiso responsable.
  - estados: `submitted`, `withdrawn`, `in_review`, `approved`, `rejected`, `converted_to_transfer`.
  - lectura RLS para solicitante, familia protectora propietaria de la publicacion y admin.
- `pet_adoption_application_status_history`
  - Foster-5D.1 implementado localmente para historial de cambios de estado del pipeline de solicitudes.
  - campos: `application_id`, `from_status`, `to_status`, `changed_by_user_id`, `change_notes`, `created_at`.
  - no debe mover custodia ni iniciar transferencia.

Foster-5 aplicado remoto:

- `pet_adoption_listings.public_slug` para ficha publica compartible.
- Foster-5B queda aplicado remoto con:
  - `pet_adoption_listings.public_slug text not null unique`.
  - `pet_adoption_listings.share_status text default disabled`.
  - `pet_adoption_listings.share_published_at timestamptz`.
  - RPC `get_public_pet_adoption_listing_by_slug(target_slug text)`.
  - lectura publica condicionada a publicacion `published`, `share_status = enabled`, media aprobada, hogar `protective`, perfil protector interno `approved` y perfil publico protector `approved` + `is_public`.
- `pet_adoption_listings.share_status` para controlar si una ficha puede compartirse.
- Foster-5C queda aplicado remoto con:
  - tabla `pet_adoption_applications`.
  - RPCs `create_pet_adoption_application`, `list_my_pet_adoption_applications`, `list_received_pet_adoption_applications`, `withdraw_pet_adoption_application` y `list_pet_adoption_applications_for_admin`.
  - validacion server-side para aceptar solicitudes solo sobre publicaciones `published` + `share_status = enabled`, hogar `protective`, perfil protector interno `approved`, perfil publico protector `approved` + `is_public` y mascota `active`.

Foster-5 debe seguir usando buckets privados y URLs firmadas temporales; no se crean buckets publicos.

Foster-5D.1 aplicado remoto:
- amplia `pet_adoption_applications.status` para incluir `interview`.
- mantiene `pet_adoption_applications.status` como estado actual y registra cada cambio en `pet_adoption_application_status_history`.
- muta estados solo via RPC transaccional `update_pet_adoption_application_status`, sin update directo desde cliente.
- agrega RPCs `get_pet_adoption_application_detail` y `list_pet_adoption_application_status_history`.
- reserva `converted_to_transfer` para Foster-5E.

Foster-5E aplicado remoto:
- amplia `pet_adoption_listings.status` con `adopted`.
- agrega `pet_transfer_records.adoption_application_id` para vincular una transferencia privada a una solicitud aprobada.
- agrega RPC `start_pet_adoption_transfer` para iniciar transferencia privada desde solicitud `approved` sin mover custodia.
- extiende `accept_pet_transfer` para que, al aceptar una transferencia vinculada a adopcion, mueva custodia por Foster-2A, marque la solicitud `converted_to_transfer` y cierre la publicacion como `adopted`.
- agrega RPC `get_pet_adoption_closure_detail`.
- discovery publico sigue mostrando solo publicaciones `published`; la ficha por slug puede mostrar `adopted` en modo lectura.

Foster-6A/6B compromiso documental:
- migracion local `20260726143000_foster_adoption_commitment_documents.sql`.
- bucket privado `foster-adoption-documents`, maximo 10 MB, PDF/JPEG/PNG/WEBP.
- tabla `protective_household_adoption_commitment_templates`: plantilla activa de compromiso por household `protective`.
- tabla `pet_adoption_application_commitment_documents`: documento completado por solicitud, con estados `pending`, `received`, `reviewed`, `needs_correction`.
- RPCs: `get_protective_adoption_commitment_template`, `upsert_protective_adoption_commitment_template`, `get_pet_adoption_application_commitment_document`, `register_pet_adoption_application_commitment_document`, `review_pet_adoption_application_commitment_document`.
- no bloquea automaticamente aprobacion/transferencia y no cambia custodia.

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
- `delete_provider_organization` permite borrar solo negocios sin historial operacional; bloquea reservas, conversaciones, resenas y soporte, registra auditoria y elimina datos maestros. La limpieza de storage asociado se realiza mediante Supabase Storage API desde el cliente tipado.
- `provider_public_locations` prepara marketplace geolocalizado V2 con PostGIS y precision publica controlada; no usa ni expone direcciones privadas de owners.
- `pet_profiles` puede referenciar avatar privado mediante `avatar_storage_bucket` y `avatar_storage_path` en bucket `pet-avatars`.
- `pet_profiles.is_sterilized` guarda estado descriptivo nullable de esterilizacion para mascotas existentes y nuevas.
- `pets.status` permite `active` e `in_memory`; `in_memory_at` registra el cierre sensible sin borrar datos ni historial.
- `provider_public_profiles` puede referenciar avatar publico controlado mediante `avatar_storage_bucket` y `avatar_storage_path` en bucket privado `provider-avatars`; `avatar_url` queda solo como compatibilidad legacy.
- Geo-0 habilita extension PostGIS y `provider_public_locations.geo_point geography(Point, 4326)` para futura busqueda por cercania/mapa.
- V2 booking capacity propone reglas de disponibilidad por servicio con capacidad y excepciones por fecha; `provider_availability` actual se conserva para compatibilidad hasta migrar. Los RPCs de slots calculan los horarios del piloto en `America/Panama` y guardan instantes `timestamptz` en UTC.
- `bookings` soporta `pending_approval`, `confirmed`, `completed` y `cancelled`.
- `booking_pricing` congela el snapshot economico al momento de crear la reserva.
- `booking_status_history` conserva la trazabilidad funcional del booking.
- `chat_threads` y `chat_messages` modelan el canal transaccional cliente-proveedor ligado 1:1 a la reserva.
- `reviews` permite una sola review por booking completado.
- `support_cases` permite un solo caso por booking en el MVP actual.
- `audit_logs` registra mutaciones criticas de bookings, approvals de proveedores y soporte admin.
- V2 Pet Travel Passport propone entidades conceptuales para expediente internacional de mascota: `pet_identifications`, `pet_travel_profiles`, `pet_travel_documents`, `pet_travel_requirements`, `pet_travel_checklists`, `pet_travel_checklist_items`, `pet_travel_events` y `pet_document_validations`. No estan implementadas ni tienen migracion; deben reutilizar `pets`, `pet_profiles`, `pet_documents`, salud y reminders cuando aplique.
- V2.5 Familias Protectoras/Foster prepara `protective_household_profiles` como Foster-1A local mediante migracion `20260620133000_foster_1a_protective_household_profiles.sql`; `pet_custody_contexts` y `pet_transfer_records` siguen conceptuales para slices posteriores. La migracion Foster-1A requiere dry-run/aprobacion antes de aplicarse remoto.

## Regla de cambio
No crear tablas fuera del modelo oficial sin actualizar esta documentacion.

## Tablas V2 propuestas pendientes de migracion

### Familias protectoras / transferencia privada de mascota (V2.5)

Entidades Foster:

- `protective_household_profiles`: implementada/aplicada por Foster-1A.
- `pet_custody_contexts`: implementada/aplicada por Foster-2A.
- `pet_transfer_records`: implementada/aplicada por Foster-2A.
- `households.household_type`: propuesto para el siguiente slice de separacion owner/protective.

Objetivo:

- permitir que un hogar/familia aprobado por admin actue como familia protectora, fundacion, rescatista u hogar temporal.
- transferir una mascota existente hacia otra familia con consentimiento y trazabilidad, conservando expediente permitido.
- preparar el camino para foster/adoption publico sin abrir marketplace de adopcion todavia.

Reglas conceptuales:

- `households` sigue siendo el hogar base, pero debe incorporar un tipo operativo principal.
- valores propuestos para `households.household_type`: `owner`, `protective`.
- default conservador: `owner`.
- `protective_household_profiles` solo debe asociarse a hogares `protective`.
- una fila de `households` no debe ser owner y protective al mismo tiempo.
- la transferencia no duplica mascotas y conserva `pets.id`.
- el RPC de aceptacion Foster-2A actualiza custodias/ownership de forma transaccional y registra audit trail.
- documentos medicos y salud pueden viajar con consentimiento; reservas, chats, soporte y datos privados del hogar anterior no se comparten automaticamente.
- admin debe poder aprobar/suspender perfiles protectores y auditar transferencias.

Migracion futura recomendada:

- agregar columna `household_type text not null default 'owner'`.
- agregar check `household_type in ('owner', 'protective')`.
- indexar `households(household_type)`.
- antes de transformar hogares con perfiles protectores existentes, ejecutar diagnostico de:
  - hogares con `protective_household_profiles`.
  - hogares con publicaciones Foster.
  - hogares con transferencias Foster.
  - hogares con mascotas y reservas activas.
- no cambiar `pets.household_id` en esta migracion.

Migracion local preparada:

- `supabase/migrations/20260629110000_household_type_owner_protective.sql`.
- agrega `household_type` y helper `is_protective_household`.
- redefine `is_approved_protective_household` para exigir `household_type = 'protective'`.
- refuerza submit/insert de perfil protector.
- redefine `create_household(next_name, next_household_type default 'owner')` para crear hogares familiares o protectores de forma explicita.
- no incluye update automatico a `protective`; requiere decision/manual backfill previa a aplicacion remota.

Foster-1A `protective_household_profiles`:

- `household_id uuid primary key references households(id) on delete cascade`
- `status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected', 'suspended'))`
- `display_name text not null`
- `organization_type text not null check (organization_type in ('individual_rescuer', 'foster_home', 'foundation', 'temporary_home', 'other'))`
- `city text not null`
- `state_region text null`
- `country_code text not null default 'PA'`
- `contact_notes text null`
- `public_notes text null`
- `review_notes text null`
- `submitted_at timestamptz null`
- `reviewed_by_user_id uuid null references auth.users(id)`
- `reviewed_at timestamptz null`
- `created_by_user_id uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints esperados:

- solo un perfil protector por hogar.
- `submitted_at` requerido para `pending_review`.
- `reviewed_by_user_id` y `reviewed_at` requeridos para `approved`, `rejected` o `suspended`.
- no borrar perfiles aprobados/suspendidos desde cliente; usar cambio de estado.

Foster-2A `pet_custody_contexts`:

- `id uuid primary key default gen_random_uuid()`
- `pet_id uuid not null references pets(id) on delete cascade`
- `household_id uuid not null references households(id) on delete restrict`
- `custody_type text check (owner | foster | rescue | temporary)`
- `status text check (active | ended | transferred | cancelled)`
- `started_at timestamptz`
- `ended_at timestamptz null`
- `created_by_user_id uuid`
- timestamps.
- indice unico parcial: una custodia `active` por mascota.

Foster-2A `pet_transfer_records`:

- `id uuid primary key default gen_random_uuid()`
- `pet_id uuid not null references pets(id) on delete restrict`
- `from_household_id uuid not null`
- `to_household_id uuid null`
- `recipient_email text not null`
- `recipient_user_id uuid null`
- `initiated_by_user_id uuid not null`
- `accepted_by_user_id uuid null`
- `status text check (pending | accepted | rejected | cancelled | expired)`
- `consent_snapshot jsonb`
- `transfer_notes text null`
- `expires_at`, `accepted_at`, `rejected_at`, `cancelled_at`, `expired_at`.
- indice unico parcial: una transferencia `pending` por mascota.

RPCs Foster-2A:

- `create_pet_transfer_invitation`
- `accept_pet_transfer`
- `reject_pet_transfer`
- `cancel_pet_transfer`
- `list_incoming_pet_transfer_invitations`
- `list_outgoing_pet_transfer_records`
- `list_pet_custody_history`
- `list_pet_transfer_records_for_admin`

### Pet Travel Passport / Expediente Internacional

Entidades conceptuales propuestas para V2:

- `pet_identifications`
- `pet_travel_profiles`
- `pet_travel_documents`
- `pet_travel_requirements`
- `pet_travel_checklists`
- `pet_travel_checklist_items`
- `pet_travel_events`
- `pet_document_validations`

Objetivo:

- organizar identidad, documentos, vacunas, certificados, requisitos y vencimientos de viaje por mascota.
- soportar checklist manual y, en un slice futuro, checklist por pais con fuentes oficiales.
- permitir revision documental asistida sin prometer validez oficial.

Reglas conceptuales:

- toda entidad cuelga de `pet_id`, `household_id` o `pet_travel_profile_id`.
- documentos deben reutilizar `pet_documents` o un modelo equivalente con bucket privado.
- `pet_documents` soporta vigencia documental con `has_expiration`, `issued_at`, `expires_at` y `expiration_warning_days`; el archivo sigue viviendo en storage privado y la metadata respeta permisos del hogar.
- microchip, documentos sanitarios y datos de viaje son informacion sensible.
- no exponer datos de viaje ni microchip en marketplace.
- checklist por pais requiere `official_source_url` y `source_reviewed_at` antes de considerarse confiable.
- la app no emite pasaporte oficial ni certificado sanitario oficial.

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

## Adoption Public Funnel Slice 4

La migracion local `20260821110000_adoption_public_funnel_slice4.sql` prepara:

- `adoption_public_requests`: interes inicial enviado desde una ficha publica, con listing, hogar protector, mascota, contacto, motivacion, contexto basico, consentimiento y estado.
- `adoption_public_request_status_history`: historial inmutable de transiciones del contacto.
- RPC publica `create_public_adoption_request` con validacion de publicacion, consentimiento, honeypot, duplicados y rate limit.
- RPCs autenticadas `list_received_public_adoption_requests` y `update_public_adoption_request_status` para la consola Foster.

No crea solicitudes formales, transferencias ni cambios en `pets.household_id`.

## Adoption Public Funnel Slice 5

- Migracion local `20260822100000_adoption_public_funnel_slice5_invites.sql`.
- Tabla `adoption_invites` con token hasheado, expiracion y estados controlados.
- RPC autenticada `create_adoption_invite` y RPC publica segura `resolve_adoption_invite`.
- `adoption_public_requests.status` incorpora `invited_to_app`.
- No crea solicitud formal, transferencia ni cambio de custodia.

## Adoption Public Funnel Slice 6

- Migracion local `20260822143000_adoption_public_funnel_slice6_owner_conversion.sql`.
- `adoption_invites.formal_application_id` enlaza la conversion formal sin duplicar aplicaciones.
- RPCs autenticadas `claim_adoption_invite` y `convert_public_request_to_adoption_application`.
- `adoption_public_requests.status` incorpora `converted_to_application`.
- Claim exige correo destinatario y conversion exige hogar `owner` administrable.
# Adoption public funnel Slice 8

- `adoption_funnel_events`: eventos publicos permitidos sin PII, asociados a Familia Protectora y opcionalmente a publicacion.
- RPC publica `record_public_adoption_funnel_event` valida slug y evento.
- RPC autenticada `get_adoption_funnel_metrics` devuelve agregados por household y periodo.
# PET ALERT Slice 4

- `public.pet_alert_community_sightings`: reportes comunitarios autenticados, compartibles mediante DTO sanitizado y con expiracion obligatoria.
- `public.pet_alert_community_sighting_history`: historial append-only de altas y cierres.
- RPCs: `create_pet_alert_community_sighting`, `get_public_pet_alert_community_sighting_by_slug`, `list_public_pet_alert_community_sightings`, `list_my_pet_alert_community_sightings`, `close_pet_alert_community_sighting`.
# PET ALERT Slice 5

- `pet_alert_community_claims`: solicitud autenticada de coincidencia sobre un reporte comunitario, datos privados del reclamante, decision y snapshot de contacto autorizado.
- `pet_alert_community_claim_history`: historial inmutable de estados del claim.
- RPCs: `create_pet_alert_community_claim`, `list_my_pet_alert_community_claims`, `list_claims_for_my_pet_alert_community_sightings`, `review_pet_alert_community_claim`, `cancel_pet_alert_community_claim`.
- Migracion aplicada remoto: `20260823183000_pet_alert_slice5_controlled_claims.sql`.

# PET ALERT Slice 6

- `pet_alert_moderation_cases` y `pet_alert_moderation_history`.
- RPCs: `report_pet_alert_content`, `list_pet_alert_moderation_queue`, `moderate_pet_alert_content`, `list_pet_alert_moderation_history`.
- Migracion aplicada remoto: `20260823210000_pet_alert_slice6_admin_moderation.sql`.

# PET ALERT Slice 7A

- `pet_alert_community_sighting_media`: hasta tres fotos opcionales por reporte comunitario.
- Bucket privado `pet-alert-media`; JPG, PNG y WebP, maximo 10 MB por archivo.
- Migracion aplicada remoto: `20260823223000_pet_alert_slice7a_community_photos.sql`.
# PET ALERT Slice 7B

- RPC publica: `list_public_pet_alert_directory(text, text, text, text, integer, integer)`.
- No crea tablas ni modifica entidades transaccionales.
- Migracion aplicada remoto: `20260823230000_pet_alert_slice7b_public_directory.sql`.
# PET ALERT 8B

- Migracion local `20260826100000_pet_alert_slice8b_external_owner_reports.sql`.
- Amplia `pet_alert_lost_pets` de forma compatible y agrega `pet_alert_external_reporters`, `pet_alert_external_verification_challenges` y `pet_alert_external_access_tokens`.
- Agrega consumo atomico de challenge, creacion transaccional de reporte externo, cola admin y revision aprobar/rechazar.
- Edge Function publica: `pet-alert-external-report` con `verify_jwt = false`; todas las escrituras privilegiadas usan service role solo en servidor.

# Clinical Access-1

- Migracion `20260901110000_clinical_access_read_only.sql` aplicada al proyecto remoto.
- Agrega `pet_clinical_access_grants`, `pet_clinical_access_events` y cuatro RPC para crear, listar, revocar y consultar una proyeccion temporal sanitizada.
- Clinical Access-1 esta aplicado remoto; Clinical Access-2B permanece local hasta completar revision y dry-run.
- Migracion Clinical Access-2B `20260901130000_clinical_access_professional_identity.sql` aplicada remoto; agrega perfiles/eventos profesionales y RPCs de autoservicio, contexto autenticado y revision Admin.
- Migracion local Clinical Access-2C: `20260901150000_clinical_access_owner_consent.sql`; agrega solicitudes y autorizaciones temporales sin escritura clinica. Pendiente de aplicacion remota.
