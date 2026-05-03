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
- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1` en `6e984eb`
- HEAD operativo publicado de cierre de fase: `57767b7`
- la QA/UAT manual web esta registrada como `PASS`
- Android/mobile esta registrado como `PASS` para `AND-01`, `AND-02` y `AND-03`
- ya no existe bloqueo activo de Android/mobile por entorno
- el baseline tecnico actual debe considerarse con `QA/UAT final completada`
- piloto controlado aprobado sobre el baseline localizado publicado
- QA visual/manual por rol cerrada con `PASS` para owner mobile, provider mobile y admin web autenticado
- hardening tecnico/operativo del piloto cerrado con notas en `docs/delivery/PILOT_OPERATIONS_HARDENING.md`
- pendientes restantes son no bloqueantes y operativos: evidencia auditable opcional, validaciones externas y preparacion del piloto
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
