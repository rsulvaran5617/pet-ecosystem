# ENVIRONMENT_VARIABLES.md

## Objetivo

Centralizar las variables realmente usadas por el baseline actual del MVP.

## Variables activas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

### PET ALERT 8B - reporte externo

- Web publica: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Edge Function `pet-alert-external-report`: `RESEND_API_KEY`, `PET_ALERT_FROM_EMAIL`, `PET_ALERT_OTP_PEPPER`, `PET_ALERT_TURNSTILE_SECRET_KEY` y `PET_ALERT_ALLOWED_ORIGINS`.
- `PET_ALERT_ALLOWED_ORIGINS` es una lista separada por comas (por ejemplo `https://petecosyst.com,http://localhost:3000`).
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se consumen exclusivamente dentro de la Edge Function. Nunca deben usar el prefijo `NEXT_PUBLIC_` ni almacenarse en el cliente.
- Si falta cualquiera de estas variables, el alta externa falla cerrada. No existe bypass de CAPTCHA, OTP o moderacion.

## Variables QA / smoke

- `QA_OWNER_EMAIL`
- `QA_OWNER_PASSWORD`
- `QA_MEMBER_EMAIL`
- `QA_MEMBER_PASSWORD`
- `QA_PROVIDER_EMAIL`
- `QA_PROVIDER_PASSWORD`
- `QA_ADMIN_EMAIL`
- `QA_ADMIN_PASSWORD`
- `SMOKE_ARTIFACT_DIR`

La smoke de `packages/api-client/scripts/smoke` mantiene compatibilidad temporal con variables `PILOT_*`, pero el nombre canonico sigue siendo `QA_*`.

## Ubicacion recomendada

- `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/admin/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- root `.env.local` o variables de shell: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `QA_*`, `SMOKE_ARTIFACT_DIR`

## Notas

- `apps/web` y `apps/admin` comparten el mismo par `NEXT_PUBLIC_SUPABASE_*`
- no se usan todavia variables de proveedor de pagos en este baseline; los pagos reales siguen fuera del release actual
- si el entorno tiene `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`, `NO_PROXY` debe permitir `supabase.co` y `.supabase.co`; la smoke canonica ya sanea el caso local roto `127.0.0.1:9`
- `.env.example` es la plantilla minima que debe mantenerse alineada con este archivo
