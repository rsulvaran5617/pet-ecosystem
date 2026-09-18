# Publicación y ampliación Core — 18/09/2026

## Resultado

- Web: no desplegada en esta sesión. SSH a `root@143.198.165.191` fue rechazado con `Permission denied (publickey,password)`. Se solicitó al usuario el alias/usuario o ruta de clave local; no contraseñas en chat. No se ejecutó el script de bootstrap ni se alteraron archivos remotos.
- Sitio publicado: siete rutas HTTP 200, comprobadas a 1440/390 px. Inicio y Ayuda conservan estilos inline y errores React 425/418/423; Inicio desborda a 420 px con viewport de 390 px. No se pudo identificar el commit remoto. En Beta se registraron dos avisos/errores de consola sin excepción JavaScript; no se investigaron sus causas en este bloque. Esto no certifica funcionamiento completo de esas páginas.
- Core: 40 comprobaciones correctas, solo lectura y sesiones QA. Tres cuentas distintas (owner/provider/member) y visitante; perfil propio, preferencias booleanas y denegación de lectura ajena. Hay direcciones y métodos referenciales existentes para owner/provider; miembro no tiene registros propios en esas dos tablas. No se afirma aislamiento sobre filas inexistentes ni se probaron escrituras.
- Cobertura: C04/C06/C07/C08 pasan a evidencia parcial. Total **49/110 parciales, 61 sin ejecución**; ninguna función se declara completamente certificada por estas lecturas.

## Android

Build solicitado: [795bad45-4d7d-48c1-8d4f-2b889b5071df](https://expo.dev/accounts/rsulvaran/projects/pet-ecosystem/builds/795bad45-4d7d-48c1-8d4f-2b889b5071df).

- Commit: `a7b89d393dccc34d067066ce1521d6bffdb44593`.
- Perfil `preview`, distribución interna, formato esperado APK. EAS informa versión nativa `0.0.0`; no confundirla con `0.3.1` de la configuración Expo. No se cambiaron versiones.
- Estado actualizado: **FINISHED**, completado a las 13:56:23 UTC del 18/09/2026. APK descargado en `dist/pilot/android/pet-ecosystem-audit-a7b89d3-20260918.apk`, 129567932 bytes. Firma e integridad ZIP válidas; paquete `com.petecosystem.mobile`, versionCode 1. El bundle contiene la acción de revocación y ambas variables públicas del backend configurado. SHA256: `66e0e6d34de8de87a05a82367b007031547fba2a78115a6e429b8f8b97629004`. Esto no certifica ejecución nativa ni compatibilidad de firma con una instalación anterior.
- EAS informó una incidencia parcial con demoras Android. Primer intento falló con ECONNRESET antes de recibir ID; segundo aceptado. No lanzar otro build duplicado: consultar este ID.
- Se usó worktree aislado `%TEMP%/pet-audit-release-a7b89d3`. Instalación congelada/offline, typecheck y lint mobile correctos. `.easignore` temporal excluye docs e incluye solo las dos variables públicas Supabase de mobile; EAS también detecta sus variables de entorno preview. Los archivos ajenos `app.json` raíz y `onlyoneaccess.txt` no están en esa copia ni se subieron.
- ADB sin dispositivos. No se generó build iOS ni se envió a TestFlight en este bloque. No hubo correos a testers ni notificaciones de distribución.

## Continuación concreta

1. Restablecer acceso SSH; inspeccionar commit/estado remoto antes de actualizar. Publicar la web validada y repetir H07/H08 en el sitio servido. No ejecutar de nuevo las migraciones H01–H06.
2. Conectar un dispositivo QA e instalar el APK ya descargado. Ejecutar `QA_ANDROID_RELEASE.md`: revocación H05, sesión/roles y permisos de documentos. No regenerar el build ni desinstalar automáticamente una versión previa si Android rechaza firma/downgrade.
3. Continuar distribución iOS/TestFlight y QA nativo cuando esté disponible el entorno.
4. Completar CRUD/UI de Core y después los flujos restantes de la matriz; recuperación/OTP y mensajes requieren planificar envíos, que no se ejecutaron aquí.

## Evidencia y reproducción

`evidence/deployed-public-check.json`, `evidence/core-read-isolation.json`, `evidence/release-followup.json` y `evidence/android-artifact.json` guardan resultados sin datos personales ni secretos. Verificador local del APK: `py docs/audit/2026-09-17/verify-android-artifact.py`.

Desde raíz: `node docs/audit/2026-09-17/deployed-public-check.mjs`. Sale 1 si hay fallos; el fallo actual del sitio es esperado hasta publicar.

Desde `packages/api-client`: `node --import ./scripts/smoke/register-ts-loader.mjs ../../docs/audit/2026-09-17/core-read-isolation.mjs`. Solo SELECT y login/logout; requiere cuentas QA existentes. No invoca solicitud de eliminación.
