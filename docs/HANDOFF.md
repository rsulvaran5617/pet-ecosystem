# HANDOFF.md

## Fecha
2026-04-19

## Objetivo
Dejar una referencia corta y util para retomar el baseline MVP sin depender de la historia inflada de iteraciones previas.

## Estado actual del baseline
- el repositorio ya no esta en bootstrap
- el baseline funcional del MVP vive en `apps/web`, `apps/mobile`, `apps/admin`, `packages/*` y `supabase/migrations`
- el flujo critico `approval_required` ya cubre creacion owner-side, recepcion provider-side, `approve`, `reject` y `complete`
- existe trazabilidad minima en `audit_logs` para bookings, approvals de proveedores y soporte admin
- Supabase remoto ya quedo sincronizado con la migracion pendiente del MVP
- la smoke canonica `critical` y `full` ya pasan contra backend real
- `Core` ya ejercita `role switch` real entre roles autogestionables
- `Health` y `Reminders` ya tienen smoke funcional dedicada dentro del baseline
- el release objetivo inmediato es `listo para QA/UAT`
- no debe declararse aun `piloto controlado` sin ejecucion manual de la matriz critica y baseline versionado

## Alcance MVP que hoy debe considerarse canonico
- core auth, perfil, preferencias, direcciones y metodos guardados
- households
- pets
- health
- reminders
- marketplace publico basico
- bookings `instant` y `approval_required`
- messaging basico por booking
- reviews basicas
- support basico
- providers base
- admin minimo

## Fuera de alcance canonico
- pagos reales
- payouts
- dashboard admin avanzado
- dashboard provider avanzado
- clinic
- commerce
- pharmacy
- finance
- benefits
- telecare
- disputas

## Archivos de verdad para retomar
- `README.md`
- `docs/delivery/MVP_SCOPE.md`
- `docs/product/MODULE_STATUS.md`
- `docs/api/API_CONTRACT.md`
- `docs/api/ENDPOINTS_BY_MODULE.md`
- `docs/data/SUPABASE_SCHEMA.md`
- `docs/data/DATA_MODEL.md`
- `docs/data/RLS_RULES.md`
- `docs/ux/APP_FLOWS.md`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/modules/bookings.md`
- `docs/modules/marketplace.md`
- `docs/modules/providers.md`
- `docs/modules/support.md`
- `docs/modules/admin.md`

## Riesgos conocidos al retomar
- la smoke depende de variables QA y actores reales del entorno
- no existe captura real de pagos; el baseline es solo `payment-ready`
- `support_cases` sigue limitado a un caso por booking
- la validacion automatizada no reemplaza la matriz manual de QA/UAT por canal
- la validacion definitiva de piloto requiere ejecucion funcional manual sobre entorno estable y baseline versionado

## Siguiente paso recomendado
Ejecutar la matriz manual critica de QA/UAT y versionar este baseline antes de abrir trabajo nuevo.

## Freeze recomendado del baseline
- commit sugerido: `chore(release): freeze sanitized MVP baseline for QA/UAT`
- tag sugerido: `v0.1.0-mvp-baseline.1`
- criterio de uso:
  - este tag solo representa baseline tecnico saneado
  - no representa aprobacion de piloto
  - el siguiente hito de versionado deberia ocurrir solo despues de cerrar la matriz manual critica
