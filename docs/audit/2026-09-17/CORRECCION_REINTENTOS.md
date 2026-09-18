# Corrección clínica H04/H05: reintentos y revocación residual

Estado al 17/09/2026 Panamá: **migración aplicada y comprobada en el servidor vinculado; web validada localmente; cambio mobile implementado, sin prueba en dispositivo. Publicación de clientes pendiente.**

## Comportamiento

- El profesional puede repetir la confirmación con la misma clave y contenido y recuperar el resultado original, incluso si luego se retiró el permiso. Esa recuperación no añade datos ni restaura permisos. Otra cuenta, otra autorización o contenido diferente no pueden reutilizar la operación.
- Si se guardó la atención pero falló el adjunto, web muestra «La atención está guardada» y «Reintentar documento». Conserva en memoria el archivo, las claves y la fase alcanzada; una respuesta perdida no provoca otra atención. Recargar/cerrar la página pierde este contexto en memoria: no se añadió persistencia de datos clínicos en el navegador.
- El cliente intenta confirmar un documento ya subido antes de volver a subirlo. Una confirmación ya finalizada devuelve éxito sin otra escritura. No sobrescribe archivos existentes. Los documentos pendientes siguen sujetos a todos los controles de vigencia y permisos.
- El propietario puede revocar una autorización `completed`. La solicitud pasa a `revoked`; preparar documentos, subirlos o finalizar pendientes queda bloqueado, y el historial ya finalizado permanece. Repetir la revocación no duplica la auditoría.
- Mobile agrega «Revocar permisos pendientes» a las autorizaciones completadas aún vigentes. El permiso efectivo lo decide siempre el servidor. Esta pantalla requiere un nuevo cliente distribuido y QA nativo.

## Implementación y despliegue

Migración `supabase/migrations/20260918020000_clinical_retry_and_residual_revocation.sql`. Reemplaza cuatro funciones existentes, conserva firmas y privilegios, y reutiliza el guard privado instalado para H01–H03. No introduce tablas ni DTOs. Las claves quedan ligadas al contenido original; los bloqueos de solicitud serializan reintentos de esa solicitud.

El preflight comparó las cuatro definiciones remotas con sus fuentes esperadas y comprobó que el proyecto vinculado coincide con la configuración de la app. La candidata se probó dentro de ROLLBACK antes de aplicar únicamente esta migración y registrar su versión. Evidencia: `evidence/clinical-retry-deploy.json`. No hubo push global, commit, push Git, despliegue web ni distribución mobile.

## Pruebas

| Nivel | Resultado | Alcance |
| --- | --- | --- |
| SQL local | 36/36 | Reproduce H04/H05 en baseline y conserva 21 regresiones de H01–H03; PGlite temporal |
| Cliente y servicio web | 9/9 | Fallos y respuestas perdidas en guardar, preparar, subir y finalizar; mocks de transporte |
| PostgreSQL remoto | 25/25 antes y después | Funciones reales, permiso del propietario y bloqueos posteriores a revocación; fixtures revertidos |
| Navegador y Storage reales | 7/7 | Login profesional QA, guardar atención con PNG, perder respuesta de subida, reintentar, comprobar timeline owner y revocar permiso completed |

La prueba de navegador realizó una sola finalización de atención, una preparación y una subida; el reintento confirmó el objeto existente. Capturas `clinical-retry-partial.png` y `clinical-retry-complete.png`. Las capturas son de web local, no de producción ni de una app nativa.

El perfil QA se habilitó temporalmente mediante gestión de fixtures porque la revisión administrativa no permite volver de suspended a verified. Se restauró su suspensión y vencimiento previo al terminar. Se revocaron acceso y autorización. La atención sintética `9601e6ff-8318-4775-bbf5-aa51c2f5c527` y su PNG quedan como evidencia QA; no se modificaron atenciones reales. Esto no acredita un flujo de rehabilitación de profesionales.

No se ejecutó concurrencia con dos conexiones en esta regresión ni QA nativo. El ensayo de reserva concurrente de la auditoría original es independiente. La cobertura global sigue siendo parcial: 45/110 fichas con alguna ejecución y 65 aún sin ejecución.

Validación técnica H04/H05: typecheck y lint de siete workspaces, lint de runners SQL/cliente, build web de producción y exports Android/iOS pasaron. El primer export simultáneo emitió ENOENT al observar .next durante el build web; se repitió después y terminó con exit 0. No se cambió configuración Metro.

## Reproducción

Desde la raíz, con la instalación temporal PGlite descrita en `CORRECCION_CLINICA.md`:

```powershell
node supabase/tests/clinical-retry.test.mjs
node docs/audit/2026-09-17/clinical-retry-remote.mjs
```

Desde `packages/api-client`:

```powershell
node --import ./scripts/smoke/register-ts-loader.mjs ../../docs/audit/2026-09-17/clinical-retry-client.test.mjs
```

`clinical-retry-browser.mjs` requiere web local en 3100 y cuentas QA configuradas. **Crea datos sintéticos persistentes** y limpia los permisos al terminar; no se ejecuta en una suite genérica. No repetir `clinical-retry-deploy.mjs --apply`: ya está registrada.

## Próximos pasos

Publicar los clientes validados y probar el botón de revocación en dispositivo; corregir H06 (reducir capacidad por debajo de reservas existentes), luego H07/H08 (ancho de la web e hidratación). Continuar después con las variantes y 65 funciones sin ejecución. El cierre de servidor no equivale al cierre del despliegue de pantallas.
