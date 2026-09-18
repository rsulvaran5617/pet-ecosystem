# Auditoría por roles — 17/09/2026

Abrir `INFORME_AUDITORIA.pdf` para lectura, `INFORME_AUDITORIA.html` para filtrar la matriz o `MATRIZ_110_FUNCIONES.csv` en una hoja de cálculo.

Resultado: ocho hallazgos; 49 de 110 fichas con alguna evidencia funcional parcial y 61 sin ejecución. No es una certificación completa. La aplicación mobile exporta para Android/iOS, pero no se probaron dispositivos.

Seguimiento de publicación y nuevas pruebas Core: `PUBLICACION_Y_CORE.md`. La web publicada todavía reproduce errores de Inicio/Ayuda; SSH requiere autenticación disponible. Android a7b89d3 compilado, descargado y verificado estáticamente; instalación y QA en dispositivo pendientes. Protocolo: `QA_ANDROID_RELEASE.md`.

Actualización: H01–H06 tienen correcciones aplicadas al servidor vinculado. Ver `CORRECCION_CLINICA.md` y `CORRECCION_REINTENTOS.md`. H04/H05 tienen clientes locales implementados y pruebas de recuperación web, con publicación y QA nativo pendientes; H06 pasó regresiones y dos carreras reales; H07/H08 están corregidos y validados en web local, pendientes de despliegue; ver `CORRECCION_WEB.md`. Ver `CORRECCION_CAPACIDAD.md`. Los scripts originales conservan reproducciones del baseline, no el estado posterior a la corrección.

`Pet-Ecosystem-Auditoria-Roles.zip` contiene PDF, HTML, Markdown descargable, CSV y las notas `CORRECCION_CLINICA.md`, `CORRECCION_REINTENTOS.md`, `CORRECCION_CAPACIDAD.md` y `CORRECCION_WEB.md`. La evidencia detallada queda en `evidence/` y no forma parte del ZIP de lectura.

## Regenerar el documento

Desde la raíz del repositorio:

```powershell
node docs/audit/2026-09-17/build-report.mjs
node docs/audit/2026-09-17/render-report.mjs
```

Editar `INFORME_AUDITORIA.md` para cambiar el texto y `build-report.mjs` para actualizar la correspondencia de casos con las 110 fichas. El Markdown descargable agrega las comprobaciones técnicas y los totales de cobertura; no editarlo directamente.

## Scripts de auditoría

Los scripts API se ejecutan desde `packages/api-client` con el loader local:

```powershell
node --import ./scripts/smoke/register-ts-loader.mjs ../../docs/audit/2026-09-17/capacity-permissions.mjs
```

Estas pruebas escriben en el backend configurado. No son comprobaciones de solo lectura y no se deben ejecutar como una suite indiscriminada: crean fixtures, reservas, invitaciones internas, perfiles y registros. `clinical-probe.mjs` se detiene si ya existe un perfil clínico para proteger la identidad existente. El perfil QA creado en esta sesión quedó suspendido. Una nueva reproducción requiere preparar expresamente otro contexto QA o adaptar el script a los fixtures ya creados.

Los runners registran resultados y errores en JSON. Un exit code cero indica que el runner llegó al final; **no reemplaza la lectura de `checks[].passed`**, que incluye los hallazgos esperados en esta auditoría. `cleanup` documenta la restauración de visibilidad y permisos de los fixtures.

`web-probe.mjs` requiere la web local en el puerto 3100 y captura evidencia de navegador. `public-web-recheck.mjs` recorre páginas públicas. `browser-session.mjs` usa un perfil temporal separado de Chrome y no usa el perfil personal del usuario.

No versionar `.env`, contraseñas, tokens de sesión, grants QR ni URLs firmadas. Los logs de compilación y lint están ignorados por la regla general `*.log`; el resumen portable es `evidence/technical-validation.json`.
