# Acceso profesional desde QR - 2026-10-25

Cambio publicado: acciones visibles Iniciar sesion/Crear cuenta, retorno al mismo QR
desde /app tras autenticacion/verificacion, cuenta conectada y cambio de cuenta,
enlace desde archivos bloqueados al panel profesional. Se reutilizan formularios
Core y sus validaciones; no hay consulta de existencia de correo ni auth duplicada.
El retorno solo admite token hexadecimal de 64 caracteres; no URLs arbitrarias.

Validacion: build Next web PASS (incluye lint/tipos); typecheck y lint standalone
PASS. 13 casos Chrome con componentes React reales y APIs simuladas PASS:
entrada anonima, pantalla estrecha, registro/login y retorno, cuenta actual,
logout, permisos aun necesarios, rechazo de redirecciones externas y sin errores.
Regresion del visor PDF: 16 casos PASS (documentos, expiracion, revocacion/logout).
No se creo cuenta productiva ni se probo OTP real, Safari/iPhone o Android fisico.

Sin cambios de RPC/RLS/Storage/mobile. Fuente 19ed1a2 enviada a origin/master.
Publicado mediante scripts/update-clinical-auth.ps1, incluyendo los dos paneles,
CoreExperienceScreen y useClinicalAuthReturn. Build, lint/tipos remotos PASS;
candidata, hashes PDF worker/fuente, HTTPS, manifest y cwd PASS. PM2 guardado.
Release: /var/www/pet-releases/clinical-auth-19ed1a2-1792944415.
Build: jVmyl74WXDweZdWxIw5SX.
Rollback: /var/www/pet-releases/clinical-viewer-75f3329-1792938614.
Admin y destino Android 5phib3mfoc2go conservados. Sin nuevos builds mobile.

Cinco comprobaciones en navegador publicado PASS: acciones visibles, enlace
archivo bloqueado, formularios Core reales login/registro conservando QR y sin
excepciones JS. Fixture clinico sintetico interceptado solo en navegador limpio;
no OTP real ni acceso a mascota productiva. Evidencia deployed-results.json y
web-deploy.json. Dos primeros intentos del test corrigieron serializacion de DOM
y comparacion del texto transformado a mayusculas; no fueron errores de la app.
