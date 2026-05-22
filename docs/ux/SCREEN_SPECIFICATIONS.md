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
- pantalla de acceso mobile ordenada por pestañas: login por defecto, registro, OTP y recuperación ocultos hasta seleccionarlos
- pantalla sin sesion enfocada solo en autenticacion; marketplace, contexto de hogar y proveedores quedan ocultos hasta iniciar sesion
- login exitoso sin aviso global persistente; los mensajes visibles quedan para errores, verificacion, recuperacion y cierre de sesion
- registro mobile pasa a verificación OTP después de crear cuenta y permite solicitar reenvío controlado del código
- perfil
- preferencias
- direcciones
- metodos de pago
- cambio de rol
- web autenticada respeta rol activo: `provider` muestra consola de proveedor y oculta workspaces owner; `pet_owner` muestra hogar/mascotas/marketplace/reservas y oculta consola provider

### Households
- snapshot de hogares
- miembros
- invitaciones
- compuerta owner post-login: si no existe hogar/familia, crear hogar aparece antes de Inicio/Mascotas

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
- ubicacion publica exacta del proveedor en cards/lista con ciudad, pais y distancia aproximada solo si hay origen opcional
- widget compacto de busqueda: campo principal, categorias rapidas, selector colapsable de origen para distancia y filtros avanzados bajo demanda
- Owner Buscar adopta patron visual de marketplace mobile: barra superior con buscador, accion de filtros, modo de busqueda enfocada, sugerencias, categorias rapidas y cards de resultado con avatar/ubicacion/CTA.
- modo Lista/Mapa en resultados; el mapa usa pins de proveedores con ubicacion publica y card inferior para abrir proveedor, sin GPS ni tracking
- seleccion de servicio

### Bookings
- preview
- historial
- detalle
- cancelacion
- requery controlado al entrar a Reservas y despues de mutaciones criticas para reflejar estados recientes sin Realtime
- owner reservas: la vista de historial abre por defecto en reservas Activas para reducir ruido visual; "Todas" queda disponible como filtro secundario de consulta historica
- V2 owner booking QR: en detalle de reserva confirmada, accion para mostrar QR temporal de check-in y luego check-out
- V2 booking capacity: seleccion de slot/cupo antes de crear booking; slots como tarjetas por dia con cupos disponibles
- owner Buscar -> Reservas: si el usuario toca `Abrir vista previa de la reserva` con slot elegido, Reservas conserva proveedor/servicio/slot y salta al paso pendiente de mascota/metodo sin consumir cupo.
- owner Reservas: flujo de preparacion usa stepper horizontal tipo etiquetas con estados completado, activo y pendiente para Servicio, Mascota, Horario, Resumen y Confirmar.
- owner Reservas preview: mostrar resumen tipo ticket compacto con estado, proveedor/servicio, mascota, horario, precio, metodo y CTA principal `Confirmar reserva`.

### Messaging
- inbox
- detalle de chat
- requery de hilos al entrar desde el menu para evitar estados de reserva obsoletos
- polling silencioso en conversacion abierta para recibir mensajes nuevos de otro dispositivo sin Realtime

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
- web provider console en `apps/web`: cabecera operativa, metricas, navegacion por secciones y acceso a Negocios, Publicacion, Reservas, Perfil publico, Servicios, Disponibilidad y Documentos sin usar admin interno
- web provider console mantiene formularios colapsados por defecto y usa CTAs de crear/editar para abrirlos; `Mis negocios` se muestra como carrusel horizontal y cada tarjeta abre la edicion del negocio mediante un CTA de lapiz
- cabecera web provider separa `Negocio seleccionado` de `Pendientes generales`; los pendientes globales se agregan por todos los negocios y cada caja navega al primer negocio relacionado y a la seccion que resuelve el pendiente
- cabecera web provider incluye tres indicadores globales `payment-ready`: ingresado por citas completadas, pendiente por citas pendientes/confirmadas y no ingresado por cancelaciones atribuidas al proveedor por razon registrada; son referencia operativa, sin cobro real
- `Publicacion` en web provider muestra un panel de pendientes accionables; cada pendiente abre la seccion que lo resuelve: perfil, servicios, agenda, documentos o negocio
- `Agenda` en web provider incluye una vista read-only de cupos publicados por servicio: selector de servicio, consulta de proximos 14 dias y tarjetas por fecha/horario con cupos reservados, disponibles y estado; no crea reservas ni consume cupo
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
- owner mensajes: bandeja tipo correo con hilos de reserva ordenados por actividad reciente, cabeceras compactas y detalle desplegable por acordeon; el filtro queda simplificado a un dropdown de estado de reserva
- owner mascotas: la mascota seleccionada se conserva como contexto activo al navegar por el menu inferior y se rehidrata al volver a Mascotas, Salud, Documentos o Recordatorios
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
- detalle de proveedor muestra readiness de publicacion para piloto: perfil publico, servicios, horarios/capacidad, ubicacion publica, documentos y visibilidad
- documentos de aprobacion se abren desde admin con enlaces firmados temporales para auditoria read-only
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
