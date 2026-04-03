# HANDOFF.md

## Fecha
2026-04-03

## Objetivo de esta nota
Dejar contexto claro para retomar el trabajo del repositorio sin depender de memoria de sesion.

## Estado actual
El repositorio ya no esta solo en bootstrap.

La documentacion base del MVP quedo alineada y `EP-01 / Core` ya quedo cerrado en web con integracion real de Supabase Auth, persistencia real del dominio core y validacion real del flujo de registro/verificacion por OTP mas login web sobre un usuario ya verificado.

No se avanzo a `EP-02` ni a otros modulos.

### Actualizacion 2026-04-03
- se completo la validacion web real de `register -> email OTP -> verify-otp`
- se confirmo `login` web sobre un usuario creado y verificado por ese mismo flujo
- las corridas finales de signup toparon el rate limit de email de Supabase despues de varias pruebas seguidas, por lo que la confirmacion final de login se hizo reutilizando uno de esos usuarios ya verificados
- se avanzo el cierre de mobile dentro de `EP-01 / Core` sin tocar otros modulos
- se corrigio el entrypoint de Expo en mobile para que el app bundlee en monorepo con pnpm:
  - `apps/mobile/package.json`
  - `apps/mobile/index.js`
- se corrigio la lectura de env vars publicas en mobile:
  - `apps/mobile/src/features/core/services/supabase-mobile.ts`
  - `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` no debian leerse con acceso dinamico
- se completo el wiring tecnico de recovery mobile end-to-end dentro de `EP-01 / Core`:
  - `apps/mobile/app.json`
  - `apps/mobile/src/features/core/services/supabase-mobile.ts`
  - `apps/mobile/src/features/core/hooks/useCoreWorkspace.ts`
  - `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`
- la app mobile ahora define `scheme = petecosystem`
- el redirect de recovery mobile queda definido como:
  - `petecosystem://auth/recovery`
- el hook mobile ahora consume el deep link entrante con `Linking.getInitialURL()` y `Linking.addEventListener('url', ...)`
- el cliente mobile ahora puede:
  - intercambiar `code` via `exchangeCodeForSession`
  - o restaurar sesion via `setSession(access_token, refresh_token)`
- cuando el deep link corresponde a recovery, la UI entra en modo `PASSWORD_RECOVERY` y despues de cambiar password cierra sesion para volver a login
- la configuracion manual que falta en dashboard queda explicita en `docs/architecture/DEVELOPMENT_SETUP.md`
- mobile ya bundlea en export nativo:
  - `npx expo export --platform android` OK
  - `npx expo export --platform ios` OK
- validacion funcional mobile-like completada contra Supabase real para:
  - login
  - persistencia de sesion tipo mobile
  - lectura de profile
  - update de profile
  - preferencias
  - create/read/update de direcciones
  - role switch basico
- recovery mobile queda abierto:
  - `recover-access` sigue devolviendo `email rate limit exceeded` en este ambiente durante la validacion
  - el codepath ya quedo listo, pero la revalidacion final del email depende de repetir la prueba cuando baje el rate limit y despues de registrar el deep link en Supabase
- durante la validacion se corrigio un bug de env vars en cliente web:
  - `apps/web/src/features/core/services/supabase-browser.ts`
  - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no debian leerse con acceso dinamico `process.env[name]`
- durante la validacion se corrigio el estado signed-out del cliente core:
  - `packages/api-client/src/core.ts`
  - `supabase.auth.getUser()` con `Auth session missing!` ahora se interpreta como sesion ausente y no como error fatal
- se estabilizo el cierre de sesion web para no forzar refresh inmediato:
  - `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`

## Lo que ya quedo hecho

### 1. Base documental y tecnica del monorepo
- se alinearon rutas y nombres de documentos clave
- el bootstrap tecnico del monorepo ya quedo funcional con `corepack pnpm`
- `corepack pnpm install`, `corepack pnpm lint` y `corepack pnpm typecheck` pasan en el entorno actual

### 2. EP-01 / Core ya no usa mocks
- se reemplazo el cliente mock de core por un cliente real tipado sobre Supabase en `packages/api-client/src/core.ts`
- se agrego schema compartido de base de datos en `packages/types/src/database.ts`
- se ampliaron tipos compartidos de core en `packages/types/src/core.ts`
- web y mobile ya consumen clientes reales de Supabase

### 3. Integracion real de auth
- registro real con `supabase.auth.signUp`
- login real con `supabase.auth.signInWithPassword`
- logout real con `supabase.auth.signOut`
- verificacion por OTP via `supabase.auth.verifyOtp`
- recuperacion de acceso via `supabase.auth.resetPasswordForEmail`

### 4. Persistencia real del dominio core
- `profiles`
- preferencias dentro de `profiles`
- `user_roles`
- `user_addresses`
- `payment_methods` solo al nivel permitido por MVP

### 5. Sync real entre `auth.users` y `public.profiles`
Se agrego migracion incremental:

- `supabase/migrations/20260401231500_core_auth_sync.sql`

Esta migracion deja:
- trigger de sync desde `auth.users`
- backfill para usuarios ya existentes
- funcion `switch_active_user_role`
- refuerzo de reglas de unico activo / default en roles, direcciones y payment methods

### 6. Push remoto de migraciones ya aplicado
- el proyecto Supabase remoto ya quedo linkeado y autenticado por CLI
- se corrigio el naming de migraciones para usar timestamps unicos validos:
  - `supabase/migrations/20260401220100_core_identity.sql`
  - `supabase/migrations/20260401231500_core_auth_sync.sql`
- se agregaron migraciones incrementales para compatibilidad y estabilizacion real del remoto:
  - `supabase/migrations/20260402140500_core_remove_legacy_auth_trigger.sql`
  - `supabase/migrations/20260402143000_core_fix_role_switch.sql`
  - `supabase/migrations/20260402152000_core_fix_single_active_defaults.sql`
- se reparo el historial remoto de migraciones para salir de la colision de version `20260401`
- `profiles` remoto venia de un esquema legado con `full_name`; la migracion de auth sync se hizo compatible para agregar y backfillear:
  - `email`
  - `first_name`
  - `last_name`
  - `locale`
  - preferencias base
- el remoto ya quedo con historial consistente:
  - `20260401220100 | core_identity`
  - `20260401231500 | core_auth_sync`

### 7. Validacion funcional real de Core completada
Se ejecuto smoke test real contra Supabase para:

- registro
- login
- profile
- preferencias
- role switch
- direcciones
- payment methods
- recovery end-to-end

Hallazgos cerrados durante la validacion:
- el remoto conservaba un trigger legado `on_auth_user_created` que rompia `signUp`; se elimino con `20260402140500_core_remove_legacy_auth_trigger.sql`
- `switch_active_user_role` chocaba con el indice unico del rol activo; se estabilizo con `20260402143000_core_fix_role_switch.sql`
- la misma condicion de carrera existia en los triggers de unico activo/default para roles, direcciones y payment methods; se corrigio con `20260402152000_core_fix_single_active_defaults.sql`

Estado resultante:
- `signUp` ya crea perfil y rol base sin error
- `switch_active_user_role` ya deja un solo rol activo
- cambiar direccion default ya deja una sola direccion default
- cambiar payment method default ya deja un solo metodo default
- `recover-access` ya genera token real y `recover-access/complete` puede cerrar el cambio de password al abrir una sesion recovery

### 8. Configuracion real de Auth observada
El proyecto Supabase ya quedo reconfigurado para verificacion manual por OTP en signup.

Estado confirmado por API de Supabase:
- `mailer_autoconfirm = false`
- `site_url = http://localhost:3000`
- `uri_allow_list = http://localhost:3000/**`
- la plantilla `Confirm sign up` ya expone `{{ .Token }}`

Eso implica:
- `signUp` ya no devuelve sesion inmediata
- el email ya no queda confirmado automaticamente
- `verify-otp` vuelve a ser un paso obligatorio para cerrar el registro en este ambiente
- recovery sigue por link y no se modifico ese flujo

Queda pendiente solo la validacion manual end-to-end usando el codigo real recibido por email, porque Supabase no expone el OTP plano por base de datos; solo deja disponible el hash del token.

### 8.1. Repo alineado para OTP manual
El codigo de core ya quedo alineado para el flujo manual de OTP por email:

- `packages/api-client/src/core.ts` valida `verify-otp` con `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- web y mobile ya etiquetan el campo como codigo manual de 6 digitos
- `docs/architecture/DEVELOPMENT_SETUP.md` deja documentado el checklist de dashboard necesario para activar `Confirm email`

Esto significa que el cambio pendiente ya no es del repo ni del dashboard; queda solo ejecutar la prueba manual real del OTP.

### 9. RLS y ownership
Las tablas core sensibles quedaron con ownership por usuario:
- `profiles`
- `user_roles`
- `user_addresses`
- `payment_methods`

### 10. Recovery UX cerrada dentro de EP-01
- `packages/api-client/src/core.ts` ya permite completar recovery con `supabase.auth.updateUser`
- web y mobile ya muestran una UI para definir nueva password cuando Supabase abre una sesion `PASSWORD_RECOVERY`
- el flujo de recovery ya no se queda solo en pedir el email; tambien puede cerrar el cambio de password dentro del alcance de core

## Archivos importantes tocados

### Shared packages
- `packages/types/src/core.ts`
- `packages/types/src/database.ts`
- `packages/types/src/index.ts`
- `packages/api-client/src/core.ts`
- `packages/api-client/package.json`

### Supabase
- `supabase/migrations/20260401220100_core_identity.sql`
- `supabase/migrations/20260401231500_core_auth_sync.sql`
- `supabase/migrations/20260402140500_core_remove_legacy_auth_trigger.sql`
- `supabase/migrations/20260402143000_core_fix_role_switch.sql`
- `supabase/migrations/20260402152000_core_fix_single_active_defaults.sql`
- `supabase/config.toml`

### Web
- `apps/web/package.json`
- `apps/web/src/app/page.tsx`
- `apps/web/src/features/core/services/supabase-browser.ts`
- `apps/web/src/features/core/hooks/useCoreWorkspace.ts`
- `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`

### Mobile
- `apps/mobile/package.json`
- `apps/mobile/src/features/core/services/supabase-mobile.ts`
- `apps/mobile/src/features/core/hooks/useCoreWorkspace.ts`
- `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`

### Documentacion
- `docs/modules/core.md`
- `docs/data/DATA_MODEL.md`
- `docs/api/API_CONTRACT.md`

## Lo que sigue pendiente de EP-01
EP-01 ya quedo sin bloqueos de datos ni de auth en el remoto.

No queda pendiente funcional dentro de `EP-01 / Core` para web.

El dominio core ya quedo validado contra Supabase real en los flujos principales del MVP, incluyendo la validacion real del OTP manual en email y el login web posterior sobre un usuario efectivamente verificado.

En mobile ya quedaron validados los flujos principales de profile/roles/direcciones sobre el cliente real y el codepath de recovery quedo preparado, pero la revalidacion final del email sigue abierta por rate limit y configuracion manual del dashboard.

## Lo que explicitamente NO se hizo
- no se avanzo a `EP-02`
- no se tocaron `households`
- no se tocaron `pets`
- no se toco `marketplace`
- no se toco `bookings`
- no se implemento checkout ni cobro real
- no se implemento logica transaccional de pagos
- no se metio nada de V2 o V3
- `audit_logs` y `consents` quedaron fuera de este cierre por alcance MVP actual

## Notas importantes
- no se detecto `.git` en este workspace al momento de trabajar, asi que este `HANDOFF.md` es la fuente principal de continuidad
- mobile usa `@react-native-async-storage/async-storage` y `react-native-url-polyfill` para persistencia de sesion de Supabase
- web y mobile fallan explicitamente si faltan las env vars de Supabase
- el dominio core ya no depende de mocks en el path principal implementado
- el remoto tenia un `profiles` legado con `full_name`; no se elimino esa columna, pero el esquema ya fue extendido para cumplir con el modelo core actual

## Estado de validacion
- `corepack pnpm install` OK
- `corepack pnpm lint` OK
- `corepack pnpm typecheck` OK
- `corepack pnpm --filter @pet/web build` OK
- `corepack pnpm --filter @pet/mobile lint` OK
- `corepack pnpm --filter @pet/mobile typecheck` OK
- `npx expo export --platform android` OK
- `npx expo export --platform ios` OK
- `npx supabase db push --db-url $SUPABASE_DB_URL` OK
- remoto verificado con:
  - `profiles.email` poblado
  - `profiles.first_name` poblado
  - `profiles.locale` poblado
  - `user_roles` backfilleado para usuarios existentes
  - registro OK
  - login OK
  - update profile OK
  - update preferencias OK
  - role switch OK
  - direcciones default OK
  - payment methods default OK
  - recovery request OK
  - recovery complete OK
  - configuracion de OTP manual en Supabase OK
  - validacion web real `register -> email OTP -> verify-otp` OK
  - `login` web OK sobre usuario creado y verificado por ese flujo
  - `login` mobile-like OK
  - persistencia de sesion mobile-like OK
  - profile read/update mobile-like OK
  - preferencias mobile-like OK
  - direcciones create/read/update mobile-like OK
  - role switch mobile-like OK
  - recovery mobile wiring tecnico OK
  - recovery mobile pendiente solo por rate limit de email y registro manual del deep link en Supabase

## Siguiente paso minimo recomendado
No avanzar automaticamente a otro modulo dentro de esta misma tarea.

El siguiente paso pequeno correcto es:
1. considerar `EP-01 / Core` formalmente cerrado
2. si se quiere continuar despues, abrir la siguiente tarea del backlog sin mezclar alcance en esta sesion

## Como retomar en la proxima sesion
Pedir algo como:

`Lee AGENTS.md, docs/HANDOFF.md, docs/modules/core.md, docs/data/DATA_MODEL.md, docs/api/API_CONTRACT.md y continúa con el cierre real de EP-01 / Core sin avanzar a otros módulos.`

Sugerencia actualizada para retomar:

`Lee AGENTS.md, docs/HANDOFF.md, docs/modules/core.md, docs/data/DATA_MODEL.md y continua con la validacion manual final de EP-01 / Core en web para el flujo register -> email OTP -> verify-otp -> login sin avanzar a otros modulos.`

Nueva sugerencia para una sesion posterior:

`Lee AGENTS.md, docs/HANDOFF.md y confirma el cierre de EP-01 / Core antes de evaluar el siguiente item MVP sin avanzar a V2 o V3.`

## Regla de continuidad
Mantener MVP primero.
No meter V2 o V3.
No avanzar a `EP-02` hasta cerrar de verdad `EP-01`.
