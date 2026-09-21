# Foundation-1C.3: saneamiento de fotografias

Actualizacion 2026-09-21: [1C.3d](FOUNDATION_1C_READY_MEDIA.md) implementado local con
proyecciones/gateway, variantes, consentimiento Owner y herramientas de conversion
y limpieza tras confirmacion. Ejecucion remota y QA real pendientes; no cierre
operativo de Foundation. Los bloques inferiores conservan el historial 1C.3a-c.

2026-09-21. **Implementacion local: 1C.3a, 1C.3b y 1C.3c**, procesador compartido,
alta externa, upload comunitario opt-in y derivados privados Owner. Migraciones 1C.3b/c preparadas,
NO aplicada. Sin despliegue, backfill ni cierre de Foundation.
Complementa [auditoria](MEDIA_PRIVACY_AUDIT.md) y
[delta comunitario](FOUNDATION_DELTA_ASSESSMENT.md).

## Implementado

- `supabase/functions/_shared/pet-alert-media.ts`: procesador de bytes en servidor,
  sin pet_id, household_id, URL remota, ruta de Storage ni permisos enviados por
  el cliente. El caller autoriza antes; el codec no concede acceso a recursos.
- Dependencia fijada `@imagemagick/magick-wasm@0.0.43`, Apache-2.0, integridad en
  deno.lock del Edge existente. No dependencia nueva mobile/web ni SDK externo
  para enviar fotos. No moderacion IA ni deteccion de contenido ofensivo.
- JPG/PNG/WebP: formato detectado por decoder debe coincidir con MIME declarado.
  Limite entrada 5 MiB, 12 millones de pixeles y 12.000 por eje. Ping previo al
  decode completo; rechaza animacion/multiples imagenes y datos corruptos.
- Politica ImageMagick: solo JPEG/PNG/WEBP, sin delegates/filtros/lecturas
  indirectas, cache pixel 128 MiB, sin spill a disco, un thread. List-length 2
  permite decodificar una imagen; check explicito exige exactamente una.
- autoOrient antes de strip; conversion sRGB, transparencia sobre blanco;
  elimina perfiles/atributos y re-encodea JPEG. No recorta ni agranda.
  Display hasta 1600x1600, thumbnail hasta 480x480, calidad 85/80.
  Los buffers se copian antes de liberar el objeto WASM.
- Errores de codec se normalizan sin imprimir metadatos ni diagnosticos del
  archivo. Fallo de inicializacion no habilita fallback al original.

## Integracion externa

`pet-alert-external-report/index.ts` conserva Deno.serve como entrypoint;
`handler.ts` permite comprobar HTTP sin iniciar servidor o conectarse a Supabase.

Secuencia: origen/metodo -> cuerpo acotado -> CAPTCHA/datos -> consumo OTP ->
sanear TODAS las fotos -> crear alerta pending_review -> subir SOLO display JPEG
-> metadata -> token privado. No cambia contrato del formulario ni moderacion.
Request JSON maximo 64 KiB; multipart 21 MiB, comprobando bytes del stream aunque
Content-Length falte o sea falso. La entrada original no se persiste en este camino.

Si una foto falla, no se crea la alerta ni se sube ninguna foto del lote.
El OTP ya se consumio antes del trabajo de codec para no ofrecer procesamiento
caro a quien no verifico. El mensaje de foto invalida indica solicitar otro codigo.
No se implementa todavia reintento idempotente que conserve el OTP/autorizacion.
Fallos de infraestructura conservan respuesta generica, sin detalles privados.

La metadata y el nombre aleatorio del objeto usan image/jpeg/.jpg; no nombre del
archivo del usuario. El thumbnail se genera y prueba, pero **no se almacena ni
se conecta al directorio en esta entrega**, para no duplicar fotos en galerias
sin contrato de variantes. El esquema actual conserva un objeto por foto.

## Preparacion y pruebas reproducibles

Con Deno disponible, desde la raiz:

```powershell
deno run --frozen --allow-read --allow-write=supabase/functions/_shared/generated --config supabase/functions/pet-alert-external-report/deno.json supabase/functions/_shared/prepare-pet-alert-media.ts
deno check --frozen --config supabase/functions/pet-alert-external-report/deno.json supabase/functions/pet-alert-external-report/index.ts
deno test --frozen --allow-read --allow-env --config supabase/functions/pet-alert-external-report/deno.json supabase/functions/_shared/pet-alert-media.test.ts supabase/functions/pet-alert-external-report/index.test.ts
deno lint --rules-exclude=no-import-prefix supabase/functions/_shared/pet-alert-media.ts supabase/functions/_shared/pet-alert-media.test.ts supabase/functions/_shared/pet-alert-media.fixtures.ts supabase/functions/_shared/prepare-pet-alert-media.ts supabase/functions/pet-alert-external-report/index.ts supabase/functions/pet-alert-external-report/handler.ts supabase/functions/pet-alert-external-report/index.test.ts
git diff --check
```

Se conserva la convencion npm: de la funcion; por eso se excluye solamente esa
regla de estilo del lint Deno, no reglas de seguridad/tipado. En esta maquina se
ejecuto Deno 2.9.6 desde npm-cache, sin instalarlo globalmente.

El paso prepare copia el WASM de la dependencia fijada al directorio generado
ignorado por Git. config.toml declara ese asset con static_files; runtime lo lee
por URL relativa estable. No depende de descargar codigo remoto por cada foto.
WASM x86: 14.828.458 bytes; SHA256
`5a4ed1017eda113144c86ae839c22c610afebcfebfa22b1da18e00e98d78b0f7`.
Ejecutar prepare en cada checkout/CI antes de empaquetar, no versionar node_modules
ni el binario generado. Mantener lockfile congelado; no cambiar codec en un deploy.

Pruebas locales: nueve escenarios de codec y siete del handler correctos.
Fixtures sinteticas en worker separado para no relajar la politica del procesador;
JPEG con EXIF GPS/IPTC, PNG y WebP con EXIF/XMP, comentarios, orientacion,
dimensiones, corrupcion, MIME falso, SVG, animacion y recuperacion tras rechazo.
Handler: deniega sin verificacion/origen, no publica parcialmente ante segunda foto
invalida, almacena JPEG saneado, conserva pending_review y acota cuerpos HTTP.

El fetch del handler esta simulado, sin red, credenciales reales, envio de correo
ni modificaciones en Storage/Supabase. NO acredita RLS, acceso anon a objetos,
performance alojada, borrado de huerfanos o concurrencia. Fixtures no son fotos de
usuarios. deno check/lint correctos; no nuevo build de mobile/web necesario para
probar este codigo local de servidor.

## Puertas pendientes antes de desplegar

1. Empaquetar y servir con runtime Supabase y static_files; verificar que el WASM
   llega al bundle. Deno local no acredita compatibilidad de Edge alojado. No
   usar despliegue API que omita assets. Esta entrega no ejecuto deploy.
2. Medir CPU/memoria con cuatro fotos de limite, peticiones concurrentes y cold/warm
   starts. El limite de cache NO es limite total de memoria del proceso. El codec
   es sincrono; no hay falso timeout con Promise.race. La cuota CPU/timeout de
   Edge sigue siendo el corte efectivo; si no alcanza, separar trabajo por foto
   en worker/job autorizado antes de lanzar, no subir limites a ciegas.
3. Ensayo controlado OTP/CAPTCHA, error Storage y cleanup, revision admin y lectura
   publica del derivado con actores reales. Alta + objetos no son una transaccion:
   el cleanup anterior sigue siendo compensatorio y necesita hardening para
   huerfanos/reintentos y revision admin concurrente. No certificar atomicidad.
4. Preservar rollback del bundle anterior; no cambiar permisos ni datos legacy
   como parte de este subpaso. Saneamiento de fotos nuevas no limpia las antiguas.

## Resto de 1C.3 (NO terminado)

| Subpaso | Entrega pendiente |
| --- | --- |
| 1C.3b | Implementado local y desactivado; falta QA real/rollout coordinado antes de cerrar subida directa |
| 1C.3c | [Derivados privados Owner](FOUNDATION_1C_OWNER_MEDIA.md) implementados localmente, sin conexion UI/proyeccion publica ni activacion |
| 1C.3d | Implementado local: variantes/ready, gateway, consentimiento y mantenimiento opt-in. Pendientes ejecucion de backfill/limpieza y QA/rollout reales |
| QA/release | RLS/JWT reales, fallo/reintento/concurrencia, carga en Edge y dispositivos; activar solo tras comprobar cobertura completa |

1C.3a no modifico SQL; 1C.3b prepara cambios aditivos sin aplicarlos. Siguen existiendo caminos de
subida directa y proyeccion legacy: **no afirmar saneamiento universal ni cerrar
el riesgo EXIF global**. Cerrar esas puertas antes de habilitar SOS ampliado.

## Foundation-1C.3b: upload comunitario controlado

- Migracion local `20260921120000_pet_sos_community_photo_uploads.sql`.
  Jobs privados sin grants cliente; RPCs prepare/finalize/abort solo service_role.
  Edge verifica JWT mediante Auth.getUser; nunca acepta actor del request.
  Reutiliza can_manage (autor o admin) sin exigir hogar/Pet/perfil Owner completo.
- POST binario a `pet-alert-community-photo`, Content-Type JPG/PNG/WebP;
  headers `x-pet-report-id` UUID y `x-pet-photo-order` 0..2. Maximo 5 MiB medido
  sobre el stream. Origin web debe estar en PET_ALERT_ALLOWED_ORIGINS; native sin
  Origin sigue necesitando JWT. Preflight no procesa fotos.
- Idempotencia por reporte/actor/slot/SHA256 calculado en servidor. Preparar
  bloquea cuota de actor y reporte; reserva 2 minutos, 9 jobs nuevos/hora/actor,
  hasta 5 intentos/job y tres slots. No supone transaccion Storage+Postgres.
- Cada intento usa ruta inmutable `report/sos-v1/attempt.jpg`. Solo display JPEG
  saneado se sube; nunca original. Finalizar vuelve a comprobar autor, estado
  operativo, expiracion, lease, intento y objeto existente, luego inserta metadata
  y auditoria atomicamente. Metadata processing_version=legacy|sos-v1.
- Repetir listo devuelve URL firmada (15 minutos) sin duplicar metadata/auditoria.
  Abort solo autoriza borrar el intento aun pendiente; un commit incierto, ready
  o intento antiguo NO permite borrar. Cleanup incierto deja objeto privado.
- Trigger impide a clientes falsificar metadata sos-v1. Policies restrictivas
  impiden escribir/actualizar/borrar objetos del namespace reservado y leerlos
  antes de metadata publica. No convierte el bucket en publico.
- Borrar metadata conserva tombstone (media_id null): repetir la misma foto en
  el mismo slot no la resucita. Reinsertar deliberadamente esa foto exacta no se
  ofrece en este slice. Huerfanos y TTL de intentos quedan para 1C.3d.
- Cliente compartido opt-in `sanitizedCommunityPhotos`; factories mobile/web usan
  `EXPO_PUBLIC_PET_ALERT_SANITIZED_UPLOADS` y `NEXT_PUBLIC_PET_ALERT_SANITIZED_UPLOADS`.
  Solo literal true activa. Por defecto false; ninguna llamada fallida vuelve al
  camino legacy. La UI no incorpora cola persistente ni nuevo boton de reintento:
  idempotencia es del contrato de subida sobre el mismo reporte/slot/bytes.

### Verificacion y activacion

```powershell
node supabase/tests/pet-sos-community-media.test.mjs
deno check --frozen --config supabase/functions/pet-alert-community-photo/deno.json supabase/functions/pet-alert-community-photo/index.ts
deno test --frozen --allow-read --allow-env --config supabase/functions/pet-alert-community-photo/deno.json supabase/functions/pet-alert-community-photo/handler.test.ts
corepack pnpm --filter @pet/api-client test
```

Comparte lockfile fijado con alta externa y asset WASM generado por prepare.
Validacion local 2026-09-21: migracion PGlite correcta; 25 pasos Deno (codec,
alta externa y endpoint comunitario), 12 tests API (8 SOS y 4 de upload),
lint/typecheck API/mobile/web, build web y export Android/iOS correctos.
Sin APK/IPA, pruebas en dispositivo, publicacion ni deploy. git diff --check
sin errores (avisos habituales de conversion LF/CRLF).
PGlite ejecuta migracion real sobre fixtures de dependencias y policies
deliberadamente permisivas para probar el bloqueo restrictivo. HTTP usa fetch
simulado y codec real. No prueba politicas completas remotas, JWT reales,
concurrencia multiconexion ni CPU/memoria alojada.

Orden antes de activar: revisar/aplicar SOLO esta migracion autorizada, preparar
WASM y desplegar endpoint, probar sesiones reales autor/tercero/anon y fallos,
medir carga, despues compilar cliente piloto con flag true. No aplicar cron de
reservas pendiente. Rollback cliente flag false conserva ruta legacy; no borrar
metadata ni migracion. Legacy sigue abierto para binarios publicados y exige
cierre coordinado posterior, no afirmar saneamiento universal.

## Referencias tecnicas

- [Supabase: manipulacion de imagenes](https://supabase.com/docs/guides/functions/examples/image-manipulation): WASM para Edge, no Sharp nativo.
- [Supabase: WASM y assets](https://supabase.com/docs/guides/functions/wasm): empaquetado static_files y validacion de despliegue.
- [Magick WASM 0.0.43](https://github.com/dlemstra/magick-wasm/tree/0.0.43): codec y licencia; limites no sustituyen controles por actor/recurso.
