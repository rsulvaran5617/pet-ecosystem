# RLS_RULES.md

## Objetivo
Definir reglas de acceso por fila para Supabase.

## Principios
- el usuario ve lo suyo
- los miembros de un hogar ven solo lo autorizado
- el proveedor ve solo su organizacion
- el staff ve lo autorizado por su rol
- el admin de plataforma ve segun rol global

## Reglas minimas por tabla

### profiles
Un usuario solo ve y modifica su propio perfil, salvo admin.

### user_roles
Un usuario solo ve y modifica sus propios roles, salvo admin.

### user_addresses
Un usuario solo ve y modifica sus propias direcciones, salvo admin.

### payment_methods
Un usuario solo ve y modifica sus propios metodos de pago guardados, salvo admin.
Los datos sensibles del procesador no deben exponerse fuera del scope autorizado.

### households
Visible para owner y miembros activos.

### household_members
Visible para miembros del hogar.

### pets
Visible para usuarios con acceso al hogar y permisos correspondientes.

### pet_documents
Visible para miembros autorizados del hogar.
Visible a proveedores solo si existe share activo.

### health tables
Visible para miembros autorizados del hogar.
Visible a clinica o proveedor solo cuando haya consentimiento o vinculo valido.

### bookings
Visible al hogar que creo la reserva y al proveedor de la reserva.

### chat_threads / chat_messages
Visible solo a participantes.

### support_cases
Visible al creador, soporte y admin.
Visible al proveedor solo cuando el caso le corresponda.

### payments
Visible al pagador y admin.
Visibilidad parcial al proveedor cuando impacta payout.

## Regla de cambio
No implementar tablas sensibles sin definir su politica RLS.
