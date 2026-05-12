# SCREEN_SPECIFICATIONS.md

## Estado de productizacion UX

La fase UX por rol queda `cerrada` sobre el MVP existente.

La fase controlada `visual_alignment_reference_canon` usa `docs/ux/reference/` y `docs/ux/VISUAL_STYLE_GUIDE.md` como canon visual para alinear apariencia sin cambiar logica funcional.

Estas pantallas siguen siendo el baseline funcional, pero ahora se presentan agrupadas por rol e intencion:

- owner mobile: Inicio, Mascotas, Buscar, Reservas, Mensajes y Cuenta
- provider: Inicio, Negocio, Servicios, Horarios, Reservas, Mensajes, Estado y Cuenta
- admin web: Inicio, Proveedores y Soporte

Ese cierre UX no agrego nuevas entidades, APIs, tablas, migraciones ni capacidades V2/V3. Los bloques V2 documentados mas abajo pertenecen a frentes posteriores abiertos de forma separada.

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
- ubicacion publica en cards/lista con ciudad, pais, precision y distancia aproximada solo si hay origen opcional
- selector compacto de origen para distancia: sin distancia o zona aproximada controlada; direccion guardada queda diferida hasta que exponga coordenadas
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
- ubicacion publica del proveedor con precision `exact`, `approximate` o `city`; captura por direccion/datos del negocio y coordenadas avanzadas sin mapa, permisos mobile ni tracking
- servicios
- disponibilidad
- horarios y capacidad
- documentos de aprobacion
- estado de aprobacion
- incoming bookings
- detalle operativo del booking con acciones `approve`, `reject` y `complete`
- V2 provider booking operations: scanner QR en detalle de reserva confirmada para check-in/check-out; botones manuales quedan fallback piloto
- provider reservas: los contadores Pendientes, Confirmadas, Completadas y Canceladas actuan como filtros tactiles; el detalle de una reserva se muestra como acordeon debajo de la card seleccionada
- provider negocio: la ubicacion publica puede heredar coordenadas aproximadas desde ciudad/zona soportada sin solicitar GPS ni publicar direccion privada.
- V2 booking capacity: provider configura capacidad por franja asociada a servicio

### Booking operations QR V2
- owner ve QR temporal, no token tecnico ni booking_id plano
- provider escanea QR desde detalle de reserva confirmada
- errores deben explicar token expirado, ya usado, reserva no confirmada o permisos insuficientes
- evidencia se presenta despues como fotos/documentos de actividad, no como prueba principal de presencia

### Booking capacity V2
- provider ve pantalla `Horarios y capacidad`.
- provider crea/edita franja con servicio, dia de semana, hora inicio, hora fin, capacidad y activo/inactivo.
- CAP-2 implementa esta pantalla en mobile provider con estados vacios para negocio, servicios y reglas.
- owner ve `Selecciona un horario` dentro del flujo de reserva.
- owner ve tarjetas tipo slot con hora y copy: `3 disponibles`, `Ultimo cupo`, `Lleno`, `No disponible` o `Expirado`.
- slots llenos, inactivos o expirados quedan deshabilitados.
- al confirmar, si el cupo se agoto, mostrar: `Este horario acaba de llenarse. Elige otro.`
- la UI no calcula cupo final; solo presenta resultado de RPC y maneja errores.
- CAP-3 implementa calendario owner con `react-native-calendars` como capa visual y tarjetas propias para la seleccion de slot.

### Admin
- login admin
- home admin
- proveedores pendientes
- detalle de proveedor
- cola de soporte
- soporte basico

## Estado visual alignment reference canon

- owner mobile: shell, navegacion inferior, cards base, chips y botones alineados al canon visual.
- mascotas, marketplace y reservas: cards internas y acciones principales alineadas con tokens visuales compartidos.
- provider mobile: consola, servicios y horarios/capacidad adoptan botones y campos del canon mobile.
- admin web: shell, sidebar, cards, botones y paneles de proveedores/soporte adoptan lenguaje visual del dashboard canon.
- pendiente: validacion visual manual con capturas reales y ajuste fino de iconografia/fotos si se decide versionar assets visuales.

## Pantallas explicitamente fuera de este baseline
- dashboard admin avanzado
- dashboard provider avanzado
- checkout con cobro real
- payouts
- clinic
- commerce
- pharmacy
- telecare
