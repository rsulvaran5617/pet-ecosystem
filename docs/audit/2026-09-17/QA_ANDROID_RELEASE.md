# QA Android del release de auditoría

Commit de producto: `a7b89d393dccc34d067066ce1521d6bffdb44593`.
Build EAS: `795bad45-4d7d-48c1-8d4f-2b889b5071df`, perfil preview.
APK local: `dist/pilot/android/pet-ecosystem-audit-a7b89d3-20260918.apk`.

## Estado

Pendiente de dispositivo: ADB no detecta teléfonos y no hay AVD configurados. Esta lista es un protocolo de prueba, no evidencia de ejecución. La firma y el contenido estático del APK se registran por separado en `evidence/android-artifact.json`.

## Preparación e instalación

1. Conectar un teléfono QA con depuración USB y autorizar esta computadora. Verificar que `adb devices` muestra estado `device`.
2. Consultar si `com.petecosystem.mobile` está instalado y registrar su versión. Instalar con `adb install -r dist/pilot/android/pet-ecosystem-audit-a7b89d3-20260918.apk`.
3. Si Android rechaza la firma o el downgrade, detenerse y conservar los datos existentes; no desinstalar automáticamente. Registrar el error y acordar un dispositivo/perfil de pruebas compatible.
4. Abrir la app y confirmar conexión al backend configurado, sin imprimir credenciales. Usar únicamente cuentas y registros QA.

## Casos por ejecutar

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| AND-A01 | Abrir, iniciar sesión owner, cerrar y reabrir | Inicio correcto, sesión persistente, sin crash |
| AND-A02 | Cambiar entre roles concedidos | Cada rol muestra su experiencia; no concede permisos nuevos |
| AND-A03 | Abrir expediente de mascota QA | Solo datos del hogar autorizado |
| AND-A04 | Preparar una autorización clínica QA completada y todavía vigente | Historial muestra Revocar permisos pendientes |
| AND-A05 | Revocar desde Android y recargar historial | Permiso revocado; atención e historial conservados |
| AND-A06 | Intentar adjuntar con esa autorización desde cliente profesional QA | Servidor rechaza; no aparece documento nuevo |
| AND-A07 | Consultar autorización vencida o revocada | No ofrece la acción de revocación residual como autorización vigente |
| AND-A08 | Cerrar sesión y abrir expediente anterior | No conserva acceso autenticado a datos privados |

La preparación de AND-A04 requiere un contexto QA nuevo o preparado expresamente: el profesional de las regresiones previas permanece suspendido y sus accesos revocados. No reactivar perfiles ni reutilizar autorizaciones vencidas a ciegas. Guardar evidencias sin nombres personales, mensajes, tokens o QR válidos; registrar limpieza de los fixtures.

## Cierre

Registrar dispositivo/Android, hash de APK, fecha, resultado por caso y fallos. Solo marcar QA nativo realizado cuando estos recorridos se hayan ejecutado. La validación del APK no certifica cámara, notificaciones, QR ni el resto de las 110 funciones.
