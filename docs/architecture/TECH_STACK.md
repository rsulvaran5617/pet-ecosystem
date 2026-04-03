# TECH_STACK.md

## Objetivo
Definir el stack técnico oficial del proyecto.

## Frontend

### Mobile
- React Native
- Expo
- TypeScript

### Web
- Next.js
- TypeScript

### Admin
- Next.js
- TypeScript

---

## Backend y datos
- Supabase Auth
- PostgreSQL en Supabase
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions cuando sea necesario

---

## Monorepo
- pnpm workspaces
- turbo opcional para pipeline

---

## Calidad
- TypeScript strict
- ESLint
- Prettier
- testing por capa

---

## Packages compartidos
- `packages/types`
- `packages/ui`
- `packages/api-client`
- `packages/config`

---

## Regla principal
No introducir tecnologías adicionales sin justificación real y sin actualizar esta documentación.