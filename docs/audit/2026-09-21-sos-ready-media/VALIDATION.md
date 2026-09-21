# Foundation-1C.3d: validacion local

Fecha: 2026-09-21. Baseline Git 3bbef94 + cambios locales 1C.3d sin commit.
Superficies: API, SQL/Storage, Edge, Owner mobile, consumidores web/admin.
Entorno: Windows, PGlite aislado y fetch simulado Deno; fotos sinteticas.
Usuario confirma ausencia de proyecto Supabase de pruebas y cuentas QA.
Estado: implementacion local completada; NO cierre operativo ni activacion.

## Evidencia ejecutada

| Caso | Actor / entorno | Esperado y observado | Estado |
| --- | --- | --- | --- |
| SQL-01 | anon / fixture | No puede cambiar rollout, mantener medios ni elegir foto Owner | PASS |
| SQL-02 | authenticated ajeno / fixture | Eleccion de foto denegada, sin mutacion | PASS |
| SQL-03 | Owner permitido / fixture | Publicar solo borrador; include exige derivado; exclude persistente, rollback sin original | PASS |
| SQL-04 | publico / fixture | Original/direct signing bloqueados en modo estricto; gateway resuelve solo ready y estado vigente | PASS |
| SQL-05 | service / fixture | Backfill duplicado en lease rechazado; fuente modificada, retiro y variante ausente impiden finalizar | PASS |
| SQL-06 | service / fixture | Finalize idempotente; abort incierto conserva ready; original conservado; community visible y externo pending_review oculto | PASS |
| SQL-07 | service / fixture | Version antigua no puede limpiarse; tombstone bloquea reanexar/recrear; confirma solo tras ausencia | PASS |
| SQL-08 | service / fixture | No limpia derivado referenciado; intento expirado retirado no finaliza; nuevo intento usa otra ruta | PASS |
| HTTP-01 | JWT/HTTP simulado | Owner/community autorizan antes de codec; fallos sin fallback inseguro, variantes y compensacion | PASS |
| HTTP-02 | publico simulado | Retiro durante descarga, MIME, limites y disabled devuelven 404 sin firma | PASS |
| CODEC-01 | bytes sinteticos | Orientacion, variantes sin recorte, retiro EXIF/GPS, corrupcion/animacion/limites rechazados | PASS |
| OPS-01 | runner simulado | Proyecto exacto, apply+reviewed+ID explicitos; Owner excluido; fallo de finalize no borra archivos | PASS |
| OPS-02 | runner simulado | Claim antes de DELETE; fallo/resultado incierto no reporta exito; bucket fijo, sin redirects/upsert | PASS |
| API-01 | cliente mock | Orden preparar/elegir, exclude no procesa, lectura gateway sin firmar avatar | PASS |
| STATIC-01 | API/mobile/web/admin | Lint y TypeScript sin errores | PASS |
| BUILD-01 | web/mobile | Next build y exportaciones Expo Android/iOS correctos | PASS |
| REMOTE-01 | anon/owner/view/editor/admin reales | RLS/JWT y Storage alojados, sesiones por rol | NOT_RUN |
| REMOTE-02 | conexiones reales | Contencion, locks, fallos HTTP y reintentos concurrentes | NOT_RUN |
| NATIVE-01 | Android/iOS | Confirmacion, switch, legibilidad, error/reintento y foto publicada | NOT_RUN |
| OPS-03 | proyecto confirmado | Inventario/conversion/limpieza reales, cobertura y adopcion | NOT_RUN |
| LOAD-01 | Edge alojada | WASM, CPU/memoria/costo, limites, latencia y abuso del gateway | NOT_RUN |

Conteos: PGlite 28 grupos mas aserciones; API 17 tests; Deno 6 suites / 54 pasos.
No sumar grupos, pasos y filas como si midieran la misma cobertura. Los 16 casos
locales PASS no certifican los cinco bloques remotos/nativos NOT_RUN.

Primer lint Deno detecto cuatro mocks async sin await; se corrigieron a promesas
explicitas y la repeticion paso. No se ocultaron advertencias de ejecucion:
Expo emitio aviso NO_COLOR/FORCE_COLOR, sin error de exportacion.

## Comandos

```powershell
node supabase/tests/pet-sos-ready-media.test.mjs
corepack pnpm --filter @pet/api-client test
corepack pnpm --filter @pet/api-client --filter @pet/mobile --filter @pet/web --filter @pet/admin lint
corepack pnpm --filter @pet/api-client --filter @pet/mobile --filter @pet/web --filter @pet/admin typecheck
corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/mobile build
deno test --frozen --allow-read --allow-env --config supabase/functions/pet-alert-external-report/deno.json supabase/functions/_shared/pet-alert-media.test.ts supabase/functions/pet-alert-external-report/index.test.ts supabase/functions/pet-alert-community-photo/handler.test.ts supabase/functions/pet-alert-owner-photo/handler.test.ts supabase/functions/pet-alert-public-photo/handler.test.ts supabase/scripts/pet-sos-media-maintenance.test.ts
deno lint --rules-exclude=no-import-prefix supabase/scripts/pet-sos-media-maintenance.ts supabase/scripts/pet-sos-media-maintenance.test.ts supabase/functions/pet-alert-public-photo
corepack pnpm exec eslint supabase/tests/pet-sos-ready-media.test.mjs
git diff --check
```

PGlite simula permisos base y Storage; no carga todo el esquema productivo ni
emula el servicio Storage. DELETE SQL en el test exclusivamente simula la API.
Pruebas Deno no hacen llamadas reales ni procesan fotos de usuarios.

## Puerta de salida

No activar flags ni modo estricto hasta resolver los cinco bloques NOT_RUN.
No hay migracion remota, commit/push, publicacion web, APK/IPA ni distribucion.
No borrado de originales historicos ni avatares. Inventario futuro puede detectar
formatos/dimensiones no admitidos: revision manual, nunca fallback original.
URLs firmadas antiguas pueden seguir vigentes; copias descargadas no se revocan.
Runbook: docs/pet-sos/FOUNDATION_1C_READY_MEDIA.md.
