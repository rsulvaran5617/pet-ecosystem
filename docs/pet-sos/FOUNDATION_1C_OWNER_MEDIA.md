# Foundation-1C.3c: derivados privados del avatar Owner

2026-09-21. Implementacion local, desactivada. No migracion remota, despliegue,
publicacion mobile ni cambio de UI. Complementa [medios](FOUNDATION_1C_MEDIA.md).

## Alcance y limites

Prepara display JPEG (hasta 1600 px) y thumbnail (hasta 480 px) por alerta Owner,
usando el codec fijado de 1C.3a. Decodifica, orienta, elimina metadata y re-encodea;
sin recorte ni sustitucion del avatar original. Limites 5 MiB/12 MP, JPG/PNG/WebP.
No crea Pet para participantes externos ni permite usar su token para leer avatars.

**Ready significa preparado en privado, no publicado.** Ninguna proyeccion publica
cambia en este subpaso. La ruta legacy actual todavia puede firmar el avatar para
una alerta compartida: NO afirmar privacidad universal del original ni cierre EXIF.
El reemplazo de esa proyeccion, retiro de permisos legacy, revocacion y backfill
corresponden a 1C.3d. Tampoco se modifica Foster/Clinical Access ni otros usos del
avatar. No hay nueva pantalla ni consentimiento inferido del alta de la alerta.

## Contrato

- Edge `pet-alert-owner-photo`: POST JSON `{ alertId, photoConsent: true }`.
  Rechaza campos extra (rutas, URLs o actor). Cuerpo maximo 2 KiB, incluso stream.
- Desactivado salvo secreto servidor `PET_ALERT_OWNER_DERIVATIVES_ENABLED=true`.
  Reutiliza SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y PET_ALERT_ALLOWED_ORIGINS.
- Auth.getUser verifica JWT antes de cualquier reserva/descarga. Web usa allowlist
  de origen; native sin Origin sigue requiriendo JWT. No acepta gestion externa.
- Respuesta `{ status: 'ready' }`, sin URL, ruta, hash, identidad o datos de perfil.
  Errores estables PET_ALERT_: UNAUTHORIZED (401/403), PHOTO_INVALID y
  PHOTO_CONSENT_REQUIRED (400), PHOTO_MISSING/BUSY/STALE y
  REPORT_NOT_AVAILABLE (409), RATE_LIMITED (429), PHOTO_UNAVAILABLE (503).
- Metodo compartido `preparePetAlertOwnerPhoto` con tipos en packages/types.
  No se llama automaticamente desde crear/publicar alerta. La UI de consentimiento
  y su conexion al flujo se incorporaran con la activacion coordinada de 1C.3d.

## Persistencia y autorizacion

Migracion `20260921140000_pet_sos_owner_avatar_derivatives.sql` preparada localmente.
Tabla tecnica `pet_alert_owner_photo_derivatives`, una fila por alerta, FK Pet/actor,
snapshot privado del objeto origen (ID/path/updated_at), estado processing/ready/failed,
intento, lease, consent_at/version, rutas de variantes, tamanos y timestamps.
No duplica alerta, mascota ni expediente; no grants de tabla a clientes.

RPCs prepare/finalize/abort solo service_role con chequeo explicito de auth.role.
El actor viene del JWT verificado por Edge, nunca del payload. Exige permisos de
edicion tanto del hogar de la alerta como de la mascota actual y coincidencia de
hogar. Un admin de plataforma sin esos permisos no recibe acceso clinico ni al avatar.

Preparar acepta registered_pet con share_enabled, estado draft/active/
sighting_received/possible_match y no expirado. Exige consentimiento true,
avatar actual en pet-avatars y ruta bajo el UUID de esa mascota. Fuente resuelta
en DB; download a Storage propio con URL construida y segmentos codificados,
sin redirects, original en memoria acotada, nunca se copia el original a pet-alert-media.

Bloqueos: cuota actor, Pet, alerta, perfil, objeto origen y job. Lease de dos minutos,
hasta cinco intentos por alerta en ventana de una hora, hasta nueve filas activadas
por actor en esa ventana. Cada intento tiene rutas inmutables distintas, upsert false.
Ready con misma version y ambas variantes existentes evita reprocesar; si falta una,
reserva nuevo intento. Cambiar avatar/version exige otra preparacion consentida.

Finalizar revalida estado, share, expiracion, actor, hogar/Pet, snapshot perfil y
version del objeto bajo bloqueo. Ambas variantes deben existir. Estado ready y
auditoria se guardan atomicamente en Postgres; no se promete transaccion conjunta
con Storage. Consentimiento queda ligado al actor/version del intento. No supone
que una foto preparada siga siendo elegible tras futuros cambios: 1C.3d debe
revalidar elegibilidad antes de proyectar y nunca firmar el original como fallback.

Compensacion solo borra las dos rutas devueltas por abort para el intento pendiente.
Si finalizacion/abort es incierto, ready o intento antiguo, no borra. Huerfanos y
variantes reemplazadas permanecen privados; TTL/reconciliacion pertenecen a 1C.3d.
Policy restrictiva ALL bloquea namespace owner-sos-v1 para anon/authenticated,
incluidos lectura/firma, cambios y borrado, aunque otras policies sean permisivas.

## Validacion reproducible

```powershell
node supabase/tests/pet-sos-owner-media.test.mjs
deno check --frozen --config supabase/functions/pet-alert-owner-photo/deno.json supabase/functions/pet-alert-owner-photo/index.ts
deno test --frozen --allow-read --allow-env --config supabase/functions/pet-alert-owner-photo/deno.json supabase/functions/pet-alert-owner-photo/handler.test.ts
deno lint --rules-exclude=no-import-prefix supabase/functions/pet-alert-owner-photo
corepack pnpm --filter @pet/api-client test
git diff --check
```

Usa lockfile compartido con pet-alert-external-report y static_files WASM; ejecutar
prepare-pet-alert-media como en 1C.3a antes de empaquetar. Ninguna dependencia nueva.
PGlite ejecuta migracion sobre fixtures simplificadas; HTTP mock usa codec real y
fotos sinteticas. No se leyeron fotos/credenciales de usuarios. No acredita permisos
reales desplegados, concurrencia multiconexion ni limites CPU/memoria Edge.

QA pendiente: autor/editor/view/tercero reales, transferir mascota/cambiar avatar
durante procesamiento, error de Storage/timeout, versiones de cliente existentes,
bundle WASM y carga cold/warm. No activar ni retirar legacy antes de esas puertas.

Resultados locales: 26 checks SQL mas assertions Storage/replay, 12 escenarios HTTP
Owner (37 junto con codec/externo/comunitario) y 14 tests API correctos. Deno
check/lint, ESLint types/API/runner, builds types/API/web y exports Android/iOS
correctos. Typecheck types/API/mobile/web/admin correcto. Export no equivale a
instalacion ni QA nativa; no se genero APK/IPA. Diff --check sin errores.
