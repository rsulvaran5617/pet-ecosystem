# RELEASE_PLAN.md

## Release objetivo actual

Cerrar un baseline serio de MVP, alineado entre codigo, migraciones, contratos y documentacion.

Estado actual:

- baseline MVP localizado: publicado como `v0.1.0-mvp-baseline-es.1`
- QA/UAT final: `completada`
- piloto controlado: `aprobado`
- productizacion UX por rol: `cerrada`
- hardening UX no bloqueante: `aplicado`
- frente activo recomendado: material visual del piloto y QA manual por rol

## Gate 1: Baseline MVP

Debe quedar resuelto:

- core, households, pets, health y reminders
- marketplace publico
- bookings `instant` y `approval_required`
- messaging, reviews y support
- providers base
- admin base
- trazabilidad minima de mutaciones criticas
- repo sin artefactos no canonicos

## Gate 2: QA/UAT

Debe quedar validado:

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- build de `apps/web`
- build de `apps/admin`
- export de `apps/mobile` cuando el entorno lo permita
- smoke MVP canonica
- checklist QA/UAT manual documentado

## Gate 3: Piloto controlado

Solo se recomienda cuando ademas exista:

- baseline committeable y reproducible
- actores QA estables
- seeds o precondiciones operativas claras
- validacion manual final de flujos criticos
- decision explicita sobre pendientes no bloqueantes

## Gate 4: Evidencia visual del piloto

Debe preparar sin abrir nuevas features:

- capturas o videos cortos de owner mobile
- capturas o videos cortos de provider mobile
- capturas de admin web
- checklist manual por rol con hallazgos visuales triageados
- confirmacion de que `payment-ready` no promete cobro real
- confirmacion de que no se abrieron backend, DB, APIs, migraciones ni V2/V3

## Freeze propuesto para el baseline actual

- commit sugerido: `chore(release): freeze sanitized MVP baseline for QA/UAT`
- tag sugerido: `v0.1.0-mvp-baseline.1`

## Convencion minima recomendada

- baseline tecnico congelado: `v0.1.0-mvp-baseline.N`
- cierre de QA/UAT manual: `v0.1.0-qa-uat.N`
- candidato a piloto controlado: `v0.1.0-pilot-rc.N`

Esta convencion busca distinguir con claridad:

- baseline tecnico saneado
- cierre manual de QA/UAT
- decision de piloto

## Fuera del release actual

- captura real de pagos
- conciliacion
- clinic
- commerce
- pharmacy
- finance
- benefits
- telecare
