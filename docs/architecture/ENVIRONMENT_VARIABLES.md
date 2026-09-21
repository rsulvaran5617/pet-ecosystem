# ENVIRONMENT_VARIABLES.md

## Lectura ready y consentimiento (Foundation-1C.3d)

- EXPO_PUBLIC_PET_ALERT_READY_MEDIA=false: gateway y consentimiento Owner mobile.
- NEXT_PUBLIC_PET_ALERT_READY_MEDIA=false: gateway de lectura web/admin.
- PET_ALERT_PUBLIC_MEDIA_ENABLED=false: secreto servidor del gateway publico.
- Ademas se requiere corte DB ready_only y endpoints variantes coordinados;
  un flag no aplica migraciones ni convierte fotos. [Orden y riesgos](../pet-sos/FOUNDATION_1C_READY_MEDIA.md).

## Derivados Owner SOS (Foundation-1C.3c)

`PET_ALERT_OWNER_DERIVATIVES_ENABLED=false`: exclusivamente servidor Edge
pet-alert-owner-photo. Solo true permite procesar tras JWT/consentimiento/permisos.
No conectar UI ni activar en produccion antes de las puertas de
[1C.3c/1C.3d](../pet-sos/FOUNDATION_1C_OWNER_MEDIA.md). Reutiliza secretos Supabase
y PET_ALERT_ALLOWED_ORIGINS; no admite credenciales ni rutas desde clientes.

## Upload comunitario SOS (Foundation-1C.3b)

- `NEXT_PUBLIC_PET_ALERT_SANITIZED_UPLOADS=false`: web, compilacion.
- `EXPO_PUBLIC_PET_ALERT_SANITIZED_UPLOADS=false`: mobile, compilacion Expo.
- Solo literal `true` activa endpoint autenticado `pet-alert-community-photo`;
  no fallback automatico a Storage directo. Mantener false hasta migracion,
  despliegue WASM/Edge y QA real. Mobile requiere nuevo build para activarlo.
- Servidor reutiliza `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y
  `PET_ALERT_ALLOWED_ORIGINS` (lista separada por comas). Ninguna credencial de
  servicio se incorpora a clientes. [Rollout](../pet-sos/FOUNDATION_1C_MEDIA.md).

## Objetivo

Centralizar las variables realmente usadas por el baseline actual del MVP.

## Variables activas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ANDROID_BETA_URL`
- `NEXT_PUBLIC_IOS_TESTFLIGHT_URL`
- `NEXT_PUBLIC_WEB_APP_URL`
- `NEXT_PUBLIC_BETA_SUPPORT_EMAIL`
- `NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL`
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

### Acceso beta publico

- `NEXT_PUBLIC_ANDROID_BETA_URL`: enlace privado de Firebase App Distribution.
- `NEXT_PUBLIC_IOS_TESTFLIGHT_URL`: enlace de invitacion de TestFlight.
- `NEXT_PUBLIC_WEB_APP_URL`: entrada a la experiencia web.
- `NEXT_PUBLIC_BETA_SUPPORT_EMAIL`: correo opcional mostrado en `/beta`.
- Son destinos publicos, nunca secretos. La pagina y las rutas `/beta/{android|ios|web}` fallan cerradas si falta una URL o si no usa protocolo HTTP(S).

### PET ALERT MAP-6

- `NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL`: URL HTTPS de un estilo MapLibre autorizado para produccion.
- Puede contener una clave publica restringida por dominio, pero nunca secretos administrativos o tokens con permisos de escritura.
- Si falta o el proveedor no responde, `/pet-alert` conserva la vista Lista y muestra un fallback explicito en Mapa.
- No usar `demotiles.maplibre.org` en produccion.

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

- `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL`
- `apps/admin/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- root `.env.local` o variables de shell: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `QA_*`, `SMOKE_ARTIFACT_DIR`

## Notas

- `apps/web` y `apps/admin` comparten el mismo par `NEXT_PUBLIC_SUPABASE_*`
- no se usan todavia variables de proveedor de pagos en este baseline; los pagos reales siguen fuera del release actual
- si el entorno tiene `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`, `NO_PROXY` debe permitir `supabase.co` y `.supabase.co`; la smoke canonica ya sanea el caso local roto `127.0.0.1:9`
- `.env.example` es la plantilla minima que debe mantenerse alineada con este archivo
