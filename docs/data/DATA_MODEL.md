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
- una mascota puede tener multiples documentos y registros de salud
- los registros de salud base del MVP viven en `pet_vaccines`, `pet_allergies` y `pet_conditions`
- un reminder pertenece a un hogar y opcionalmente a una mascota
- `calendar_events` refleja los reminders visibles en agenda para el MVP
- una organizacion proveedora tiene un perfil publico, multiples servicios, disponibilidades y documentos de aprobacion
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
- para evitar sobreventa, CAP-1 debe usar bloqueo transaccional sobre la regla/slot o advisory lock por `service_id + slot_start_at + slot_end_at`.
- no confiar en cupos mostrados previamente por mobile.

## Reglas estructurales
- `auth.users` es la fuente de identidad autenticada y sincroniza el perfil base en `profiles`
- `profiles` concentra perfil base y preferencias
- `user_roles` resuelve el cambio de rol basico del MVP; `admin` existe como rol global y requiere provision explicita
- `user_addresses` pertenece al usuario, no al hogar
- `payment_methods` almacena metodos guardados del usuario; la captura real de pago queda diferida
- no mezclar ownership de dueno con ownership de proveedor
- la visibilidad publica del proveedor depende de `approval_status = approved` y de flags publicos
- la visibilidad de slots depende de provider aprobado, organizacion publica, perfil publico, servicio publico/activo y regla activa
- la visibilidad de datos depende de household membership y organization scoping
- las mascotas heredan visibilidad y capacidad de edicion desde los permisos del hogar
- los documentos de mascota guardan metadata relacional y archivo en storage privado
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
