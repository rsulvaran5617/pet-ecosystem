# SCREEN_SPECIFICATIONS.md

## Estado de productizacion UX

La fase UX por rol queda `cerrada` sobre el MVP existente.

Estas pantallas siguen siendo el baseline funcional, pero ahora se presentan agrupadas por rol e intencion:

- owner mobile: Inicio, Mascotas, Buscar, Reservas, Mensajes y Cuenta
- provider: Inicio, Negocio, Servicios, Horarios, Reservas, Mensajes, Estado y Cuenta
- admin web: Inicio, Proveedores y Soporte

No se agregaron nuevas entidades, APIs, tablas, migraciones ni capacidades V2/V3.

## Pantallas MVP minimas

### Core
- onboarding
- registro
- verificacion OTP manual
- login
- recovery
- perfil
- preferencias
- direcciones
- metodos de pago
- cambio de rol

### Households
- snapshot de hogares
- miembros
- invitaciones

### Pets
- lista de mascotas
- crear mascota
- editar mascota
- perfil mascota
- documentos

### Health
- dashboard de salud
- vacunas
- alergias
- condiciones

### Reminders
- calendario
- crear reminder
- completar o posponer

### Marketplace
- home marketplace publico
- resultados
- perfil proveedor
- seleccion de servicio

### Bookings
- preview
- historial
- detalle
- cancelacion
- V2 owner booking QR: en detalle de reserva confirmada, accion para mostrar QR temporal de check-in y luego check-out
- V2 booking capacity: seleccion de slot/cupo antes de crear booking; slots como tarjetas por dia con cupos disponibles

### Messaging
- inbox
- detalle de chat

### Reviews
- dejar review

### Support
- crear caso
- listar mis casos
- detalle de caso

### Providers
- organizaciones
- perfil de negocio
- perfil publico
- servicios
- disponibilidad
- horarios y capacidad
- documentos de aprobacion
- estado de aprobacion
- incoming bookings
- detalle operativo del booking con acciones `approve`, `reject` y `complete`
- V2 provider booking operations: scanner QR en detalle de reserva confirmada para check-in/check-out; botones manuales quedan fallback piloto
- V2 booking capacity: provider configura capacidad por franja asociada a servicio

### Booking operations QR V2
- owner ve QR temporal, no token tecnico ni booking_id plano
- provider escanea QR desde detalle de reserva confirmada
- errores deben explicar token expirado, ya usado, reserva no confirmada o permisos insuficientes
- evidencia se presenta despues como fotos/documentos de actividad, no como prueba principal de presencia

### Booking capacity V2
- provider ve pantalla `Horarios y capacidad`.
- provider crea/edita franja con servicio, dia de semana, hora inicio, hora fin, capacidad y activo/inactivo.
- owner ve `Selecciona un horario` dentro del flujo de reserva.
- owner ve tarjetas tipo slot con hora y copy: `3 disponibles`, `Ultimo cupo`, `Lleno`, `No disponible` o `Expirado`.
- slots llenos, inactivos o expirados quedan deshabilitados.
- al confirmar, si el cupo se agoto, mostrar: `Este horario acaba de llenarse. Elige otro.`
- la UI no calcula cupo final; solo presenta resultado de RPC y maneja errores.

### Admin
- login admin
- home admin
- proveedores pendientes
- detalle de proveedor
- cola de soporte
- soporte basico

## Pantallas explicitamente fuera de este baseline
- dashboard admin avanzado
- dashboard provider avanzado
- checkout con cobro real
- payouts
- clinic
- commerce
- pharmacy
- telecare
