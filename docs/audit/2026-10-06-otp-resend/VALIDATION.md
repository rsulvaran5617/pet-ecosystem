# Reenvío OTP web — entrega 2026-10-06

Problema: tras vencer el primer código, la web no permitía solicitar otro sin
recargar y perder datos/fotos. Cambiado únicamente el componente
PublicExternalLostPetReportForm.tsx y documentación.

## Resultado

- Acción Solicitar otro código después del primer envío, conservando formulario.
- Expiración mostrada desde expiresAt del servidor; código vencido no se envía.
- CAPTCHA nuevo en cada intento; se reinicia también ante errores/límites.
- Respuesta sin challenge explica espera sin anunciar envío exitoso.
- OTP previo se vacía al emitir nuevo challenge; cambiar correo invalida contexto
  del cliente. No se cambian challenges persistidos ni límites del servidor.
- Widget se retira/recrea al navegar entre Contacto/Revisar; bloqueo de doble
  solicitud y de navegación atrás durante petición en curso.

## Comprobaciones

- Lint y typecheck @pet/web PASS; build Next producción PASS.
- Ocho regresiones de navegador local PASS: CAPTCHA inicial, reinicio después de
  envío, expiración, reenvío conservando foto/datos, límite sin challenge, limpieza
  de OTP anterior, navegación atrás/adelante y cambio de correo.
- Fixtures locales para CAPTCHA/Edge mediante CDP; ninguna petición de correo o
  reporte alcanza backend. No acredita entrega real OTP ni E2E de moderación.
- Primer intento del runner omitió OPTIONS CORS y falló; corregido el fixture de
  preflight, segunda ejecución completa PASS. No fue un fallo de la aplicación.
- Comparación de 178 archivos web/packages/manifiestos con release activo anterior:
  solo cambió el formulario esperado. Configuración pública/privada conservada;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY presente en el cliente compilado.
- Siete rutas candidatas HTTP200; activación con HTML local/HTTPS coincidente,
  proceso Admin intacto y PM2 guardado. Temporal retirado.

## Release

- Activa: `/var/www/pet-releases/otp-resend-20261007`.
- Build: `PEvx_lpapn1SEUyPizbWA`.
- Hora UTC: 2026-10-07T01:47:56.210Z (06/10 en Panamá).
- Rollback: `/var/www/pet-releases/turnstile-20261007`, build
  `HEZ2MMH47ygGl7aedGRQp`, intacto. Recrear solo proceso web con cwd anterior,
  mismo Next en 127.0.0.1:3000, comprobar HTTP y guardar PM2.
- Admin permanece en `/var/www/pet-ecosystem`. Sin migraciones, cambios Edge,
  flags de medios, cron, builds mobile, commit ni push.

Evidencias: activation.json, source-parity.json, browser-regression.json.
Navegador publicado: browser-check.json y review.png (solo carga/paso 4, sin OTP).
Los scripts de activación son específicos de estas rutas/estado; no reutilizarlos
como despliegue genérico. No versionar secretos, códigos ni correos personales.

El usuario debe recargar una vez para obtener el bundle nuevo (el formulario
anterior solo vive en memoria). Después de solicitar el primer código verá la
acción de reenvío y podrá continuar sin recargar. Pendiente prueba humana de
recepción/introducción del nuevo OTP y envío controlado a revisión.
