# PET ALERT API Contract

## Principios

- Mutaciones criticas mediante RPCs `security definer` con `search_path` fijo, validacion de actor y auditoria.
- Lectura publica mediante DTOs sanitizados, no `select` directo de tablas sensibles.
- Operaciones anonimas con rate limiting/captcha en el borde cuando se habiliten publicamente.
- Errores funcionales estables y traducibles; no exponer SQL.

## DTOs publicos

### `PublicLostPetAlert`

Incluye slug, estado publico, foto aprobada, nombre, especie/raza, color/tamano, zona general, fecha aproximada, senas, comportamiento y notas medicas explicitamente publicas. Excluye `household_id`, coordenadas exactas, contacto privado y expediente.

### `PublicCommunitySighting`

Incluye slug, estado, descripcion, situacion, zona general, fecha aproximada y media publica. Excluye identidad/contacto del reportante y coordenadas exactas.

## Flujo A

- `createPetAlertLostPet(input)`
- `getPetAlertLostPetBySlug(slug)`
- `listPetAlertLostPetsForPet(petId)`
- `listActivePetAlertLostPetsForHousehold(householdId)`
- `publishPetAlertLostPet(id)`
- `updatePetAlertLostPet(id, patch)`
- `closePetAlertLostPet(id, reason)`
- `markPetAlertLostPetFound(id, source)`
- `createPetAlertLostPetSighting(slug, input)`
- `listSightingsForPetAlertLostPet(alertId)`
- `updatePetAlertLostPetSightingStatus(id, status)`

En Slice 1A, crear avistamientos requiere sesion autenticada. La concesion a `anon` se difiere hasta que Slice 3 incorpore rate limiting/captcha y moderacion publica.

Slice 3 conserva deliberadamente este requisito: la ficha es anonima mediante `getPetAlertLostPetBySlug`, pero `createPetAlertLostPetSighting` solo se ejecuta con sesion autenticada. La apertura anonima queda diferida hasta contar con rate limiting, captcha y moderacion operativa.

La creacion valida pet, household, permisos, elegibilidad y unicidad activa en una transaccion.

## Flujo B

- `createPetAlertCommunitySighting(input)`
- `getPetAlertCommunitySightingBySlug(slug)`
- `listPetAlertCommunitySightings(filters)`
- `updatePetAlertCommunitySighting(id, patch, manageToken?)`
- `closePetAlertCommunitySighting(id, reason, manageToken?)`
- `createPetAlertCommunityClaim(slug, input)`
- `listMyPetAlertCommunityClaims()`
- `listClaimsForCommunitySighting(id)` restringido
- `reviewPetAlertCommunityClaim(id, decision, reason)` admin

Slice 4 implementa solo `createPetAlertCommunitySighting`, `getPetAlertCommunitySightingBySlug`, `listPetAlertCommunitySightings` y cierre propio. La creacion exige sesion y aplica limite server-side de tres reportes por hora. Claims, token anonimo y contacto controlado permanecen diferidos a Slice 5.

## Slice 5 reclamo controlado

- `createPetAlertCommunityClaim(input)`: exige sesion, consentimiento, sena privada y reporte operativo; maximo cinco solicitudes por 24 horas.
- `listMyPetAlertCommunityClaims()`: seguimiento del reclamante; contacto del reportante solo aparece con estado `approved`.
- `listClaimsForMyPetAlertCommunitySightings()`: bandeja privada del autor del reporte.
- `reviewPetAlertCommunityClaim(id, approved|rejected, reason?)`: decision exclusiva del autor del reporte.
- `cancelPetAlertCommunityClaim(id)`: cancelacion exclusiva del reclamante mientras esta pendiente.

Ninguna operacion cambia `pets.household_id`, custodia o propiedad. No existe lectura publica de claims.

## Moderacion

- `reportPetAlertContent(target, reason)`
- `listPetAlertModerationQueue(filters)` admin
- `moderatePetAlertContent(target, action, reason)` admin
- `getPetAlertAuditHistory(target)` autorizado

Slice 6 implementa `reportPetAlertContent`, `listPetAlertModerationQueue`, `moderatePetAlertContent` y `listPetAlertModerationHistory`. El reporte exige sesion; cola, historial completo y decision exigen rol global `admin`. Las acciones `flag`, `restore`, `close`, `reject_claim` y `dismiss` estan restringidas por tipo de objetivo y requieren justificacion.

## Slice 7A fotos comunitarias

- `uploadPetAlertCommunityPhoto` recibe reporte, nombre, MIME, bytes y orden `0..2`.
- Solo acepta JPG, PNG o WebP de hasta 10 MB y exige que la sesion administre el reporte.
- Las consultas publicas y propias adjuntan `photoUrls` firmadas y temporales.
- Un fallo de media no duplica ni invalida el reporte textual ya creado.

## Contratos de error

- `PET_ALERT_UNAUTHORIZED`
- `PET_ALERT_PET_NOT_ELIGIBLE`
- `PET_ALERT_ALREADY_ACTIVE`
- `PET_ALERT_NOT_ACTIVE`
- `PET_ALERT_NOT_FOUND`
- `PET_ALERT_CONTACT_CONSENT_REQUIRED`
- `PET_ALERT_INVALID_LOCATION`
- `PET_ALERT_CLAIM_ALREADY_ACTIVE`
- `PET_ALERT_RATE_LIMITED`
- `PET_ALERT_CONTENT_FLAGGED`
- `PET_ALERT_MODERATION_ALREADY_OPEN`
- `PET_ALERT_MODERATION_ALREADY_REVIEWED`
- `PET_ALERT_MODERATION_REASON_REQUIRED`

## RLS propuesta

### Alertas owner

- Crear/editar/cerrar: miembro autorizado del household.
- Leer privado: miembros autorizados y admin.
- Leer publico: solo RPC para estados publicados.

### Avistamientos

- Crear: RPC publico solo si alerta activa.
- Leer: owner autorizado, reportante autenticado sobre su fila y admin.
- Actualizar estado: owner autorizado o admin.

### Reportes comunitarios

- Crear: RPC, con usuario o token anonimo.
- Editar/cerrar: autor autenticado, token de gestion valido o admin.
- Leer publico: RPC sanitizada para reportes visibles.

### Claims

- Crear/ver propio: usuario autenticado.
- Ver expediente completo/revisar: admin; reportante recibe solo estado/contacto autorizado.
- Sin lectura publica y sin updates directos.

### Historial/media

- Sin insercion directa de cliente.
- Lectura segun acceso al caso y visibilidad del medio.

## Pruebas contractuales requeridas

- usuario ajeno no crea alerta sobre otra mascota;
- miembro read-only no publica;
- segunda alerta activa falla atomicamente;
- anonimo nunca lee contacto/coordenadas;
- owner recibe solo avistamientos de su alerta;
- claimant no obtiene identidad del reportante;
- claim aceptado no cambia `pets.household_id`;
- `flagged` desaparece de lectura publica;
- reintentos no duplican mutaciones.
# Slice 7B - Directorio publico

`list_public_pet_alert_directory(filter_view, filter_query, filter_city, filter_species, result_limit, result_offset)` devuelve una pagina sanitizada de eventos publicos PET ALERT.

- `filter_view`: `lost`, `seen` o `found`.
- Busqueda: nombre publico, especie, raza, ciudad, region y resumen publico.
- Salida: tipo de evento, slug/ruta publica, estado agrupado, titulo, especie/raza, zona general, fechas publicas, resumen y total paginado.
- No devuelve IDs internos, ownership, usuario, contacto, coordenadas ni datos privados.

El API client expone `listPublicPetAlertDirectory` y firma temporalmente la primera foto de reportes comunitarios cuando existe.

`list_public_pet_alert_community_media(target_report_slugs)` reemplaza la lectura publica directa de metadata. Solo devuelve referencias de storage para reportes compartibles y vigentes; el cliente genera URLs firmadas temporales.

`list_public_pet_alert_lost_pet_media(target_alert_slugs)` proyecta exclusivamente el avatar del perfil asociado a una alerta pública válida. El API client firma temporalmente la imagen y la incorpora en la ficha y el directorio.
# PET ALERT MAP-2

Las ubicaciones se escriben despues de crear el evento mediante RPC dedicadas,
evitando cambiar las firmas historicas:

- `set_pet_alert_lost_pet_location`
- `set_pet_alert_lost_pet_sighting_location`
- `set_pet_alert_community_sighting_location`

Entrada: ID privado autorizado, latitud/longitud confirmadas, precision opcional,
fuente `device | map | search`, fecha de captura y preferencia de visibilidad.
La respuesta autenticada devuelve la ubicacion privada del propio evento y su
metadata; la coordenada generalizada no puede ser elegida por el cliente.

`list_public_pet_alert_map_points` acepta vista `lost | seen | found`, texto,
ciudad, especie, limites geograficos opcionales y un maximo efectivo de 500.
Devuelve tipo, slug/ruta publica, estado, titulo, especie, ciudad, fecha y
`public_latitude/public_longitude`. No devuelve IDs, coordenadas privadas,
precision, fuente, contacto, household ni identidad del reportante.

# PET ALERT MAP-4

El `payload` multipart privado de `pet-alert-external-report` admite `location`
opcional con `latitude`, `longitude`, `accuracyMeters`, `capturedAt` y fuente
`device`. La Edge Function valida el objeto despues de OTP/Turnstile y lo envia
a `set_pet_alert_lost_pet_location` usando `service_role`.

Las respuestas de la funcion no contienen coordenadas. Una captura invalida o
obsoleta se rechaza; omitirla conserva el contrato anterior. No se modifican las
RPC de creacion ni las proyecciones publicas.
