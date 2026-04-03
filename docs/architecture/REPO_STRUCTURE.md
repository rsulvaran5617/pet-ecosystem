# REPO_STRUCTURE.md

## Objetivo
Definir la estructura oficial del repositorio y el propósito de cada carpeta.

## Estructura

```text
pet-ecosystem/
  AGENTS.md
  README.md
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  .gitignore
  .env.example
  tsconfig.base.json
  eslint.config.mjs
  prettier.config.mjs

  apps/
    mobile/
      App.tsx
      app.json
      babel.config.js
      metro.config.js
      package.json
      tsconfig.json
    web/
      package.json
      tsconfig.json
      next.config.mjs
      next-env.d.ts
      src/app/
    admin/
      package.json
      tsconfig.json
      next.config.mjs
      next-env.d.ts
      src/app/

  packages/
    types/
      package.json
      tsconfig.json
      src/
    ui/
      package.json
      tsconfig.json
      src/
    api-client/
      package.json
      tsconfig.json
      src/
    config/
      package.json
      tsconfig.json
      src/

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
      ENVIRONMENT_VARIABLES.md
    product/
    data/
    api/
    ux/
    modules/
    delivery/
```

## Propósito por bloque

### Root
- coordina workspaces, scripts y tooling compartido

### Apps
- contienen las superficies finales por canal
- no deben depender unas de otras

### Packages
- contienen código reutilizable
- deben evitar lógica de negocio duplicada

### Supabase
- concentra configuración local y artefactos de base de datos

### Docs
- concentra la fuente de verdad del producto y la arquitectura

## Regla práctica
Si una carpeta nueva no tiene un propósito claro en arquitectura, no debe agregarse todavía.
