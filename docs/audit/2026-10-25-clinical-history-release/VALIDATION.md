# Publicacion del historial de autorizaciones - 2026-10-25

Fuente mobile: 302a3d9, commit y push completados. Historial en acordeon cerrado
por defecto; solicitudes pendientes y autorizaciones activas siguen visibles.
Decision Owner: conservar lectura basica por QR; escritura/archivos con aprobacion.

Validacion local previa: typecheck, lint, cuatro pruebas existentes y exportaciones
Expo Android/iOS PASS. No equivale a prueba nativa en dispositivo.

Builds desde worktree aislado, solo configuracion publica incorporada. Destinos:
Firebase App Distribution (testers existentes) y TestFlight (grupo BetaTester).
Consultar beta-*.json para estado de builds, artefactos y distribucion.

Web encontrada activa con visor 75f3329 en
/var/www/pet-releases/clinical-viewer-75f3329-1792891859; worker PDF y ruta clinica
responden HTTP 200. El acordeon no requiere cambios de web/backend.
El script update-clinical-viewer.ps1 permite actualizar el enlace Firebase,
con candidata y rollback; CheckOnly PASS. Publicacion web completada; ver estado final abajo.

## Mobile publicado

- Android 0.3.2 (5): EAS aa4a3171-4c94-4970-b926-7f42ba8d5108 FINISHED.
  APK verificado (CRC, identidad, configuracion, firma y certificado anterior).
  Firebase release 5phib3mfoc2go distribuido al tester existente.
- iOS 0.3.2 (55): EAS 1032111d-4ca1-406f-ad1a-64268ccd256a FINISHED.
  IPA verificado estaticamente; firma presente, no validacion criptografica local.
  Submission 7600d5fa-8728-4934-b513-aa1cd750e1f1 FINISHED.
  Apple d3dc33df-3f69-4190-99d9-1de0a0bb31c6 VALID, IN_BETA_TESTING interno,
  asociado a BetaTester. Revision externa bloqueada por build 54 WAITING_FOR_BETA_REVIEW
  (error ANOTHER_BUILD_IN_REVIEW). No afirmar disponibilidad externa del 55.
  Tras resolver la revision anterior, ejecutar beta-apple.mjs 55 --distribute.
- Evidencia: beta-*-artifact.json, beta-firebase.json, beta-submission.json,
  beta-apple.json y apple-external-review-blocker.json. QA fisica pendiente.

## Web publicada

Release /var/www/pet-releases/clinical-viewer-75f3329-1792938614, build
880cC92fHkj8VAVk83REf. Fuente web 75f3329 (el acordeon es solo mobile).
Build, lint/tipos, candidata, hashes worker/fuente, HTTPS, manifest, cwd y
redirect Android 5phib3mfoc2go PASS. PM2 guardado; candidata eliminada.
Rollback preservado: /var/www/pet-releases/clinical-viewer-75f3329-1792891859.
Admin y backend sin cambios. Evidencia: web-deploy.json.
