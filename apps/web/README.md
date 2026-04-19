# apps/web

Workspace Next.js del MVP web.

## Responsabilidad

- discovery publico del marketplace
- auth/core del usuario web
- households, pets, health, reminders, bookings, messaging, reviews y support
- provider workspace base

## Estado actual

Ya no es shell tecnico. Este workspace consume Supabase real via `packages/api-client` y expone el baseline funcional del MVP en una sola superficie integrada.

## Reglas

- no duplicar logica de `admin`
- no mover reglas de negocio pesadas a componentes visuales
- reutilizar `packages/types`, `packages/api-client`, `packages/config` y `packages/ui`
