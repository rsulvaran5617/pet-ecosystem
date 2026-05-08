# providers.md

## Objetivo del modulo
Gestionar onboarding y operacion base del proveedor para dejarlo listo para aprobacion, discovery en marketplace y atencion minima de reservas MVP.

## Alcance MVP
- onboarding basico de organizacion
- crear y editar perfil de negocio
- configurar perfil publico
- configurar servicios
- definir disponibilidad base
- cargar documentos de aprobacion
- consultar estado de aprobacion
- exponer visibilidad publica solo cuando la organizacion fue aprobada
- recibir bookings de su organizacion
- aprobar o rechazar bookings `pending_approval`
- completar bookings `confirmed`

## Alcance diferido
- staff
- sucursales
- ubicacion geografica del negocio para discovery por cercania
- CRM interno
- dashboard de ingresos
- payouts avanzados
- reportes avanzados

## Alcance V2 provider operations / booking operations
- operar reservas confirmadas con timeline operacional
- registrar check-in y check-out de servicio preferiblemente mediante QR temporal mostrado por owner/familia
- subir evidencia operacional del servicio
- completar report card no financiero
- mantener notas internas del equipo proveedor

## Alcance V2 booking capacity / slots

Objetivo: permitir que el proveedor configure franjas de atencion con capacidad maxima y que el owner reserve un cupo especifico desde un calendario/lista de slots.

Flujo provider:
- crear una regla semanal o por fecha para un servicio.
- definir dia de semana, hora inicio, hora fin, capacidad maxima y estado activo/inactivo.
- editar capacidad futura sin modificar bookings historicos.
- cerrar o ajustar una fecha concreta mediante excepcion.
- ver reservas tomadas por slot para operar capacidad.

Reglas provider:
- solo el owner de la organizacion administra capacidad de sus servicios.
- la capacidad debe ser mayor a cero cuando la regla esta activa.
- una franja no debe tener `ends_at <= starts_at`.
- editar capacidad por debajo de cupos ya consumidos debe bloquearse o requerir excepcion/fix-forward.
- la configuracion profunda puede seguir en mobile durante piloto, pero el modelo debe soportar web provider posterior.

Modelo recomendado CAP-0:
- modelo hibrido: reglas recurrentes por servicio + excepciones por fecha + RPC de proyeccion.
- no usar `reserved_count` manual como fuente primaria.
- `bookings` con referencia a regla y slot elegido para trazabilidad.

## Entidades
- `provider_organizations`
- `provider_public_profiles`
- `provider_services`
- `provider_availability`
- `provider_documents`
- `bookings`
- `booking_operations`
- `booking_operation_evidence`
- `booking_operation_report`
- `booking_operation_notes`
- `provider_availability_rules` (V2 booking capacity, propuesto)
- `provider_availability_exceptions` (V2 booking capacity, propuesto)
- `audit_logs`

## Pantallas
- onboarding proveedor
- perfil negocio
- perfil publico
- servicios
- disponibilidad
- horarios y capacidad
- documentos de aprobacion
- estado de aprobacion
- incoming bookings
- detalle de reserva con timeline operacional V2

## Reglas
- un proveedor opera dentro de una organizacion
- solo organizaciones con `approval_status = approved` pueden publicarse en marketplace
- la organizacion tambien debe tener `is_public = true`
- el perfil publico debe tener `is_public = true`
- marketplace solo expone servicios con `is_public = true` e `is_active = true`
- marketplace solo expone disponibilidad activa de organizaciones publicas ya aprobadas
- en V2 capacity, marketplace/booking expone slots calculados desde reglas activas con cupos disponibles
- el owner proveedor ve y gestiona solo su propia organizacion
- la operacion provider-side del MVP se limita a recibir, aprobar, rechazar y completar reservas
- V2 provider operations extiende la consola para ejecutar el servicio entre `confirmed` y `completed`
- check-in/check-out, evidencia, report card y notas internas pertenecen al contexto de una reserva
- el flujo principal futuro de check-in/check-out sera escanear QR temporal del owner; los botones manuales existentes quedan como fallback piloto/soporte
- el proveedor no debe consumir tokens de reservas de otra organizacion ni registrar operaciones sin validacion server-side
- internal notes son privadas para provider/admin y no deben mostrarse al owner
- evidencia visible para owner requiere decision explicita posterior
- evidencia operacional no es la prueba principal de presencia; sirve como fotos/documentos de actividad despues del flujo QR
- capacidad de booking pertenece a provider availability/bookings; no modifica QR, check-in/check-out ni evidencia
- provider operations no habilita cobro real, payouts, ingresos, refunds ni conciliacion
- la revision administrativa de documentos pertenece al dominio `admin`

## Dependencias
- core
- storage
- admin
- marketplace
- bookings

## APIs relacionadas
- `GET /provider/organizations`
- `POST /provider/organizations`
- `GET /provider/organizations/{id}`
- `PATCH /provider/organizations/{id}`
- `PUT /provider/organizations/{id}/public-profile`
- `POST /provider/organizations/{id}/services`
- `PATCH /provider/services/{id}`
- `POST /provider/organizations/{id}/availability`
- `PATCH /provider/availability/{id}`
- `POST /provider/organizations/{id}/availability-rules` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-rules/{ruleId}` (V2 booking capacity, propuesto)
- `POST /provider/availability-rules/{ruleId}/exceptions` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-exceptions/{exceptionId}` (V2 booking capacity, propuesto)
- `GET /provider/organizations/{id}/documents`
- `POST /provider/organizations/{id}/documents`
- `GET /provider/organizations/{id}/approval-status`
- `GET /provider/bookings`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `GET /bookings/{id}/operations` (V2 provider operations)
- `POST /bookings/{id}/operations/check-in` (V2 provider operations)
- `POST /bookings/{id}/operations/check-out` (V2 provider operations)
- `POST /bookings/{id}/operations/tokens/consume` (V2 QR provider operations, propuesto)
- `POST /bookings/{id}/operations/evidence` (V2 provider operations)
- `PUT /bookings/{id}/operations/report-card` (V2 provider operations)
- `POST /bookings/{id}/operations/internal-notes` (V2 provider operations)

## Criterio de done V2 provider operations
- el proveedor ve un timeline operacional en reservas confirmadas de su organizacion
- el proveedor puede registrar check-in y check-out mediante QR temporal validado server-side; los botones manuales son fallback piloto
- el proveedor puede asociar evidencia al booking con storage protegido
- el proveedor puede crear o actualizar un report card operacional
- el proveedor puede crear notas internas no visibles al owner
- admin puede leer el timeline para soporte o auditoria operativa
- owner no ve notas internas ni evidencia privada
- no se integran pagos reales, payouts, ingresos, refunds ni conciliacion

## Criterio de done V2 booking capacity
- el proveedor configura capacidad por franja asociada a servicio.
- el owner ve slots disponibles con cupos restantes.
- la creacion de booking desde slot valida capacidad server-side y evita sobreventa.
- las reservas `pending_approval` y `confirmed` consumen cupo.
- cancelaciones/rechazos liberan cupo segun reglas documentadas.
- QR operations sigue operando despues de que el booking existe y no participa en la seleccion de cupo.

## Criterio de done del modulo MVP
- el proveedor crea su organizacion
- puede editar su perfil de negocio
- completa su perfil publico
- configura servicios y disponibilidad
- carga documentos de aprobacion
- consulta su estado de aprobacion
- queda listo para revision administrativa y publicacion en marketplace
- recibe y opera reservas dentro del subset minimo del MVP
