# Pet Ecosystem SOS: evolucion de Pet Alert

Fecha: 2026-09-20. Baseline: `7c9fabb` mas cambios locales documentados en HANDOFF.
Estado: primera entrega de arquitectura; implementacion incremental, NO lanzamiento.

## A. Arquitectura actual

SOS sera una experiencia de Pet Alert, no un dominio ni una base de datos paralelos.
Se conservan React Native/Expo en mobile, Next.js en web/admin, tipos y cliente API
compartidos y Supabase Auth/Postgres/Storage. No cambia el dominio de salud.

| Capacidad comprobada en codigo | Fuente reutilizable |
| --- | --- |
| Alerta desde mascota/hogar, cierre, recuperacion | `apps/mobile/src/features/pet-alert/components/PetAlertLostPetPanel.tsx` |
| Reportes comunitarios, fotos y reclamaciones | `apps/mobile/src/features/pet-alert/components/PetAlertCommunityWorkspace.tsx` |
| DTO y acceso centralizado por RPC | `packages/types/src/pet-alert.ts`, `packages/api-client/src/pet-alert.ts` |
| Mapa web, clustering, alternativa lista | `apps/web/src/features/pet-alert/components/PublicPetAlertMap.tsx` |
| Motor nativo de mapas ya instalado | MapLibre, usado en marketplace mobile; reutilizar biblioteca, no importar su workspace |
| Coordenadas privadas/publicas, PostGIS, indices GiST | Migracion `20260904130000_pet_alert_map2_secure_locations.sql` |
| Moderacion geografica admin | Migracion MAP-7 aplicada el 20 de septiembre |
| Reportante externo, verificacion, moderacion | `supabase/functions/pet-alert-external-report/index.ts` |
| Fotos privadas, proyeccion publica, avatar de mascota | Migraciones Pet Alert de medios y avatar publico |
| URL publica, compartir, QR y cartel | Rutas existentes `/pet-alert` y fichas por slug |
| Custodia y adopcion independientes | `docs/modules/foster_adoption.md` |

Notificaciones existentes: recordatorios locales, badges y mensajeria in-app.
Esto NO acredita infraestructura de push remoto por proximidad.
Auth mobile persiste actualmente en AsyncStorage; no reutilizar ese mecanismo
sin revision para borradores con coordenadas privadas y fotografias.

Skills utilizadas: pet-feature-delivery, pet-supabase-security y pet-role-qa.
pet-release-operations queda para publicacion. No existen las skills nominales
architecture-review/accessibility/performance: esos controles se cubren manualmente.
La revision estatica y la inspeccion remota de funciones/ACL no equivalen a una
auditoria completa de todo el repositorio ni a certificacion MASVS.

## B. Brechas

1. No hay pantalla SOS nativa map-first con filtros y lista sincronizados.
2. `found` del directorio significa recuperada/reunida. No equivale a animal
   encontrado bajo resguardo que sigue buscando a su propietario.
3. Avistamientos vinculados existen, pero falta experiencia LO VI, fotos,
   direccion/confianza y timeline geografico autorizado.
4. Faltan borradores seguros offline, idempotencia de envio y recuperacion de subidas.
5. Faltan suscripciones por zona, cola backend y push remoto con consentimiento.
6. El mapa admite consultas sin bounds; el filtro SQL usa rangos escalares,
   no demuestra aprovechamiento del indice espacial. No hay cursor ni truncamiento explicito.
7. La aproximacion se regenera al guardar; consultas sucesivas son estables,
   pero sucesivas escrituras pueden producir puntos diferentes para la misma ubicacion.
8. No se verifico saneamiento EXIF del archivo publicado en todos los caminos.
9. Hay una brecha de autorizacion prioritaria descrita en E/H.
10. Faltan mediciones nativas de accesibilidad, rendimiento y tiempos reales del flujo.

## C. Arquitectura propuesta

Pantalla SOS -> hooks de consulta/formulario -> API tipada Pet Alert -> RPCs
autorizadas y proyecciones publicas. Edge Functions solo para procesos confiables:
normalizacion de medios, reportantes externos y, mas adelante, entrega push.

- `PetSosWorkspace`: contenedor del estado de filtros, seleccion y mapa/lista.
- Componentes pequenos: mapa nativo, lista accesible, ficha resumida y formulario.
- Reutilizar el panel de perdida y reportes actuales extrayendo solo lo necesario.
- Mantener CoreHomeScreen como integracion, no agregar alli reglas de negocio.
- Un unico resultado consultado alimenta mapa y lista; no descargar el pais entero.
- No crear repositorio generico, event bus ni servicio de microservicios nuevo.
- Flags propuestas por capacidad: mapa, avistamientos y suscripcion; apagadas por
  defecto. Configuracion cliente controla exposicion UX, NUNCA permisos.
- Habilitacion regional/beta efectiva requiere verificacion backend si limita
  escrituras. No presentar variables EXPO_PUBLIC como autorizacion de cohortes.

## D. Modelo y estados

Conservar `pet_alert_lost_pets`, `pet_alert_lost_pet_sightings`,
`pet_alert_community_sightings`, medios, reclamaciones, moderacion e historiales.
Las alertas externas ya permiten mascota/hogar nulos. No crear `lost_found_alerts`.

| Concepto UX | Modelo existente | Regla propuesta |
| --- | --- | --- |
| Extraviada | active | Publicacion por owner autorizado o circuito externo verificado |
| Con avistamientos | sighting_received | No confirma identidad ni recuperacion |
| Posible coincidencia | possible_match / possible_owner_claim | Evidencia por revisar, no propiedad acreditada |
| Vista | sighting_open | Animal observado, sin afirmar custodia |
| Resguardada | sheltered_by_reporter | Quien reporta declara resguardo; no es reunificacion |
| Recuperada | found / reunited | Confirmacion por actor autorizado; fuera del filtro activo |
| Cerrada/cancelada | closed / withdrawn | Motivo e historial; no contabilizar como recuperacion |

Conservar estados de moderacion, verificacion y expiracion. La nueva UI no
reemplaza enums publicados. En Foundation debe centralizarse una tabla de
transiciones por tipo de recurso y actor, contrastada con cada RPC vigente.
No aprobar transiciones nuevas desde el cliente solamente.

Cada mutacion: bloqueo/validacion, cambio e historial en una transaccion.
El identificador idempotente debera estar ligado al actor y operacion, no solo
al ID enviado. Para sightings ampliar de forma aditiva foto, rumbo opcional y
confianza declarada; ninguna confianza es verificacion automatica.

Tablas futuras justificadas, no creadas en esta entrega: suscripcion geografica,
registro privado de dispositivo y outbox de entrega, solo si no existe equivalente
al implementar fase 5. UUID, timestamps, ownership, indices y RLS por operacion.

## E. Seguridad y privacidad

Inspeccion remota de solo lectura confirma EXECUTE anon en dos setters MAP-2.
Su condicion `not (actor = reporter OR ...)` puede resultar NULL cuando no hay
usuario; IF NULL no rechaza en PL/pgSQL. Riesgo alto de mutacion no autorizada
si se conoce un UUID valido. No se han probado escrituras contra datos reales.
Prioridad Foundation-1A: grants explicitos y rechazo null-safe, con fixtures locales.

| Actor | Lectura | Escritura |
| --- | --- | --- |
| Anonimo | DTO publico sanitizado, solo publicaciones elegibles | Ningun setter privado; circuito externo mediado por backend |
| Usuario autenticado ajeno | DTO publico | Puede reportar bajo sus propios permisos; no editar recursos ajenos |
| Reportante | Sus datos privados segun contrato | Su reporte/sighting, con estado permitido |
| Miembro de hogar | Segun nivel existente | Gestion solo con permiso de edicion; no basta pertenecer |
| Admin | Cola de moderacion segun privilegio | Acciones auditadas; no propiedad de la mascota |
| Servicio | Operacion confiable y acotada | Verificacion externa/trabajos backend; secreto nunca en cliente |

No entregar coordenadas privadas en consultas publicas, push, QR ni analytics.
Mapa de sightings publico solo con proyeccion/consentimiento explicitos; timeline
preciso reservado a autorizados. UUID no es secreto ni autorizacion.
Revisar SELECT/INSERT/UPDATE/DELETE directos, SECURITY DEFINER, search_path,
ACL y Storage. Pruebas de funciones con mocks no acreditan RLS real.

Medios: conservar bucket privado; validar bytes/MIME/tamano y decodificar/re-encodear
en backend antes de exponer derivado sin EXIF. Original en cuarentena no publicable.
No volver publico el bucket. Moderacion automatica de contenido sigue propuesta
pendiente, no aprobada implicitamente como procesamiento por proveedor externo.

Abuso: reutilizar denuncias/moderacion/CAPTCHA existentes; cubrir limites por actor,
operacion y ventana en backend, cuotas de fotos y reintentos. Verificar concurrencia.
Contacto intermediado, sin telefono/email publicos; bloqueo requiere contrato antes
de agregarlo. No usar reputacion o matching automatico para decidir propiedad.

## F. Flujos UX

- Perdida: mascota existente -> confirmar lugar y hora -> publicar. Precargar
  ficha/foto; circunstancias adicionales opcionales segun validacion real. Meta
  menor de 30 s para usuario con sesion/datos listos, medir sin ocultar esperas GPS/red.
- Encontrada: elegir "La vi" o "Esta bajo mi cuidado" -> foto/caracteristicas ->
  lugar/hora -> revisar privacidad -> enviar. No crear mascota del owner automaticamente.
- LO VI: ficha -> lugar/hora prellenados y corregibles -> observacion/foto opcional
  -> confirmar. Fecha capturada se conserva si hubo desconexion.
- Reunificacion: gestion propia -> confirmar recuperacion -> registrar motivo ->
  retirar de activas, conservar ficha compartida con estado actualizado.
- Regresar conserva filtros, mapa y borrador. Cancelar confirma solo si hay cambios.
- Mapa ofrece Extraviadas / Vistas o resguardadas / Todas; Recuperadas como filtro
  explicito. Texto/icono/forma ademas de color. Timeline dice "Avistamientos reportados",
  nunca "ruta real". No unir puntos privados en la vista publica.

| Estado | Respuesta |
| --- | --- |
| Sin resultados | "No hay reportes en esta zona. Puedes ampliar la busqueda." |
| GPS denegado/no disponible | "Elige la zona en el mapa"; no bloquear formulario |
| GPS impreciso | Mostrar area de precision y permitir corregir pin |
| Cargando | Conservar mapa/lista anterior con indicador, evitar salto de layout |
| Error de red | Reintentar sin perder campos ni duplicar reporte |
| Offline | "Guardado en este dispositivo. Todavia no se ha enviado." solo si persistio |
| Alerta cerrada | Estado visible; desactivar nuevos avistamientos segun regla backend |
| Foto fallo | Explicar si reporte existe; reintentar solo archivo pendiente |

Objetivo tactil 48 dp, escalado de texto sin corte, foco restaurado, lectura
VoiceOver/TalkBack y contraste comprobados. No exigir mapa a quien usa lector.

## G. Decisiones tecnicas

- MapLibre ya instalado. No nuevo SDK. Estilo/tiles productivos configurables,
  atribucion y coste revisados antes de beta; no usar servidor demo como produccion.
- PostGIS geography(Point,4326) existente. Radio con ST_DWithin sobre columna
  indexada; bbox espacial antes de proyeccion. EXPLAIN ANALYZE con datos sinteticos
  para demostrar indice, no solo su presencia. Tratar antimeridiano y bounds invalidos.
- Contrato aditivo para feed SOS con tipos discriminados y region obligatoria,
  fecha/especie/estado, cursor y aviso de limite. Mantener RPC antigua para clientes.
- Ubicacion aproximada estable por evento/version; revisar persistencia de celda
  generalizada y riesgo de promediar puntos antes de publicar mas endpoints.
- Solo permiso foreground por accion. Manual o zona buscada sin permiso; proveedor
  de geocoding pendiente de seleccionar con coste/retencion, no prometer busqueda gratis.
- Offline: cache solo proyeccion publica con edad visible. Borrador privado cifrado,
  clave protegida por sistema, TTL propuesto 24 h y limpieza al logout. Dependencia
  segura a evaluar antes de implementar; no guardar ubicacion privada en AsyncStorage.
- Envio offline idempotente y explicito, sin reactivar alertas cerradas; no afirmar
  publicacion mientras esta en cola. No seguimiento en segundo plano.
- Conservar `/pet-alert/...` y QR actuales. Universal/App Links requieren dominios
  asociados y QA iOS/Android; esquema custom no demuestra enlaces HTTPS nativos.
- Compartir usa mecanismos existentes; no prometer publicacion automatica en Stories.

Push fase 5: zonas elegidas, opt-in revocable, radio/especie/horarios; servidor
resuelve candidatos por indice y outbox con deduplicacion, reintentos y tokens
invalidos eliminados. No coordenadas exactas ni identidad del reportante en payload.
100/1.000 usuarios: lotes acotados; 10.000: workers y cuotas medidos; 100.000:
prueba de carga y particionamiento solo si evidencia lo requiere. No capacidad prometida.

## H. Riesgos priorizados

| Nivel | Riesgo | Puerta de salida |
| --- | --- | --- |
| Alto | Setters con ACL anon y condicion NULL | Foundation-1A, pruebas y aplicacion remota controlada |
| Alto | EXIF/ubicacion precisa en derivados | Verificacion de bytes y saneamiento antes de nuevas galerias |
| Alto | Confundir resguardo, recuperacion y custodia | Estados/copy explicitos; no adoptar automaticamente |
| Alto | Robo/extraccion de drafts privados | Almacenamiento seguro y revocacion/logout probados |
| Medio | Consultas geograficas/carga de fotos no acotadas | Plan SQL, limites, thumbnails y carga |
| Medio | Duplicados/offline y cambios de estado concurrentes | Idempotencia y tests multiconexion |
| Medio | Proveedor tiles/geocoder/push y coste | Configuracion, cuotas, fallback y ensayo de carga |
| Medio | Accesibilidad y bateria no medidas | QA nativa y presupuesto medido |
| Bajo | Nuevo nombre SOS rompe enlaces o comprension | Pet Alert se conserva; SOS como experiencia |

No hay evidencia para afirmar ausencia de vulnerabilidades criticas en todo el
sistema. El hallazgo alto bloquea declarar este frente listo para produccion.

## I. Plan por fases

| Slice | Entrega | Dependencia / estado |
| --- | --- | --- |
| Foundation-1A | Cerrar hueco NULL/ACL con regresion local | Implementado localmente; aplicacion remota pendiente |
| Foundation-1B | Matriz completa de estados/permisos y contratos, flags | 1A; RLS real y compatibilidad |
| Foundation-1C | Feed acotado PostGIS, privacidad y medios saneados | 1B; EXPLAIN y pruebas negativas |
| Lost-2A | Mapa/lista mobile, filtros y detalle publico | Foundation; feature flag apagado |
| Lost-2B | Reportar desde mascota, confirmar recuperacion | 2A; meta 30 s y QA fisico |
| Found-3 | Vista/resguardada, fotos y reclamacion existente | Foundation; no nuevas reglas de propiedad |
| Sightings-4A | LO VI/timeline autorizados | 2/3; contrato de medios y consentimiento |
| Sightings-4B | Borradores seguros, idempotencia, avisos owner | 4A; backend y prueba offline |
| Community-5 | Zonas, push remoto, enlaces nativos | 4; consentimiento y pruebas de entrega |
| Protector-6 | Derivacion aceptada y trazada a protectora | Politica de custodia aprobada; sin adopcion automatica |

Fases 2-6 NO implementadas por esta documentacion. Matching IA, heatmaps y
prediccion quedan fuera. No activar cron de reservas pendiente por trabajar en SOS.

## J. Criterios de aceptacion y verificacion

- A no puede editar alerta/sighting de B; anon no ejecuta setters privados.
- Miembro view no equivale a edit; comprobar RLS con JWT reales y REST directo.
- Publico no recibe coordenadas privadas, contacto, identidad privada ni EXIF.
- Owner publica desde mascota y aparece en mapa/lista con iguales filtros.
- Comunidad reporta LO VI; owner lo ve; cierre retira alerta de busqueda activa.
- Sin permiso GPS sigue siendo posible completar manualmente.
- Offline conserva fecha real, muestra pendiente y reintento no duplica.
- Historico/custodia/Foster/health/auth existentes no cambian por esta fase.
- Builds/lint/tipos y tests correspondientes pasan; E2E no sustituido por build.
- Android/iPhone fisicos: lector, escalado, GPS, camara, offline y enlaces.
- Umbrales iniciales propuestos: debounce 350 ms; maximo 200 puntos por respuesta
  SOS inicial; sin fotos originales en marcadores; p95 consulta < 500 ms con 10k
  fixtures y red excluida; primer resultado util < 3 s en red de QA documentada.
  Son objetivos pendientes de medicion, no resultados actuales.
- Medir memoria/FPS/bateria y 100k registros sinteticos antes de ampliar regiones.
- Sin findings altos/criticos abiertos para release; flag off y rollback probado.

Observabilidad propuesta: request_id, operacion, duracion, resultado y codigo de
error, sin tokens/coords/contacto. Eventos: time_to_create_alert, alert_created,
alert_shared, alert_opened_from_share, map_opened, sighting_created,
sighting_confirmed, push_opened, alert_reunited, alert_closed,
permission_location_denied. Minimizar identificadores, consentimiento/retencion
definidos antes de instrumentar. Recuperacion usa confirmaciones, no cierres como proxy.
No registrar campos libres en telemetria. Crash-free sessions requiere SDK/backend
verificado; no inventar metricas ni introducir proveedor automaticamente.

## Fuentes y canon

- [Pet Alert](../modules/pet_alert.md), [Mapa](../modules/pet_alert_map.md),
  [RLS](../data/RLS_RULES.md), [API](../api/API_CONTRACT.md), [Handoff](../HANDOFF.md).
- [OWASP MASVS](https://mas.owasp.org/MASVS/): revisar STORAGE, CRYPTO, AUTH,
  NETWORK, PLATFORM, CODE y PRIVACY; checklist no equivale a certificacion.
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html): distancia en
  metros para geography y predicado espacial compatible con indice.

Este documento agrupa A-J sin duplicar diez documentos canonicos. Especificaciones
SQL/API definitivas se actualizan en sus documentos existentes al implementar.

## Resultado de Foundation-1A

Preparada `supabase/migrations/20260920160000_pet_sos_location_authorization.sql`,
sin cambiar tablas ni firmas. Corrige ambos guards NULL y grants anon; renombra
la variable a jwt_role para no confundirse con CURRENT_ROLE bajo SECURITY DEFINER.
No aplicada a Supabase. El riesgo remoto permanece hasta desplegar y verificar.

27 checks en `supabase/tests/pet-sos-location-authorization.test.mjs`, incluidos
dos que reproducen el baseline inseguro antes de aplicar la correccion local.
Evidencia en `foundation-1a-local-results.json`. ESLint del test, node --check y
git diff --check correctos. No builds nativas porque no se cambio codigo de app.
El harness requiere PGlite del entorno de regresion existente, o definir
PGLITE_MODULE_PATH; no se instalo ninguna dependencia nueva.

Limitacion: auth, permisos de hogar, geometria y auditoria simplificados en fixture.
Faltan RLS/Storage reales, actores con niveles view/edit, concurrencia, PostGIS y
QA de dispositivos. No se declara Foundation completa ni certificacion de seguridad.
