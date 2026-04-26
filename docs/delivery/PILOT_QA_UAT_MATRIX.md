# PILOT_QA_UAT_MATRIX.md

## Objetivo
Convertir el cierre funcional del MVP en una matriz ejecutable de QA/UAT para decidir si la version queda lista para piloto controlado sobre `web + Android`.

## Estado base asumido
- el baseline actual queda con `QA/UAT final completada`
- el piloto controlado queda aprobado despues de ejecutar la matriz critica aplicable
- la captura real de pagos no forma parte de este cierre; el release queda `payment-ready`
- la smoke automatizada ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico
- la smoke automatizada documentada esta en `PASS`
- la UI principal fue localizada al espanol y esta incorporada en el baseline publicado `v0.1.0-mvp-baseline-es.1`
- la validacion fisica iOS sigue fuera por entorno Apple

## Estado operativo actual registrado

| Area | Estado | Alcance | Nota |
| --- | --- | --- | --- |
| Git / baseline | `PASS` | baseline localizado publicado en `6e984eb`; HEAD operativo publicado en `57767b7` | `v0.1.0-mvp-baseline-es.1` publicado en remoto; `v0.1.0-mvp-baseline.1` queda como tag previo en `ea573cd` |
| Smoke automatizada | `PASS` | typecheck, lint, builds, exports y smoke MVP documentada | no inventa nueva corrida; registra la evidencia ya documentada |
| `localization_es` | `PASS` | `web`, `mobile`, `admin` | incorporada al baseline publicado; no queda pendiente de commit ni tag |
| QA/UAT manual web | `PASS` | flujos web manuales ejecutados por el usuario | funciona correctamente segun validacion manual reportada |
| Android/mobile | `PASS` | `AND-01`, `AND-02`, `AND-03` | validaciones manuales Android ejecutadas; ya no existe bloqueo activo de entorno |

## Resultados manuales finales registrados

| ID | Canal | Estado | Nota |
| --- | --- | --- | --- |
| WEB manual | web | `PASS` | pruebas manuales web ejecutadas y funcionales correctamente |
| Admin/provider critico | admin/web | `PASS` | cubierto por smoke automatizada documentada y validaciones web aplicables |
| AND-01 | Android/mobile | `PASS` | core auth y sesion persistida ejecutado manualmente |
| AND-02 | Android/mobile | `PASS` | marketplace y bookings ejecutado manualmente |
| AND-03 | Android/mobile | `PASS` | messaging sobre booking ejecutado manualmente |

## Clasificacion de severidad
- `critica_salida`: debe pasar antes de recomendar piloto controlado
- `importante_no_bloqueante`: debe correrse y quedar con triage
- `externa_entorno`: depende de dispositivo, mail delivery, Apple Developer Team u otros factores externos
- `BLOCK` por entorno no equivale a `FAIL` funcional, pero impediria aprobar piloto controlado si afectara casos `critica_salida`; no existe bloqueo activo Android en este cierre

## Criterios de salida
- todas las pruebas `critica_salida` de `web`, `provider`, `admin` y `Android` deben quedar en `PASS`
- las pruebas `importante_no_bloqueante` deben tener resultado registrado y triage hecho
- las pruebas `externa_entorno` deben quedar marcadas como `pass` o `pendiente_externa`

## Matriz QA/UAT - Web y Provider

| ID | Severidad | Flujo | Precondicion | Resultado esperado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| WEB-01 | critica_salida | Core auth, profile, preferencias, direcciones, role switch | Usuario owner existente | Login OK, profile editable, preferencias persistidas, direcciones CRUD y cambio de rol estable | Captura o video corto |
| WEB-02 | critica_salida | Households invite cycle y permisos | Usuario A + Usuario B existentes | Create household, invite, reject, re-invite, accept y update permissions OK | Captura de members + permissions |
| WEB-03 | critica_salida | Pets base | Household existente | Crear mascota, editar perfil resumen y listar mascota OK | Captura de detalle mascota |
| WEB-04 | importante_no_bloqueante | Pet documents | Mascota existente | Subir documento basico y verlo listado | Captura de documento listado |
| WEB-05 | importante_no_bloqueante | Health + Reminders | Mascota existente | Vacunas, alergias, condiciones y reminder derivado visibles y editables | Captura dashboard + calendario |
| WEB-06 | critica_salida | Marketplace discovery publico | Provider aprobado y publico | Home, busqueda, filtros y perfil publico OK sin requerir sesion | Captura de search + provider detail |
| WEB-07 | critica_salida | Bookings owner-side | Household, pet y provider publicados | Preview, create booking, history, detail y cancel basic OK; metodo guardado opcional sin captura real | Captura preview + detail |
| PRO-01 | critica_salida | Provider incoming bookings | Booking `approval_required` existente para su organizacion | Provider ve la reserva, puede aprobar o rechazar y luego completar si corresponde | Captura cola provider + detalle |
| WEB-08 | critica_salida | Messaging desde booking | Booking existente | Thread visible, envio y lectura de mensajes OK | Captura thread |
| WEB-09 | critica_salida | Reviews desde booking completed | Booking `completed` | Review unica creada por booker y visible donde corresponde | Captura review |
| WEB-10 | critica_salida | Support desde booking | Booking existente | Crear caso, listar mis casos y ver detalle OK | Captura support case |

## Matriz QA/UAT - Android / Mobile

| ID | Severidad | Flujo | Precondicion | Resultado esperado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| AND-01 | critica_salida | Core auth y sesion persistida | Usuario owner existente | Login OK, sesion persiste y role switch estable | Video corto |
| AND-02 | critica_salida | Marketplace + Bookings | Provider aprobado y publico | Search provider, abrir detalle, preview booking, crear booking y abrir detalle OK | Video corto |
| AND-03 | critica_salida | Messaging sobre booking | Booking existente | Inbox, detalle y reply visibles en Android | Video corto |
| AND-04 | importante_no_bloqueante | Households + Pets | Household existente | Ver hogares, mascota y resumen base sin errores de UI | Capturas |
| AND-05 | importante_no_bloqueante | Health + Reminders | Mascota existente | Ver dashboard de salud, calendario y reminders | Capturas |
| AND-06 | importante_no_bloqueante | Reviews + Support | Booking completed + support case | Ver review y detalle de soporte actualizados | Capturas |
| AND-07 | importante_no_bloqueante | Provider workspace mobile | Usuario con rol provider | Ver organizacion, estado, servicios, disponibilidad, documentos e incoming bookings | Capturas |
| AND-08 | externa_entorno | Picker de documentos de Pets | Dispositivo o emulador Android con file picker funcional | Seleccionar archivo real y completar upload | Video corto |
| AND-09 | externa_entorno | Recovery deep link | Email recovery disponible y build con scheme activo | Abrir link, entrar a recovery, cambiar password y volver a login | Video corto |

## Matriz QA/UAT - Admin

| ID | Severidad | Flujo | Precondicion | Resultado esperado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| ADM-01 | critica_salida | Pending providers list | Admin con rol provisionado | Lista de pendientes visible y estable | Captura listado |
| ADM-02 | critica_salida | Provider detail + approve | Provider pendiente con documentos | Abrir detalle y aprobar OK; provider pasa a visible en marketplace | Captura detail + search |
| ADM-03 | importante_no_bloqueante | Provider reject path | Provider pendiente separado | Rechazo OK; provider no aparece en marketplace | Captura reject |
| ADM-04 | critica_salida | Support triage | Support case existente | Listar casos, abrir detalle, cambiar estado y dejar resolucion | Captura support detail |

## Pendientes externos de entorno

| ID | Severidad | Flujo | Dependencia externa | Resultado esperado |
| --- | --- | --- | --- | --- |
| EXT-01 | externa_entorno | iOS physical validation | Apple Developer Team activo | Tap-through iOS fisico completado |
| EXT-02 | externa_entorno | Android picker fisico | Device/emulator con picker funcional | Upload manual validado |
| EXT-03 | externa_entorno | Mobile recovery real | Mail delivery + deep link + rate limits | Recovery E2E validado |

## Actores QA recomendados
- `QA_OWNER_A`
- `QA_MEMBER_B`
- `QA_PROVIDER_A`
- `QA_ADMIN_A`

## Variables de entorno sugeridas
- `QA_OWNER_EMAIL`
- `QA_OWNER_PASSWORD`
- `QA_MEMBER_EMAIL`
- `QA_MEMBER_PASSWORD`
- `QA_PROVIDER_EMAIL`
- `QA_PROVIDER_PASSWORD`
- `QA_ADMIN_EMAIL`
- `QA_ADMIN_PASSWORD`
- `SMOKE_ARTIFACT_DIR`

## Evidencia automatizada ya disponible
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm build`
- `corepack pnpm smoke:mvp`
- `corepack pnpm smoke:mvp:critical`
- `corepack pnpm smoke:mvp:admin`
- `corepack pnpm smoke:mvp:providers`
- `corepack pnpm smoke:mvp:health`
- `corepack pnpm smoke:mvp:reminders`

## Precondiciones operativas minimas
- backend Supabase enlazado y sin drift de migraciones
- variables QA cargadas para owner, member, provider y admin
- provider aprobado y publico disponible para discovery
- al menos un provider pendiente separado para probar `ADM-02` y `ADM-03` sin contaminar el mismo caso
- Android emulator o dispositivo usado para ejecutar `AND-01`, `AND-02` y `AND-03`
- carpeta de artefactos o evidencia definida para capturas y videos cortos
- idioma esperado de la experiencia: espanol como idioma principal; registrar cualquier texto visible en ingles que aparezca en flujos MVP

## Formalizacion minima de smoke
- `pnpm smoke:mvp`
- `pnpm smoke:mvp:critical`
- `pnpm smoke:mvp:admin`
- `pnpm smoke:mvp:providers`
- `pnpm smoke:mvp:health`
- `pnpm smoke:mvp:reminders`

## Orden recomendado de ejecucion manual
1. `ADM-01`
2. `ADM-02`
3. `WEB-01`
4. `WEB-02`
5. `WEB-03`
6. `WEB-05`
7. `WEB-06`
8. `WEB-07`
9. `PRO-01`
10. `WEB-08`
11. `WEB-09`
12. `WEB-10`
13. `ADM-04`
14. `AND-01`
15. `AND-02`
16. `AND-03`
17. `AND-04`
18. `AND-05`
19. `AND-06`
20. `AND-07`
21. `AND-08`
22. `AND-09`

## Decision operativa
- `listo para QA/UAT` si la matriz ya puede ejecutarse sobre el baseline
- `listo para piloto controlado` solo si toda la severidad `critica_salida` queda en `PASS`
- estado actual: baseline localizado publicado, smoke automatizada `PASS`, web manual `PASS`, Android/mobile `PASS`; QA/UAT final `completada`; piloto controlado `aprobado`

## Criterio exacto de cierre
- `QA/UAT final completado`:
  - toda la evidencia automatizada disponible registrada en verde
  - todos los casos `critica_salida` ejecutados manualmente
  - todos los casos `critica_salida` en `PASS`
  - los casos `importante_no_bloqueante` ejecutados o triageados con decision explicita
- `piloto controlado aprobado`:
  - `QA/UAT final completado`
  - baseline congelado en commit/tag
  - sin `FAIL` ni `BLOCK` en casos `critica_salida`
  - pendientes no bloqueantes aceptados de forma explicita
- `piloto controlado no aprobado`:
  - cualquier caso `critica_salida` en `FAIL` o `BLOCK`
  - ausencia de baseline versionado
  - falta de actores, entorno o evidencia suficiente para cerrar la corrida

## Decision final registrada

- `QA/UAT final completada`: `si`
- `piloto controlado aprobado`: `si`
- pendientes restantes: `no bloqueantes`
- fase actual del proyecto: `cerrada formalmente`
- fuera de alcance todavia: produccion comercial, pagos reales, clinic, commerce, pharmacy, finance, benefits y telecare
