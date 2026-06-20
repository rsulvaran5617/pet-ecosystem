# HANDOFF.md

## Actualizacion UX selectores de fecha mobile 2026-06-20

- Rama actual: `master`.
- Slice cerrado: ajuste visual de selectores de fecha en owner mobile para Mascotas, Salud y Recordatorios.
- Cambio aplicado: los controles de salto anual pasan a botones compactos `-1 ano` / `+1 ano` y el encabezado central usa formato numerico `MM/YYYY`, evitando que los botones grandes tapen el mes/ano en pantallas pequenas.
- Alcance: solo capa visual mobile; no se tocaron Supabase, migraciones, contratos API, reglas de negocio, Payments, QR ni evidencia.
- Validaciones esperadas antes de publicar: `@pet/mobile lint`, `@pet/mobile typecheck`, `@pet/mobile build` y `git diff --check`.

## Handoff operativo 2026-06-14 - PET-DOC-EXPIRATION

- Rama de trabajo: `feature/pet-doc-expiration`.
- Slice en curso: control de vigencia documental del expediente de mascota.
- Cambios locales implementados:
  - nueva migracion local `supabase/migrations/20260614110000_pet_document_expiration.sql`;
  - metadata de vigencia en `pet_documents`: `has_expiration`, `issued_at`, `expires_at`, `expiration_warning_days`;
  - helper compartido `getPetDocumentValidityStatus`;
  - API client para listar documentos de hogar con nombre de mascota y editar metadata documental;
  - mobile/web owner permiten cargar documentos con vigencia y editarla sin reemplazar archivo;
  - mobile/web owner muestran alertas y chips de vigencia en el expediente de mascota.
- Fuera de alcance confirmado: no se tocaron Payments, booking, QR, evidencia operacional, adoption/foster, provider capacity ni marketplace.
- Supabase remoto: migracion `20260614110000_pet_document_expiration.sql` aplicada correctamente; dry-run posterior reporto base remota al dia.

## Fecha de publicacion documentada

2026-05-17

## Handoff operativo antes de apagado 2026-06-01

- Rama actual verificada: `master`.
- Estado Git antes de este handoff: limpio y sincronizado con `origin/master`.
- HEAD publicado actual: `ca08104 fix(profile): clarify account role modes`.
- Ultimos cierres publicados:
  - `d2d890e fix(reminders): align pet reminder summaries`.
  - `ca08104 fix(profile): clarify account role modes`.
- `REM-001` queda implementado, publicado y validado manualmente en Xiaomi:
  - Inicio, ficha de mascota y Recordatorios comparten la misma fuente visible de recordatorios.
  - La ficha de mascota muestra recordatorios pendientes reales o empty state especifico.
  - Al crear/completar/posponer desde Recordatorios se refresca el resumen compartido.
  - QA usuario confirmada: los recordatorios aparecen para la mascota.
- `PROF-001` queda implementado, publicado e instalado en Xiaomi:
  - `Cuenta > Modo de uso` muestra rol activo, roles disponibles y descripcion de cada modo.
  - Si falta `pet_owner` o `provider`, se muestra instruccion clara para solicitar habilitacion al equipo interno durante piloto.
  - No se crean roles automaticamente, no se tocan permisos, Supabase, DB ni contratos.
- Validaciones ejecutadas para los cierres recientes:
  - `corepack pnpm --filter @pet/mobile lint` PASS.
  - `corepack pnpm --filter @pet/mobile typecheck` PASS.
  - `corepack pnpm --filter @pet/mobile build` PASS.
  - `git diff --check` PASS.
- APK QA generada e instalada en Xiaomi `85975329`:
  - `dist/pilot/android/pet-ecosystem-pilot-v0.3.1-profile-roles-prof001-20260601-arm64-hermes-release.apk`
  - SHA256 `9B34599860CC2F2F36BAEC7D82B7FE561603EC4C6111F378CEBF3557C89A789D`
- Tema nuevo planteado antes de apagar:
  - En `Salud > Vacunas`, seria valioso adjuntar una foto del sticker/datos de la vacuna como evidencia documental fidedigna.
  - Recomendacion inicial: implementar primero como slice pequeno sin migracion, reutilizando documentos existentes de mascota/storage actual. Desde la vacuna se agregaria accion `Cargar foto del sticker`, guardandola como documento tipo cartilla/registro medico y mostrandola como evidencia asociada visualmente.
  - Alternativa posterior mas trazable: entidad especifica por vacuna (`pet_vaccine_evidence`) con migracion/RLS/API, solo si piloto confirma necesidad.
- Siguiente paso recomendado al retomar:
  1. Confirmar si se implementa el slice `HEALTH vaccine sticker evidence` sin DB nueva.
  2. Revisar `docs/modules/health.md`, `docs/modules/pets.md`, `apps/mobile/src/features/health/components/HealthWorkspace.tsx`, `apps/mobile/src/features/pets/components/PetsWorkspace.tsx` y storage/documentos actuales.
  3. Mantener fuera de alcance Supabase/migraciones/RLS/contratos hasta que el usuario lo apruebe.

## Handoff operativo antes de apagado 2026-05-29

- Rama actual verificada: `master`.
- Estado Git verificado: limpio y sincronizado con `origin/master`.
- HEAD publicado actual: `7e1a19f fix(bookings): resolve provider booking participant names`.
- Ultimos cierres publicados:
  - `064224b feat(web): show provider booking operations timeline`.
  - `9793f6e feat(providers): allow safe deletion of unused businesses`.
  - `3b2bd76 fix(providers): complete safe business deletion flow`.
  - `7e1a19f fix(bookings): resolve provider booking participant names`.
- Supabase remoto queda al dia segun dry-run posterior al fix de participantes de reserva.
- Ultimo bug resuelto: en web provider, algunas reservas de owners externos mostraban `Unknown household`, `Unknown customer` y `Unknown pet` porque el API intentaba leer directamente `households`, `profiles` y `pets`, protegidas por RLS. Se corrigio con RPC `get_booking_participant_summaries`, que devuelve solo hogar, cliente y mascota para reservas visibles por `can_view_booking`.
- Web provider ya tiene:
  - timeline operacional de reservas con check-in, check-out y evidencia documental;
  - borrado seguro de negocios sin historial transaccional;
  - mensajes claros de exito o bloqueo por datos transaccionales;
  - resumen correcto de participantes de la cita sin abrir datos privados completos del owner.
- Siguiente paso recomendado al retomar: desplegar GOTA para que el dominio tome `7e1a19f`, luego validar en web provider la cita de `sp_velasco@hotmail.com` / mascota `GINGER` y confirmar que ya no aparecen placeholders `Unknown`.
- Script de despliegue GOTA usado en este proyecto:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem"
.\scripts\deploy-droplet.ps1 -SshTarget "root@143.198.165.191"
```

## Actualizacion mobile owner reservas 2026-05-29

- Se corrige un caso de QA donde owner mobile mantenia abierto el detalle de una reserva como `Pendiente de aprobacion` despues de que provider web la aprobaba.
- Causa: el hook de reservas ya refrescaba la lista por Realtime/polling, pero no recargaba `selectedBookingDetail` cuando el detalle permanecia abierto en pantalla.
- Solucion: `useBookingsWorkspace` conserva el id del detalle abierto y, durante cada refresco de reservas, recarga tambien el detalle seleccionado si sigue perteneciendo al hogar/filtro actual.
- No se tocaron backend, Supabase, migraciones, RLS, RPCs, QR, evidencia operacional, Payments ni reglas de booking.
- Validaciones ejecutadas: `@pet/mobile lint`, `@pet/mobile typecheck` y `git diff --check` en `PASS`.
- APK QA generada para validar en Xiaomi:
  - `dist/pilot/android/pet-ecosystem-pilot-v0.3.1-booking-detail-refresh-20260529-arm64-hermes-release.apk`
  - SHA256 `EDBB3185A6BD4C27C77E5493EE19982CC2B1286D8E870C15F9217A27D712EB10`
- Prueba recomendada: abrir el detalle de una reserva owner `pending_approval`, aprobarla desde web provider y confirmar que el detalle mobile cambia a `Confirmada/Aprobada` sin salir y volver a entrar.

## Actualizacion documental V2 Pet Travel Passport 2026-05-25

- Se documenta `Pet Travel Passport / Expediente Internacional de Mascota` como alcance V2 en `docs/modules/pet_travel_passport.md`.
- El alcance es informativo y preparatorio: organiza datos, documentos, vencimientos, checklist manual y comparticion autorizada para viajes con mascotas.
- La app no emite pasaporte oficial, certificado sanitario oficial ni documento gubernamental; la validez depende de veterinarios certificados, autoridades sanitarias, aerolineas y pais destino.
- No se tocaron codigo funcional, Supabase, migraciones, RLS reales, pagos, booking, QR, geolocalizacion, marketplace ni mobile.
- Se actualizan referencias documentales de modulo, V2, modelo de datos conceptual, RLS esperada y UX futura.

## Actualizacion documental V2.5 Foster/Adoption 2026-05-26

- Se documenta `Hogares de acogida, rescate y adopcion de mascotas` como nodo futuro V2.5 no financiero en `docs/modules/foster_adoption.md`.
- El alcance cubre foster owners, instituciones/fundaciones, mascotas en acogida, publicaciones `Busca hogar`, solicitudes de adopcion, moderacion admin y transferencia de custodia digital.
- La adopcion queda separada del marketplace de servicios: no usa pagos, checkout, bookings, QR, provider availability ni venta de mascotas.
- El modelo recomendado extiende `pets` con tablas asociadas de foster/adoption para conservar expediente y evitar duplicar mascotas.
- No se tocaron codigo funcional, Supabase, migraciones, RLS reales, API clients, mobile ni flujos existentes.

## Actualizacion web provider reservas 2026-05-28

- `apps/web` ahora muestra `Ejecucion operacional` dentro del acordeon de Reservas entrantes del proveedor.
- El panel consulta el API existente de booking operations y muestra check-in, check-out, estado operacional y evidencia documental con enlaces firmados cuando existen.
- Web provider mantiene acciones manuales de check-in/check-out como fallback piloto y permite cargar evidencia despues del check-out usando el bucket/metadata existente.
- Se agrega `get_booking_participant_summaries` para que provider web muestre hogar, cliente y mascota de reservas visibles sin abrir lectura directa completa de datos privados del owner.
- Fix provider web pendientes: el CTA `Ver negocio` desde `Citas por aprobar` ahora selecciona/refresca el negocio, activa el filtro `Pendientes por aprobar`, abre la primera cita pendiente y enfoca la tarjeta de la cita para evitar caer visualmente en la bandeja de mensajes.
- Web provider `Operacion general` muestra indicadores economicos globales `payment-ready`: ganado por citas cerradas, por ganarse por citas pendientes/confirmadas y dejado de ganar por cancelaciones del negocio/proveedor. Son sumas derivadas de bookings de todos los negocios y no representan cobro real.
- No se tocaron QR mobile, booking capacity, evidencia mobile ni reglas de negocio.

## Actualizacion web provider borrado seguro de negocios 2026-05-28

- Se agrega RPC local `delete_provider_organization` para borrar negocios creados por error solo si no tienen reservas, conversaciones, resenas ni casos de soporte asociados.
- La RPC valida ownership, registra auditoria y elimina datos maestros via cascada; el API client limpia documentos/avatar mediante Supabase Storage API porque Supabase bloquea borrado directo sobre `storage.objects`.
- Web provider expone `Eliminar negocio` dentro de `Datos del negocio`; el boton queda bloqueado si la organizacion seleccionada tiene reservas cargadas.
- Al borrar con exito, web provider muestra confirmacion explicita; si el backend bloquea por datos transaccionales, muestra un mensaje claro y recomienda ocultar/pausar el negocio.

## Objetivo de este handoff

Dejar una referencia operativa para retomar el piloto sin depender del historial conversacional.

## Estado actual real

- rama actual: `master`
- remoto: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`
- HEAD publicado antes de este handoff: `b978d3a docs(pilot): add controlled pilot runbook`
- baseline tecnico previo: `v0.1.0-mvp-baseline.1` en `ea573cd`
- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1` en `6e984eb`
- cierre UX productizada: `b20799a chore(ux): close role-based productization handoff`
- QA/UAT final: `completada`
- piloto controlado: `aprobado`
- fase UX por rol: `cerrada`
- fase actual: `paquete mobile QA/piloto listo para cierre y publicacion`
- working tree al iniciar este handoff: ajustes acumulados de QA mobile, autenticacion/onboarding, reservas/QR, mensajes, contexto de mascota, timezone y guias de piloto

## Que ya quedo cerrado

- shell owner mobile + Home owner
- Cuenta owner separada del flujo principal
- Mascotas como hub contextual
- Reservas como hub transaccional con chat, review y soporte subordinados
- consola provider mobile-first
- backoffice admin web-only refinado
- hardening UX no bloqueante
- polish visual inicial
- checklist visual del piloto iniciado

## Actualizacion V2 provider operations

- Rama de trabajo: `feature/v2-booking-operations-clean`
- La migracion remota de booking operations V2 ya fue aplicada al Supabase remoto.
- Slice A mobile provider check-in queda implementado y validado manualmente en Android: desde una reserva confirmada del proveedor aparece `Registrar check-in`, se ejecuta correctamente y el timeline pasa a mostrar `Llegada / Check-in registrado` con fecha/hora.
- Slice B mobile provider check-out queda implementado y validado manualmente en Android: desde una reserva confirmada con check-in registrado aparece `Registrar check-out`, se ejecuta correctamente y el timeline pasa a mostrar `Salida / Check-out registrado`; el estado operacional avanza a `Evidencia requerida`.
- Decision QR-0: el flujo principal futuro para check-in/check-out sera QR temporal mostrado por owner/familia y escaneado por provider; los botones manuales quedan fallback piloto.
- QR-2 owner mobile display queda implementado y validado manualmente en Android: el owner genera QR temporal de check-in/check-out desde una reserva confirmada.
- QR-3 provider scanner queda implementado y validado manualmente en Android: el provider escanea el QR operacional del owner, consume el token via RPC y el timeline registra check-in/check-out sin crash de camara ni error RLS.
- Los cambios locales exploratorios de Slice C evidencia fueron pausados en stash antes del rediseño QR.
- Slice C evidencia documental queda validado manualmente en Android sobre el modelo QR: provider carga `Evidencia documental` despues de check-out, el archivo va al bucket privado `booking-operation-evidence` y la metadata usa `storage_bucket` + `storage_path`. Para compatibilidad con el esquema remoto legacy que aun exige `file_url not null`, el cliente envia `file_url = storage_path` como path privado, sin URL publica arbitraria.
- Fuera de estos slices quedan report card e internal notes.

## Actualizacion V2 Booking Capacity

- Rama de trabajo documental: `feature/v2-booking-capacity`
- Baseline de partida: `v0.2.0-booking-qr-ops.1`
- Baseline publicado: `v0.3.0-booking-capacity-ops.1` en `a677f7bf8aa60b9758af13c5d578c27c7b100a00`.
- Readiness operativo: `docs/delivery/V0_3_0_PILOT_READINESS.md`.
- CAP-0 abre diseno documental para slots/franjas con capacidad.
- Evidencia documental/actividad queda integrada sobre el flujo QR como Slice C; el stash previo se conserva sin aplicarse.
- Modelo actual diagnosticado: `provider_availability` semanal por organizacion sin capacidad; `preview_booking`/`create_booking` eligen el proximo bloque activo.
- Modelo recomendado: hibrido, con reglas recurrentes por servicio, excepciones puntuales por fecha, proyeccion de slots por RPC y creacion transaccional de booking desde slot.
- Principio de seguridad: owner no modifica capacidad; provider administra solo sus organizaciones; backend valida cupo final y evita sobreventa.
- QR operations no cambia: sigue despues de que la reserva existe y no participa en seleccion de cupo.
- CAP-1 backend quedo aplicado y publicado en `feature/v2-booking-capacity`: tablas `provider_availability_rules` / `provider_availability_exceptions`, columnas de slot en `bookings`, RPC `get_service_booking_slots` y RPC transaccional `create_booking_from_slot`.
- CAP-2 provider UI queda implementado en mobile: la consola provider muestra `Horarios y capacidad`, permite crear/editar reglas por servicio con dia, horario, capacidad y estado activo/inactivo.
- CAP-3 owner UI queda implementado localmente: owner selecciona fecha/slot con `react-native-calendars` como capa visual, tarjetas propias de cupo y `create_booking_from_slot` como unica mutacion final cuando hay slot elegido.
- Fix CAP-3 aplicado: `Generar preview` con slot seleccionado construye una vista previa local y no consume cupo; solo `Confirmar reserva` llama `create_booking_from_slot` y consume capacidad.
- El flujo legacy de preview/create booking se conserva como fallback piloto cuando no hay slots publicados.
- Fix timezone preparado localmente: `supabase/migrations/20260604073000_booking_capacity_panama_timezone.sql` reemplaza el uso de `current_setting('TimeZone')` por `America/Panama` en los RPCs de slots/cupos, manteniendo Supabase en UTC. Pendiente de aplicar remoto con `supabase db push` controlado despues de aprobacion.
- Validaciones tecnicas desde `master` publicado estan en PASS y los flujos criticos Android quedan validados manualmente para piloto controlado.

## Actualizacion Mascota En memoria

- Slice Pet Memory queda versionado localmente despues de aplicar remoto la migracion `20260510123000_pet_memory_status_slice_b.sql`.
- El estado de mascota admite `active` e `in_memory`; `in_memory` conserva perfil, documentos, salud, recordatorios e historial.
- Reservas nuevas deben usar solo mascotas activas; el backend valida `ensure_pet_is_bookable` en preview/booking desde slot.

## Actualizacion V2 Geo Marketplace

- Geo-0 queda iniciado como base tecnica/documental, sin UI ni mapa.
- Modelo propuesto/implementado localmente: `provider_public_locations` con PostGIS `geography(Point, 4326)`, precision publica `exact | approximate | city`, publicacion controlada y timestamp de verificacion.
- Privacidad: no se exponen direcciones privadas de owners, no se guarda ubicacion actual sin consentimiento y no hay tracking en tiempo real.
- Marketplace geolocalizado futuro solo debe listar ubicaciones publicas de proveedores aprobados, publicos, con perfil publico y servicios activos.
- Geo-1 implementa UI minima en mobile provider > `Negocio` para capturar/editar ubicacion publica del negocio, precision `exact | approximate | city` y estado publico/privado. El formulario prioriza direccion/datos del negocio y deja latitud/longitud como ajuste avanzado; puede precargar coordenadas aproximadas de ciudades soportadas sin pedir permisos.
- Geo-1 no habilita mapa, permisos mobile, ubicacion actual del usuario ni tracking; queda como preparacion controlada antes de abrir marketplace geolocalizado visual.
- Geo-2 muestra en mobile owner > `Buscar` la ubicacion publica declarada por proveedores visibles: nombre visible, ciudad/pais, precision publica y distancia aproximada solo si el API recibe coordenadas de origen opcionales. No pide permisos, no guarda ubicacion actual y no expone direcciones privadas de owners.
- Geo-3 agrega selector `Origen para distancia` en mobile owner > `Buscar`: permite `Sin distancia` o zonas aproximadas controladas. Se reviso `user_addresses` y el contrato actual no expone coordenadas, por lo que direcciones guardadas quedan diferidas. No usa GPS, no geocodifica direcciones reales y no publica `user_addresses`.
- Geo-4 agrega preview de mapa en mobile owner > `Buscar` con MapLibre React Native. El modo `Mapa` dibuja pins solo para proveedores ya visibles con ubicacion publica exacta declarada por el proveedor; al tocar un pin muestra card inferior con ciudad, distancia aproximada si aplica y accion `Ver proveedor`. Usa estilo demo de MapLibre para piloto inicial y conserva fallback de lista. No pide permisos GPS, no guarda ubicacion actual y no expone direcciones privadas.

## Cierre UX mobile por rol 2026-05-13

- Owner > `Buscar` queda compactado como widget unico: campo principal, categorias rapidas, origen para distancia colapsable, filtros avanzados bajo demanda y acceso a Lista/Mapa sin pedir GPS ni exponer direcciones privadas.
- Provider > `Negocio` agrupa `Negocio activo`, `Perfil publico`, `Ubicacion publica` y `Publicacion` como expediente jerarquico con secciones colapsables para reducir ruido visual.
- Provider > `Reservas` permite que `Atencion operativa` actue como acceso directo: abre y filtra reservas pendientes o confirmadas que requieren accion.
- Provider > `Inicio` deja solo resumen operativo y un acceso compacto a `Estado de publicacion`; la vista `Estado` conserva el diagnostico completo de aprobacion/publicacion.
- No se tocaron backend, Supabase, migraciones, RLS, Payments, QR, booking capacity, evidencia operacional, pet memory ni avatares.

## Preparacion piloto controlado real 2026-05-14

- Se crea `docs/delivery/PILOT_CONTROLLED_RUNBOOK.md` como guia operativa para piloto con 3 proveedores, 3 propietarios y 1 admin interno.
- Se crea `docs/delivery/PILOT_DATA_PREPARATION.sql` como archivo reviewable de diagnostico y preparacion no destructiva de datos; los `UPDATE` quedan comentados y no deben ejecutarse sin aprobacion explicita.
- Estrategia recomendada para primera distribucion Android: APK manual por enlace privado para prueba seca inicial; mover a Firebase App Distribution si se agregan rondas o testers.
- El piloto mantiene `payment-ready`, sin cobro real, sin migraciones, sin Supabase push, sin borrado de datos historicos y sin apertura de V2/V3 nuevas.

## Cierre QA mobile pre-piloto 2026-05-17

- Auth mobile queda ordenado como circuito real de acceso: login por defecto, registro, OTP y recuperacion ocultos hasta seleccionarlos. La pantalla sin sesion ya no muestra marketplace/contexto operativo antes de autenticar.
- Se agrega reenvio controlado de OTP desde mobile mediante API tipada; no cambia Supabase ni reglas de negocio.
- Owner post-login queda protegido por compuerta de hogar/familia: si no existe hogar, se solicita crearlo antes de Inicio/Mascotas.
- Owner Home usa nombre real del perfil, no texto quemado.
- Timezone/display queda centralizado con `productLocale` / `productTimeZone` para fechas visibles en mobile/admin.
- Owner `Buscar` queda con campo de busqueda primero y filtros visuales mas compactos.
- Owner `Buscar` incorpora un slice UX de marketplace: buscador superior con accion de filtros, modo de busqueda enfocada, sugerencias, categorias rapidas y cards de resultados con avatar/ubicacion/CTA. No cambia backend, Supabase, contratos API ni flujo de reservas.
- Handoff Buscar -> Reservas ajustado: cuando Buscar entrega un slot seleccionado, Reservas conserva proveedor/servicio/slot y abre directamente en mascota o metodo de pago segun falte contexto; Marketplace sigue sin crear reservas ni consumir cupos.
- Owner `Reservas` incorpora stepper visual Servicio -> Mascota -> Horario -> Resumen -> Confirmar. Es capa UX solamente; no cambia backend, capacity, preview ni confirmacion.
- Owner `Reservas` preview queda redisenado como ticket compacto para validacion final: conserva el mismo preview/confirmacion y mantiene payment-ready sin cobro real.
- Mobile UX polish: cards de Owner `Buscar`, QR operacional en Owner `Reservas` y cards de Provider `Reservas` quedan compactadas para evitar solapes/truncados en pantallas pequenas sin cambiar backend, Supabase, QR ni reglas de booking.
- Mobile date UX: selectores de fecha en Mascotas, Salud y Recordatorios agregan salto directo por ano para evitar navegar mes a mes; se mantienen restricciones de fecha minima/maxima existentes.
- Mascotas perfil: se agrega estado descriptivo de esterilizacion (`Esterilizada`, `No esterilizada`, `Sin indicar`) en mobile/web owner mediante `pet_profiles.is_sterilized`. Migracion local pendiente de aplicar remoto: `20260609110000_pet_sterilization_profile_field.sql`.
- Salud owner: el resumen de vacunas en ficha de mascota usa vigencia por `next_due_on`; muestra `Al dia`, `Por vencer`, `Vencida`, `Revisar` o `Sin registro` en vez de asumir `Al dia` por tener una vacuna registrada. Sin DB/API nueva.
- Owner `Reservas` abre por defecto en `Activas`; el QR operacional temporal se limpia cuando el timeline confirma check-in/check-out y tambien puede cerrarse manualmente.
- Owner `Mensajes` queda como bandeja tipo correo: lista de hilos por reserva, orden reciente a antiguo, cabecera compacta y detalle en acordeon; filtro reducido a selector por estado de reserva.
- Owner `Mascotas` conserva el contexto activo de mascota al navegar por el menu inferior y rehidrata la ficha al volver.
- Provider/reservas y admin/soporte refrescan estados con requery controlado sin abrir Supabase Realtime.
- Se crean guias rapidas de piloto para owner, provider y admin, mas guia de distribucion APK privada.
- APK release de prueba actualizado para validar Marketplace UX en piloto: `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-marketplace-ux-android-release.apk`, SHA256 `C4A61EA37D223421DF34FCFCF44E044709C9B7692EAB0974EC0DF03BE1C3D206`.
- No se ejecutaron migraciones ni `supabase db push`; no se tocaron Payments, geolocalizacion avanzada, mapa funcional adicional, QR backend, booking capacity backend ni evidencia backend.

## Cierre QA visual mobile owner/provider 2026-05-19

- Owner > `Mascotas`: se retiro el chip redundante de hogar bajo el carrusel de mascotas para liberar espacio visual sin cambiar el contexto activo ni la seleccion de mascota.
- Owner > `Buscar`: el encabezado concentra el copy descriptivo, se elimina el bloque intermedio de contexto/resultados y se simplifica la tarjeta `Prepara tu reserva` para que el flujo sea mas directo.
- Owner > `Reservas`: las tarjetas del historial se alinean al estilo ticket/resumen de reserva, conservando filtros y navegacion existentes.
- Provider > `Inicio`: se agrega carrusel horizontal de negocios reales sobre el panel operativo, reutilizando `selectOrganization`; el panel operativo queda mas compacto sin cambiar metricas ni destinos de navegacion.
- Provider > `Reservas`: se corrige el crash/pantalla en blanco al abrir el detalle de una reserva confirmada. La causa era un `useEffect` dentro de `BookingOperationsTimeline` declarado despues de retornos condicionales; ahora el hook se ejecuta siempre y sale temprano si no hay timeline/QR activo.
- APK release actualizado e instalado en Xiaomi `85975329` para validar el fix del detalle de reserva provider.
- No se tocaron backend, Supabase, migraciones, RLS, RPCs, Payments, geolocalizacion, booking capacity backend, QR backend ni evidencia backend.

## Inicio Payments MVP+ 2026-05-19

- Se retoma el frente de medios de pago como `Payments-0` documental.
- Estado actual confirmado: `payment-ready`, con `payment_methods` referenciales y `bookings.selected_payment_method_id`, sin captura real, refunds, conciliacion ni payouts.
- Se crea `docs/payments/PAYMENTS_MVP_PLUS_DESIGN.md` con modelo propuesto (`payments`, `payment_events`, `payment_refunds`), RLS esperada, flujos owner/provider/admin, politica objetivo de captura y slices recomendados.
- Se crea `docs/modules/payments.md` como ficha canonica del modulo.
- No se implementaron migraciones, codigo funcional, Supabase push, proveedor de pago, webhooks ni variables nuevas.
- Antes de Payments-1 se debe validar proveedor de pago, pais/merchant/moneda y politica de captura/autorizacion.

## Payments-0.1 Decision Record 2026-05-20

- Se crea `docs/payments/PAYMENTS_DECISION_RECORD.md` para decidir proveedor y politica inicial de cobro sin tocar codigo funcional.
- Mercado inicial: Panama.
- Decision piloto: mantener cobro fuera de app durante piloto controlado para no mezclar soporte operativo con responsabilidad financiera.
- Decision MVP+: Wompi Panama queda como candidato principal por documentacion publica de Panama, tokenizacion, tarjetas/Clave, eventos/webhooks y preautorizacion/captura; sujeto a cuenta comercio, contrato y sandbox. No es una decision irreversible.
- Stripe no queda como default para merchant Panama local porque Panama no aparece en disponibilidad global revisada; podria reabrirse solo con entidad/merchant en pais soportado.
- Politica objetivo: servicios `instant` con captura inmediata; servicios `approval_required` con preautorizacion y captura al aprobar si sandbox/contrato lo confirma.
- No se crearon migraciones, no se ejecuto Supabase, no se modificaron variables reales y no se introdujo checkout en flujos existentes.

## Owner evidence read para reservas 2026-05-20

- Se prepara lectura owner de evidencia documental operacional dentro del detalle/historial de reserva.
- El provider sigue siendo el unico que carga evidencia despues de check-out; owner queda en modo consulta.
- `BookingEvidence` incorpora `signedUrl` temporal y `BookingEvidenceCard` permite abrir el documento cuando exista URL firmada.
- Se agrega migracion local `20260520164000_owner_booking_operation_evidence_read.sql` para permitir lectura owner de `booking_operations`, `booking_operation_evidence` y objetos del bucket privado `booking-operation-evidence` solo cuando `can_view_booking` sea verdadero.
- No se ejecuto `supabase db push`; la visibilidad real en remoto requiere aplicar esa migracion de forma controlada.

## Ajustes QA visual de Cuenta provider

## Actualizacion visual alignment reference canon

- Fase abierta: `visual_alignment_reference_canon`.
- Canon visual: imagenes en `docs/ux/reference/` para owner mobile, mascotas, marketplace, booking, horarios/capacidad provider y admin web.
- Guia derivada: `docs/ux/VISUAL_STYLE_GUIDE.md`.
- Alcance aplicado: tokens visuales compartidos, cards/chips/botones mobile, shell owner/provider, navegacion inferior mobile y shell/cards/admin web.
- No se cambio backend, Supabase, RLS, RPCs, migraciones, contratos API, pagos, permisos, QR flow ni reglas de booking.
- Quedan pendientes de polish fino: reproduccion exacta de iconografia/imagenes fotograficas de las referencias y validacion visual manual en dispositivo/navegador.

Durante la revision visual con `QA_PROVIDER` se detectaron dos elementos fuera de contexto en modo provider:

- `Crear un hogar`, que pertenece al modo propietario
- tarjetas guardadas / metodos de pago, que pertenecen al flujo owner `payment-ready`
- tarea de onboarding `Agregar metodo de pago`, que tambien pertenece al flujo owner `payment-ready`
- tarjeta informativa `Pagos reales fuera del MVP`, util para QA pero demasiado tecnica dentro de Cuenta provider

Estado aplicado:

- Cuenta provider ya no muestra gestion de hogares
- Cuenta provider ya no muestra formulario ni listado de tarjetas guardadas
- Cuenta provider ya no muestra la tarea owner-only `Agregar metodo de pago` dentro de onboarding
- Cuenta provider ya no muestra la tarjeta informativa de pagos; el alcance `payment-ready` queda en documentacion QA
- Cuenta provider conserva perfil, preferencias, direcciones y cambio de rol
- Cuenta owner conserva hogares, metodos guardados y la tarea `Agregar metodo de pago`
- Campos mobile de fecha/hora/vencimiento recibieron placeholders y ayudas breves (`AAAA-MM-DD`, `HH:mm`, `MM`, `AAAA`) sin cambiar formatos ni contratos
- Header owner queda mas limpio: se retiraron chips tecnicos de progreso, rol y `sin cobro real` del encabezado superior
- Inicio owner queda mas limpio: se retiraron chips de cuenta, rol y metodos guardados del bloque principal
- Mascotas owner ahora usa navegacion interna por vistas (`lista`, `crear`, `editar`, `detalle`) para evitar una superficie plana de formulario/lista/detalle
- Buscar owner ahora usa navegacion interna por vistas (`inicio`, `resultados`, `proveedor`, `seleccion`) y elimina el bloque tecnico `Navegacion`
- Reservas owner ahora usa navegacion interna por vistas (`historial`, `servicio`, `mascota`, `metodo`, `preview`, `detalle`) para separar preparacion, preview, historial y detalle; las tarjetas del historial evitan el texto comprimido/vertical
- Mensajes owner ahora usa navegacion interna por vistas (`bandeja`, `conversacion`): el tab abre bandeja de hilos por reserva y `Detalle de reserva > Chat` abre la conversacion contextual
- QA visual owner mobile fue revisada con `QA_OWNER` y queda en `PASS`
- QA visual provider mobile fue revisada con `QA_PROVIDER` y queda en `PASS`
- QA visual admin web autenticado fue revisada con `QA_ADMIN` y queda en `PASS`

No se tocaron backend, base de datos, APIs, contratos ni migraciones.

## Validaciones en PASS

Validaciones historicas del baseline:

- `corepack pnpm typecheck` -> `PASS`
- `npm run lint` -> `PASS`
- `corepack pnpm --filter @pet/web build` -> `PASS`
- `corepack pnpm --filter @pet/admin build` -> `PASS`
- `npx expo export --platform android` -> `PASS`
- `npx expo export --platform ios` -> `PASS`
- `npm run smoke:mvp` -> `PASS`
- `npm run smoke:mvp:admin` -> `PASS`
- `npm run smoke:mvp:providers` -> `PASS`
- `npm run smoke:mvp:critical` -> `PASS`
- QA/UAT manual web -> `PASS`
- Android manual `AND-01`, `AND-02`, `AND-03` -> `PASS`

Validaciones ejecutadas despues de los ajustes QA visual de Cuenta provider:

- `corepack pnpm --filter @pet/mobile lint` -> `PASS`
- `corepack pnpm --filter @pet/mobile typecheck` -> `PASS`
- `corepack pnpm --filter @pet/mobile build` -> `PASS`
- `git diff --check` -> `PASS`

Validaciones ejecutadas durante hardening tecnico/operativo:

- `corepack pnpm lint` -> `PASS`
- `corepack pnpm typecheck` -> `PASS`
- `corepack pnpm --filter @pet/web build` -> `PASS`
- `corepack pnpm --filter @pet/admin build` -> `PASS`
- `corepack pnpm --filter @pet/mobile build` -> `PASS`
- `git diff --check` -> `PASS` sin errores; solo avisos LF -> CRLF del entorno Windows
- `corepack pnpm smoke:mvp` -> `PASS`
- `corepack pnpm smoke:mvp:critical` -> `PASS`
- `corepack pnpm smoke:mvp:admin` -> `PASS`
- `corepack pnpm smoke:mvp:providers` -> `PASS`
- `corepack pnpm smoke:mvp:health` -> `PASS`
- `corepack pnpm smoke:mvp:reminders` -> `PASS`

Validaciones ejecutadas durante cierre QA mobile pre-piloto 2026-05-17:

- `corepack pnpm --filter @pet/mobile typecheck` -> `PASS`
- `corepack pnpm --filter @pet/mobile lint` -> `PASS`
- `corepack pnpm --filter @pet/mobile build` -> `PASS`
- Android release build `:app:assembleRelease` en `C:\pb` -> `PASS`
- instalacion ADB en Xiaomi `85975329` -> `PASS`
- `git diff --check` -> `PASS` sin errores; solo avisos LF -> CRLF del entorno Windows

## Pendientes reales

- ejecutar smoke manual del piloto con 3 owners / 3 providers / 1 admin usando las guias nuevas
- subir manualmente el APK release a enlace privado controlado
- registrar evidencia visual final si se requiere paquete auditable

## BLOCK por entorno

- `EXT-01` iOS fisico depende de entorno Apple
- recovery deep link real depende de mail delivery, deep link y rate limits
- Android dev-client puede requerir `adb reverse tcp:8081 tcp:8081` despues de reiniciar app o Metro
- `next dev` / `next build` pueden fallar en sandbox con `spawn EPERM`; si ocurre, ejecutar fuera del sandbox
- no hay bloqueo activo Android/mobile registrado para el piloto actual

## Siguiente frente recomendado

Hardening tecnico/operativo cerrado con notas. El siguiente frente elegible es `Payments MVP+` si se decide abrir nuevo alcance funcional.

Payments MVP+ cambia alcance funcional y debe abrirse como frente separado, actualizando documentacion de alcance antes de implementar.

## Cómo retomar exactamente en la próxima sesión

### Rama actual

- `master`
- remoto: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`

### Referencias de commit/tag

- baseline tecnico: `v0.1.0-mvp-baseline.1` -> `ea573cd`
- baseline localizado MVP: `v0.1.0-mvp-baseline-es.1` -> `6e984eb`
- cierre UX productizada: `b20799a`
- checklist visual piloto: `cfc70b7`
- HEAD de continuidad: tomar `git log -1 --oneline --decorate` como referencia principal despues de publicar este cierre QA mobile pre-piloto

### Comandos para levantar

Web:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/web dev
```

Admin:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/admin dev
```

Mobile:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
npx expo start --dev-client --port 8081
```

Android:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
```

### Documentos que deben leerse primero

1. `docs/HANDOFF.md`
2. `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`
3. `docs/delivery/PILOT_OPERATIONS_HARDENING.md`
4. `docs/ux/ROLE_BASED_SCREEN_ARCHITECTURE.md`
5. `docs/delivery/MVP_SCOPE.md`
6. `docs/product/MODULE_STATUS.md`
7. `docs/delivery/PILOT_QA_UAT_MATRIX.md`

### Siguiente paso correcto

Siguiente paso recomendado:

- decidir si se congela este estado con commit/tag de cierre operativo
- preparar paquete de evidencia auditable si el piloto lo requiere
- evaluar apertura formal de `Payments MVP+` como nuevo alcance funcional

No abrir V2/V3 ni pagos reales sin actualizar alcance, modelo de datos, API y reglas operativas.

## Handoff 2026-05-21 - cierre QA mobile / APK piloto

Estado:

- Rama esperada: `master`.
- `master` queda con un commit documental local de Payments pendiente de publicar antes de este cierre.
- Se preparo un nuevo APK local de piloto para pruebas Android:
  - Ruta: `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-qa-20260520-arm64-release.apk`
  - SHA256: `43D57C10B4B77E8B02CB0F94DE5E190072C56344EEFF99BF21615B265F4E1EE1`
  - Build: release privado `arm64-v8a`, generado con JSC para evitar fallos Windows/Hermes por rutas con espacios y source maps.
- Para que el build release sea reproducible con PNPM, `@pet/mobile` declara explicitamente dependencias que Expo/React Native usaban transitivamente durante el bundle nativo:
  - `expo-asset`
  - `@react-native/assets-registry`
  - `babel-preset-expo`
- El APK no se subio a servicios externos desde el agente; debe compartirse manualmente por enlace privado.

Cambios funcionales/UI incluidos en el cierre:

- Owner booking history/timeline puede renderizar evidencia documental con boton `Abrir documento` usando URL firmada temporal.
- Se agrega migracion read-only `20260520164000_owner_booking_operation_evidence_read.sql` para permitir al owner leer operaciones/evidencia/storage objects de sus propias reservas sin exponer notas internas.
- Marketplace owner, en detalle de proveedor, cuando no hay agenda publica semanal pero si hay servicios, muestra tarjetas por servicio con CTA `Ver cupos` para consultar horarios reales por servicio.
- Provider mobile vuelve accionables las cajas de publicacion (`Negocio`, `Servicios`, `Horarios`, `Documentos`) para llevar al area que resuelve el pendiente.
- Provider home incluye carrusel compacto de negocios disponibles, con avatar/logo si existe, para cambiar el negocio activo desde Inicio.

Validaciones ejecutadas antes del cierre:

- `corepack pnpm --filter @pet/types typecheck` -> PASS
- `corepack pnpm --filter @pet/api-client typecheck` -> PASS
- `corepack pnpm --filter @pet/mobile lint` -> PASS
- `corepack pnpm --filter @pet/mobile typecheck` -> PASS
- `git diff --check` -> PASS

Notas operativas:

- La migracion owner evidence read esta versionada en repo, pero debe aplicarse a Supabase remoto con `supabase db push` en una ventana controlada antes de esperar lectura real de evidencia en el telefono del owner.
- No se modifican Payments reales, QR logic, booking capacity, evidence upload provider ni reglas de negocio.
- El build de APK se genero desde copia temporal local corta con `node-linker=hoisted` para evitar limites de path de Windows/CMake; el repo principal no depende de esa copia.

## Handoff 2026-05-21 - Admin readiness proveedor piloto

Estado:

- Admin web sigue limitado al alcance MVP: login admin, cola de proveedores pendientes, aprobacion/rechazo y soporte basico.
- Se mejora la vista `Proveedores > Revision del proveedor` con un checklist visual de readiness para piloto.
- El checklist usa datos existentes del detalle admin:
  - perfil publico
  - servicios publicos/activos
  - horarios o reglas de capacidad activas
  - ubicacion publica valida
  - documentos de aprobacion
  - visibilidad de la organizacion
- No se agregan endpoints, migraciones, reglas de negocio ni mutaciones nuevas.
- Slice documental read-only agregado: los documentos de aprobacion del proveedor ahora exponen `signedUrl` temporal en el API client y admin muestra `Abrir documento`.
- No se agrega estado por documento; la decision formal continua siendo aprobar/rechazar proveedor.
- No requiere migracion nueva porque la policy base `provider_documents_objects_select` ya permite lectura a `public.is_platform_admin(auth.uid())`.

Validacion recomendada:

- iniciar admin web
- entrar con usuario admin
- abrir `Proveedores`
- seleccionar un proveedor pendiente
- revisar que el panel muestre conteo `Listo para piloto` o pendientes concretos antes de aprobar/rechazar
- abrir cada documento de aprobacion y confirmar que el enlace temporal carga el archivo esperado

## Handoff 2026-05-21 - Provider web console inicial

Estado:

- Se confirma que el blueprint contempla una suite SaaS/web para proveedores como superficie separada del admin interno.
- `apps/web` queda como experiencia provider-facing inicial para pantallas amplias.
- Se agrega shell operativo al workspace de proveedores existente:
  - cabecera `Provider web console`
  - metricas de servicios, agenda, readiness y reservas
  - navegacion horizontal a `Negocios`, `Publicacion`, `Reservas`, `Perfil publico`, `Servicios`, `Disponibilidad` y `Documentos`
- La consola se compacta para uso real:
  - tipografia de encabezado web reducida
  - lista de negocios visible como carrusel horizontal compacto
  - cabecera separada en `Negocio seleccionado` y `Pendientes generales`; el panel global agrega citas por aprobar, reservas confirmadas, conversaciones activas, publicacion incompleta, falta de servicios, agenda o documentos
  - cada tarjeta de negocio abre la edicion con un CTA circular de lapiz
  - el bloque `Publicacion` muestra pendientes accionables y cada uno abre la seccion que lo resuelve
  - el bloque `Agenda` en web provider agrega `Cupos publicados`, una vista read-only por servicio que consulta slots reales de los proximos 14 dias mediante `get_service_booking_slots`; no crea reservas ni consume cupos
  - la cabecera agrega indicadores globales `payment-ready` para todos los negocios: ingresado por citas completadas, pendiente por citas pendientes/confirmadas y no ingresado por cancelaciones atribuidas al proveedor por razon registrada; no hay captura real de pagos
  - formularios de perfil, servicios, agenda y documentos cerrados por defecto
  - CTAs `+` / `Editar` abren formularios solo cuando el proveedor los necesita
  - copy tecnico reemplazado por lenguaje orientado a negocio
- Se corrige carga de la web provider para evitar que el shell quede atrapado indefinidamente en `Preparando tu espacio` cuando el snapshot core tarda; el estado de carga se libera al resolver auth y mantiene mensajes de error visibles si la carga secundaria tarda.
- Se corrige visibilidad de la consola provider: las secciones avanzadas, carrusel horizontal de negocios, navegacion, publicacion, servicios, agenda y documentos quedan visibles por defecto; solo el formulario de negocio depende de abrir edicion.
- La web autenticada ahora respeta el rol activo:
  - `provider`: muestra consola proveedor y oculta hogares, mascotas, marketplace, reservas owner, reviews, soporte y mensajes owner
  - `pet_owner`: mantiene la experiencia owner y permite cambiar de rol si el usuario tambien es proveedor
- No se agregan tablas, migraciones, endpoints ni reglas nuevas.
- `apps/admin` conserva su alcance de backoffice interno: aprobacion/rechazo, soporte y auditoria administrativa.

Validacion recomendada:

- iniciar `apps/web` en `http://localhost:3000`
- entrar con un usuario que tenga rol proveedor
- confirmar que la consola muestra organizaciones del proveedor
- usar la navegacion superior para saltar a publicacion, reservas, servicios, disponibilidad y documentos
- crear/editar solo datos de prueba si se esta en ambiente piloto controlado

## Handoff 2026-05-22 - Landing publica web

Estado:

- `apps/web` agrega landing publica de identidad de producto en `/`.
- La experiencia autenticada por rol se mueve a `/app`, manteniendo owner/provider sobre el mismo `CoreExperienceScreen`.
- Se incorpora el activo visual `apps/web/public/brand/pet-ecosystem-logo.png` a partir del logo compartido para identificar marca en cabecera y hero.
- La composicion visual se alinea a la referencia compartida: header de marca, hero con mock mobile, visual pet, bloques de confianza, pasos `Asi funciona`, cards para duenos/proveedores, CTA de piloto y footer informativo.
- La landing comunica alcance real del MVP/piloto: super app owner, suite provider, marketplace/orquestacion y estado `payment-ready`; no promete pagos reales, comercio, clinica digital ni telecare.
- No se agregan backend, Supabase, migraciones, APIs ni reglas nuevas.

Validacion recomendada:

- abrir `http://localhost:3000` y confirmar landing publica.
- abrir `http://localhost:3000/app` y confirmar experiencia autenticada por rol.

## Handoff 2026-05-28 - Fix mobile owner reservas Realtime

Estado:

- Se corrige crash Android en owner mobile al seleccionar una mascota y navegar desde `Mascotas` hacia `Reservas`.
- Causa: `useBookingsWorkspace` usaba el canal fijo `mobile-booking-updates`; al remontar `BookingsWorkspace`, Supabase podia reutilizar un canal ya suscrito y lanzar `cannot add postgres_changes callbacks ... after subscribe()`.
- Solucion: el canal Realtime de bookings ahora usa nombre unico por instancia del hook, manteniendo la suscripcion a cambios de `bookings` y el polling de respaldo.
- No se tocaron backend, Supabase, migraciones, RLS, RPCs, reglas de booking, Payments, QR ni evidencia operacional.
- APK release generada e instalada en Xiaomi `85975329`:
  - `dist/pilot/android/pet-ecosystem-pilot-v0.3.1-booking-realtime-fix-20260528-universal-hermes-release.apk`
  - SHA256 `44567F145DB06CACBF5888E53718E3E95A5ECB53EA12E252AEF0249A7D6B7F86`

Validacion ejecutada:

- `corepack pnpm --filter @pet/mobile typecheck` -> `PASS`
- `corepack pnpm --filter @pet/mobile lint` -> `PASS`
- Android release build `:app:assembleRelease` en `C:\b28` -> `PASS`
- instalacion ADB en Xiaomi `85975329` -> `PASS`

## Handoff 2026-06-01 - Web provider message notices

Estado:

- Se agrega aviso emergente in-app en la consola web provider cuando llega un mensaje entrante del owner en un hilo de reserva.
- El aviso muestra cliente, mascota, servicio y preview del mensaje, con CTA `Responder`.
- Al presionar `Responder`, la consola:
  - cambia al negocio correcto si el hilo pertenece a otro negocio del proveedor;
  - navega a `Reservas`;
  - expande la cita asociada;
  - abre la conversacion vinculada para responder.
- La deteccion reutiliza `chat_threads.last_message_at` y consulta el detalle del hilo solo cuando hay actividad nueva para confirmar que el ultimo mensaje vino del customer.
- Se ignoran mensajes enviados por el propio provider para evitar avisos sobre respuestas propias.
- No se agregan backend, Supabase, migraciones, RLS, RPCs, contratos API ni push notifications.
- El aviso funciona solo con la web provider abierta; background/cerrado queda fuera de alcance.

Validacion ejecutada:

- `corepack pnpm --filter @pet/web typecheck` -> `PASS`
- `corepack pnpm --filter @pet/web lint` -> `PASS`
- `corepack pnpm --filter @pet/web build` -> `PASS`
- `git diff --check` -> `PASS`

## Handoff 2026-06-02 - Preparacion iOS Beta Privada

Estado:

- Se prepara configuracion inicial para EAS iOS + TestFlight sin generar build ni subir a Apple.
- `apps/mobile/app.json` queda con:
  - version `0.3.1`;
  - `ios.bundleIdentifier` `com.petecosyst.mobile`;
  - `ios.buildNumber` inicial `1`;
  - scheme `petecosystem`;
  - textos iOS para camara, fotos y guardado en fototeca;
  - declaracion `usesNonExemptEncryption: false` para uso de cifrado estandar de plataforma/HTTPS.
- `apps/mobile/eas.json` explicita `ios.simulator: false` en perfiles `preview` y `production`.
- Se crea `docs/deployment/IOS_TESTFLIGHT_BETA.md` con prerequisitos Apple, comandos EAS, submit a TestFlight, checklist QA y riesgos.
- No se tocaron backend, Supabase, migraciones, RLS, RPCs, Payments ni flujos funcionales.
- No se genero build iOS ni se ejecuto submit; queda pendiente aprobacion explicita.

Validacion recomendada:

- `corepack pnpm --filter @pet/mobile lint`
- `corepack pnpm --filter @pet/mobile typecheck`
- `corepack pnpm --filter @pet/mobile build`
- `git diff --check`
- luego, con aprobacion: `corepack pnpm --filter @pet/mobile exec eas build --platform ios --profile production`

### Prompt exacto recomendado para continuar

```text
Quiero continuar despues del cierre de QA visual/manual por rol, abriendo hardening tecnico/operativo del piloto.

Contexto:
- La productizacion UX por rol ya esta cerrada.
- El hardening UX no bloqueante y el polish visual inicial ya estan aplicados.
- Owner mobile quedo en PASS con QA_OWNER.
- Provider mobile quedo en PASS con QA_PROVIDER.
- Admin web autenticado quedo en PASS con QA_ADMIN.
- No quiero abrir nuevas features.
- No quiero tocar backend, DB, APIs ni migraciones.
- No quiero abrir V2/V3.

Objetivo:
revisar estado operativo del piloto, validar scripts/builds/runbooks necesarios y preparar evidencia final si se requiere paquete auditable.

Antes de tocar codigo:
1. revisa docs/HANDOFF.md
2. revisa docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md
3. revisa git status, branch, ultimos commits y tags
4. enumera riesgos operativos por severidad

Durante el trabajo:
- solo aplicar ajustes visuales menores si son de bajo riesgo
- conservar copy en espanol
- no cambiar logica de negocio ni contratos

Al final:
1. correr lint/typecheck/build donde aplique
2. actualizar `docs/delivery/PILOT_OPERATIONS_HARDENING.md`
3. resumir evidencia tecnica/operativa pendiente o capturada
4. recomendar si el siguiente frente puede ser Payments MVP+ o si falta cerrar smoke/evidencia
```
