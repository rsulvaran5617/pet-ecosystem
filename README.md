# Pet Ecosystem

Monorepo base del ecosistema digital pet.

El proyecto esta organizado alrededor de tres superficies coordinadas:

1. `apps/mobile`: super app del dueno de mascota.
2. `apps/web`: experiencia web publica y base provider-facing del MVP.
3. `apps/admin`: backoffice de plataforma.

## Objetivo del repositorio

Preparar una base tecnica y documental consistente para construir el MVP sin mezclar todavia verticales V2 o V3.

El MVP prioriza:

- core auth/profile
- households
- pets
- salud basica
- reminders
- marketplace basico
- booking basico
- pagos basicos
- chat
- reviews basicas
- soporte basico
- proveedor basico
- aprobacion de proveedores

## Estructura principal

```text
pnpm-lock.yaml

apps/
  mobile/
  web/
  admin/

packages/
  api-client/
  config/
  types/
  ui/

supabase/
  README.md
  config.toml
  migrations/
  seed/
  functions/
  data/

docs/
  HANDOFF.md
  vision/
  architecture/
  product/
  data/
  api/
  ux/
  modules/
  delivery/
```

## Documentacion clave

- `AGENTS.md`
- `docs/vision/PRODUCT_VISION.md`
- `docs/vision/BLUEPRINT_GENERAL.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/REPO_STRUCTURE.md`
- `docs/architecture/DEVELOPMENT_SETUP.md`
- `docs/architecture/MONOREPO_CONVENTIONS.md`
- `docs/architecture/ENVIRONMENT_VARIABLES.md`
- `docs/architecture/DOMAIN_MAP.md`
- `docs/architecture/TECH_STACK.md`
- `docs/api/API_CONTRACT.md`
- `docs/data/SUPABASE_SCHEMA.md`
- `docs/data/DATA_MODEL.md`
- `docs/data/RLS_RULES.md`
- `docs/delivery/MVP_SCOPE.md`

## Bootstrap tecnico

1. Instalar dependencias:
   `corepack pnpm install`
2. Levantar las apps en modo desarrollo:
   `corepack pnpm dev`
3. Ejecutar verificaciones basicas:
   `corepack pnpm lint`
   `corepack pnpm typecheck`

Si `pnpm` ya esta disponible en el PATH del sistema, puedes usar el atajo `pnpm ...`.

## Reglas operativas

- MVP primero; V2 y V3 despues.
- No duplicar logica de negocio entre apps.
- Tipos compartidos en `packages/types`.
- Acceso a datos compartido en `packages/api-client`.
- Componentes y tokens compartidos en `packages/ui`.
- Configuracion compartida en `packages/config`.

## Estado actual

Este bootstrap prepara la estructura tecnica minima para empezar el desarrollo del MVP, pero no implementa todavia logica funcional del negocio.
