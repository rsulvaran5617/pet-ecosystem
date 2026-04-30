# ROLE_BASED_SCREEN_ARCHITECTURE.md

## 1. Proposito

Este documento abre la fase de arquitectura UX por rol posterior al cierre del MVP.

El MVP funcional ya esta construido, validado y aprobado para piloto controlado. Esta fase no abre V2/V3, no cambia backend, no cambia base de datos y no modifica contratos API. Su objetivo es reorganizar la experiencia existente para que el producto se sienta como una app real por rol y no como una superficie tecnica de validacion.

Estado base asumido:

- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1`
- QA/UAT final: `completada`
- piloto controlado: `aprobado`
- smoke automatizada: `PASS`
- web manual: `PASS`
- Android manual `AND-01`, `AND-02`, `AND-03`: `PASS`
- pagos: `payment-ready`, sin captura real
- clinic, commerce, pharmacy, finance, benefits y telecare: fuera del baseline actual

Estado de cierre de esta fase:

- productizacion UX por rol: `cerrada`
- implementacion: `completada` sobre capacidades MVP existentes
- backend, base de datos, migraciones y contratos API: `sin cambios`
- nuevas features V2/V3: `no abiertas`
- pagos: se mantiene `payment-ready`, sin captura real
- siguiente frente recomendado: polish visual y QA manual por rol

Este blueprint queda como canon de arquitectura UX por rol y registro de cierre de la fase de productizacion posterior al MVP funcional.

## 2. Principios de diseno por rol

### Principios generales

- Priorizar intenciones de usuario por encima de nombres de modulos.
- Mantener el alcance MVP: no introducir pagos reales, clinic, commerce, pharmacy, finance, benefits ni telecare.
- Reutilizar `packages/api-client`, `packages/types`, `packages/config` y las capacidades ya validadas.
- Mover acciones al contexto natural: chat, review y soporte nacen desde una reserva; salud y documentos nacen desde una mascota; aprobaciones nacen desde colas admin.
- Separar claramente los modos `propietario`, `proveedor` y `admin`.
- Evitar que el usuario tenga que recorrer una pagina larga de workspaces para completar un flujo.

### Propietario de mascota

El propietario debe sentir que la app responde:

- que necesita mi mascota hoy
- que tengo pendiente
- donde encuentro un servicio
- que pasa con mis reservas
- como contacto al proveedor o a soporte

La experiencia debe empezar en mascotas, salud, agenda y reservas, no en la estructura tecnica del core.

### Proveedor

El proveedor debe sentir que tiene una consola de operacion:

- que falta para estar publicado
- que reservas requieren accion
- que servicios y disponibilidad estan activos
- que estado tiene mi aprobacion
- que clientes debo atender

La experiencia debe empezar en estado operativo y reservas, no en formularios aislados.

### Admin

El admin debe sentir que entra a una cola de decisiones:

- proveedores pendientes
- casos de soporte abiertos
- decisiones de aprobacion
- seguimiento basico de estado

La experiencia debe ser densa, escaneable y orientada a accion.

## 3. Arquitectura por rol

### Propietario de mascota

#### Navegacion principal

- Inicio
- Mascotas
- Agenda
- Buscar
- Reservas
- Mensajes
- Cuenta

#### Pantallas principales

- `OwnerHome`
- `PetsList`
- `PetDetail`
- `PetHealth`
- `PetDocuments`
- `RemindersCalendar`
- `MarketplaceHome`
- `MarketplaceResults`
- `ProviderPublicProfile`
- `BookingPreview`
- `BookingsList`
- `BookingDetail`
- `ChatThread`
- `ReviewBooking`
- `SupportCaseCreate`
- `SupportCasesList`
- `AccountSettings`

#### Subpantallas

- Crear mascota
- Editar mascota
- Cargar documento
- Registrar vacuna
- Registrar alergia
- Registrar condicion
- Crear recordatorio
- Completar o posponer recordatorio
- Seleccionar servicio
- Seleccionar mascota para booking
- Seleccionar metodo guardado opcional
- Cancelar reserva
- Crear caso de soporte desde reserva

#### Entry points

- Home: mascota destacada, recordatorios proximos, reserva activa, mensajes recientes.
- Mascota: acceso a salud, documentos y recordatorios de esa mascota.
- Marketplace: busqueda publica o autenticada de proveedores aprobados.
- Reserva: acceso a chat, review y soporte.
- Cuenta: perfil, preferencias, direcciones, metodos guardados y cambio de rol.

#### Acciones clave

- Crear hogar.
- Registrar mascota.
- Editar perfil de mascota.
- Cargar documentos basicos.
- Registrar salud base.
- Crear, completar o posponer recordatorios.
- Buscar proveedor.
- Reservar servicio.
- Cancelar reserva cuando aplique.
- Conversar con proveedor.
- Dejar review cuando la reserva este `completed`.
- Abrir soporte vinculado a booking.

#### Dependencias entre pantallas

- `Households` habilita `Pets`.
- `Pets` habilita `Health`, `Documents`, `Reminders` y `Bookings`.
- `Marketplace` entrega seleccion a `BookingPreview`.
- `BookingDetail` entrega contexto a `ChatThread`, `ReviewBooking` y `SupportCaseCreate`.
- `AccountSettings` gestiona perfil, preferencias, direcciones, metodos guardados y rol activo.

### Proveedor

#### Navegacion principal

- Inicio
- Onboarding
- Negocio
- Perfil publico
- Servicios
- Disponibilidad
- Reservas
- Mensajes
- Resenas
- Estado

#### Pantallas principales

- `ProviderHome`
- `ProviderOnboardingChecklist`
- `ProviderOrganization`
- `ProviderPublicProfile`
- `ProviderServices`
- `ProviderAvailability`
- `ProviderApprovalDocuments`
- `ProviderApprovalStatus`
- `ProviderBookingsList`
- `ProviderBookingDetail`
- `ProviderCustomerChat`
- `ProviderReviews`

#### Subpantallas

- Crear organizacion.
- Editar organizacion.
- Editar perfil publico.
- Crear servicio.
- Editar servicio.
- Crear bloque de disponibilidad.
- Editar disponibilidad.
- Cargar documento de aprobacion.
- Aprobar booking `pending_approval`.
- Rechazar booking `pending_approval`.
- Marcar booking `confirmed` como `completed`.

#### Entry points

- Home provider: estado de aprobacion, checklist de publicacion, reservas pendientes.
- Onboarding: tareas faltantes para poder aparecer en marketplace.
- Reservas: cola de acciones operativas.
- Estado: explicacion clara de aprobado, pendiente o rechazado.

#### Acciones clave

- Crear organizacion.
- Completar perfil de negocio.
- Configurar perfil publico.
- Crear servicios activos y publicos.
- Definir disponibilidad.
- Subir documentos de aprobacion.
- Consultar estado de aprobacion.
- Recibir reservas.
- Aprobar, rechazar o completar reservas.
- Revisar mensajes y reviews vinculadas a bookings.

#### Dependencias entre pantallas

- `ProviderOrganization` debe existir antes de `ProviderPublicProfile`, `ProviderServices`, `ProviderAvailability` y `ProviderApprovalDocuments`.
- `ProviderApprovalStatus = approved` es requerido para visibilidad en marketplace.
- `ProviderServices` y `ProviderAvailability` alimentan `Marketplace`.
- `ProviderBookingsList` depende de bookings asociados a la organizacion.
- `ProviderCustomerChat` depende de booking existente.
- `ProviderReviews` depende de bookings `completed` con review.

### Admin

#### Navegacion principal

- Inicio
- Proveedores
- Soporte

#### Pantallas principales

- `AdminHome`
- `PendingProvidersQueue`
- `ProviderReviewDetail`
- `ProviderDocumentsReview`
- `SupportCasesQueue`
- `SupportCaseDetail`

#### Subpantallas

- Aprobar proveedor.
- Rechazar proveedor.
- Ver servicios y disponibilidad del proveedor.
- Ver documentos de aprobacion.
- Filtrar casos de soporte por estado.
- Actualizar estado o resolucion de soporte.

#### Entry points

- Home admin: colas accionables.
- Proveedores pendientes: siguiente proveedor a revisar.
- Soporte: casos abiertos o recientes.

#### Acciones clave

- Abrir proveedor pendiente.
- Revisar detalle, servicios, disponibilidad y documentos.
- Aprobar o rechazar proveedor.
- Abrir caso de soporte.
- Cambiar estado o resolucion.
- Refrescar colas.

#### Dependencias entre pantallas

- `PendingProvidersQueue` depende de `provider_organizations` en revision.
- `ProviderReviewDetail` depende de provider, perfil publico, servicios, disponibilidad y documentos.
- `SupportCasesQueue` depende de `support_cases`.
- `SupportCaseDetail` mantiene el alcance MVP: no hay asignaciones, macros, disputas ni chat de soporte.

## 4. Home por rol

### Home propietario

#### Proposito

Mostrar la situacion actual del hogar y dar acceso rapido a las acciones mas frecuentes.

#### Bloques de informacion

- Mascota destacada o selector de mascota.
- Recordatorios proximos.
- Salud resumida: vacunas, alergias y condiciones relevantes.
- Reserva activa o proxima.
- Mensajes recientes vinculados a reservas.
- Busqueda rapida de servicios.
- Casos de soporte abiertos.

#### Acciones rapidas

- Agregar mascota.
- Registrar salud.
- Crear recordatorio.
- Buscar servicio.
- Ver reservas.
- Abrir mensajes.

#### Prioridades visuales

1. Mascotas y pendientes de cuidado.
2. Reservas activas y mensajes.
3. Discovery de servicios.
4. Cuenta y configuracion.

### Home proveedor

#### Proposito

Mostrar si el negocio puede operar y que requiere accion hoy.

#### Bloques de informacion

- Estado de aprobacion.
- Checklist de publicacion.
- Reservas pendientes de aprobacion.
- Reservas confirmadas proximas.
- Servicios publicados y activos.
- Documentos de aprobacion.
- Reviews recientes visibles al proveedor.

#### Acciones rapidas

- Completar perfil publico.
- Agregar servicio.
- Configurar disponibilidad.
- Cargar documento.
- Aprobar reserva.
- Completar servicio.

#### Prioridades visuales

1. Bloqueos de publicacion.
2. Reservas que requieren accion.
3. Operacion del dia.
4. Configuracion del negocio.

### Home admin

#### Proposito

Mostrar colas de decision de plataforma y permitir resolverlas rapidamente.

#### Bloques de informacion

- Proveedores pendientes.
- Casos de soporte abiertos.
- Casos por estado.
- Ultima actividad administrativa basica cuando este disponible en UI.

#### Acciones rapidas

- Revisar siguiente proveedor.
- Abrir proveedor pendiente.
- Abrir caso de soporte.
- Filtrar soporte.
- Refrescar colas.

#### Prioridades visuales

1. Proveedores pendientes.
2. Casos de soporte abiertos.
3. Contexto operativo minimo.

## 5. Navegacion web

### Web propietario

Usar una navegacion superior o sidebar liviana:

- Inicio
- Mascotas
- Agenda
- Buscar
- Reservas
- Mensajes
- Cuenta

Patron recomendado:

- lista + detalle cuando aplique, especialmente en reservas, mensajes y soporte
- `BookingDetail` como hub transaccional
- `PetDetail` como hub de salud, documentos y recordatorios

### Web proveedor

Usar sidebar de consola:

- Inicio
- Onboarding
- Negocio
- Perfil publico
- Servicios
- Disponibilidad
- Reservas
- Mensajes
- Resenas
- Estado

Patron recomendado:

- home con checklist y colas
- formularios en pantallas dedicadas
- reservas con panel de detalle y acciones claras

### Web admin

Usar sidebar o layout de backoffice:

- Inicio
- Proveedores
- Soporte

Patron recomendado:

- colas a la izquierda, detalle a la derecha
- filtros persistentes
- botones de decision visibles y restringidos al estado del caso/proveedor

## 6. Navegacion mobile

### Mobile propietario

Usar bottom navigation:

- Inicio
- Mascotas
- Buscar
- Reservas
- Mensajes

Cuenta, hogares, direcciones, metodos guardados, preferencias y cambio de rol deben vivir en un menu de cuenta.

Stacks principales:

- `InicioStack`: home, recordatorio destacado, reserva destacada
- `MascotasStack`: lista, detalle, salud, documentos
- `BuscarStack`: marketplace, resultados, proveedor, booking preview
- `ReservasStack`: lista, detalle, review, soporte
- `MensajesStack`: inbox, thread

### Mobile proveedor

Si el rol proveedor se mantiene en mobile durante esta fase, usar una navegacion separada por modo:

- Inicio
- Reservas
- Servicios
- Mensajes
- Estado

La configuracion profunda del negocio puede priorizar web si el costo mobile es alto, pero debe quedar claro en UI que el proveedor tiene modo propio.

### Mobile admin

Admin sigue siendo web-first para MVP. No se recomienda abrir admin mobile en esta fase.

## 7. Journeys principales

### Owner registra mascota

1. Inicio owner.
2. Accion `Agregar mascota`.
3. Crear o seleccionar hogar si hace falta.
4. Crear mascota.
5. Ver `PetDetail`.
6. Sugerir siguientes pasos: cargar documento, registrar salud o crear recordatorio.

### Owner ve salud y recordatorios

1. Inicio owner o Mascotas.
2. Abrir mascota.
3. Abrir Salud.
4. Ver vacunas, alergias y condiciones.
5. Registrar o editar item de salud.
6. Ver recordatorios relacionados.
7. Completar o posponer recordatorio.

### Owner busca proveedor y reserva

1. Buscar.
2. Marketplace home.
3. Resultados y filtros basicos.
4. Perfil publico del proveedor.
5. Seleccionar servicio.
6. Booking preview.
7. Seleccionar hogar, mascota y metodo guardado opcional.
8. Crear reserva.
9. Ver detalle con estado `confirmed` o `pending_approval`.

### Owner conversa y deja resena

1. Reservas.
2. Abrir detalle de booking.
3. Abrir chat vinculado.
4. Enviar mensaje.
5. Cuando el booking este `completed`, abrir review.
6. Dejar rating y comentario.

### Owner abre soporte

1. Reservas.
2. Abrir detalle de booking.
3. Accion `Necesito ayuda`.
4. Crear caso vinculado a la reserva.
5. Ver estado y resolucion en soporte.

### Provider completa onboarding

1. Cambiar a modo proveedor.
2. Home provider.
3. Ver checklist.
4. Crear organizacion.
5. Completar perfil publico.
6. Crear servicios.
7. Definir disponibilidad.
8. Subir documentos.
9. Consultar estado de aprobacion.

### Provider publica servicios

1. Servicios.
2. Crear servicio.
3. Definir categoria, precio, moneda, modo de booking y ventana de cancelacion.
4. Marcar servicio activo/publico.
5. Confirmar que la organizacion debe estar aprobada para aparecer en marketplace.

### Provider recibe y gestiona reservas

1. Reservas.
2. Ver pendientes y confirmadas.
3. Abrir detalle.
4. Si `pending_approval`, aprobar o rechazar.
5. Si `confirmed`, marcar como completada cuando corresponda.
6. Usar chat vinculado si hay conversacion.

### Admin aprueba provider

1. Admin Home.
2. Proveedores pendientes.
3. Abrir detalle.
4. Revisar perfil, servicios, disponibilidad y documentos.
5. Aprobar o rechazar.
6. Confirmar que el resultado controla visibilidad en marketplace.

### Admin gestiona soporte

1. Admin Home.
2. Soporte.
3. Filtrar por estado.
4. Abrir caso.
5. Revisar contexto de booking, owner y provider.
6. Actualizar estado o resolucion.

## 8. Mapeo entre capacidades actuales y pantallas futuras

| Capacidad actual | Estado | Pantalla futura | Notas UX |
| --- | --- | --- | --- |
| Auth, perfil, preferencias | implementado | `AccountSettings` | Debe salir del home principal. |
| Direcciones | implementado | `AccountSettings > Direcciones` | Reutilizar CRUD actual. |
| Metodos guardados | implementado parcial | `AccountSettings > Metodos de pago` | Mantener copy `payment-ready`; no prometer cobro real. |
| Roles | implementado | selector de modo / cuenta | Debe distinguir owner vs provider sin mezclar workspaces. |
| Households | implementado | `Cuenta/Hogar` y prerequisite de mascotas | No debe competir con Mascotas como destino primario. |
| Pets | implementado | `Mascotas`, `PetDetail` | Convertir en hub de salud/documentos. |
| Pet documents | implementado | `PetDetail > Documentos` | Upload sigue basico. |
| Health | implementado | `PetDetail > Salud` | Mejorar jerarquia por vacunas, alergias, condiciones. |
| Reminders | implementado | `Agenda` y widgets home | Falta integracion de reservas en agenda. |
| Marketplace | implementado | `Buscar` | Debe sentirse como discovery, no como modulo tecnico. |
| Booking preview/create | implementado | `BookingPreview` | Debe nacer desde servicio seleccionado. |
| Bookings list/detail | implementado | `Reservas`, `BookingDetail` | Debe ser hub para chat, review y soporte. |
| Messaging | implementado | `Mensajes`, `BookingDetail > Chat` | No hay chat libre fuera de booking. |
| Reviews | implementado | `BookingDetail > Review` | Solo para booking `completed`. |
| Support owner | implementado | `BookingDetail > Soporte`, `Soporte` | Un caso por booking en MVP. |
| Provider organization/profile | implementado | `ProviderOnboarding`, `Negocio` | Checklist orientado a publicacion. |
| Provider services | implementado | `Servicios` | Reusar formularios existentes. |
| Provider availability | implementado | `Disponibilidad` | Reusar formularios existentes. |
| Provider documents/status | implementado | `Estado`, `Documentos` | Explicar impacto en marketplace. |
| Provider bookings | implementado | `Reservas proveedor` | Acciones por estado. |
| Admin providers | implementado | `Admin > Proveedores` | Ya cercano a backoffice, mejorar cola/detalle. |
| Admin support | implementado | `Admin > Soporte` | Ya cercano a backoffice, mejorar prioridad/filtros. |

## 9. Gaps UX no resueltos

### Implementado pero mal presentado

- `apps/web` y `apps/mobile` montan workspaces por modulo en una sola superficie larga.
- El modo proveedor aparece dentro de la misma experiencia general, no como consola separada.
- Chat, reviews y soporte existen, pero no estan suficientemente subordinados al detalle de booking.
- Perfil, preferencias, direcciones y metodos guardados compiten con flujos principales.

### Documentado pero no evidente como producto

- Marketplace publico como experiencia de discovery.
- Handoff natural marketplace -> booking.
- Checklist real de publicacion del proveedor.
- Estado de aprobacion como bloqueo operacional.
- Admin como cola de decisiones.

### Tensiones con el estado actual

- El MVP esta validado funcionalmente, pero la UX actual todavia se parece a un workspace tecnico de QA.
- `payments` existe solo como metodos guardados; cualquier copy de reserva debe evitar prometer pago/cobro real.
- `Reminders` no incluye eventos derivados de bookings; si la home muestra agenda, debe diferenciar recordatorios reales de reservas reales.
- `Support` esta vinculado a booking y permite un solo caso por booking; no debe presentarse como soporte general.
- Provider mobile existe como capacidad, pero la operacion profunda del negocio puede ser mas natural web-first en esta fase.
- Admin mobile no existe y no debe abrirse en esta fase.

### Faltaria para fases posteriores

- Navegacion real por rol.
- Home real por rol.
- Badges/counts de reservas pendientes, mensajes y soporte.
- Empty states orientados a accion.
- Integracion de bookings en agenda.
- Mejor priorizacion de colas admin.
- Mejor visibilidad del estado de publicacion provider.
- Notificaciones persistidas quedan fuera si requieren modelo nuevo.

## 10. Orden recomendado de implementacion

### Slice 1: Shell por rol y Home propietario

Estado: `completado`.

Objetivo:

- Crear estructura visual/navegacional por rol sin cambiar backend.
- Convertir owner home en puerta de entrada real.
- Reubicar cuenta, perfil, direcciones y metodos guardados fuera del flujo principal.

Alcance:

- shell owner web/mobile
- home owner
- tabs/bottom navigation mobile
- rutas o estados internos para Mascotas, Buscar, Reservas, Mensajes y Cuenta
- reutilizacion de componentes/hook existentes

No incluye:

- nuevas tablas
- nuevas APIs
- pagos reales
- V2/V3

### Slice 2: Mascotas como hub

Estado: `completado`.

Objetivo:

- Convertir `Pets`, `Health`, `Documents` y parte de `Reminders` en una experiencia centrada en mascota.

Alcance:

- lista de mascotas
- detalle mascota
- salud
- documentos
- recordatorios relacionados

### Slice 3: Booking como hub transaccional

Estado: `completado`.

Objetivo:

- Hacer que reserva sea el centro de chat, review y soporte.

Alcance:

- lista de reservas
- detalle de reserva
- acciones por estado
- handoff a chat
- review para `completed`
- soporte vinculado

### Slice 4: Consola proveedor

Estado: `completado`.

Objetivo:

- Separar claramente el modo proveedor.

Alcance:

- home provider
- checklist onboarding
- negocio/perfil publico
- servicios/disponibilidad/documentos
- reservas proveedor

### Slice 5: Backoffice admin refinado

Estado: `completado`.

Objetivo:

- Reforzar admin como cola de decisiones.

Alcance:

- admin home
- cola proveedores
- cola soporte
- detalle en panel contextual

### Slice 6: Hardening UX no bloqueante

Estado: `completado`.

Objetivo:

- Mejorar claridad, estados vacios, copy y continuidad.

Alcance:

- empty states
- indicadores de estado
- badges si pueden derivarse de datos actuales
- copy consistente con `payment-ready`
- evidencias de piloto sin abrir nuevas capacidades

## 11. Cierre formal de la fase UX

### Resultado

La fase de productizacion UX por rol queda cerrada. El producto deja de presentarse como una superficie de workspaces tecnicos apilados y pasa a organizarse por intencion de usuario:

- propietario: cuidado de mascotas, discovery, reservas, mensajes y cuenta
- proveedor: consola operativa con estado, publicacion, servicios, disponibilidad, reservas y mensajes
- admin: backoffice web-first con colas de decision para proveedores y soporte

### Experiencia productizada por rol

#### Propietario

- Shell mobile owner con navegacion base.
- Home owner como puerta de entrada.
- Cuenta separada del flujo principal.
- Mascotas como hub contextual para detalle, salud, documentos y recordatorios.
- Reservas como hub transaccional para detalle, chat, review y soporte.
- Copy `payment-ready` consistente: metodos guardados como referencia, sin prometer cobro real.

#### Proveedor

- Consola mobile-first separada del modo propietario.
- Home provider con estado operativo, checklist y reservas que requieren accion.
- Negocio/perfil publico, servicios, disponibilidad, documentos y estado de aprobacion organizados por seccion.
- Reservas proveedor como cola operativa con acciones por estado.
- Mensajes reutilizados dentro del alcance MVP ligado a bookings.
- Cuenta provider mantiene perfil, preferencias, direcciones y cambio de rol; hogares y tarjetas guardadas pertenecen al modo propietario y no se muestran dentro de la consola provider.

#### Admin

- Backoffice web-only, consistente con el canon MVP.
- Home admin con colas accionables.
- Cola de proveedores pendientes con detalle contextual.
- Cola de soporte con filtros y detalle contextual.
- Acciones administrativas restringidas al alcance MVP: aprobar/rechazar proveedor y actualizar soporte basico.

### Huecos estructurales

No queda un hueco estructural real de UX dentro del alcance MVP actual. Lo que queda pertenece a polish fino, QA manual por rol y hardening operativo del piloto.

### Explicitamente no abierto

- No se abrio V2/V3.
- No se agregaron nuevas tablas, APIs, entidades ni migraciones.
- No se agregaron notificaciones persistidas.
- No se agrego captura real de pagos.
- No se abrio admin mobile.
- No se incorporaron clinic, commerce, pharmacy, finance, benefits ni telecare.
