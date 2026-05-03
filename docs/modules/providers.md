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

## Entidades
- `provider_organizations`
- `provider_public_profiles`
- `provider_services`
- `provider_availability`
- `provider_documents`
- `bookings`
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

## Reglas
- un proveedor opera dentro de una organizacion
- solo organizaciones con `approval_status = approved` pueden publicarse en marketplace
- la organizacion tambien debe tener `is_public = true`
- el perfil publico debe tener `is_public = true`
- marketplace solo expone servicios con `is_public = true` e `is_active = true`
- marketplace solo expone disponibilidad activa de organizaciones publicas ya aprobadas
- el owner proveedor ve y gestiona solo su propia organizacion
- la operacion provider-side del MVP se limita a recibir, aprobar, rechazar y completar reservas
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

## Criterio de done del modulo MVP
- el proveedor crea su organizacion
- puede editar su perfil de negocio
- completa su perfil publico
- configura servicios y disponibilidad
- carga documentos de aprobacion
- consulta su estado de aprobacion
- queda listo para revision administrativa y publicacion en marketplace
- recibe y opera reservas dentro del subset minimo del MVP
