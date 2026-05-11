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

### pet_documents
Visible para miembros autorizados del hogar.
Carga de documentos requiere permisos derivados de `edit` o `admin`.

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
