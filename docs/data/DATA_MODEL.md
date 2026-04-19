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
- admin revisa la organizacion proveedora y decide su aprobacion basica
- una reserva conecta hogar, mascota, proveedor y servicio
- una reserva puede referenciar opcionalmente un `payment_method` guardado sin ejecutar cobro real
- el pricing de la reserva se congela en `booking_pricing`
- la reserva deja su trazabilidad funcional en `booking_status_history`
- la reserva crea automaticamente un `chat_thread` transaccional 1:1
- una reserva completada puede generar una sola `review`
- una reserva tambien puede originar un `support_case`
- las mutaciones criticas tambien dejan rastro sintetico en `audit_logs`

## Reglas estructurales
- `auth.users` es la fuente de identidad autenticada y sincroniza el perfil base en `profiles`
- `profiles` concentra perfil base y preferencias
- `user_roles` resuelve el cambio de rol basico del MVP; `admin` existe como rol global y requiere provision explicita
- `user_addresses` pertenece al usuario, no al hogar
- `payment_methods` almacena metodos guardados del usuario; la captura real de pago queda diferida
- no mezclar ownership de dueno con ownership de proveedor
- la visibilidad publica del proveedor depende de `approval_status = approved` y de flags publicos
- la visibilidad de datos depende de household membership y organization scoping
- las mascotas heredan visibilidad y capacidad de edicion desde los permisos del hogar
- los documentos de mascota guardan metadata relacional y archivo en storage privado
- los registros de salud heredan visibilidad desde la misma membresia del hogar
- las reservas heredan permiso de lectura desde el hogar y desde el owner de la organizacion proveedora involucrada
- adjuntar un `payment_method` al booking exige permiso `pay` o `admin` en el hogar
- el chat MVP no es libre: hereda su alcance desde el booking
- las reviews heredan su elegibilidad desde el booking completado
- el soporte MVP hereda su contexto desde el booking y no reutiliza `chat_threads`
- `support_cases` queda limitado a una incidencia por booking en este baseline
- las entidades sensibles deben quedar auditadas o con trazabilidad minima equivalente
