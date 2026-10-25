# Visor profesional de solo lectura - 2026-10-25

## Resultado local

Reemplaza object/plugin PDF por PDF.js 6.4.299 canvas, con navegacion paginada,
ampliacion, texto accesible y cierre. Sin UI de descarga/impresion/edicion ni
fallback para descargar formatos no compatibles. Volver a consultar reemplaza
Actualizar documentos y ejecuta solo lectura. Backend y scopes intactos.

Dependencia fijada en apps/web/package.json y pnpm-lock.yaml. El script
apps/web/scripts/copy-pdf-assets.mjs corre en dev/build y prepara worker, fuentes,
CMaps, perfiles ICC y WASM locales/versionados. Assets generados ignorados por
Git/ESLint; se conserva licencia. No hay CDN ni terceros que reciban el documento.
Usa API de render documentada por [Mozilla PDF.js](https://mozilla.github.io/pdf.js/examples/).
Node >=22.13 requerido por dependencia; gota verificada con Node v22.22.2.

## Validacion

- Build Next web PASS; typecheck y lint web PASS.
- 16 casos en Chrome headless: componentes React y worker PDF.js reales, PDF
  sintetico valido de dos paginas, pixeles dibujados y texto de cada pagina,
  navegacion, zoom, scroll estrecho, PNG visible, ausencia de controles de
  descarga/edicion, error legible, revocacion/expiracion/logout y respuesta tardia.
  APIs clinicas simuladas; no equivalen a QA de autorizacion productiva.
- La ausencia de herramientas de descarga no impide capturas, extraccion de
  bytes por herramientas del navegador o almacenamiento fuera de la app.
- PDF con clave/formato no compatible muestra error; no se implementa desbloqueo.
- Safari/iOS y Android fisicos pendientes. Sin deploy. Fuente del visor: 75f33298a0f7ff820a3222fab6c50cb71b43c8a6.

## Publicacion

Solo web; no nuevas migraciones/Edge Functions ni distribucion mobile. Incluir
componentes SharedClinicalDocuments/ReadOnlyPdfViewer, CSS, package.json, lockfile
y scripts/copy-pdf-assets.mjs. Compilar genera public/pdfjs. Conservar Node
compatible. El script anterior update-clinical-documents.ps1 fija 44262b4 y no
publica esta nueva correccion. Hacer deploy con candidata y verificaciones de
worker/font assets; conservar la web anterior para rollback.

Script PowerShell: `scripts/update-clinical-viewer.ps1`. Fija la fuente anterior,
compila una candidata, valida hashes del worker/fuente y restaura la web anterior
si falla tras el cambio. No modifica backend ni mobile. `-CheckOnly` valida Bash
sin desplegar.

Preflight: Bash remoto -CheckOnly PASS; Node v22.22.2. Web activa inspeccionada:
/var/www/pet-releases/clinical-documents-44262b4-1792890083. No se desplego.
