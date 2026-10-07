# Turnstile web — corrección publicada

Fecha local: 2026-10-06, America/Panama; activación UTC 2026-10-07T01:21:31.104Z.

## Causa y procedencia

El formulario externo mostraba «La validación de seguridad no está configurada».
PM2 web servía `/var/www/pet-ecosystem`, build `F5U_dy3hVL_KltFglqcEz`, cuyo
`.env.production` no contenía `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
El checkout activo no tenía metadatos Git utilizables. Se compararon por SHA256
178 archivos de apps/web, packages y manifiestos/configuración raíz con el release
SOS d646476 y con la nueva copia: ninguna diferencia. No se cambió código funcional.

La candidata antigua sí se había activado: su activation.json registra
2026-09-26T19:17:15.806Z. Posteriormente se sustituyó el proceso por la ruta raíz
(creación PM2 observada por el usuario a las 19:33 UTC). La causa de esa sustitución
no se investigó; no atribuirla a un operador o herramienta. Las notas históricas de
«activación bloqueada» no describen ya el estado actual.

## Entrega

- Copia aislada: `/var/www/pet-releases/turnstile-20261007`.
- Conserva las variables de la web activa; agrega únicamente la Site Key pública
  recuperada del release SOS anterior, sin imprimirla ni versionar archivos env.
- Instalación offline con lockfile y build Next correctos, incluidas comprobaciones
  de tipos del build. Aviso no bloqueante de Browserslist desactualizado.
- Build nuevo: `HEZ2MMH47ygGl7aedGRQp`.
- Siete rutas candidatas HTTP200; clave presente en JavaScript cliente compilado.
- Activación: proceso web con cwd nuevo; HTML local y HTTPS coincide con candidata;
  PM2 guardado, proceso candidato retirado, PID/cwd Admin conservados.
- Rollback: `/var/www/pet-ecosystem`, build anterior intacto. Recrear solo proceso
  `pet-ecosystem-web` con ese cwd y el mismo comando Next/puerto 3000; verificar y
  guardar PM2. No reconstruir encima de la versión activa ni restaurar todo el dump.
- Sin cambios de Supabase, secretos Edge, flags de medios, cron, mobile o datos.

## Navegador y límites

Chrome automatizado recorrió los cuatro pasos con datos sintéticos solo en memoria.
El aviso de configuración faltante desapareció; API Turnstile y widget cargaron.
La captura muestra el widget en «Verificando…». Sin excepciones runtime ni errores
de consola registrados. Botón de solicitar código aún deshabilitado: no se certifica
resolución humana del CAPTCHA, envío/recepción OTP ni reporte/moderación completos.
No se intentó superar automáticamente el CAPTCHA ni se enviaron correos/reportes.

El campo `challengeFramePresent=false` de la inspección CDP no niega la presencia
visual del widget: la captura y el contenedor/campo Turnstile confirman su carga.
`passed` en browser-check.json significa carga/configuración, no flujo E2E aprobado.

Evidencia: activation.json, source-parity.json, browser-check.json y review.png.
Runners: activate.cjs (preflight sin argumentos; --activate solo para las rutas
exactas y estado anterior esperado), browser-check.mjs (no solicita OTP ni envía).

Siguiente: usuario recarga la web y completa verificación humana en paso 4; solicita
un código a su correo y comprueba recepción. No publicar casos ficticios al directorio.
Para futuras compilaciones, conservar NEXT_PUBLIC_TURNSTILE_SITE_KEY en el entorno
de build; un reinicio de PM2 no incorpora variables NEXT_PUBLIC nuevas al bundle.

## Seguimiento OTP del usuario

Consulta de solo lectura tras reporte de correo no recibido: una solicitud creada
2026-10-07T01:27:28Z, vence a las 01:37:28Z, sin consumo ni intentos de código.
Logs de invocación confirman POST 200 a pet-alert-external-report a las 01:27:28Z.
La ruta implementada responde con challenge tras aceptar Resend el envío; esto
indica aceptación por proveedor, no entrega a Hotmail. No se consultaron códigos,
hashes OTP, contenido del mensaje ni datos de otras personas. No se hizo reenvío.
Sin credencial Resend disponible en los env locales/remotos revisados; falta
consultar el evento de entrega en su panel y revisar carpeta no deseada del usuario.
