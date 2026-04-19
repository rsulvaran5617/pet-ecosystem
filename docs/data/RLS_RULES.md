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

### pet_documents
Visible para miembros autorizados del hogar.
Carga de documentos requiere permisos derivados de `edit` o `admin`.

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

### bookings / booking_pricing / booking_status_history
Visible a miembros del hogar via funciones de acceso y al owner de la organizacion proveedora involucrada via `can_view_booking`.
Crear o cancelar bookings ocurre via RPC `security definer` y exige permiso `book` en el hogar.
Aprobar o rechazar un booking `pending_approval` exige ownership de la organizacion proveedora.
Marcar un booking `confirmed` como `completed` exige ownership del proveedor involucrado.
Adjuntar un `payment_method` exige permiso `pay` o `admin`.
No se habilita insercion ni edicion directa por tabla para usuarios autenticados.

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
