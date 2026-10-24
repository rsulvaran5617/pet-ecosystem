# Distribucion clinica 2026-10-24

## Resultado

- Feature d9d28ee: permisos solicitados preseleccionados y aviso Owner en app abierta; aprobacion explicita. No push con app cerrada.
- Version 0.3.2 d5ead14; script web e9ff2d2; imagen iOS fijada e50f903. Commits enviados a origin/master.
- Android 0.3.2 (4): EAS 9e83e8a4-0779-460e-8c2e-16787383b575 FINISHED. Distribuido a un tester existente de Firebase; release 7lp5ahi4kk5m8. Evidencia beta-firebase.json.
- iOS 0.3.2 (54): EAS 32447579-f163-41f8-879f-55f0bfb37e42 FINISHED. Submission 2d7439bb-7527-4a9f-8e5e-503d2e08c466 FINISHED. Apple aa2e8705-4102-427f-8561-1400ba5f8c11 VALID, interno IN_BETA_TESTING, grupo BetaTester asociado. Revision externa enviada: WAITING_FOR_BETA_REVIEW. No afirmar disponibilidad externa hasta aprobacion.
- Build iOS 53 fallo por incompatibilidad de deployment targets con Xcode 27.1 elegido por latest. Build 54 usa macos-tahoe-26.5-xcode-26.6, misma imagen del build anterior exitoso. Detalle ios-retry.json.

## Verificacion

Builds desde worktree aislado. Configuracion publica, identidad, version, CRC y hashes verificados; evidencias beta-*-artifact.json. Android firma criptografica validada y certificado coincidente con beta anterior. iOS contiene firma; no se verifico criptograficamente localmente en Windows, Apple proceso VALID.
Validacion funcional previa: [evidencia](../2026-10-24-clinical-friction/VALIDATION.md). Lint/tipos, compilacion web y exports Expo completados; pruebas de servicios y UI simulada aprobadas. QA nativa en Android/iPhone NO EJECUTADA.

## Web y siguientes pasos

El agente no activo web en la gota. Ejecutar desde la raiz del repo:

```powershell
.\scripts\update-clinical-web.ps1 -AndroidBetaUrl "https://appdistribution.firebase.google.com/testerapps/1:1040291363922:android:f00d644d342e309b87f38b/releases/7lp5ahi4kk5m8"
```

Script comprobado con -CheckOnly. Detecta cwd PM2 activo, prepara copia aislada con los dos componentes web revisados y conserva configuracion. Compila/verifica candidata antes de cambiar web, comprueba BUILD_ID servido y restaura anterior si falla. No modifica Admin ni Supabase. Ninguna migracion aplicada o requerida.
Rollback: conservar cwd web previo que el script detecta; beta mobile anterior permanece en canales, sin cambios de datos que revertir.

Pendiente: aprobacion beta externa Apple, ejecutar despliegue web y prueba fisica de QR -> registro profesional -> solicitud -> aviso Owner -> revisar/aprobar -> registrar atencion. Desmarcar permisos debe respetarse y no debe concederse acceso antes de aprobar.
