# Archivos temporales del expediente - 2026-10-24

## Estado

Implementacion local completa; sin commit/push ni despliegue de esta correccion.
Baseline Git 7a6dec3. Se preservan cambios ajenos preexistentes en el workspace.
Migracion 20261025010000 preparada, ejecutada en PostgreSQL vinculado dentro de
BEGIN/ROLLBACK y no persistida. Edge Function y web aun no publicadas.

## Comportamiento

Profesional autenticado/verificado + aprobacion Owner approved/completed + QR
vigente de la misma mascota: lista y abre archivos Owner de pet_documents.
Incluye fotos/cartillas/stickers y soportes del expediente. No se inventa enlace
individual para alergia/condicion: el modelo solo permite listado comun.
No agrega lectura del historial de otros profesionales ni sus clinical_documents.
No usa el permiso de subir archivos como permiso de lectura; acompa?a cualquier
accion clinica aprobada. Owner recibe texto aclaratorio en la tarjeta mobile.

No Storage publico ni nuevas policies/grants de tablas; listado separado del QR
anonimo. El gateway verifica JWT real con Auth.getUser y ejecuta autorizacion RPC
con JWT del caller. Usa servicio solo para recuperar el objeto autorizado, vuelve
a verificar antes de devolver bytes y rechaza un reemplazo concurrente. El locator debe coincidir con la ruta canonica de esa mascota: metadata
Owner manipulada, rutas ajenas, traversal y escapes URL son rechazados. El RPC
autenticado de resolucion devuelve locator; conocerlo no concede lectura directa
ni firma de URLs. La UI no recibe ese locator: consume solo bytes del gateway.
Cada resolucion autorizada se audita (dos chequeos por apertura; evento significa
intento autorizado, no prueba de que el usuario haya visto el documento).

Cache-Control no-store, MIME seguro por firma, formatos activos como binario,
Blob URL liberado al cerrar/logout/desmontar/vencer. Revocacion bloquea siguientes
aperturas; preview abierto se oculta al siguiente chequeo de 8s visible/reanudar.
No es posible recuperar copias ya descargadas. Preview PDF depende del visor del
navegador y ofrece descarga como alternativa; prueba de lectura PDF en Safari/iOS
pendiente. Limite de descarga 10 MiB, igual al bucket existente.

## Evidencia

- 25 casos SQL PASS, sql-results.json: actor correcto/incorrecto, otro documento,
  mascota ajena, pendiente, expiracion y revocacion de consentimiento/QR,
  profesional suspendido/vencido, cambio de hogar, completed vigente, ACL anon,
  guard privado, rutas manipuladas/traversal y acceso directo a tablas/Storage. Usa rol authenticated y subject
  JWT en PostgreSQL; no sustituye prueba HTTP con sesiones reales.
- 6 pruebas gateway PASS, gateway.test.mjs: autenticar, origen, input acotado,
  archivos correctos, revocacion/reemplazo durante descarga, MIME, tamano/error.
  Dependencias Auth/Storage simuladas; no acredita Edge desplegado.
- 10 casos browser PASS, browser-results.json: componente React real con APIs
  simuladas en Chrome, imagen PNG decodificada, contenedor PDF/descarga, aprobacion,
  revocacion, logout/expiracion y respuesta tardia tras logout.
- Suite api-client: 21 tests PASS, incluidos dos nuevos contratos de archivos.
- Typecheck types/api-client/web/mobile/admin PASS. Gateway TypeScript estricto
  PASS con declaraciones Deno y Supabase local; no equivale a runtime Deno.
- Build Next web PASS. Lint types/api-client/web/mobile PASS.
- Regresion de solicitud/aprobacion existente: browser-check.mjs en
  ../2026-10-24-clinical-friction/ (componente real + APIs simuladas).

## Orden de publicacion y QA pendiente

1. Revisar/cerrar commit con solo esta correccion y push. Verificar proyecto
   Supabase vinculado e historial antes de aplicar exclusivamente la migracion
   20261025010000; no ejecutar indiscriminadamente todas las migraciones pendientes.
2. Configurar CLINICAL_DOCUMENT_ALLOWED_ORIGINS con origenes web usados, publicar
   clinical-shared-document y comprobar JWT/denegaciones reales. Variables de
   servicio permanecen en Edge. No se requieren secretos nuevos en la gota.
3. Publicar web con componente SharedClinicalDocuments, PublicClinicalAccessPage,
   su CSS y packages api-client/types actualizados. El script anterior
   update-clinical-web.ps1 esta fijado a d9d28ee y NO publica esta correccion.
4. Incluir aclaracion de consentimiento mobile en siguiente distribucion.
5. QA integrada con Owner/veterinario: subir PNG/JPEG/PDF, generar QR, aprobar,
   ver cada archivo y descargar; desautorizar y comprobar que no reabre; repetir
   expiracion, otra cuenta, otra mascota y iPhone/Android reales.

Rollback: restaurar web previa; retirar Edge Function o revocar EXECUTE de las
nuevas RPCs si se necesita deshabilitar lectura. No tocar objetos ni historial.
