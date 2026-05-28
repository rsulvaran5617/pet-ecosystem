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
- landing web publica en `/` con identidad de Pet Ecosystem, header de marca, hero con mock mobile con saludo a Valeria, visual pet, bloques de confianza, pasos `Asi funciona`, cards para dueños/proveedores y CTA hacia `/app`
- experiencia web autenticada vive en `/app`
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
- owner web usa una consola con sidebar izquierdo y area de contenido derecha para `Panel`, `Hogar`, `Mascotas`, `Salud`, `Agenda`, `Buscar`, `Reservas`, `Mensajes` y `Cuenta`, manteniendo los workspaces existentes y sin cambiar contratos ni reglas
- owner web `Panel` muestra dashboard interno de gestion de mascotas con saludo, KPIs de mascotas/reservas/recordatorios/documentos/mensajes, cards de mascotas, proximas actividades, salud y recordatorios, documentos, actividad reciente y accesos rapidos usando datos existentes y empty states visuales

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
- V2 Pet Travel Passport futuro: desde el detalle de mascota, CTA `Preparar viaje` hacia expediente internacional informativo con estado de preparacion, documentos de viaje, checklist manual y vencimientos. La pantalla debe aclarar que no emite documentos oficiales y que los requisitos se validan con autoridades/veterinarios/aerolineas.
- owner mobile Mascotas permite actualizar avatar tomando foto con camara o seleccionando imagen de la galeria, con permisos nativos y misma carga controlada al bucket privado.
- owner web Mascotas usa carrusel horizontal superior de mascotas y panel inferior compacto para datos maestros, resumen y documentos de la mascota seleccionada sin cambiar contratos ni reglas

### Health
- dashboard de salud
- vacunas
- alergias
- condiciones
- owner web Salud usa carrusel superior de mascotas y ficha inferior compacta con resumen, vacunas, alergias y condiciones para evitar columnas altas y mantener controles pequenos

### Reminders
- calendario
- crear reminder
- completar o posponer
- owner web Recordatorios usa el patron mobile con selector hogar/mascota, resumen por secciones, formulario plegable y listas compactas de pendientes, completados y calendario.
- V2 Pet Travel Passport futuro: recordatorios de vencimiento de vacuna, certificado, microchip/documento si aplica, ventana de desparasitacion, fecha limite de tramite y verificacion previa de requisitos oficiales.

### Pet Travel Passport / Expediente Internacional V2
- expediente de viaje dentro del detalle de mascota.
- resumen de preparacion: incompleto, en preparacion, listo para revision, vencido.
- checklist manual por pais/destino con fuente oficial cuando exista.
- carpeta documental privada de viaje.
- alertas de vencimiento y ventanas criticas.
- accion `Compartir con veterinario` sujeta a consentimiento owner.
- provider/veterinario puede ver expediente compartido, adjuntar documentos y sugerir faltantes en un slice futuro.
- admin no opera documentos medicos por defecto; solo metricas, soporte justificado o moderacion de plantillas/checklists.
- copy obligatorio: Pet Ecosystem ayuda a organizar y preparar informacion, pero no emite pasaportes oficiales ni certificados sanitarios oficiales.

### Marketplace
- home marketplace publico
- resultados
- perfil proveedor
- V2.5 Foster/Adoption futuro: marketplace de adopcion separado del marketplace de servicios, con mascotas `Busca hogar`, filtros por especie/tamano/edad/ciudad/condicion/compatibilidad y sin precios, checkout ni reservas comerciales.
- ubicacion publica exacta del proveedor en cards/lista con ciudad, pais y distancia aproximada solo si hay origen opcional
- widget compacto de busqueda: campo principal, categorias rapidas, selector colapsable de origen para distancia y filtros avanzados bajo demanda
- Owner Buscar adopta patron visual de marketplace mobile: barra superior con buscador, accion de filtros, modo de busqueda enfocada, sugerencias, categorias rapidas y cards de resultado con avatar/ubicacion/CTA.
- owner web Buscar queda alineado funcionalmente con owner mobile: busqueda enfocada, recientes, sugerencias, chips rapidos, filtros bajo demanda, contexto hogar/mascota y seleccion enriquecida hacia Reservas.
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
- aviso emergente in-app con vibracion corta en `Mensajes` cuando llega un mensaje entrante de la contraparte; no cubre push en background/cerrado

### Reviews
- dejar review

### Support
- crear caso
- listar mis casos
- detalle de caso

### Foster/Adoption V2.5
- Foster mobile/web: Home foster, Mis mascotas en acogida, Crear mascota en acogida, Expediente, Publicar para adopcion, Solicitudes recibidas, Detalle de solicitud y Transferencia/adopcion.
- Owner/adoptante: Marketplace de adopcion, Perfil de mascota, Solicitar adopcion, Mis solicitudes, Seguimiento y Mascota adoptada agregada a mi hogar.
- Admin: Aprobar foster/institucion, Moderar publicaciones, Revisar reportes, Ver solicitudes sospechosas, Bloquear publicacion y Auditar transferencia.
- Perfil publico de mascota en adopcion: fotos, nombre, especie, sexo, edad estimada, tamano, personalidad, historia breve, estado de salud publico, vacunas relevantes, esterilizacion si aplica, requisitos de adopcion, ciudad/zona y CTA `Solicitar adopcion`.
- La UX debe comunicar adopcion responsable y no venta; no mostrar direccion exacta, datos sensibles ni documentos privados.

### Providers
- organizaciones
- perfil de negocio
- perfil publico
- web provider console en `apps/web`: cabecera operativa, metricas, navegacion por secciones y acceso a Negocios, Publicacion, Reservas, Perfil publico, Servicios, Disponibilidad y Documentos sin usar admin interno
- web provider PW-0 usa una base visual de consola profesional con sidebar izquierdo `Panel`, `Negocios`, `Servicios`, `Reservas`, `Agenda`, `Publicacion` y `Documentos`, topbar de negocio activo, cards blancas, chips de estado y metricas compactas sin alterar datos ni mutaciones
- web provider PW-1 convierte `Panel` en dashboard multinegocios con header de acciones rapidas, metricas ejecutivas, tarjetas de negocio gestionables, salud del negocio activo y proximas acciones operativas; los datos faltantes se presentan como pendientes o empty states profesionales
- web provider PW-1 adopta composicion tipo dashboard ejecutivo para `Panel`: titulo `Panel de gestion multi-negocio`, KPIs superiores, comparativo por negocio, embudo consolidado, heatmap de capacidad, ranking de servicios, alertas y estado por negocio usando datos existentes o derivados en cliente
- en el dashboard provider, `Ranking de servicios` resume todos los negocios y no solo el negocio activo; cada fila muestra servicio, negocio, cantidad de reservas e ingreso estimado
- en el dashboard provider, `Capacidad y ocupacion` mantiene formato heatmap pero muestra ocupacion real derivada: reservas activas sobre cupos publicados por franja y dia, incluyendo lectura `reservadas/cupos`
- web provider console mantiene formularios colapsados por defecto y usa CTAs de crear/editar para abrirlos; `Mis negocios` se muestra como carrusel horizontal y cada tarjeta abre la edicion del negocio mediante un CTA de lapiz
- web provider usa navegacion lateral por seccion unica: el item activo muestra solo su contenido y oculta el resto para evitar que el usuario mezcle Reservas, Perfil, Servicios o Agenda en un mismo scroll
- topbar web provider mantiene el bloque `Negocio activo` compacto, con tipografia reducida, separacion suficiente respecto al sidebar y truncado visual para nombres largos
- `Publicacion` y `Perfil publico` en web provider usan composicion compacta con tipografia reducida, chips/CTAs pequeños y tarjetas de pendientes densas para priorizar lectura ejecutiva
- `Datos del negocio` y `Documentos de aprobacion` en web provider usan el mismo tratamiento compacto: cabecera menor, campos densos, CTAs pequeños y lista documental ligera
- web provider trata `Documentos de aprobacion` como expediente maestro del negocio: se muestran y cargan dentro de la seccion de edicion abierta con el lapiz de la tarjeta del negocio, no como seccion operativa independiente
- cabecera web provider separa `Negocio seleccionado` de `Pendientes generales`; los pendientes globales se agregan por todos los negocios y cada caja navega al primer negocio relacionado y a la seccion que resuelve el pendiente
- en `Pendientes generales`, `Citas por aprobar` despliega un resumen agrupado por negocio con cada solicitud pendiente, servicio, mascota, cliente, fecha e importe antes de entrar al detalle operativo de reservas
- el dashboard multinegocio provider consolida metricas desde cada negocio cargando detalles y reservas en orden estable para que reservas, servicios, ingresos y salud no queden en cero por carga parcial
- `Reservas entrantes` en web provider inicia filtrado por `Pendientes por aprobar` y permite alternar chips de estado para ver confirmadas, completadas y canceladas del negocio activo
- cada tarjeta expandida de `Reservas entrantes` incluye accion `Chatear` cuando la reserva tiene hilo transaccional, reutilizando messaging existente para pedir informacion adicional o explicar una decision al owner
- cada tarjeta expandida de `Reservas entrantes` muestra `Ejecucion operacional` con check-in, check-out, evidencia documental, estado operativo y fallback manual para piloto; la carga de evidencia aparece solo despues de check-out y no reemplaza QR mobile
- el KPI consolidado antes llamado `Salud promedio` se presenta como `Preparacion marketplace` para evitar confusion con salud medica; sigue midiendo readiness de perfil, servicios, agenda, documentos, ubicacion y visibilidad
- `Conversaciones activas` reemplaza el KPI anterior de soporte y se muestra en la seccion Reservas con lista de hilos, detalle del chat y respuesta de texto para el proveedor
- web provider muestra un popup pequeno y profesional cuando llega una nueva solicitud de cita `pending_approval` mientras la consola esta abierta; el CTA lleva a `Reservas` filtrado por pendientes del negocio correspondiente
- shell web provider usa un encabezado compacto con menor altura y sin chip de progreso de onboarding para priorizar el area operativa de la consola
- cabecera web provider incluye tres indicadores globales `payment-ready`: ingresado por citas completadas, pendiente por citas pendientes/confirmadas y no ingresado por cancelaciones atribuidas al proveedor por razon registrada; son referencia operativa, sin cobro real
- `Publicacion` en web provider se integra como checklist compacto dentro de cada tarjeta de negocio con estados verdes `Listo` y naranjas `Pendiente`; el panel grande de publicacion se oculta para liberar espacio operativo
- `Agenda` en web provider permite crear y editar horarios con cupos por servicio igual que mobile provider: servicio, dia, hora inicio, hora fin, capacidad y activo/inactivo; ademas incluye vista read-only de cupos proyectados por servicio para los proximos 14 dias, sin crear reservas ni consumir cupo
- `Agenda` en web provider usa un planificador semanal compacto dentro de un layout de dos columnas: servicios/agenda tienen mas ancho horizontal, los bloques por dia son bajos y los botones internos usan menor tamano para reducir scroll vertical
- formulario compacto de `Agenda` en web provider reduce tipografia y controles de hora/cupos; la capacidad no admite valores negativos ni decimales al guardar
- `Servicios` en web provider permite eliminar servicios creados por error solo cuando no tienen reservas asociadas; los servicios con historial se conservan y se gestionan con `Servicio activo` / `Servicio publico`
- ubicacion publica del proveedor con precision `exact`, `approximate` o `city`; captura por direccion/datos del negocio y coordenadas avanzadas sin mapa, permisos mobile ni tracking
- `Perfil publico` en web provider expone la ubicacion publica del negocio: nombre visible, direccion publica opcional, ciudad, region, pais, latitud, longitud, precision y publicacion
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
