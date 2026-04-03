# DEVELOPMENT_SETUP.md

## Objetivo
Definir el setup minimo para arrancar el desarrollo tecnico del MVP.

## Prerrequisitos
- Node.js 20 o superior
- pnpm 9 o superior
- Corepack disponible en la instalacion de Node.js
- Supabase CLI para trabajo local de datos

## Primer arranque

1. Instalar dependencias:
   `corepack pnpm install`
2. Copiar variables de entorno:
   usar `.env.example` como base local
   - `apps/web/.env.local` para variables `NEXT_PUBLIC_*`
   - `apps/mobile/.env` para variables `EXPO_PUBLIC_*`
   - root `.env.local` o shell para `SUPABASE_PROJECT_ID` y `SUPABASE_DB_PASSWORD`
3. Levantar desarrollo:
   `corepack pnpm dev`

## Comandos base
- `corepack pnpm dev`: levanta `apps/mobile`, `apps/web` y `apps/admin`
- `corepack pnpm build`: ejecuta builds por workspace
- `corepack pnpm lint`: corre validaciones estaticas
- `corepack pnpm typecheck`: valida tipos TypeScript
- `corepack pnpm test`: reservado para pruebas automatizadas

Si `pnpm` ya esta habilitado en el PATH del sistema, se puede usar el atajo `pnpm ...`.

## Apps

### Mobile
- Expo + React Native + TypeScript
- punto de entrada: `apps/mobile/App.tsx`

### Web
- Next.js + TypeScript
- usa `apps/web` como base web del MVP y soporte provider-facing inicial

### Admin
- Next.js + TypeScript
- usado para operacion y aprobaciones

## Supabase Auth para EP-01 / Core

Si el ambiente debe usar verificacion manual por OTP en email:

1. En `Authentication > Providers > Email`, habilitar `Confirm email`
2. En `Authentication > Email Templates > Confirm signup`, exponer `{{ .Token }}` para que el usuario reciba el codigo manual
3. En `Authentication > URL Configuration`, mantener `Site URL` y `Redirect URLs` validos para recovery
4. Para recovery mobile en `EP-01 / Core`, registrar manualmente este deep link en `Redirect URLs`:
   - `petecosystem://auth/recovery`
5. Si luego se quisiera dejar margen para callbacks auth adicionales en mobile, se puede ampliar a:
   - `petecosystem://**`
6. Despues de agregar `scheme` en `apps/mobile/app.json`, crear un nuevo development build o reinstalar la app para que el deep link quede disponible en el binario
7. En `Authentication > SMTP`, configurar SMTP propio si se probara con emails reales fuera del equipo del proyecto

El cliente tipado del repo ya queda alineado a `verify-otp` con `email + token` para este flujo.

## Supabase local

1. Revisar `supabase/config.toml`
2. Mantener migraciones en `supabase/migrations`
3. Mantener seeds en `supabase/seed`
4. Mantener documentacion del modelo en `docs/data`

## Regla
No agregar features de negocio mientras la base tecnica no compile, tipifique y documente correctamente.
