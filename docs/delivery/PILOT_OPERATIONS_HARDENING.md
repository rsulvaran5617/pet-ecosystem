# PILOT_OPERATIONS_HARDENING.md

## Objetivo

Cerrar el hardening tecnico/operativo previo al piloto controlado sin abrir features nuevas, cambios de base de datos, contratos API, migraciones ni alcances V2/V3.

Este frente existe para asegurar que el baseline validado pueda levantarse, revisarse y operarse de forma reproducible durante el piloto.

## Estado base

- QA/UAT final: `completada`
- piloto controlado: `aprobado`
- productizacion UX por rol: `cerrada`
- QA visual/manual por rol: `cerrada`
- owner mobile: `PASS` con `QA_OWNER`
- provider mobile: `PASS` con `QA_PROVIDER`
- admin web autenticado: `PASS` con `QA_ADMIN`
- hardening tecnico/operativo: `cerrado_con_notas`
- pagos reales: fuera de alcance; baseline sigue en modo `payment-ready`
- V2/V3: no abiertas

## Alcance del hardening

Entra:

- preflight operativo de entorno
- comandos canonicos para levantar superficies
- comandos canonicos de validacion
- clasificacion de pendientes `PASS`, `pendiente` y `BLOCK por entorno`
- criterio para preparar evidencia auditable
- criterio para decidir el siguiente frente

No entra:

- nuevas features
- pagos reales
- cambios en Supabase schema/RLS/API
- migraciones
- clinic, commerce, pharmacy, finance, benefits o telecare
- geolocalizacion V2 de marketplace

## Preflight operativo

| Area | Estado esperado | Comando o verificacion | Nota |
| --- | --- | --- | --- |
| Git | rama `master`, sin divergencia inesperada con `origin/master` | `git status --short --branch` | Si hay cambios locales, deben corresponder al cierre QA/hardening actual. |
| Dependencias | instaladas y alineadas con lockfile | `corepack pnpm install` | No actualizar versiones sin tarea explicita. |
| Variables web/admin | Supabase publico cargado | `apps/web/.env.local`, `apps/admin/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| Variables mobile | Supabase publico cargado | `apps/mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |
| Variables QA/smoke | actores QA disponibles | root `.env.local` o shell | `QA_OWNER_*`, `QA_MEMBER_*`, `QA_PROVIDER_*`, `QA_ADMIN_*`, `SMOKE_ARTIFACT_DIR`. |
| Backend Supabase | proyecto enlazado y sin drift esperado | smoke MVP | No correr migraciones nuevas durante piloto sin decision explicita. |
| Android dev-client | dispositivo/emulador conectado | `adb devices` | Aplicar `adb reverse tcp:8081 tcp:8081` si la app no carga Metro. |

## Comandos para levantar

Web:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/web dev
```

Admin:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/admin dev
```

Mobile:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
npx expo start --dev-client --port 8081 --clear
```

Android:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
```

## Comandos de validacion

Validacion estatica minima:

```powershell
corepack pnpm lint
corepack pnpm typecheck
```

Builds por superficie:

```powershell
corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/admin build
corepack pnpm --filter @pet/mobile build
```

Smokes canonicas:

```powershell
corepack pnpm smoke:mvp
corepack pnpm smoke:mvp:critical
corepack pnpm smoke:mvp:admin
corepack pnpm smoke:mvp:providers
corepack pnpm smoke:mvp:health
corepack pnpm smoke:mvp:reminders
```

Chequeo de diff:

```powershell
git diff --check
```

## PASS registrado

| Area | Estado | Fuente |
| --- | --- | --- |
| QA/UAT funcional | `PASS` | `docs/delivery/PILOT_QA_UAT_MATRIX.md` |
| Owner mobile visual | `PASS` | `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md` |
| Provider mobile visual | `PASS` | `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md` |
| Admin web autenticado visual | `PASS` | `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md` |
| Android manual critico | `PASS` | `AND-01`, `AND-02`, `AND-03` documentados |
| Web manual | `PASS` | validacion manual reportada |

## Validacion tecnica de hardening

Corrida local registrada el `2026-05-03`:

| Comando | Estado | Nota |
| --- | --- | --- |
| `corepack pnpm lint` | `PASS` | todos los workspaces aplicables |
| `corepack pnpm typecheck` | `PASS` | todos los workspaces aplicables |
| `corepack pnpm --filter @pet/web build` | `PASS` | Next build OK |
| `corepack pnpm --filter @pet/admin build` | `PASS` | Next build OK |
| `corepack pnpm --filter @pet/mobile build` | `PASS` | Expo export Android/iOS OK |
| `git diff --check` | `PASS` | sin errores; solo avisos LF -> CRLF del entorno Windows |
| `corepack pnpm smoke:mvp` | `PASS` | variables cargadas desde `.env.local`; smoke full OK |
| `corepack pnpm smoke:mvp:critical` | `PASS` | variables cargadas desde `.env.local`; smoke critica OK |
| `corepack pnpm smoke:mvp:admin` | `PASS` | variables cargadas desde `.env.local`; admin smoke OK |
| `corepack pnpm smoke:mvp:providers` | `PASS` | variables cargadas desde `.env.local`; providers smoke OK |
| `corepack pnpm smoke:mvp:health` | `PASS` | variables cargadas desde `.env.local`; health smoke OK |
| `corepack pnpm smoke:mvp:reminders` | `PASS` | variables cargadas desde `.env.local`; reminders smoke OK |

## Pendientes no bloqueantes

| Pendiente | Tipo | Decision |
| --- | --- | --- |
| Evidencia visual final auditable | operativo | Preparar solo si se requiere paquete externo/versionado. |
| iOS fisico | entorno externo | Mantener como pendiente externa hasta tener entorno Apple. |
| Recovery deep link real | entorno externo | Validar cuando existan mail delivery, deep link y condiciones de rate limit controladas. |
| Android picker fisico | entorno externo | Validar si el piloto requiere carga real de archivo desde dispositivo. |

## BLOCK por entorno

| Bloqueo | Impacto | Mitigacion |
| --- | --- | --- |
| `EXT-01` iOS fisico | No bloquea piloto Android/web actual | Requiere Apple Developer Team y dispositivo iOS. |
| Recovery real por email | No bloquea piloto si no es caso critico de salida activo | Configurar SMTP/deep link y probar fuera de rate limits. |
| Android dev-client sin bundle | Bloquea revision local Android hasta corregir entorno | Ejecutar `adb reverse tcp:8081 tcp:8081`, reiniciar Metro con `--clear` y recargar app. |
| `next dev` / `next build` con `spawn EPERM` | Puede bloquear validacion local en sandbox | Ejecutar fuera del sandbox o desde terminal local normal. |

## Criterio de cierre del hardening

El hardening tecnico/operativo puede cerrarse cuando:

- `lint` y `typecheck` pasan o existe decision explicita sobre cualquier fallo de entorno
- builds/smokes requeridas para el piloto pasan o quedan registradas como historicas con decision explicita
- QA visual/manual por rol permanece en `PASS`
- pendientes restantes son externos o evidencia opcional
- no hay apertura de features, DB, API, migraciones, V2/V3 ni pagos reales

Estado al 2026-05-03: `cerrado_con_notas`.

## Siguiente frente recomendado

Despues de cerrar este hardening:

1. preparar paquete de evidencia auditable si el piloto lo requiere
2. publicar commit/tag de cierre operativo si se decide congelar este estado
3. solo despues evaluar `Payments MVP+`

`Payments MVP+` no debe abrirse antes de cerrar estabilidad operativa del piloto.
