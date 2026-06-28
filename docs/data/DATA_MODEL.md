# DATA_MODEL.md

## Entidad transaccional central
La entidad transaccional del baseline MVP es `booking`, conectada a identidad, hogar, mascota y proveedor.

## Relaciones clave
- un usuario autenticado tiene un perfil base en `profiles`
- un usuario puede tener multiples `user_roles`
- un usuario puede tener multiples `user_addresses`
- un usuario puede tener multiples `payment_methods`
- un usuario puede pertenecer a multiples hogares
- un usuario puede recibir multiples invitaciones de hogar
- un hogar puede tener multiples miembros e invitaciones pendientes
- un hogar puede tener multiples mascotas
- una mascota pertenece a un hogar
- una mascota tiene un perfil resumen en `pet_profiles`
- una mascota puede tener avatar privado en `pet-avatars` referenciado por metadata controlada
- una mascota puede estar `active` o `in_memory`; `in_memory` conserva historial y bloquea nuevas reservas
- una mascota puede tener multiples documentos y registros de salud
- los documentos de mascota pueden tener vigencia controlada con fecha de emision, fecha de vencimiento y ventana de aviso configurable
- los registros de salud base del MVP viven en `pet_vaccines`, `pet_allergies` y `pet_conditions`
- un reminder pertenece a un hogar y opcionalmente a una mascota
- `calendar_events` refleja los reminders visibles en agenda para el MVP
- una organizacion proveedora tiene un perfil publico, multiples servicios, disponibilidades y documentos de aprobacion
- una organizacion proveedora sin historial operacional puede eliminarse mediante RPC controlada; si tiene reservas, conversaciones, resenas o soporte debe conservarse y ocultarse/desactivarse
- el perfil publico proveedor puede tener avatar controlado en `provider-avatars`
- en V2 Geo-0, una organizacion proveedora puede tener una ubicacion publica controlada en `provider_public_locations`
- en V2 booking capacity, una organizacion/servicio puede tener reglas de disponibilidad con capacidad y excepciones por fecha
- admin revisa la organizacion proveedora y decide su aprobacion basica
- una reserva conecta hogar, mascota, proveedor y servicio
- en V2 booking capacity, una reserva puede trazar el slot elegido mediante regla, inicio y fin de slot
- una reserva puede referenciar opcionalmente un `payment_method` guardado sin ejecutar cobro real
- el pricing de la reserva se congela en `booking_pricing`
- V2 provider operations agrega un timeline operacional asociado a `bookings`
- `booking_operations` registra eventos de check-in y check-out de la reserva
- `booking_operation_tokens` modela QR temporales owner -> provider para autorizar check-in/check-out sin exponer `booking_id` plano
- `booking_operation_evidence` guarda metadata de archivos de evidencia asociados a la reserva
- `booking_operation_report` guarda un report card operacional unico por reserva
- `booking_operation_notes` guarda notas internas del proveedor asociadas a la reserva
- la reserva deja su trazabilidad funcional en `booking_status_history`
- la reserva crea automaticamente un `chat_thread` transaccional 1:1
- una reserva completada puede generar una sola `review`
- una reserva tambien puede originar un `support_case`
- las mutaciones criticas tambien dejan rastro sintetico en `audit_logs`

## Modelo V2 Booking Capacity

Modelo recomendado CAP-0: hibrido.

Relaciones propuestas:
- `provider_services` 1:N `provider_availability_rules`.
- `provider_availability_rules` 1:N `provider_availability_exceptions`.
- `bookings` referencia opcionalmente `provider_availability_rules` y guarda `slot_start_at` / `slot_end_at`.
- cupos consumidos se derivan de `bookings` por servicio/regla/slot y estado; no usar `reserved_count` manual como fuente primaria.

Estados que consumen cupo:
- `pending_approval`
- `confirmed`
- `completed` historicamente mantiene cupo consumido

Estados que liberan cupo:
- `cancelled`
- `rejected`
- `expired`
- `provider_cancelled` si ocurre antes de `slot_start_at`

Decision pendiente:
- `no_show` consume cupo por defecto; puede cambiar si operaciones decide liberar recursos no usados.
- el modelo actual solo tiene `pending_approval`, `confirmed`, `completed` y `cancelled`; `rejected`, `expired`, `provider_cancelled` y `no_show` requieren ampliacion de estado o tabla operacional futura antes de usarse.

Consistencia:
- `get_service_booking_slots` calcula disponibilidad para UI.
- `create_booking_from_slot` valida y crea booking en transaccion.
- Supabase/Postgres se mantiene en UTC; las reglas de horario/capacidad se interpretan como horario local `America/Panama` para proyectar `slot_start_at` / `slot_end_at` como `timestamptz`.
- para evitar sobreventa, CAP-1 debe usar bloqueo transaccional sobre la regla/slot o advisory lock por `service_id + slot_start_at + slot_end_at`.
- no confiar en cupos mostrados previamente por mobile.

## Modelo V2 Pet Travel Passport / Expediente Internacional

Modelo conceptual documental. No implementado y sin migraciones asociadas.

Relaciones propuestas:
- `pets` 1:N `pet_identifications`.
- `pets` 1:N `pet_travel_profiles`.
- `pet_travel_profiles` 1:N `pet_travel_documents`.
- `pet_documents` puede alimentar `pet_travel_documents` como archivo soporte.
- `pet_travel_profiles` 1:1 o 1:N `pet_travel_checklists` segun se permita versionar viajes.
- `pet_travel_checklists` 1:N `pet_travel_checklist_items`.
- `pet_travel_requirements` puede actuar como catalogo de referencia para checklist items.
- `pet_travel_profiles` 1:N `pet_travel_events` para trazabilidad.
- `pet_document_validations` referencia documentos y expediente para revision no oficial.

Datos reutilizables actuales:
- mascota, especie, raza, sexo, fecha de nacimiento, esterilizacion, avatar y estado desde `pets` / `pet_profiles`.
- documentos base desde `pet_documents` y bucket privado asociado.
- vacunas, alergias y condiciones desde `pet_vaccines`, `pet_allergies` y `pet_conditions`.
- vencimientos de vacunas y preparacion previa desde `reminders` / `calendar_events`.

Gaps conceptuales:
- microchip estructurado.
- peso, color y senas particulares.
- vacunas con lote, fabricante, veterinario, centro y documento soporte.
- documentos de viaje con tipo, pais, emisor y vencimiento.
- viaje/destino y estado de preparacion.
- checklist por pais con fuente oficial y fecha de ultima revision.
- comparticion granular con provider/veterinario.

Regla documental:
- Pet Ecosystem no emite pasaporte oficial, certificado sanitario oficial ni documento gubernamental.
- el modulo organiza informacion, vencimientos y documentos para revision.
- cualquier validez legal depende de veterinarios certificados, autoridades sanitarias, aerolineas y pais destino.

## Modelo V2.5 Foster/Adoption

Modelo conceptual documental. No implementado y sin migraciones asociadas.

Recomendacion:
- extender `pets` mediante tablas asociadas de acogida/adopcion, no duplicar mascotas.
- `pets` y `pet_profiles` siguen siendo la fuente de verdad del expediente base.
- `protective_household_profiles` representa la capacidad especial de una familia/hogar para actuar como familia protectora aprobada por admin.
- `pet_custody_contexts` registra el hogar custodio y tipo de custodia de una mascota en el tiempo.
- `foster_pets` representa el contexto de custodia temporal.
- `adoption_listings` representa la publicacion publica moderada.
- `adoption_applications` representa la solicitud del adoptante.
- `pet_transfer_records` registra transferencia de custodia digital.

Relaciones propuestas:
- `households` 1:0..1 `protective_household_profiles`.
- `pets` 1:N `pet_custody_contexts`.
- `households` 1:N `pet_custody_contexts`.
- `households` 1:N `foster_profiles`.
- `foster_organizations` 1:N `foster_pets`.
- `pets` 1:0..1 `foster_pets` para contexto activo de acogida.
- `foster_pets` 1:0..1 `adoption_listings`.
- `adoption_listings` 1:N `adoption_applications`.
- `adoption_applications` 1:N `adoption_status_history`.
- `adoption_applications` 1:N `adoption_documents`.
- `adoption_applications` 1:N `adoption_screening_notes`.
- `pet_transfer_records` referencia `pet_id`, hogar origen, hogar destino y solicitud aprobada.
- para transferencia privada, `pet_transfer_records` puede existir sin `adoption_application_id` y debe guardar consentimiento de emisor/receptor.

Tablas conceptuales iniciales para transferencia privada:
- `protective_household_profiles`: `household_id`, `status`, `display_name`, `organization_type`, `city`, `state_region`, `country_code`, `contact_notes`, `review_notes`, `reviewed_by_user_id`, `reviewed_at`, `created_at`, `updated_at`.
- `pet_custody_contexts`: `pet_id`, `household_id`, `custody_type`, `status`, `started_at`, `ended_at`, `created_by_user_id`, `created_at`, `updated_at`.
- `pet_transfer_records`: `pet_id`, `from_household_id`, `to_household_id`, `initiated_by_user_id`, `accepted_by_user_id`, `status`, `recipient_email`, `consent_snapshot`, `transfer_notes`, `created_at`, `accepted_at`, `cancelled_at`.

Reglas estructurales:
- una mascota privada no aparece en marketplace.
- solo mascotas bajo `foster_pets` y con listing aprobado pueden publicarse como `Busca hogar`.
- el marketplace de adopcion es separado del marketplace de servicios.
- adopcion no usa pagos, checkout, bookings ni disponibilidad provider.
- la transferencia de custodia debe conservar audit trail y consentimiento de foster/adoptante.
- documentos medicos sensibles no se transfieren automaticamente; deben marcarse como compartibles.
- el primer slice recomendado no abre marketplace de adopcion: solo familia protectora aprobada y transferencia privada de mascota.
- al aceptar transferencia, la identidad `pets.id` debe conservarse; no se duplica mascota.

Foster-2A implementacion local:

- `pet_custody_contexts` queda como historial de custodia con un unico contexto `active` por mascota.
- `pet_transfer_records` queda como registro transaccional de invitacion, consentimiento, receptor, estado y fechas.
- aceptar transferencia actualiza `pets.household_id`; no se crean nuevas filas en `pets`.
- `pet_documents`, salud, vacunas, alergias y condiciones siguen asociados a `pet_id` y viajan por la nueva custodia.
- `bookings`, `chat_threads`, pagos, soporte y recordatorios conservan su `household_id` original y no se transfieren automaticamente.
- reservas, chats, soporte y datos privados del hogar anterior no viajan automaticamente al nuevo hogar.

## Reglas estructurales
- `auth.users` es la fuente de identidad autenticada y sincroniza el perfil base en `profiles`
- `profiles` concentra perfil base y preferencias
- `user_roles` resuelve el cambio de rol basico del MVP; `admin` existe como rol global y requiere provision explicita
- `user_addresses` pertenece al usuario, no al hogar
- `payment_methods` almacena metodos guardados del usuario; la captura real de pago queda diferida
- no mezclar ownership de dueno con ownership de proveedor
- la visibilidad publica del proveedor depende de `approval_status = approved` y de flags publicos
- la ubicacion publica del proveedor depende tambien de `provider_public_locations.is_public`, perfil publico, servicios activos y precision elegida por el proveedor
- `user_addresses` pertenece al usuario y no debe exponerse en marketplace; la ubicacion actual del owner no se guarda sin consentimiento ni se usa para tracking
- la visibilidad de slots depende de provider aprobado, organizacion publica, perfil publico, servicio publico/activo y regla activa
- la visibilidad de datos depende de household membership y organization scoping
- las mascotas heredan visibilidad y capacidad de edicion desde los permisos del hogar
- los documentos de mascota guardan metadata relacional y archivo en storage privado
- la vigencia de documentos de mascota se guarda como metadata en `pet_documents`; no crea recordatorios automaticos ni bloqueos operativos por defecto
- los registros de salud heredan visibilidad desde la misma membresia del hogar
- las reservas heredan permiso de lectura desde el hogar y desde el owner de la organizacion proveedora involucrada
- la creacion de booking desde slot debe validar permisos del hogar, mascota, servicio y cupo en backend
- el timeline operacional hereda contexto desde `bookings`, `provider_organizations`, household y mascota
- check-in/check-out deben quedar autorizados por QR temporal single-use generado por owner elegible y consumido por provider elegible; botones manuales son fallback piloto
- report card pertenece al provider owner de la organizacion vinculada al booking
- tokens QR guardan hash, estado, expiracion, uso y revocacion; no guardan token plano persistente
- evidencia operacional requiere metadata en tabla y archivo protegido en storage
- evidencia operacional documenta actividad; no es prueba principal de presencia en el modelo QR
- evidencia operacional usa `storage_bucket` y `storage_path`; no usa URL arbitraria externa
- las notas internas de provider operations no son visibles al owner
- admin puede leer provider operations para soporte o auditoria operativa
- provider externo no puede leer ni mutar operaciones de bookings de otra organizacion
- adjuntar un `payment_method` al booking exige permiso `pay` o `admin` en el hogar
- el chat MVP no es libre: hereda su alcance desde el booking
- las reviews heredan su elegibilidad desde el booking completado
- el soporte MVP hereda su contexto desde el booking y no reutiliza `chat_threads`
- `support_cases` queda limitado a una incidencia por booking en este baseline
- las entidades sensibles deben quedar auditadas o con trazabilidad minima equivalente

## Foster-3A - Vitrina controlada de adopcion/acogida

Modelo local pendiente de aplicar remoto:

- `pet_adoption_listings`: publicacion moderada de una mascota existente (`pets.id`) bajo custodia de una familia protectora aprobada. Estados: `draft`, `pending_review`, `published`, `paused`, `closed`, `rejected`. Incluye textos publicos seguros, ciudad/pais y metadata de revision admin.
- `pet_adoption_listing_media`: galeria asociada a la publicacion, con bucket privado `pet-adoption-media`, path privado, orden, portada y estado de moderacion por archivo.

Reglas de identidad:

- No duplica mascotas.
- No mueve custodia ni `pets.household_id`.
- No transfiere reservas, chats, pagos, soporte ni recordatorios.
- No expone documentos privados completos; el resumen de salud es texto publico controlado por la familia protectora y moderado por admin.

Foster-3B agrega moderacion individual de fotos sobre este mismo modelo:

- `pet_adoption_listing_media` acepta hasta 8 imagenes por publicacion.
- una publicacion `published` puede recibir fotos nuevas sin volver a `pending_review`.
- fotos nuevas quedan `moderation_status = pending` hasta revision admin.
- lectura publica solo usa fotos `approved`; owner/admin ven todos los estados.
- `set_pet_adoption_listing_cover` controla la portada y `review_pet_adoption_listing_media` aprueba/rechaza fotos individuales.

Videos siguen fuera de alcance; Foster-3B usa fotos privadas con URLs firmadas temporales.
