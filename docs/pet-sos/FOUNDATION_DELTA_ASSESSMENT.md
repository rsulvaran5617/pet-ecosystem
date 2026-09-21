# Foundation Delta Assessment: SOS comunitario e incorporacion progresiva

2026-09-20. Complementa, no sustituye, [el plan SOS](README.md).
Baseline inspeccionado: `75cc669` y cambios ajenos preservados en el working tree.
Requerimiento: ampliacion comunitaria recibida el 20 de septiembre.
Esta entrega es revision arquitectonica, decisiones incrementales y pruebas de
caracterizacion. NO implementa conversion, RescueCase ni nuevas autorizaciones.

## Resumen y puerta de avance

SOS es un servicio comunitario abierto. Pet Ecosystem es el ecosistema permanente
al que una persona puede incorporarse voluntariamente. Separacion de experiencia
y capacidades, no otra base de usuarios, backend, app obligatoria ni dominio SQL.
Principio: **HELP FIRST - ONBOARD LATER**. Leer/compartir no exige cuenta; escribir
puede exigir una verificacion proporcionada al riesgo, nunca completar un hogar,
expediente, direccion o medio de pago para ayudar.

Se conservan Foundation-1A, 1B, 1C.1 y 1C.2. Las migraciones de seguridad,
transiciones y feed ya aplicadas no se reescriben. Foundation-1C.3 estaba en
investigacion de saneamiento de medios, NO implementada ni desplegada.

No se identifica un ARCHITECTURAL BLOCKER que exija reconstruir identidad, pets
o SOS. SI hay refactors y bloqueos funcionales antes de declarar listas las
historias externas: gestion privada, vinculacion a Pet, identidad ligera y
transicion de resguardo. No habilitar la fase Lost/Found ampliada hasta resolver
esas puertas y la privacidad de medios. Un campo reservado no es un flujo listo.

## 1. Diez respuestas verificadas

| Pregunta | Evidencia actual | Clasificacion / delta minimo |
| --- | --- | --- |
| 1. Alerta con pet_id NULL | `20260826100000...external_owner_reports.sql` elimina NOT NULL de pet_id, household_id y created_by_user_id; rama external_owner valida. DTO PetAlertLostPet tambien nullable. | NO CHANGE para existencia independiente |
| 2. Crear sin ser Owner | Edge `pet-alert-external-report` verifica correo, crea pending_review y media sin auth user ni hogar. Publicacion requiere moderacion. Reporte comunitario pide sesion, no rol Owner. | NO CHANGE para alta externa; MINOR CHANGE en entrada UX comunitaria |
| 3. RLS exige hogar/pet | SELECT privado de alertas usa can_view_household o admin; can_manage_pet_alert_lost_pet solo can_edit_household. No cubre reportante externo vinculado. Publico usa DTO y alta externa backend. | REFACTOR REQUIRED para gestion propia externa, sin abrir SELECT anon |
| 4. API requiere pet_id | create_pet_alert_lost_pet y CreatePetAlertLostPetInput son especificamente de mascota registrada. create_external_pet_alert_report no lo necesita. Feed SOS no requiere pet_id. | NO CHANGE: conservar contratos diferenciados por operacion, no hacer nullable toda la API |
| 5. Vincular externa a Pet sin recrear | source_check exige pet_id/household_id/created_by_user_id NULL para external_owner. No hay RPC de vinculacion. | REFACTOR REQUIRED: origen inmutable y asociacion opcional, RPC auditada; preservar id/slug |
| 6. Identidad SOS evoluciona a Owner | external_reporters.linked_user_id existe; challenge link_account esta reservado, pero consume solo admite publish. Edge emite managementToken sin endpoint consumidor/recovery localizado. | REFACTOR REQUIRED: reclamar gestion con prueba reciente y vincular a auth.users, no crear external_users |
| 7. Owner + Protector simultaneos | user_roles unique(user_id,role), admite pet_owner/protective_family; un rol activo es contexto UX. Hogares owner/protective separados. | NO CHANGE en identidad/multirrol; no confundir rol con membresia aprobada |
| 8. Organizacion y RescueCase | hogares protective + miembros/permisos + perfiles de aprobacion reutilizables. No hay RescueCase SOS implementado. | MINOR CHANGE de arquitectura extensible; implementacion FUTURE / POST-MVP |
| 9. Sightings exigen perfil completo | RPC comunitaria exige auth.uid; sighting vinculado usa slug de alerta, incluso externa. No consulta pet, rol ni perfil completo. Web envia a /app para login. | MINOR CHANGE en UX/auth contextual; antiabuso servidor necesita verificacion adicional |
| 10. Decisiones que dificultan ampliacion | source_check exclusivo, can_manage basado solo en hogar, bootstrap SQL/cliente con fallback pet_owner, ausencia de consumo del token y de accion resguardada. | REFACTOR REQUIRED acotado; no borrar restricciones antes de tener reemplazo probado |

NO CHANGE significa reutilizable, no certificado en todas las superficies.
MINOR CHANGE conserva entidades y modifica un contrato/experiencia acotado.
REFACTOR REQUIRED implica coordinacion SQL/API/UI y rollout compatible.
ARCHITECTURAL BLOCKER significaria no poder preservar continuidad sin reemplazar
un fundamento. Si aparece en implementacion, detener el slice dependiente y
actualizar este analisis antes de continuar.

### Fuentes de codigo

- Migraciones `20260823110000`, `20260823153000`, `20260826100000`:
  alertas, sightings, fuente externa, helpers y RLS.
- `supabase/functions/pet-alert-external-report/index.ts`: requestCode,
  submitReport, emision de token; dispatch solo JSON/multipart para alta.
- `packages/types/src/pet-alert.ts`, `packages/api-client/src/pet-alert.ts`:
  contrato registrado y DTO nullable; `pet-sos.ts`: feed discriminado existente.
- `20260725103000_core_protective_family_role.sql` y
  `packages/api-client/src/core.ts`: multirrol y fallback pet_owner en ambos lados.
- `PublicLostPetSightingPage.tsx`, `PublicCommunitySightingForm.tsx` en web:
  publicacion autenticada y login general, no recorrido SOS ligero terminado.
- `20260629110000_household_type_owner_protective.sql`, tipos households y
  modulo Foster: separacion de hogar familiar y organizacion protectora.

Revision del repositorio; no nueva introspeccion remota ni acceso a fotos/contactos
reales en esta entrega. ACL desplegadas deben revalidarse antes de ampliar anon.

## 2. SosAnimal sin tabla paralela

SosAnimal es el snapshot descriptivo del animal en un evento SOS, no una identidad
biologica verificada ni un duplicado obligatorio de pets. Hoy se representa con
pet_name/pet_species/pet_breed y demas campos de alerta externa, o animal_species,
apparent_breed y caracteristicas del reporte comunitario.

- Conservar tablas, IDs, slugs, fotos, sightings y timelines actuales.
- Referencia estable del evento: tipo + id interno; publico usa tipo + slug.
- No crear sos_animals solo para renombrar datos. No fusionar reportes por parecido.
- La alerta existe antes, durante y despues de una vinculacion opcional a Pet.
- Copiar datos seleccionados al crear Pet no borra el snapshot historico; una
  foto/descripccion posterior del expediente no debe reescribir evidencia anterior.
- FOUND tiene dos significados hoy: found en alerta = reunificada;
  sheltered_by_reporter = resguardada sin propietario confirmado. No renombrar
  enums ni presentar ambos como adopcion disponible. Falta accion de resguardo.

## 3. Identidad progresiva, sin segundo sistema de cuentas

| Participante | Entrada y alcance propuesto |
| --- | --- |
| Visitor | Lectura publica aproximada y compartir, sin sesion |
| Community reporter | Autenticacion ligera Supabase Auth para escribir; sin household, pet ni rol comercial |
| External pet owner | Mantener alta verificada actual sin cuenta; gestion limitada a su alerta y recuperacion segura |
| Rescuer independiente | Misma identidad Auth que cualquier colaborador; no obtiene lectura privada por llamarse rescatista |
| Protector / NGO member | Identidad Auth + membresia vigente en hogar protective aprobado; acciones de su caso, no datos de todo SOS |
| Owner / Provider | Capacidades actuales mas colaboracion comunitaria; no privilegio de rescate universal |

Decision: una cuenta persistente es auth.users + profiles. El registro existente
pet_alert_external_reporters se conserva como contacto/consentimiento previo a
cuenta, no se convierte en otro login ni adquiere roles. Su linked_user_id es el
puente reservado, no prueba de permiso por si solo. No migrar personas a Auth ni
enviar invitaciones masivas sin accion explicita.

Entrada Auth ligera propuesta: verificar correo mediante el sistema existente,
crear perfil minimo y volver a la tarea SOS pendiente. No agregar rol `rescuer`
global ni obligar a elegir Owner/Provider/Protector. Antes de activarla, ajustar
bootstrap SQL y cliente para soportar **cero roles de producto** en esta entrada;
los registros ordinarios conservan su seleccion explicita y comportamiento.
Contexto de entrada no concede permisos ni se usa para autorizar admin/ONG.

No exigir segundo registro a una cuenta existente. Resolver login/recuperacion
sin enumerar correos. Retorno solo a rutas SOS permitidas del mismo origen;
no poner tokens privados ni formularios sensibles en query params/analytics.
No conectar automaticamente por coincidencia de email: exigir sesion validada,
verificacion reciente del canal externo y consentimiento por alerta.

## 4. Capabilities por recurso

Son decisiones del backend a partir de datos existentes, no un nuevo motor RBAC
ni permisos que el cliente pueda afirmar con actor_type/organization_id.

| Capability conceptual | Verificacion efectiva requerida |
| --- | --- |
| READ_PUBLIC_SOS / SHARE | Elegibilidad, moderacion, visibilidad, vigencia y DTO publico |
| CREATE_SOS_ALERT | can_edit_pet para mascota registrada; desafio verificado/rate limit en circuito externo |
| REPORT_SIGHTING | Sesion ligera y limites; alerta elegible; sin permiso de editarla |
| MANAGE_OWN_ALERT | Rama registrada con permisos existentes; externa con grant acotado verificado, no rol Owner |
| VIEW_RESCUE_CASE | FUTURE: membresia/asignacion al caso y organizacion vigente |
| MANAGE_RESCUE_CASE / ASSIGN_RESCUER | FUTURE: permiso operativo explicito, no autodeclaracion de NGO |
| TRANSFER_TO_PROTECTOR | FUTURE: evaluacion y aceptacion trazadas, reutilizando custodia Foster |

Para operaciones externas no exponer service_role al navegador. Hash de token,
TTL, revocacion, rotacion, rate limits y reautenticacion de acciones criticas.
El token no concede acceso al expediente, al hogar ni a otras alertas del correo.
Una ONG recibe ubicacion precisa solo mediante autorizacion explicita por caso,
con alcance/expiracion y registro; no domicilio, contactos o salud por defecto.

## 5. SOS -> Owner: contrato de continuidad

1. Publicar mediante circuito externo, verificar y moderar como hoy. No anunciar
   publicacion inmediata si esta pending_review. Conservar acceso SOS sin cuenta.
2. Completar gestion privada: recuperar acceso, leer sightings autorizados,
   actualizar informacion permitida, retirar/cerrar y confirmar reunificacion.
   No cambiar moderacion ni convertir un cierre en exito de recuperacion.
3. Ofrecer incorporacion opcional y descartable despues de entregar valor,
   preferentemente tras reunificacion. Nunca interrumpir reporte o LO VI.
4. Autenticar/crear identidad comun y verificar control reciente del reporte.
   Vincular cuenta no activa automaticamente Owner ni vincula todas sus alertas.
5. Si acepta Owner, crear/seleccionar hogar owner autorizado y crear/seleccionar
   Pet con confirmacion de datos. No duplicar una mascota que ya tenga registrada.
6. Vincular en transaccion idempotente sin recrear alerta, slug ni hijos.
   Conservar source_type=external_owner y external_reporter_id como procedencia.
   Actor que vincula se registra en auditoria, no se falsifica autor historico.

Cambio SQL previsto: permitir pareja pet_id/household_id opcional en rama externa,
sin relajar la rama registered_pet. FK/validacion de pertenencia y autorizacion
real al vincular; bloqueo y conflicto si ya vinculada a otra mascota. Misma clave
idempotente devuelve el mismo resultado. Indice de una alerta activa por Pet
sigue vigente: conflicto explicito si ya existe otra, nunca cerrar/fusionar a ciegas.

Este cambio NO se implementa aislado. Auditar helpers, RLS, listados por mascota,
media/avatares y transferencia posterior: un enlace no debe dar acceso al hogar
ni a un nuevo custodio a contactos/evidencia privada del reportante. Mantener
autorizacion de alerta separada de la referencia descriptiva a Pet. Revocar
acceso de gestion segun contrato, no eliminar el historial al desasociar cuenta.
El contrato de grants por alerta y revocacion se concreta en el slice de gestion.

## 6. RescueCase y continuidad con Foster

FUTURE / POST-MVP. Reutilizar households de tipo protective, household_members y
protective_household_profiles. No providers.organizations ni otra ONG paralela.
Una persona puede pertenecer a varios hogares; cada caso mantiene un scope unico.
Inicialmente la organizacion operativa necesita estar identificada/aprobada;
un rescatista externo puede colaborar sin crear organizacion y no pierde Auth
al incorporarse a una Familia Protectora.

RescueCase futuro se relaciona a una alerta existente mediante FK comprobable
(lost_pet_alert_id o community_sighting_id, exactamente una), household protector,
asignaciones, historial y notas privadas. UUID/timestamps, RLS y auditoria.
Un mismo reporte puede recibir operaciones de organizaciones distintas; nunca
permitir que una vea notas de otra. Restriccion propuesta: un caso activo por
organizacion/evento para evitar duplicados, no monopolio de la alerta publica.

Estados propuestos, no enums ni RPCs publicados:
WATCHING -> SEARCHING -> RESCUE_PLANNED -> RESCUE_IN_PROGRESS -> ANIMAL_SECURED;
desde ANIMAL_SECURED -> OWNER_LOCATED o evaluacion -> TRANSFERRED_TO_PROTECTOR;
CLOSED con motivo desde estados permitidos. Definir transiciones/cancelacion y
evidencia al implementar. No hay sincronizacion automatica con LOST/REUNITED.
ANIMAL_SECURED no demuestra propiedad, abandono, custodia legal ni adoptabilidad.

Admin organizacional y permisos actuales bastan como punto de partida. Coordinator,
rescuer, volunteer y viewer seran permisos/asignaciones operativas si se requieren,
no cinco nuevos roles globales ahora. Si una organizacion utiliza SOS antes de
activar acogida, conservar su mismo household protective/miembros y activar
capacidades aprobadas despues, sin convertir un hogar owner en protective.

Mapa operativo futuro: alertas y sightings permitidos, casos propios/asignados,
antiguedad, zona de busqueda y prioridades justificadas. Feed privado distinto
del DTO publico; no extender el feed publico con notas o coordenadas precisas.

Rescate -> acogida: evaluacion documentada, busqueda de propietario y autorizacion
de custodia segun politica aplicable; aceptacion expresa por protectora. Crear o
vincular Pet una sola vez, asociar caso e historial permitido; expediente privado,
publicacion y solicitudes siguen flujos Foster. No usar un plazo arbitrario para
dar por abandonado un animal. Decision legal/operativa pendiente antes del rollout.

## 7. Avistamientos y confianza

Conservar dos conceptos, no tablas por actor: avistamiento ligado a alerta y
reporte comunitario independiente. Owner, visitante autenticado y rescatista
usan el mismo contrato para cada concepto. Actor autenticado se deriva de JWT;
organizacion declarada requiere comprobar membresia vigente por operacion.

Propuesta futura de procedencia: actor_user_id nullable en circuito verificado
sin cuenta, referencia privada al reportante cuando corresponda y organizacion
opcional. No publicar esos IDs ni reatribuir retroactivamente autorias al convertir.
No crear un enum excluyente de identidades: una persona puede combinar capacidades.

Confianza separada del estado del caso: reported/unverified, owner_confirmed,
organization_confirmed con actor, fecha, alcance y evidencia autorizada. Una
confirmacion de organizacion es una atribucion, no un hecho oficial ni prueba
automatica de propiedad. El badge no se deduce de email verificado o rol activo.
No implementar reputacion, matching o inferencia automatica en esta etapa.

## 8. Funnel privado y opcional

Diseno de eventos, no instrumentacion implementada: sos_opened, auth_completed,
external_alert_submitted, alert_published, sighting_submitted, reunited_confirmed,
owner_activation_completed. FUTURE: rescue_case_followed, organization_joined,
protector_activated, animal_secured, foster_intake_accepted, adoption_completed.

Medir por cohortes y denominadores explicitos: reportes externos/total creados,
reportantes externos que aceptaron vinculacion/verificados elegibles; conversion
Owner como activacion consentida, NO rol pet_owner asignado por fallback. No
contar cerradas como reunificadas ni secured como adoptadas. Reintentos deduplicados.
No seguir visitantes entre dispositivos sin consentimiento; conversion anonima
no atribuible se informa como desconocida, no se inventa identidad.

Solo propiedades enumeradas y contadores agregados; sin email, contacto, tokens,
campos libres, coordenadas, URLs firmadas ni IDs publicos vinculados a personas.
Definir consentimiento, retencion y accesos antes de elegir proveedor/event store.
Captacion comercial no condiciona ayuda ni permisos de emergencia.

## 9. Orden incremental y alcance

| Slice | Entrega / puerta |
| --- | --- |
| Foundation delta (esta entrega) | Decisiones y caracterizacion; sin cambios productivos ni permisos nuevos |
| Foundation-1C.3 | Continuar medios saneados para registrada, externa y comunitaria; autorizar por evento, no pet_id obligatorio |
| Foundation-1D.1 | Gestion/recuperacion externa por alerta, identidad comun vinculable; pruebas token/correo/concurrencia/RLS antes de publicar |
| Foundation-1D.2 | Auth SOS ligero con retorno contextual; sin fallback Owner para esa entrada, sin cambiar registro ordinario |
| Foundation-1D.3 | Conversion opcional Owner + enlace Pet, source_check y autorizacion coordinados; no perder historiales |
| Lost-2 / Found-3 / Sightings-4 | Recorridos web/mobile externos y registrados; estado resguardada, consentimientos y antiabuso, no depender de alta Owner |
| Community-5 | Suscripciones/push ya planificados; no bloquean uso basico externo |
| Protector-6 | Diseno detallado/primer caso privado si se aprueba alcance; posterior puente a acogida, sin adopcion automatica |
| FUTURE / POST-MVP | Equipos avanzados, asignaciones, mapa operacional, reputacion, automatizacion y funnel operacional completo |

Foundation-1D es una adicion al plan, no renumeracion ni afirmacion de implementacion.
No instalar cron de reservas, cambiar clinical access, booking ni pagos por SOS.
Se pospone el desarrollo del resto de fases hasta cerrar las puertas pertinentes.

## 10. Historias y pruebas de salida

| Historia | Que existe | Que falta antes de llamarla completa |
| --- | --- | --- |
| A: propietario externo | Alta sin pet/hogar, verificacion, moderacion y ficha publica | Gestion/recovery, reunificacion externa y conversion voluntaria trazada |
| B: ciudadano que vio mascota | RPC con sesion minima, sin perfil/hogar; avistamiento admite alerta externa | Login SOS contextual, media saneada y antiabuso comprobado; no onboarding completo |
| C: rescatista ONG | Lectura publica y colaboracion como usuario | Caso privado, permisos/asignaciones, estados de rescate y puente de custodia |
| D: ONG adopta ecosistema | Hogar protective, miembros, Foster/custodia/adopcion existentes | Activacion progresiva conservando caso/historial; sin automatismo de adopcion |

Regresiones obligatorias de futuros slices:
- Externo sin Pet puede publicar bajo moderacion, administrar y recuperar acceso.
- Token revocado/vencido/reutilizado, correo ajeno o JWT de tercero no dan control.
- Vinculacion conserva IDs/slug, fotos, sightings, timeline, procedencia y auditoria;
  reintento no duplica Pet ni alerta; conflicto concurrente no deja enlaces parciales.
- Asociar Pet no expone historial privado a miembros ajenos o futuros custodios.
- Cuenta SOS no crea Owner/hogar implicitamente; cuenta multirrol sigue funcionando.
- ONG A no ve notas/casos de B ni coordenadas por autodeclarar rol; revocacion efectiva.
- Rescate no cambia propiedad ni inicia publicacion de adopcion por si solo.
- Usuario puede rechazar conversion y seguir usando SOS; regresar conserva tarea.

Prueba de caracterizacion agregada:
`node --test supabase/tests/pet-sos-participation-baseline.test.mjs`.
Ejecuta DDL/RPC reales seleccionadas en PGlite con FK/auth/auditoria simplificadas;
nueve escenarios (incluidos tres KNOWN GAP), todos correctos. Esos PASS reproducen
restricciones existentes, NO demuestran que las brechas esten corregidas.
Requiere PGlite del harness local existente o PGLITE_MODULE_PATH. Sin dependencia
nueva en producto. No ejecuta Edge, Auth real, RLS/grants completos, PostGIS ni
concurrencia; no es certificacion de produccion ni de las cuatro historias.

Validacion adicional: ESLint del test correcto; ocho tests existentes del cliente
SOS correctos; git diff --check correcto (avisos de conversion LF/CRLF del entorno).
Sin build mobile/web ni typecheck de producto: solo documentacion y runner JS,
sin cambios a runtime o contratos ejecutables. Sin migracion, commit ni push nuevos.
