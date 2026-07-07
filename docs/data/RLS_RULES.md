# RLS_RULES.md

## Objetivo
Definir las reglas canonicas de acceso por fila para el baseline MVP en Supabase.

## Principios
- el usuario ve lo suyo
- los miembros de un hogar ven solo lo autorizado
- el proveedor ve solo su organizacion
- el admin de plataforma solo recibe visibilidad ampliada en slices explicitamente habilitados
- las mutaciones criticas deben entrar por RPC o politicas controladas

## Reglas minimas por tabla

### profiles
Un usuario solo ve y modifica su propio perfil.

### user_roles
Un usuario solo ve y modifica sus propios roles.

### user_addresses
Un usuario solo ve y modifica sus propias direcciones.

### payment_methods
Un usuario solo ve y modifica sus propios metodos guardados.
No existe exposicion de cobros reales porque `payments` no forma parte del baseline.

### households
Visible para owner y miembros activos.
La separacion Foster/Adoption propuesta agrega un tipo operativo por hogar:
- `owner`: hogar familiar para mascotas propias.
- `protective`: familia protectora/acogida para custodia y adopcion responsable.
RLS y RPCs futuros deben validar `households.household_type` antes de habilitar capacidades Foster; un hogar `owner` no puede publicar mascotas en adopcion ni iniciar transferencias Foster.
Foster-Household-B prepara `is_protective_household` e `is_approved_protective_household` para que la validacion ocurra server-side, no solo en UI. El RPC `create_household` permite crear explicitamente hogares `protective`; el default `owner` evita conversiones silenciosas.

### household_members
Visible para miembros del hogar.

### household_invitations
Visible para admins del hogar y para el usuario invitado.
Aceptar o rechazar solo puede hacerlo el usuario invitado.

### pets
Visible para usuarios con acceso al hogar y permisos correspondientes.
Crear o editar mascota requiere permisos derivados de `edit` o `admin`.
Cambiar estado `active`/`in_memory` requiere los mismos permisos de edicion del hogar.
`in_memory` no borra datos ni cambia visibilidad historica; solo evita uso en nuevas reservas.

### pet_adoption_listings / pet_adoption_listing_media (Foster-3A/3B)
Solo familias protectoras aprobadas pueden crear/editar publicaciones de mascotas activas de su hogar. La revision y moderacion corresponde a admin de plataforma. Usuarios autenticados leen solo publicaciones `published`. La media vive en bucket privado `pet-adoption-media` y se consulta con URLs firmadas temporales; no se permite lectura publica irrestricta ni direccion exacta de la familia protectora.
Foster-3B permite agregar fotos a publicaciones `published` sin cambiar el estado de la publicacion: la media nueva queda `pending`, owner/admin la ven con estado y adoptantes solo leen media `approved`. Admin modera fotos individuales mediante RPC; owner no actualiza directamente `moderation_status`. El limite inicial es 8 fotos por publicacion y solo una portada puede quedar marcada.
El conteo del limite de fotos debe ejecutarse mediante funcion `security definer` (`count_pet_adoption_listing_media`) y no mediante subconsulta directa en la policy, para evitar recursion RLS sobre la misma tabla.

### pet_documents
Visible para miembros autorizados del hogar.
Carga de documentos requiere permisos derivados de `edit` o `admin`.
Edicion de metadata documental, incluyendo vigencia, requiere permisos derivados de `edit` o `admin`.
Lectura de vigencia documental requiere el mismo acceso de lectura a la mascota/hogar.

### Pet Travel Passport / Expediente Internacional (V2 conceptual)

Alcance documental para futuras tablas `pet_identifications`, `pet_travel_profiles`, `pet_travel_documents`, `pet_travel_requirements`, `pet_travel_checklists`, `pet_travel_checklist_items`, `pet_travel_events` y `pet_document_validations`.

Reglas esperadas:
- owner y miembros autorizados del hogar controlan lectura y escritura del expediente.
- microchip, documentos sanitarios y datos de viaje se tratan como informacion sensible.
- provider/veterinario solo puede ver datos si el owner comparte el expediente o si existe un servicio autorizado que lo requiera.
- admin no lee documentos sensibles por defecto; acceso solo para soporte, moderacion o auditoria justificada.
- documentos deben vivir en bucket privado y exponerse con URLs firmadas temporales.
- datos de viaje, microchip y certificados no se exponen en marketplace ni superficies publicas.
- cualquier comparticion futura debe registrar trazabilidad de acceso, revocacion y actor.
- checklist por pais no debe publicarse como regla confiable sin fuente oficial y fecha de ultima revision.
- ninguna tabla futura debe permitir acceso anonimo a documentos o datos sanitarios.

### Foster/Adoption (V2.5 conceptual)

Alcance documental para futuras tablas `protective_household_profiles`, `pet_custody_contexts`, `pet_transfer_records`, `foster_profiles`, `foster_organizations`, `foster_pets`, `adoption_listings`, `adoption_applications`, `adoption_status_history`, `adoption_documents` y `adoption_screening_notes`.

Reglas esperadas:
- household regular no debe convertirse implicitamente en familia protectora dentro de la misma identidad operativa.
- el modelo esperado exige hogar tipo `protective` para solicitar/aprobar perfil protector.
- un usuario que necesite mascotas propias y acogida debe usar hogares separados: `owner` y `protective`.
- hogares `owner` no pueden publicar mascotas en adopcion ni iniciar transferencias Foster.
- admin puede aprobar, rechazar, suspender y auditar `protective_household_profiles`.
- Foster-1A lectura: miembros del hogar leen su propio perfil protector; admin lee todos; anon/public no lee.
- Foster-1A insercion: solo miembro con permiso `admin` del hogar puede crear perfil para ese hogar.
- Foster-1A actualizacion familia: solo sobre `draft` o `rejected`; no puede escribir campos de revision.
- Foster-1A submit: `submit_protective_household_profile` valida campos minimos y pasa a `pending_review`.
- Foster-1A revision admin: `review_protective_household_profile` aprueba, rechaza o suspende y registra `reviewed_by_user_id`, `reviewed_at` y `review_notes`.
- Foster-1A no permite borrado cliente; usar suspension/rechazo.
- familia protectora aprobada puede gestionar mascotas bajo su custodia solo si el household asociado es tipo `protective`.
- si un household tiene perfil protector aprobado pero `household_type = owner`, las mutaciones Foster deben fallar con mensaje de familia protectora requerida hasta que exista backfill o seleccion de hogar protector.
- familia protectora no puede transferir mascotas de otro hogar ni mascotas fuera de su custodia activa.
- familia receptora solo ve informacion minima de invitacion antes de aceptar transferencia.
- familia receptora solo obtiene lectura/gestion completa del expediente compartido despues de aceptar.
- hogar anterior no conserva acceso completo por defecto despues de transferencia; cualquier acceso historico debe definirse explicitamente.
- `pet_transfer_records` debe mutarse via RPC transaccional con consentimiento de emisor y receptor.
- `pet_custody_contexts` solo debe mutarse desde RPCs controladas, no por escritura directa de cliente.
- documentos sensibles requieren consentimiento o marca de comparticion antes de transferirse.
- datos personales entre hogares no se exponen sin autorizacion.
- foster owner aprobado gestiona sus mascotas en acogida.
- owner regular no puede publicar mascotas privadas salvo que tenga rol/perfil foster aprobado.
- institucion/fundacion gestiona solo mascotas, listings y solicitudes de su organizacion.
- admin puede revisar, aprobar, pausar, retirar y auditar publicaciones.
- adoptante solo ve listings publicados y sus propias solicitudes.
- foster/institucion solo ve solicitudes asociadas a sus listings.
- provider comercial no tiene acceso por defecto.
- marketplace publico solo lee `adoption_listings` publicadas y campos publicos de la mascota.
- direccion exacta del foster nunca se expone; solo ciudad/zona aproximada.
- documentos y salud sensible no tienen lectura publica.
- notas internas de screening no son visibles para adoptantes.
- transferencia de custodia debe ejecutarse con RPC/control transaccional, consentimiento y audit trail.
- adopcion no debe habilitar pagos, checkout ni bookings.
- Foster-5A public profile: el perfil publico de familia protectora debe vivir separado del perfil interno de aprobacion; lectura publica/autenticada solo para `approved` + `is_public`.
- Foster-5B public pet page: ficha compartible solo puede leer publicaciones `published` con `share_status = enabled`, media `approved`, ciudad/pais y resumen publico no sensible; no lee documentos ni direccion exacta. El RPC `get_public_pet_adoption_listing_by_slug` exige ademas hogar `protective`, perfil protector interno `approved` y perfil publico protector `approved` + `is_public`.
- Foster-5C adoption applications: solicitudes se mutan via RPC; applicant ve sus propias solicitudes, familia protectora ve solicitudes de sus publicaciones y admin audita. `create_pet_adoption_application` exige login, publicacion `published`, `share_status = enabled`, hogar `protective`, perfil protector interno `approved`, perfil publico `approved` + `is_public` y mascota `active`. La solicitud no cambia custodia ni `pets.household_id`.
- Foster-5D.1 pipeline: `pet_adoption_application_status_history` es visible solo para solicitante, familia protectora autorizada y admin mediante scope de solicitud. Los cambios de estado ocurren via RPC `update_pet_adoption_application_status`; no se permite update directo de `pet_adoption_applications.status`. `rejected` requiere nota y `converted_to_transfer` queda reservado para Foster-5E.
- Foster-5E transferencia: cambios de estado de solicitud no reemplazan Foster-2A; `start_pet_adoption_transfer` solo crea una transferencia privada pendiente desde solicitud `approved`, y `accept_pet_transfer` es el unico punto que mueve custodia y marca solicitud `converted_to_transfer` + publicacion `adopted`. No se permite update directo de custodia, solicitud o publicacion desde cliente.

Foster-2A implementacion local:
- `pet_transfer_records` permite lectura a hogar emisor, hogar receptor cuando exista, receptor por email/usuario y admin.
- `pet_custody_contexts` permite lectura a hogares involucrados, custodio actual por `can_view_pet` y admin.
- no se conceden escrituras directas cliente sobre `pet_transfer_records` ni `pet_custody_contexts`; las mutaciones quedan encapsuladas en RPC.
- `create_pet_transfer_invitation` exige familia protectora aprobada, permiso admin del hogar emisor, mascota propia activa y ausencia de otra transferencia pendiente.
- `accept_pet_transfer` valida receptor, hogar receptor administrable, invitacion no expirada y mueve `pets.household_id` transaccionalmente.
- `reject_pet_transfer` y `cancel_pet_transfer` limitan actores a receptor/emisor respectivamente.
- reservas, chats, pagos, soporte y recordatorios futuros no se transfieren por RLS ni por RPC.

### pet-avatars storage
Bucket privado para fotos de mascotas.
Lectura requiere `can_view_pet` derivado del hogar; carga o reemplazo requiere `can_edit_pet`.
El path debe iniciar con el `pet_id` y la app solo debe exponer URLs firmadas temporales.

### health tables
Visibles para miembros autorizados del hogar.
Registrar o editar requiere permisos derivados de `edit` o `admin` sobre la mascota.

### reminders / calendar_events
Visibles para miembros autorizados del hogar.
Crear, completar o posponer reminders requiere permisos derivados de `edit` o `admin`.
Los eventos de agenda derivados de bookings siguen fuera del baseline.

### provider_organizations / provider_public_profiles / provider_services / provider_availability / provider_documents
Las lecturas publicas de marketplace solo pueden ver organizaciones con `approval_status = approved` e `is_public = true`.
Servicios y disponibilidad requieren ademas flags publicos y `is_active` cuando aplica.
Los documentos de aprobacion no son publicos.
La gestion privada de estos registros pertenece al owner de la organizacion o a admin en el slice de revision.
`delete_provider_organization` es una RPC `security definer` para owners autenticados: valida ownership, bloquea borrado si existen reservas, conversaciones, resenas o casos de soporte y solo elimina datos maestros de negocios sin historial operacional.
Los negocios con historial deben ocultarse/desactivarse en lugar de borrarse para preservar trazabilidad.

### provider_public_locations (V2 Geo-0)
La ubicacion publica de proveedor solo puede leerse en marketplace si:
- `provider_public_locations.is_public = true`
- la organizacion esta aprobada y publica
- el perfil publico esta publicado
- existe al menos un servicio publico y activo

El provider owner/manager puede crear y editar la ubicacion de su organizacion.
Admin puede leer y moderar ubicaciones.
Owners no exponen `user_addresses`; la direccion del hogar nunca se publica ni se devuelve a proveedores desde marketplace.
Geo-3 no usa `user_addresses` como origen mientras el contrato no exponga coordenadas; no devuelve la direccion a proveedores ni la publica en cards/listas.
No se guarda ubicacion actual del owner sin consentimiento explicito y Geo-0 no habilita tracking en tiempo real.

### provider-avatars storage
Bucket privado con lectura controlada para la foto/avatar del perfil publico del proveedor.
La lectura publica/anonima solo debe permitir imagenes de organizaciones visibles mediante `is_provider_organization_visible`.
La carga o reemplazo requiere `can_manage_provider_organization` y path con prefijo `organization_id`.
No se deben agregar nuevas URLs externas arbitrarias para avatar de proveedor; usar `storage_bucket` + `storage_path` y URL firmada temporal.

### bookings / booking_pricing / booking_status_history
Visible a miembros del hogar via funciones de acceso y al owner de la organizacion proveedora involucrada via `can_view_booking`.
Crear o cancelar bookings ocurre via RPC `security definer` y exige permiso `book` en el hogar.
Crear preview/bookings nuevos debe rechazar mascotas `in_memory`.
Aprobar o rechazar un booking `pending_approval` exige ownership de la organizacion proveedora.
Marcar un booking `confirmed` como `completed` exige ownership del proveedor involucrado.
Adjuntar un `payment_method` exige permiso `pay` o `admin`.
No se habilita insercion ni edicion directa por tabla para usuarios autenticados.
`get_booking_participant_summaries` expone solo nombres minimos de hogar, cliente y mascota para bookings visibles via `can_view_booking`; evita abrir lectura directa completa de `households`, `profiles` o `pets` al proveedor.

### provider_availability_rules / provider_availability_exceptions (V2 booking capacity, propuesto)

Objetivo: modelar slots/capacidad sin abrir escritura directa de owners sobre configuracion provider.

Visibilidad esperada:
- owner: no lee la configuracion privada completa; lee slots calculados por `get_service_booking_slots` solo para servicios publicos/aprobados.
- provider: lee y administra reglas/excepciones solo de sus propias organizaciones.
- admin: puede leer metadata para soporte/auditoria.
- anon/public: sin escritura; lectura publica directa no recomendada.

Mutaciones:
- provider crea/edita reglas mediante RPCs controladas o politicas scoped por `can_manage_provider_organization`.
- owner no puede crear, modificar ni desactivar capacidad.
- `create_booking_from_slot` es la unica mutacion owner que consume cupo y crea booking.
- `validate_slot_capacity` debe ser helper interno o RPC de solo lectura; no debe ser fuente de verdad separada de `create_booking_from_slot`.

Proteccion anti-sobreventa:
- `create_booking_from_slot` debe ejecutarse como `security definer` y tomar bloqueo transaccional por regla/slot antes de contar bookings.
- el conteo debe incluir `pending_approval` y `confirmed`; `completed` mantiene cupo consumido historico.
- cancelaciones/rechazos liberan cupo solo al cambiar estado del booking.
- la UI no puede confiar en `available_count` previo para crear booking.

Reglas negativas:
- owner no puede leer capacidad privada de servicios no publicos.
- provider externo no puede leer ni modificar reglas de otra organizacion.
- no habilitar insert/update/delete directo sobre `bookings` para consumir cupo.

### booking_operations / booking_operation_evidence / booking_operation_report / booking_operation_notes (V2 provider operations)
Definidas en `supabase/migrations/20260504140000_booking_operations_v2.sql` para V2 no financiero.

Visibilidad esperada:
- owner: no tiene lectura directa en la primera migracion conservadora; lectura owner de timeline/evidencia/report card queda diferida hasta agregar una decision explicita de visibilidad.
- provider: puede leer operaciones de bookings de su propia organizacion.
- provider: puede crear check-in/check-out, evidencia, report card e internal notes solo para bookings `confirmed` de su propia organizacion.
- admin: puede leer operaciones para soporte, auditoria operativa y revision de incidentes; no se habilitan mutaciones admin directas en esta migracion.
- provider externo: no puede leer ni mutar operaciones de bookings de otra organizacion.
- anon/public: sin acceso.

Reglas negativas:
- owner no puede ver `booking_operation_notes`.
- owner no puede ver `booking_operation_evidence` ni `booking_operation_report` hasta que exista flag o decision de visibilidad.
- owner no puede subir ni editar evidencia/report card provider-side.
- provider no puede ver datos sensibles del household fuera del contexto ya permitido por booking.
- provider no puede crear operaciones para reservas canceladas o de otra organizacion.
- ninguna tabla debe aceptar mutaciones anonimas.

Reglas de evidencia/storage:
- la metadata de evidencia vive en `booking_operation_evidence`.
- el archivo vive en bucket privado `booking-operation-evidence`.
- el path debe estar scoped por `booking_id`.
- upload debe validar ownership provider-side antes de guardar metadata.
- lectura owner de archivos queda diferida; por ahora evidence queda provider/admin.
- admin puede leer archivos para soporte o auditoria operativa.
- no se permite `file_url` arbitrario; se usa `storage_bucket` + `storage_path`.
- si se necesita evidencia visible al owner, agregar un flag de visibilidad y politicas storage antes de abrir esa lectura.
- en el modelo QR, evidencia no reemplaza validacion de presencia; check-in/check-out se autorizan por token temporal.

### booking_operation_tokens (V2 QR provider operations, propuesta QR-1)

Objetivo: soportar QR temporal owner -> provider para check-in/check-out.

Reglas esperadas:
- no permitir mutacion directa por cliente sobre `booking_operation_tokens`.
- creacion de token solo via RPC `create_booking_operation_token(target_booking_id, target_operation_type)` con `security definer`.
- consumo de token solo via RPC `consume_booking_operation_token(raw_token)` con `security definer`.
- revocacion via RPC `revoke_booking_operation_token(token_id)` si entra en alcance.
- owner puede crear token solo para bookings de hogares donde tiene permiso y solo para booking `confirmed`.
- provider puede consumir token solo si gestiona la organizacion proveedora del booking.
- provider externo no puede leer ni consumir tokens de otra organizacion.
- admin puede leer metadata para auditoria/soporte, pero no debe ver token plano.
- `token_hash` no debe exponerse a vistas o clientes normales.
- token debe ser single-use, tener expiracion corta y marcar `used_at/used_by_user_id` al consumirse.
- crear un nuevo token debe revocar tokens activos previos del mismo booking y `operation_type`.
- owner no escribe directamente en `booking_operations`; provider tampoco deberia escribir check-in/check-out directo salvo fallback piloto documentado.

### chat_threads / chat_messages
Visible solo a participantes del booking:
- el usuario que realizo la reserva
- el owner de la organizacion proveedora involucrada

### reviews
Visible al cliente que dejo la review y al owner de la organizacion proveedora del booking.
Crear review ocurre via RPC `security definer` y exige booking `completed` y ausencia de review previa.

### support_cases
Visible al creador y a admin.
Crear un caso exige acceso valido al booking vinculado.
No existe visibilidad automatica para el proveedor en este baseline.

### audit_logs
Visible al actor que genero la mutacion y a admin de plataforma.
No existe insercion directa de clientes; se registra desde RPCs administrativas o transaccionales controladas.

## Regla de cambio
No implementar tablas sensibles sin definir su politica RLS.
