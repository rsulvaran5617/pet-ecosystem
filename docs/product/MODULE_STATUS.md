# MODULE_STATUS.md

## Escala usada

- `closed`
- `closed_with_notes`
- `documented_on_hold`
- `partial`
- `not_started`

## Estado actual por modulo

- `core` -> `closed_with_notes`
- `households` -> `closed_with_notes`
- `pets` -> `closed_with_notes`
- `health` -> `closed_with_notes`
- `reminders` -> `closed_with_notes`
- `marketplace` -> `closed_with_notes`
- `bookings` -> `closed_with_notes`
- `messaging` -> `closed_with_notes`
- `reviews` -> `closed_with_notes`
- `support` -> `closed_with_notes`
- `providers` -> `closed_with_notes`
- `admin` -> `closed_with_notes`
- `payments` -> `documented_on_hold`
- `qa_smoke` -> `closed_with_notes`
- `qa_manual_web` -> `closed_with_notes`
- `qa_android_mobile` -> `closed_with_notes`
- `localization_es` -> `closed_with_notes`
- `role_based_ux_productization` -> `closed_with_notes`
- `ux_hardening_non_blocking` -> `closed_with_notes`
- `visual_polish_manual_qa` -> `closed_with_notes`
- `visual_alignment_reference_canon` -> `partial`
- `pilot_operations_hardening` -> `closed_with_notes`
- `booking_capacity_v2` -> `partial`
- `controlled_avatar_media` -> `partial`
- `pet_memory_status` -> `partial`
- `pet_document_expiration` -> `partial`
- `geo_marketplace_v2` -> `partial`
- `pet_travel_passport_v2` -> `documented_on_hold`
- `foster_adoption_v2_5` -> `partial`
- `pilot_mobile_qa_hardening` -> `closed_with_notes`
- `clinic` -> `not_started`
- `commerce` -> `not_started`
- `pharmacy` -> `not_started`
- `finance` -> `not_started`
- `benefits` -> `not_started`
- `telecare` -> `not_started`

## Salvedades activas del baseline

- pagos solo en modo `payment-ready`
- Payments-0/0.1 documental cerrado: `docs/payments/PAYMENTS_MVP_PLUS_DESIGN.md`, `docs/payments/PAYMENTS_DECISION_RECORD.md` y `docs/modules/payments.md` definen alcance MVP+, modelo propuesto, RLS esperada, riesgos y slices antes de migraciones/codigo.
- Payments queda en `documented_on_hold`: el MVP actual no procesa pagos reales; `payment_methods` sigue como referencia visual/operativa; piloto controlado continua con cobro fuera de app; Wompi Panama queda como candidato principal para MVP+ sujeto a sandbox/contrato y no como decision irreversible.
- la smoke canonica `full` ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre Supabase real
- smoke automatizada documentada en `PASS`
- la UI principal de `web`, `mobile` y `admin` quedo localizada al espanol, validada con lint/typecheck/build/export/smoke e incorporada en el baseline publicado `v0.1.0-mvp-baseline-es.1`
- la localizacion al espanol ya no esta pendiente de commit ni de tag
- la productizacion UX por rol quedo implementada sobre capacidades MVP existentes: owner mobile shell/Home, Mascotas hub, Reservas hub transaccional, consola provider mobile-first, admin web backoffice y hardening UX no bloqueante
- admin web mantiene alcance MVP y suma readiness visual de proveedor para piloto: checklist de perfil publico, servicios, horarios/capacidad, ubicacion publica, documentos y visibilidad antes de aprobar/rechazar
- admin document review queda en modo read-only: documentos de aprobacion se abren con URL firmada temporal y la decision formal sigue siendo aprobar/rechazar proveedor, sin estado por documento ni migracion nueva.
- web provider console inicial queda habilitada en `apps/web`: shell operativa para proveedor con metricas, navegacion por Negocios/Publicacion/Reservas/Perfil/Servicios/Disponibilidad/Documentos y reutilizacion de contratos provider existentes. Incluye vista read-only de cupos publicados en Agenda usando slots reales por servicio. No reemplaza `apps/admin`, que sigue siendo backoffice interno.
- `apps/web` queda depurada por rol activo: usuarios duales ven solo la consola provider cuando el rol activo es `provider`, y deben cambiar a `pet_owner` para ver hogares, mascotas, marketplace y reservas owner.
- Provider web console mejora look and feel: encabezado compacto, carrusel/lista horizontal de negocios, formularios cerrados por defecto y CTAs para abrir creacion/edicion, sin referencias tecnicas visibles. `Operacion general` agrega indicadores globales de referencia operativa `payment-ready` por citas completadas, pendientes/confirmadas y canceladas por negocio/proveedor segun razon registrada; no representa pagos reales.
- el polish visual/manual QA por rol quedo cerrado con `PASS`: owner mobile con `QA_OWNER`, provider mobile con `QA_PROVIDER` y admin web autenticado con `QA_ADMIN`
- el hardening tecnico/operativo del piloto queda cerrado con notas en `docs/delivery/PILOT_OPERATIONS_HARDENING.md`; lint, typecheck, web build, admin build, mobile build, smokes canonicas y `git diff --check` estan en `PASS`
- la QA/UAT manual web fue ejecutada por el usuario y queda registrada como `PASS`
- Android/mobile fue ejecutado manualmente y `AND-01`, `AND-02` y `AND-03` quedan registrados como `PASS`
- ya no existe bloqueo activo de Android/mobile por entorno
- V2 provider operations / booking operations: Slice A check-in, Slice B check-out, QR-2 owner QR display, QR-3 provider scanner y Slice C evidencia documental quedan implementados y validados manualmente en Android sobre Supabase remoto. El flujo principal de check-in/check-out queda como QR temporal owner -> provider, dejando botones manuales como fallback piloto. Evidencia se carga despues de check-out al bucket privado `booking-operation-evidence` como documento de actividad; no reemplaza QR como prueba principal de presencia. Por compatibilidad con esquema remoto legacy, `file_url` se guarda como el `storage_path` privado cuando la columna aun es requerida. Report card e internal notes siguen pendientes.
- Web provider reservas resuelve nombres minimos de hogar, cliente y mascota con `get_booking_participant_summaries`, manteniendo RLS de datos owner y evitando mostrar placeholders `Unknown` en citas de clientes externos.
- Owner evidence read: preparado localmente para que el owner consulte evidencia documental de su propia reserva con URL firmada temporal. Requiere aplicar la migracion `20260520164000_owner_booking_operation_evidence_read.sql`; no se ha ejecutado Supabase push.
- Owner evidence read queda versionado como lectura read-only: mobile muestra `Abrir documento` con URL firmada temporal y la migracion agrega policies select para operaciones, evidencia y objetos del bucket `booking-operation-evidence` solo sobre bookings visibles por el hogar. Notas internas siguen fuera de visibilidad owner.
- V2 booking capacity: CAP-0 documental, CAP-1 backend/RPC, CAP-2 provider UI y CAP-3 owner UI estan en curso sobre `feature/v2-booking-capacity`. Modelo: reglas recurrentes por servicio, excepciones por fecha, slots calculados por RPC y creacion transaccional de booking desde slot para evitar sobreventa. Provider mobile permite configurar horarios con capacidad; owner mobile muestra calendario/slots y crea booking desde slot cuando hay cupo elegido. Fix CAP-3 separa preview local de confirmacion: preview no consume cupo y solo confirmar reserva llama `create_booking_from_slot`. El flujo legacy queda como fallback piloto.
- Booking capacity timezone fix: migracion local `20260604073000_booking_capacity_panama_timezone.sql` mantiene Supabase/Postgres en UTC y fuerza `America/Panama` al proyectar y validar slots en `get_service_booking_slots` / `create_booking_from_slot`, evitando que la hora configurada por el proveedor dependa de la zona de sesion de Supabase.
- Controlled avatar media: mascotas y perfiles publicos de proveedor usan buckets privados `pet-avatars` y `provider-avatars`, metadata `storage_bucket`/`storage_path` y URLs firmadas temporales. No se agregan nuevas URLs externas arbitrarias.
- Pets profile hardening: se agrega campo descriptivo nullable de esterilizacion en `pet_profiles` y UI owner mobile/web para indicar `Esterilizada`, `No esterilizada` o `Sin indicar`. Requiere aplicar migracion local `20260609110000_pet_sterilization_profile_field.sql` antes de usar contra Supabase remoto.
- Pet document expiration: slice agrega metadata de vigencia a `pet_documents`, helper compartido de estado, UI mobile/web owner para cargar/editar vigencia y alertas dentro del expediente de mascota. La migracion `20260614110000_pet_document_expiration.sql` ya fue aplicada en Supabase remoto y el dry-run posterior reporto base al dia.
- Pet memory status: mascotas pueden alternar `active` / `in_memory` sin borrar perfil ni historial; reservas nuevas rechazan mascotas `in_memory`. La migracion `20260510123000_pet_memory_status_slice_b.sql` ya fue aplicada remoto.
- UX audit Pets P0/P1: mobile owner refuerza el contexto activo de mascota al navegar desde otras secciones y muestra estado explicito cuando la mascota solicitada esta cargando o ya no esta disponible. El modo `En memoria` ahora separa acciones operativas de consulta/historial, pausa recordatorios operativos visibles y comunica que reservas nuevas quedan bloqueadas sin borrar documentos, salud ni historial.
- Geo marketplace V2: Geo-0 prepara modelo tecnico/documental con `provider_public_locations`, PostGIS, precision publica controlada y contratos tipados. Geo-1 agrega UI provider minima en `Negocio` para capturar/editar ubicacion publica manual, precision y visibilidad. Geo-2 muestra ubicacion publica en marketplace owner y calcula distancia aproximada solo si llegan coordenadas de origen opcionales. Geo-3 agrega selector de origen controlado con zonas aproximadas; direcciones guardadas quedan diferidas hasta exponer coordenadas en contrato. Geo-4 agrega preview de mapa en mobile owner con MapLibre, pins de proveedores publicos usando la ubicacion exacta publicada por el proveedor y fallback de lista. No pide permisos de ubicacion ni tracking.
- Pet Travel Passport V2 queda en `documented_on_hold`: `docs/modules/pet_travel_passport.md` define el expediente internacional de mascota como modulo documental futuro para organizar requisitos, documentos, vencimientos y comparticion autorizada con veterinarios/proveedores. No emite pasaporte oficial ni certificado sanitario oficial, no cambia Supabase, no crea migraciones y requiere validacion legal/fuentes oficiales por pais antes de automatizar checklists.
- Foster/Adoption V2.5 queda en `documented_on_hold`: `docs/modules/foster_adoption.md` define familias protectoras aprobadas, transferencia privada de custodia, hogares de acogida, rescate y adopcion como nodo no financiero para mascotas bajo custodia temporal. La ruta recomendada inicia con perfil protector aprobado por admin y transferencia privada antes de marketplace publico. No es provider comercial, no habilita pagos ni venta de mascotas y requiere consentimiento/auditoria antes de mover expediente.
- Foster-1A queda implementado y aplicado remoto: `protective_household_profiles`, tipos/API client, UI owner en Hogares para solicitar/ver estado y UI admin para revisar/aprobar/rechazar/suspender.
- Foster-2A queda implementado y aplicado remoto: migracion `20260620153000_foster_2a_private_pet_transfers.sql`, tablas `pet_custody_contexts` / `pet_transfer_records`, RPCs de invitacion/aceptacion/rechazo/cancelacion, UI owner mobile para transferir/recibir invitaciones y auditoria admin web. No incluye marketplace publico de adopcion, transferencia de reservas/chats/pagos/soporte ni recordatorios futuros. Pendiente QA manual antes de piloto real.
- Foster-3A queda implementado, aplicado remoto y publicado: migracion `20260621100000_foster_3a_adoption_showcase.sql`, tablas `pet_adoption_listings` / `pet_adoption_listing_media`, bucket privado `pet-adoption-media`, RPCs de publicacion/revision/listado, UI owner mobile de vitrina controlada y UI admin de moderacion. Videos, solicitudes formales y conexion automatica con transferencia privada quedan diferidos.
- Foster-3B queda implementado, aplicado remoto y publicado: migracion `20260628120000_foster_3b_adoption_media_gallery.sql`, RLS para agregar fotos a publicaciones `published` sin despublicarlas, limite de 8 fotos, portada controlada, moderacion individual admin y filtros publicos para mostrar solo media aprobada. No incluye videos, chat ni solicitudes formales de adopcion.
- Foster-4A queda implementado en mobile owner como discovery controlado separado del marketplace comercial: `Inicio` abre la pantalla dedicada `Mascotas que buscan hogar`, con listado, detalle publico, galeria/historia/salud/compatibilidad/requisitos y CTA informativo. `Buscar` queda enfocado en servicios/proveedores y reserva; `Mascotas` queda enfocado en gestion propia/publicaciones propias de familias protectoras. No crea solicitudes, transferencias, reservas ni chats; usa APIs Foster-3A existentes y no requiere migracion.
- Foster-Household-B queda implementado, aplicado remoto y publicado: migracion `20260629110000_household_type_owner_protective.sql`, tipos/API para `householdType`, creacion explicita de hogares `owner`/`protective`, UX owner en Hogares para distinguir `Hogar familiar` vs `Familia protectora` y validaciones server-side Foster que exigen hogar `protective` aprobado. Decision de producto: `HOGAR SULVARAN VELASCO` permanece como hogar familiar `owner`; no hubo backfill automatico a `protective`. APK Android QA generada en `dist/pilot/android/pet-ecosystem-pilot-v0.3.1-foster-household-b-android.apk`; iOS queda pendiente por cuota EAS iOS.
- Foster-5A a Foster-5E quedan aplicados remoto y publicados: perfil publico moderado de Familia Protectora, ficha publica de mascota por slug, solicitudes estructuradas de adopcion, historial/cambio controlado de estado y cierre `adopted` conectado a transferencia privada Foster-2A. La regla clave se mantiene: aprobar una solicitud no mueve custodia; solo aceptar la transferencia privada mueve `pets.household_id`, marca la solicitud `converted_to_transfer` y cierra la publicacion como `adopted`. Foster-5D.2 sigue pendiente para UI completa de bandeja/pipeline.
- Baseline `v0.3.0-booking-capacity-ops.1` queda aprobado para piloto controlado sobre `master` en `a677f7b`; readiness documentado en `docs/delivery/V0_3_0_PILOT_READINESS.md`.
- Piloto controlado real: runbook operativo creado en `docs/delivery/PILOT_CONTROLLED_RUNBOOK.md` y guia SQL no destructiva en `docs/delivery/PILOT_DATA_PREPARATION.sql` para preparar 3 proveedores, 3 propietarios y 1 admin sin borrar historicos ni ejecutar migraciones.
- Cierre QA mobile pre-piloto: autenticacion mobile ordenada, compuerta de hogar post-login, saludo owner con nombre real, contexto de mascota persistente en navegacion inferior, mensajes tipo bandeja/acordeon, reservas owner filtradas por Activas, QR owner cerrable/auto-limpiable tras check-in/check-out, requery controlado sin Realtime y guias de APK/quick-start para owners, providers y admin.
- UX audit Auth P0: errores comunes de login, OTP, recovery, rate limit, sesion expirada y enlaces invalidos se traducen a mensajes accionables en espanol desde el API client y los hooks mobile/web. El enlace de recovery mobile ahora muestra instrucciones claras al abrirse y evita exponer errores tecnicos crudos.
- Owner account readiness UX: Owner mobile > Cuenta usa `Pasos de cuenta` como checklist accionable hacia acceso/verificacion, perfil, preferencias, roles, direcciones y metodos guardados, sin cambiar reglas de negocio ni activar pagos reales.
- UX audit Households P0: la compuerta owner sin hogar usa copy calido y no tecnico, explica por que el hogar va antes de mascotas/reservas, agrega placeholder/helper para nombrarlo y bloquea el CTA mientras el nombre este vacio.
- UX audit Reminders P0: Inicio, ficha de Mascotas y Recordatorios quedan alineados sobre la misma fuente visible del hogar. La ficha de mascota muestra sus recordatorios pendientes reales o un empty state especifico; al crear/completar/posponer desde Recordatorios se refresca el resumen compartido sin cerrar sesion.
- Health vaccine summary UX: ficha owner mobile/web deja de marcar vacunas `Al dia` solo por conteo y deriva el estado desde `next_due_on` como `Al dia`, `Por vencer`, `Vencida`, `Revisar` o `Sin registro`; sin cambios DB/API.
- Health vaccine sticker evidence: owner mobile puede cargar foto/PDF del sticker desde una vacuna; se guarda como documento existente tipo `vaccination_record` y se muestra como soporte asociado, sin migracion ni cambio de contrato.
- Pet document viewer: owner mobile permite abrir documentos de mascotas desde Docs con acciones compactas por icono. Las imagenes se previsualizan en modal interno y PDFs/otros formatos se abren con el visor del dispositivo usando URL firmada temporal del bucket privado; sin migracion ni bucket publico.
- Mobile date picker UX: selectores de fecha en Mascotas, Salud y Recordatorios usan encabezado numerico `MM/YYYY` y controles compactos `-1 ano` / `+1 ano` para evitar solapamientos en pantallas pequenas; sin cambios DB/API.
- Owner active pet context UX: owner mobile centraliza una `mascota activa` en el shell y la propaga a Mascotas, Salud, Recordatorios, Buscar y Reservas para no perder el foco al navegar por el menu inferior. Mensajes queda como siguiente slice si se requiere filtrar por `petId` real en hilos.
- UX audit Perfil P0: `Cuenta > Modo de uso` ahora muestra rol activo, roles disponibles y una instruccion clara para solicitar un rol faltante durante piloto, sin crear roles automaticamente ni cambiar permisos/contratos.
- Fix mobile owner reservas 2026-05-28: `useBookingsWorkspace` usa canal Realtime unico por instancia para evitar crash al navegar desde `Mascotas` hacia `Reservas` despues de seleccionar mascota; mantiene actualizacion de booking status y polling de respaldo.
- Fix mobile owner detalle de reserva 2026-05-29: cuando provider web aprueba o cambia estado de una reserva, el refresco mobile actualiza tambien el detalle abierto (`selectedBookingDetail`), no solo la lista. APK QA generada: `dist/pilot/android/pet-ecosystem-pilot-v0.3.1-booking-detail-refresh-20260529-arm64-hermes-release.apk`.
- Messaging mobile agrega aviso emergente in-app para piloto: mientras `Mensajes` esta activo, owner/provider reciben banner temporal con vibracion corta ante mensajes entrantes de la contraparte. No activa push notifications en background/cerrado ni cambia backend, DB, RLS o contratos.
- Messaging web provider agrega aviso emergente in-app para piloto: mientras la consola web provider esta abierta, detecta nuevos mensajes entrantes del owner en hilos de reserva y permite saltar con CTA a la cita y conversacion correspondiente. No activa push notifications en background/cerrado ni cambia backend, DB, RLS o contratos.
- Marketplace owner UX: Buscar queda alineado al patron visual de busqueda mobile con barra superior, filtros modales, categorias rapidas, sugerencias y cards de proveedor mas claras. Los datos reales siguen viniendo del marketplace actual; rating/cupos agregados en lista quedan como UI controlada o CTA hacia detalle/horarios.
- APK local de piloto actualizado para validar Marketplace UX: `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-marketplace-ux-android-release.apk`, SHA256 `C4A61EA37D223421DF34FCFCF44E044709C9B7692EAB0974EC0DF03BE1C3D206`. La distribucion sigue siendo manual por enlace privado; no se subio a servicios externos desde el agente.
- APK local de piloto actualizado para QA mobile general: `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-qa-20260520-arm64-release.apk`, SHA256 `43D57C10B4B77E8B02CB0F94DE5E190072C56344EEFF99BF21615B265F4E1EE1`. Build release privado `arm64-v8a`, generado con JSC por compatibilidad con Windows/rutas largas. Distribucion manual por enlace privado.
- APK local de piloto actualizado para messaging notices: `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-messaging-notices-20260522-arm64-hermes-env-release.apk`, SHA256 `510C445CD5327D94D520F762A61620D124D5E2BD6566F522CD704CB6627BBD49`. Build release privado `arm64-v8a`, generado con Hermes, copia temporal corta `C:\b23`, `.env` mobile copiado y build limpio. El artefacto JSC previo queda reemplazado porque crasheaba al abrir con `Unexpected token '?'`; la reconstruccion Hermes sin clean tambien queda descartada porque reutilizo bundle sin variables `EXPO_PUBLIC_*`. Distribucion manual por enlace privado.
- iOS Beta Privada queda preparada y operativa para EAS + TestFlight: `apps/mobile/app.json` define version `0.3.1`, bundle id `com.petecosyst.mobile`, scheme `petecosystem` y textos de permisos iOS; `apps/mobile/eas.json` explicita build iOS no-simulator en preview/production. Build iOS production vigente para QA Foster navigation: `0.3.1 (13)`, EAS `845b0ace-14f4-4806-a516-803689d55e51`, subido a App Store Connect/TestFlight para procesamiento Apple.
- Visual alignment reference canon: fase visual controlada iniciada sobre las referencias en `docs/ux/reference/`. Se deriva guia minima en `docs/ux/VISUAL_STYLE_GUIDE.md` y se alinean tokens, cards, chips, botones, navegacion mobile y shell/admin cards sin cambiar logica funcional, backend, DB, contratos API ni reglas de negocio.
- quedan pendientes externos/no bloqueantes de evidencia o ampliacion de cobertura fuera del criterio de salida MVP
- el baseline esta alineado para piloto controlado, no para produccion comercial

## Estado global del release

- estado recomendado hoy: `QA/UAT final completada`, con web manual en `PASS` y Android/mobile en `PASS`
- baseline tecnico congelado en `v0.1.0-mvp-baseline.1`
- baseline localizado actual publicado en `v0.1.0-mvp-baseline-es.1` sobre `6e984eb`
- piloto controlado: `aprobado`
- fase UX por rol: `cerrada`
- fase actual del proyecto: `QA mobile pre-piloto cerrado`; siguiente paso recomendado es smoke operativo con 3 proveedores, 3 propietarios y 1 admin antes de abrir nuevo alcance funcional
- baseline operativo actual: `v0.3.0-booking-capacity-ops.1`, aprobado para piloto controlado; no abrir Payments hasta cerrar el paquete operativo de piloto.
- checklist visual/manual: `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`
- HEAD operativo publicado antes del handoff actual: `b978d3a`
- pendientes restantes: `no bloqueantes`; evidencia visual final si se requiere paquete auditable y pendientes externos de entorno
- fuera de alcance todavia: produccion comercial, pagos reales, clinic, commerce, pharmacy, finance, benefits y telecare
