# Foundation-1B: contratos, permisos y activacion

2026-09-20. Implementacion local de base compartida; no activacion de SOS.
Foundation-1A ya esta aplicada. Este slice no cambia RPCs, RLS, tablas ni pantallas.

## Entrega de codigo

- `packages/types/src/pet-sos.ts`: evento publico discriminado por tipo, sin
  sustituir los DTO Pet Alert existentes; flags y estado de presentacion.
- `packages/config/src/pet-sos.ts`: clasificacion de estados y resolver de flags
  puro, sin lectura implicita de variables, sesion o ubicacion.
- Los exports permiten reutilizacion mobile/web. No hay endpoint nuevo ni cliente
  que finja que un feed SOS ya existe. Integracion en pantallas: Lost-2A.
- Config test deja de ser un mensaje vacio: ejecuta pruebas SOS con node:test y
  el compilador TypeScript existente; no exige strip-types/Node 22. La regresion
  de reservas tambien se ejecuto con su runner existente. No nueva dependencia.

## Matriz de permisos

Esta matriz describe contratos actuales inspeccionados en SQL. No es un permiso
cliente ni resultado de prueba RLS integral. El backend debe comprobar cada llamada.

| Operacion | Actor y alcance | Contrato existente |
| --- | --- | --- |
| Ver ficha/directorio/mapa | Publico; solo DTO elegible, compartir y vigencia | get_public_*, list_public_pet_alert_* |
| Crear alerta registrada | Sesion y can_edit_pet; hogar de esa mascota | create_pet_alert_lost_pet |
| Consultar propias de mascota/hogar | Permiso de lectura del recurso | list_pet_alert_lost_pets_for_pet / list_active_pet_alert_lost_pets_for_household |
| Editar/publicar/cerrar/recuperar | can_manage_pet_alert_lost_pet -> can_edit_household | update/publish/close/mark_* |
| Reportar LO VI existente | Sesion; alerta activa elegible por slug | create_pet_alert_lost_pet_sighting |
| Leer sightings privados/revisar estado | Gestor autorizado de alerta; no cualquier provider | list_pet_alert_lost_pet_sightings / update_pet_alert_lost_pet_sighting_status |
| Ubicacion de sighting vinculado | Reportante, gestor de alerta o servicio confiable | set_pet_alert_lost_pet_sighting_location |
| Crear reporte comunitario | Sesion; identidad tomada de auth.uid | create_pet_alert_community_sighting |
| Ubicacion/cierre de reporte | Reportante; servicio solo donde contrato lo permite | set_pet_alert_community_sighting_location / close_pet_alert_community_sighting |
| Reclamar coincidencia | Sesion, contacto consentido, no propio reporte | create_pet_alert_community_claim |
| Revisar reclamo | Reportante del reporte, no reclamante | review_pet_alert_community_claim |
| Cancelar reclamo | Autor del reclamo pendiente | cancel_pet_alert_community_claim |
| Reportante externo | Verificacion/limitacion mediada por Edge Function | pet-alert-external-report; sin setters anon directos |
| Moderacion | is_platform_admin y motivo; no rol comercial | moderate_pet_alert_content / moderate_pet_alert_geographic_location |
| Derivar a protectora | No hay permiso SOS automatico | Fase 6, consentimiento/custodia pendientes |

Miembro view no hereda edit. Elegir rol Protector/Provider no confiere control de
una alerta ajena. Tener URL/UUID no autoriza escritura. Service-role no es un rol
de usuario ni puede enviarse en payload para eludir autorizacion.

## Matriz de estados observados

Fuentes: migraciones slice1a, slice4, slice5, slice6 y slice8b. No renombrar enums
publicados. Estas son precondiciones adicionales al permiso y validacion de entrada.

| Recurso / accion | Origen | Destino / efecto |
| --- | --- | --- |
| Registrada / crear | Nueva | draft o active segun publish |
| Registrada / editar | draft, active, sighting_received, possible_match | Conserva estado |
| Registrada / publicar | draft | active; historial y fecha |
| Registrada / recuperar | active, sighting_received, possible_match, flagged | found; motivo de recuperacion |
| Registrada / cerrar | draft, active, sighting_received, possible_match, flagged | closed; cierre no implica recuperacion |
| Alerta / nuevo sighting | active, sighting_received, possible_match | active pasa a sighting_received; las demas conservan estado |
| Sighting / revisar | Cualquier estado de sighting actual | new, reviewed, possible_lead, discarded o flagged |
| Sighting / possible_lead | Alerta active o sighting_received | Alerta pasa a possible_match |
| Comunidad / crear | Nuevo | sighting_open |
| Comunidad / cerrar | sighting_open, sheltered_by_reporter, possible_owner_claim, owner_verified | reunited si motivo reunificacion; closed en otro caso |
| Comunidad / reclamar | sighting_open, sheltered_by_reporter, possible_owner_claim | Claim pending; reporte pasa a possible_owner_claim |
| Claim / aprobar | pending | approved; reporte owner_verified, contacto autorizado privado |
| Claim / rechazar | pending | rejected; reporte possible_owner_claim si quedan pendientes, si no sighting_open |
| Claim / cancelar | pending | cancelled; reporte possible_owner_claim vuelve a sighting_open si no quedan pendientes |
| Externa / crear verificada | Nueva, backend confiable | pending_review |
| Externa / aprobar-rechazar | pending_review, admin | active o rejected |
| Moderacion / flag | Caso open, alerta o comunidad | flagged; motivo obligatorio |
| Moderacion / restore | Caso open, recurso flagged | Estado previo guardado en caso |
| Moderacion / close | Caso open, alerta o comunidad | closed |
| Moderacion / reject_claim | Caso open, claim pending | rejected |
| Moderacion / dismiss | Caso open | Cierra caso sin cambiar recurso |

No se encontro en estos contratos una accion comunitaria de usuario para pasar
de sighting_open a sheltered_by_reporter. Existe el estado, no el flujo completo.
pending_verification/paused/withdrawn/expired en tipos no demuestran una accion
publicada o un scheduler. No implementar botones por la sola existencia de un enum.

## Brechas de transicion a resolver antes de conectar SOS

Actualizacion: Foundation-1C.1 corrige revision/restauracion;
ver [alcance y limitaciones](FOUNDATION_1C.md). Migracion aplicada remoto el 2026-09-20.

1. review_pet_alert_community_claim valida claim pending pero no restringe estado
   actual del reporte al actualizarlo. Puede sobrescribir un cierre/moderacion
   ocurrido mientras habia un reclamo pendiente. Requiere prueba concurrente y
   guard transaccional en slice de integridad; NO corregido en este bloque.
2. El regreso a sighting_open tras rechazo/cancelacion no conserva si antes habia
   resguardo. No representar esto como "ya no esta bajo cuidado".
3. Revisar un sighting no exige que su alerta siga activa. No habilitar LO VI
   nuevo sobre cerradas y no confundir revision historica con reapertura.
4. Moderacion guarda estado previo del caso; restaurar un caso antiguo necesita
   comprobar historial/version del recurso antes de exponer mas acciones.

Estas brechas impiden declarar la maquina de estados global completamente
verificada. No introducir una funcion canTransition en cliente que prometa
seguridad ni duplique parcialmente reglas SQL. Foundation-1C debe empezar por
integridad de transiciones antes de ampliar consultas/mapa.

## Semantica publica

`getPetSosDisplayState` es SOLO presentacion sobre DTO tipado, no sanitizador.
El backend sigue decidiendo publicacion, fechas y permisos; no llamar al helper
para decidir si un registro privado puede compartirse.

- found (alerta owner) y reunited (comunidad): recuperada.
- sheltered_by_reporter: resguardada, NO recuperada.
- owner_verified: posible coincidencia, NO entrega ni propiedad legal acreditada.
- sighting_received: extraviada con avistamientos, NO recuperacion.
- closed/expired/withdrawn: cerrada; no se incluyen como exito en analytics.
- flagged/pending/draft/paused/rejected: no publicado en SOS.

PetSosPublicMapEvent vincula tipo de evento a su enum de estado; reutiliza campos
publicos del DTO de mapa. Los campos privados no forman parte del contrato.
TypeScript no elimina propiedades de una respuesta: la proyeccion SQL/DTO sigue
siendo obligatoria. Bounds/radio/cursor y su validacion se implementan en 1C,
no se presume que list_public_pet_alert_map_points ya los garantice.

## Activacion gradual

`resolvePetSosFeatureFlags({map, sightings, nearbyNotifications})` recibe cadenas
explicitas. Solo `"true"` habilita; ausencia, espacios, valores desconocidos o
`"1"` no habilitan. sightings y nearbyNotifications requieren map habilitado y
su propia bandera. No hay activacion automatica por NODE_ENV. Resultado inmutable.

Todavia no hay adaptadores de variables ni consumidores en apps porque no existe
pantalla SOS nueva. No documentar variables de ambiente que aparenten activar una
funcionalidad inexistente. Lost-2A conectara la configuracion existente del build
al resolver y probara fallback a Pet Alert; mientras tanto flags no alteran nada.

Etapas: desarrollo -> QA -> beta por cohortes/regiones -> produccion. La seleccion
real de cohortes/regiones y kill-switch remoto requiere fuente confiable backend
antes de escrituras nuevas o suscripciones. Esta utilidad NO implementa rollout
remoto, autenticacion, RLS, derechos por region ni control de permisos.

## Verificacion y limites

Pruebas: defaults/valores invalidos, dependencias entre flags, inmutabilidad,
resguardo versus recuperacion, estado moderado/pendiente, cierre sin recuperacion
y clasificacion sin mutar DTO. Compilacion strict valida cobertura de cada enum.
Checks de tipos/lint/build compartidos y consumidores registrados al cierre.
No migracion, cambio de datos, commit, push, despliegue ni build APK/IPA en 1B.
No hay cambio visual para QA en dispositivos; E2E/RLS completo siguen pendientes.
