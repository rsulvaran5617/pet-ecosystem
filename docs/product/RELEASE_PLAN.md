# RELEASE_PLAN.md

## Release objetivo actual

Cerrar un baseline serio de MVP, alineado entre codigo, migraciones, contratos y documentacion.

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
