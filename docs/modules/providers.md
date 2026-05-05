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
- registrar check-in y check-out de servicio
- subir evidencia operacional del servicio
- completar report card no financiero
- mantener notas internas del equipo proveedor

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
- `audit_logs`

## Pantallas
- onboarding proveedor
- perfil negocio
- perfil publico
- servicios
- disponibilidad
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
- el owner proveedor ve y gestiona solo su propia organizacion
- la operacion provider-side del MVP se limita a recibir, aprobar, rechazar y completar reservas
- V2 provider operations extiende la consola para ejecutar el servicio entre `confirmed` y `completed`
- check-in/check-out, evidencia, report card y notas internas pertenecen al contexto de una reserva
- internal notes son privadas para provider/admin y no deben mostrarse al owner
- evidencia visible para owner requiere decision explicita posterior
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
- `POST /bookings/{id}/operations/evidence` (V2 provider operations)
- `PUT /bookings/{id}/operations/report-card` (V2 provider operations)
- `POST /bookings/{id}/operations/internal-notes` (V2 provider operations)

## Criterio de done V2 provider operations
- el proveedor ve un timeline operacional en reservas confirmadas de su organizacion
- el proveedor puede registrar check-in y check-out segun reglas de estado acordadas
- el proveedor puede asociar evidencia al booking con storage protegido
- el proveedor puede crear o actualizar un report card operacional
- el proveedor puede crear notas internas no visibles al owner
- admin puede leer el timeline para soporte o auditoria operativa
- owner no ve notas internas ni evidencia privada
- no se integran pagos reales, payouts, ingresos, refunds ni conciliacion

## Criterio de done del modulo MVP
- el proveedor crea su organizacion
- puede editar su perfil de negocio
- completa su perfil publico
- configura servicios y disponibilidad
- carga documentos de aprobacion
- consulta su estado de aprobacion
- queda listo para revision administrativa y publicacion en marketplace
- recibe y opera reservas dentro del subset minimo del MVP
