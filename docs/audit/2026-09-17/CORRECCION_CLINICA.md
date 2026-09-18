# Corrección clínica H01–H03

Estado: **aplicada a la base remota vinculada y verificada**, 17/09/2026 en Panamá (18/09/2026 UTC).

## Cambio

Migración: `supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql`.

- H01: bloquear atención nueva con grant revocado/vencido, incluso si el consentimiento individual sigue marcado approved.
- H02: bloquear rectificaciones del profesional suspendido/vencido.
- H03: bloquear finalización de documentos tras suspensión, revocación o vencimiento.
- Preparación de archivos y policy de subida reutilizan el mismo guard; archivos pendientes no se convierten en documentos disponibles por haber obtenido permiso antes.
- Se revalida hogar actual de la mascota y se conservan historiales finalizados. Las firmas API y tipos de cliente no cambian.

El guard es privado, SECURITY DEFINER con search_path fijo, y deriva la identidad de auth.uid(). Adquiere bloqueos en orden solicitud, autorización, profesional, grant y mascota; la finalización bloquea el documento después. Usa clock_timestamp() al terminar de adquirirlos para no conservar una vigencia calculada antes de una espera.

## Evidencia

1. `supabase/tests/clinical-write-authorization.test.mjs`: ejecuta PL/pgSQL real en PGlite 0.3.14 con tablas clínicas originales y dependencias de infraestructura mínimas. Reproduce los tres fallos del SQL anterior; pasan los 21 casos con la migración nueva.
2. `clinical-remote-regression.mjs --candidate`: 12 comprobaciones contra el esquema PostgreSQL real, instalando temporalmente la migración dentro de una transacción que termina en ROLLBACK.
3. `clinical-migration-remote.mjs --apply`: verificó que las cinco definiciones remotas coincidían con el baseline y que el proyecto vinculado era el de la app; aplicó solo esta migración y registró su versión en una transacción. No ejecutó un push global de migraciones pendientes.
4. `clinical-remote-regression.mjs`: las mismas 12 comprobaciones pasaron con la migración instalada. Los cambios de fixtures se revirtieron; el perfil QA permanece suspendido y sin grants activos.

Las pruebas remotas de este bloque verifican funciones SQL y el helper de Storage; insertan metadata sintética de objeto dentro de una transacción revertida, no un archivo persistente en Storage. Las pruebas de la auditoría original sí incluyeron la subida de un PNG. Estas regresiones no son una prueba visual ni una prueba de carreras con dos conexiones concurrentes; el orden de bloqueos fue revisado, pero falta el ensayo concurrente específico.

Resultados en `evidence/clinical-fix-regression.json`, `clinical-remote-candidate.json`, `clinical-remote-installed.json`, `clinical-migration-remote.json` y `clinical-post-deploy.json`.

También pasaron `corepack pnpm typecheck`, `corepack pnpm lint`, lint específico del runner SQL y `git diff --check`. No se repitieron los builds de apps porque no cambió código de cliente; los builds y exports anteriores siguen documentados como evidencia de la auditoría, no como pruebas de la migración.

## Repetir pruebas locales

Dependencia de pruebas aislada, sin cambiar dependencias del producto:

```powershell
$qaPgPath = Join-Path $env:TEMP 'pet-clinical-regression'
npm install --prefix $qaPgPath --no-audit --no-fund @electric-sql/pglite@0.3.14
node supabase/tests/clinical-write-authorization.test.mjs
```

También se puede definir `PGLITE_MODULE_PATH` hacia `dist/index.js` de la instalación temporal. La suite local no necesita credenciales. El test usa savepoints para comprobar rechazos sin abortar las comprobaciones posteriores y sale con código no cero ante una regresión.

Los scripts remotos requieren las credenciales de gestión ya configuradas; no se imprimen ni se incluyen aquí. No repetir `--apply`: la migración ya está registrada. Las pruebas remotas solo identifican los fixtures QA conocidos y se detienen si no coinciden; no usan expedientes reales.

## Pendiente

Actualización posterior: H04/H05 tienen servidor corregido y clientes locales implementados; publicación y QA nativo pendientes. Ver CORRECCION_REINTENTOS.md para resultados y límites. También siguen abiertos H06–H08, las funciones sin ejecución y las pruebas nativas. Los documentos de auditoría conservan la evidencia original del fallo; este archivo registra su corrección posterior.

No hubo cambios de pantallas, despliegue web, nuevo binario mobile, commit ni push. La corrección del servidor se aplica a los clientes que usan el proyecto vinculado.
