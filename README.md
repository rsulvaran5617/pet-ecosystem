# Pet Ecosystem

Monorepo PNPM del MVP pet con tres superficies coordinadas:

1. `apps/mobile`: super app del duenio de mascota.
2. `apps/web`: experiencia web del MVP, incluyendo discovery publico y workspace funcional del usuario autenticado.
3. `apps/admin`: backoffice MVP para aprobacion de proveedores y triage de soporte.

## Estado actual de la version

La version actual ya no es bootstrap. El working tree implementa el baseline funcional del MVP para:

- core auth/profile/preferences/addresses/payment methods
- households
- pets
- health
- reminders
- marketplace
- bookings
- messaging
- reviews
- support
- providers base
- admin base

Decisiones activas del release:

- pagos en modo `payment-ready`; no hay captura real ni conciliacion todavia
- `approval_required` ya incluye recepcion provider-side y acciones `approve/reject`
- existe trazabilidad minima en `audit_logs` para mutaciones criticas del MVP
- la smoke canonica ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre backend real
- la localizacion al espanol esta incorporada en el baseline operativo actual `8c5b7d3`
- la QA/UAT manual web esta registrada como `PASS`
- Android/mobile esta en `BLOCK` por entorno tecnico local, no por `FAIL` funcional
- el baseline tecnico actual debe considerarse `listo para cierre de QA/UAT final`
- no debe declararse `piloto controlado` hasta congelar `8c5b7d3` con tag propio, cerrar el bloqueo Android/mobile, y cerrar la matriz manual critica
- clinic, commerce, pharmacy, finance, benefits y telecare siguen fuera del baseline

## Estructura

```text
apps/
  admin/
  mobile/
  web/

packages/
  api-client/
  config/
  types/
  ui/

supabase/
  config.toml
  functions/
  migrations/
  seed/

docs/
  architecture/
  api/
  data/
  delivery/
  modules/
  product/
  ux/
  vision/
  HANDOFF.md
```

## Scripts principales

- `corepack pnpm dev`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm build`
- `corepack pnpm smoke:mvp`
- `corepack pnpm smoke:mvp:critical`
- `corepack pnpm smoke:mvp:admin`
- `corepack pnpm smoke:mvp:providers`
- `corepack pnpm smoke:mvp:health`
- `corepack pnpm smoke:mvp:reminders`

## Canon del proyecto

Leer siempre, como minimo:

- `AGENTS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/ENVIRONMENT_VARIABLES.md`
- `docs/api/API_CONTRACT.md`
- `docs/data/SUPABASE_SCHEMA.md`
- `docs/data/DATA_MODEL.md`
- `docs/data/RLS_RULES.md`
- `docs/delivery/MVP_SCOPE.md`
- `docs/product/MODULE_STATUS.md`
- `docs/HANDOFF.md`

## Regla operativa

No abrir V2 o V3 mientras el alcance documentado del MVP no este alineado, estable y validado.
