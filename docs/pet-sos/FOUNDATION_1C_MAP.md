# Foundation-1C.2: consulta geografica acotada

2026-09-20. Migracion aplicada remotamente a las 20:27 UTC. Registro, cuerpo SQL
y ACL verificados; cuatro smoke checks publicos correctos (muestra vacia).
Evidencia en `foundation-1c-map-remote.json`. La UI SOS aun no esta conectada.

## Contrato

- RPC aditiva `list_public_pet_sos_map_events`, migracion `20260920210000`.
- Metodo `PetAlertApiClient.listPublicPetSosMapEvents(filters)` y DTOs compartidos.
- bounds obligatorio: cuatro numeros finitos, latitudes ordenadas, longitud valida,
  amplitud maxima de 30 grados por eje. Antimeridiano soportado con dos envolventes.
- `view`: all significa ambas categorias activas, lost solo extraviadas, seen
  vistas/resguardadas y found recuperadas. Found NO significa sheltered.
- Especie opcional por igualdad sin distinguir mayusculas; no busqueda fuzzy.
- Fecha minima opcional. Limite 1..200, default 100; RPC devuelve a lo sumo limite+1.
- Orden ocurrido DESC, tipo ASC, slug ASC. Cursor contiene esos tres valores y se
  deriva del ultimo elemento mostrado, no del elemento extra. Sin offset creciente.
- `hasMore`/`nextCursor` distinguen truncamiento de ausencia de resultados.
- Reiniciar cursor al cambiar zona/filtros. Paginacion no es snapshot transaccional:
  si cambian eventos entre paginas, refrescar desde el comienzo.
- No ID interno, contacto, actor, coordenada privada ni ruta de Storage en respuesta.
  Cliente reconstruye enlaces canonicos y proyecta claves explicitamente.
- `photoUrl=null` en este feed: no firmar/descargar todas las fotos originales para
  marcadores. El detalle publicado existente conserva su galeria por separado.

No se cambio `list_public_pet_alert_map_points` ni el mapa web actual. No hay
pantalla SOS conectada ni adaptador de rollout activo. Cambios compatibles con
clientes publicados; metodo nuevo requiere migracion antes de ser consumido.

## SQL y privacidad

Cada rama aplica sharing, visibilidad geografica, estado y vencimiento del
contrato existente. Predicado geography && sobre public_geo_point aprovecha GiST;
filtro escalar posterior delimita exactamente el rectangulo. No se consulta
private_geo_point. Publicacion recuperada conserva visibilidad historica.

Firma con bounds obligatorios impide omitir zona en cliente manipulado. Backend
tambien rechaza NaN, infinitos, limites excesivos y cursores incompletos. EXECUTE
solo anon/authenticated; no escritura ni cambio RLS de tablas. Esta limitacion no
reemplaza rate limiting de infraestructura ni garantiza resistencia a scraping.

## Pruebas

- Ocho tests cliente: validacion, sin RPC ante input invalido, antimeridiano,
  paginacion, campos privados descartados, estados no publicos rechazados y errores.
- Quince checks Postgres/PostGIS usando tablas temporales sinteticas en transaccion
  revertida, incluida compilacion del SQL original contra el esquema existente.
- Pruebas de comportamiento sustituyen SOLO nombres de relaciones por fixtures.
  No son RLS integral con actores ni carga concurrente de produccion.
- 10.000 filas sinteticas: EXPLAIN ANALYZE muestra Index Scan sos_lost_geo sin
  forzar planner. Es elegibilidad del predicado espacial, NO p95 del RPC completo
  ni benchmark a 100.000 usuarios. No extrapolar duracion del ensayo a produccion.
- Runner `node docs/pet-sos/check-map-candidate.mjs` usa helper de gestion existente,
  exige ausencia de RPC, no registra migracion y confirma ausencia tras ROLLBACK.
  Requiere entorno seguro configurado; no imprime credenciales ni datos reales.
- Evidencia `foundation-1c-map-results.json`. Docker local no estaba disponible.
- Lint/build types/API, typecheck mobile/web/admin/API y diff check correctos.

## Pendientes

No cierra Foundation-1C: falta pipeline servidor de medios sin EXIF,
preservacion de resguardo, prueba multiconexion, consultas por radio y ensayo de
carga del RPC completo. No nuevos SDKs/dependencias ni despliegues en esta entrega.
Siguiente: Foundation-1C.3, medios privados y derivados publicables normalizados.
