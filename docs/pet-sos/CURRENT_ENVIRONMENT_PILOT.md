# Piloto SOS en el entorno actual

## Estado actualizado 2026-09-26

- Runtime Docker disponible. Procesadores Owner, Community y External v1 ACTIVE
  desplegados con WASM; gateway v2 conservado. Secretos de correo/CAPTCHA presentes.
- Auth registro/codigo/login confirmado por el usuario. Reporte externo completo
  aun pendiente de QA manual; no equiparar ambos circuitos.
- Deno 5 tests/44 pasos PASS; pilot-http-check.json registra 7 checks HTTP PASS
  sin mutaciones ni correos. No demuestra procesamiento real remoto de imagenes.
- Candidata web /var/www/pet-releases/sos-services-d646476, build
  nOz0xh6TKi0JVHOZnHY03, incluye Site Key y seis rutas HTTP 200 en puerto 3074.
- Activacion bloqueada por politica de herramienta, sin ejecutar. Web y Admin
  conservan /var/www/pet-releases/sync-7c9fabb. PM2 pet-sos-web-candidate sigue
  disponible; inspeccionar estado antes de retomar y no crear otra candidata.
- Flags nuevos/ready_only false. Una alerta activa, cero reportes comunitarios,
  31 objetos; no conversion, limpieza, migracion, nuevas betas ni commit/push.
- Pendiente: operador activa candidata con rollback al release anterior; verificar
  HTTPS y PM2. Luego prueba humana de CAPTCHA/OTP/fotos y moderacion, sin
  publicar reportes ficticios. Las notas iniciales siguientes son historicas.

## Autorizacion y limites

Activacion manual de esta candidata: copiar `scripts/activate-sos-web-20260926.mjs`
a `/var/www/pet-releases/sos-services-d646476/activate-web.mjs` y ejecutarlo con
Node en la gota. Valida commit/build, candidata y web anterior antes de cambiar
solo PM2 web; verifica HTTP local/HTTPS y restaura la anterior si falla.
No es un deploy generico de futuros commits. No cambia env, flags ni Supabase.
La ejecucion queda a cargo del operador; crear el script no acredita activacion.

2026-09-21: el usuario autoriza continuar en el proyecto actual como piloto
controlado, sin crear otro proyecto Supabase. Esto sustituye la recomendacion
previa de exigir staging separado; NO acredita QA ni autoriza borrar datos reales.

Base de codigo: d64647675a4751194dc3005e6d9e57ddbfac163c.
Las cuatro migraciones Foundation-1C.3 estan aplicadas. No reaplicarlas ni incluir
el cron de reservas diferido. No ejecutar backfill o limpieza masiva.

## Inspeccion inicial

- Proyecto vinculado coincide con configuracion de las apps.
- Cero alertas y cero reportes comunitarios; 31 objetos de fotos existentes.
- ready_only=false; no cambio global de Storage ni consentimiento.
- Sin backups administrados ni PITR disponibles en la respuesta de Management API.
  Esto NO demuestra ausencia de copias externas; no hay recuperacion certificada.
- Web/admin activos en /var/www/pet-releases/sync-7c9fabb, PM2 online.
- Al iniciar no habia funciones Edge desplegadas. Consulta de secretos no mostro
  configuracion de Resend, Turnstile, origen permitido ni flags SOS.
- iOS 0.3.1 (50) y APK d646476 conservan flags false; no sirven para probar
  consentimiento y retirada de fotos. No confundir distribucion con adopcion.

## Reanudacion 2026-09-21 23:13 UTC

- Inventario actualizado: UNA alerta active/share_enabled=true, cero reportes
  comunitarios y 31 objetos. El inventario inicial vacio ya no es vigente.
  No se consultaron datos personales ni se modifico la alerta.
- Gateway pet-alert-public-photo v1 ACTIVE, verify_jwt=false por contrato publico;
  flag servidor ausente, GET inexistente 404 vacio/no-store y POST 405.
- Docker Desktop iniciado, motor 28.3.3 disponible. El primer deploy se detuvo
  durante pull del runtime, antes de empaquetar Owner. Consulta posterior desde
  la gota confirmo solo el gateway, sin despliegues parciales adicionales.
- Reintento public.ecr.aws/supabase/edge-runtime:v1.74.3 fallo por TLS handshake
  timeout. Reintento docker.io/supabase/edge-runtime:v1.74.3 se estanco descargando
  la capa 662b1f44f1ee; se detuvo solo ese cliente pull, sin borrar cache Docker.
- CLI usada 2.116.0. No sustituir el bundle WASM por --use-api: la documentacion
  oficial no garantiza static_files en esa via. Gateway no requiere WASM.
- Management API local presento tambien ECONNRESET/timeouts; la inspeccion remota
  via SSH funciono. No se instalaron herramientas nuevas ni Docker en la gota.
- No se habilitaron flags, no corte DB, no nuevas compilaciones, no conversion,
  no limpieza ni cambios de web/admin. No QA funcional/nativa certificada.

Reanudar verificando primero inventario remoto y runtime local:

```powershell
node docs/audit/2026-09-21-sos-ready-media/pilot-preflight.mjs
docker pull supabase/edge-runtime:v1.74.3
docker image inspect supabase/edge-runtime:v1.74.3 --format '{{.Id}}'
```

Solo tras descarga completa, usar CLI autenticada con project-ref validado y
desplegar explicitamente pet-alert-owner-photo, pet-alert-community-photo y
pet-alert-external-report con WASM preparado. No usar --prune ni desplegar todas
las funciones. No reintentar mutaciones remotas ante un timeout sin inventario.
No hay proceso de despliegue/pull de este intento que deba mantenerse esperando.

## Orden de habilitacion

1. Desplegar gateway y procesadores con sus assets WASM. No activar ready_only.
2. Verificar runtime alojado, JWT, permisos de otro hogar y procesado real con
   fixtures privados identificados. No publicar boletines ficticios al directorio.
3. Obtener copia recuperable del esquema/configuracion y de datos/objetos afectados
   antes del corte. Una copia DB no incluye archivos de Storage.
4. Configurar correo y CAPTCHA del circuito externo sin bypass. Credenciales solo
   en secretos Edge; clave publica Turnstile en compilacion web.
5. Preparar web/admin y builds iOS/APK con ambos flags cliente pertinentes.
   Verificar artefactos y distribuir a testers existentes, sin cambiar grupos.
6. Confirmar instalacion por participantes y ventana del piloto; repetir inventario
   por si aparecieron alertas durante la preparacion.
7. Habilitar secretos de medios y corte DB de manera coordinada. Un despliegue
   de binarios no sustituye esta comprobacion ni la autorizacion de consentimiento.
8. Ejecutar recorrido Owner, visitante, otro Owner y moderador; registrar resultados
   observados, version, dispositivo e IDs privados solo en evidencia restringida.

## Configuracion y pendientes

Configurados: PET_ALERT_ALLOWED_ORIGINS, RESEND_API_KEY, PET_ALERT_FROM_EMAIL,
PET_ALERT_OTP_PEPPER y PET_ALERT_TURNSTILE_SECRET_KEY. La candidata incluye
NEXT_PUBLIC_TURNSTILE_SITE_KEY; falta activarla y validar CAPTCHA real.
PET_ALERT_OWNER_DERIVATIVES_ENABLED y PET_ALERT_PUBLIC_MEDIA_ENABLED siguen
sin activar. No compartir secretos en chat o Git.

Consultar ENVIRONMENT_VARIABLES.md y FOUNDATION_1C_READY_MEDIA.md para flags
cliente y orden. No sustituir configuracion de Auth SMTP por Resend de PET ALERT:
son circuitos distintos. No usar llaves de prueba CAPTCHA para abrir el sitio real.

## Guion y resultados esperados

- Owner publica sin consentir foto: boletin sin avatar privado.
- Owner autoriza: solo derivados saneados visibles, no archivo fuente ni EXIF/GPS.
- Owner retira: nuevas peticiones dejan de servir foto; avatar privado conservado.
- Visitante consulta ficha/QR sin sesion. Tengo informacion exige iniciar sesion;
  no prometer envio anonimo de avistamiento vinculado.
- Otro Owner no puede modificar alerta ni acceder al original ajeno.
- Externo verifica correo/CAPTCHA, espera moderacion, admin aprueba; solo entonces
  aparece en directorio. No confundir este flujo con futuras capacidades SOS.
- Recuperacion cambia estado; fallos/reintentos no duplican ni publican originales.

## Recuperacion

Conservar release web/admin anterior y builds previos. Antes de desplegar sobre
una funcion existente, guardar su version/bundle recuperable. No habia funciones
previas al iniciar este piloto. Mantener gateway si existen enlaces emitidos.
No revertir SQL ni borrar objetos para deshacer UI. Un rollback a legacy respeta
decisiones include/exclude, no promete recuperar copias descargadas previamente.

## Evidencia

`docs/audit/2026-09-21-sos-ready-media/pilot-preflight.mjs` es solo lectura remota;
registra inventario agregado y rechazo del gateway sin valores de secretos.
`pilot-preflight.json` contiene el estado observado mas reciente, no certifica QA.
Pruebas locales ejecutadas: codec y handlers, 4 tests / 37 pasos PASS.
La prueba funcional en iPhone y la activacion global siguen pendientes.
