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
