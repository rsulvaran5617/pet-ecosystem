import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const production=JSON.parse(await fs.readFile(new URL('evidence/web-layout-production.json',dir),'utf8'));
const development=JSON.parse(await fs.readFile(new URL('evidence/web-layout-development.json',dir),'utf8'));
assert.ok(production.passed&&development.passed);
assert.ok(production.roles.every(r=>r.dataLoaded&&'messageNotice' in r));
const note=`# Corrección web H07/H08 — 18/09/2026

Estado: **implementada y validada en web local, incluido build de producción; despliegue del sitio pendiente**. El commit previo fcdb056 con canvas, auditoría y H01–H06 fue enviado a origin/master a petición del usuario. Push Git no equivale a despliegue.

## H07 — ancho y contenido visible

El baseline mostró 422 px de documento en proveedor y 412 px en propietario con viewport de 390 px. Una cadena sin espacios podía elevar el ancho a más de 2000 px.

- El contenedor principal y los paneles usan columnas minmax(0, 1fr), y las etiquetas y tarjetas permiten partir identificadores largos.
- Se retiró overflow hidden de los contenedores principales que recortaban contenido. Las columnas de detalle pasan a una sola columna en pantallas estrechas.
- El selector de negocio respeta el ancho disponible. El aviso flotante de mensajes incluye borde y relleno dentro de su ancho y permite partir textos largos.
- La tabla semanal de capacidad conserva sus columnas dentro de una región con desplazamiento horizontal, nombre accesible y foco por teclado; la página no se ensancha para mostrarla. La prueba verifica foco habilitado y que se puede alcanzar su extremo, sin certificar todos los recorridos de teclado.
- La decoración de la landing permanece dentro del ancho móvil.

## H08 — renderizado de Inicio y Ayuda

Se extrajeron los bloques estáticos style de ProductLandingScreen y HelpCenterPage a hojas CSS importadas por sus componentes. Se conservan contenido y estilos; se usan flex-start/flex-end en las alineaciones flex para evitar advertencias del procesador CSS. Los estilos ya no viajan como texto HTML escapado dentro del árbol hidratado.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Inicio y Ayuda en 1440, 360, 390 y 414 px | Sin desbordamiento ni errores de hidratación |
| Propietario y proveedor en esos cuatro anchos | Sin desbordamiento de página ni elementos fuera de los lados, salvo áreas de scroll intencional accesibles |
| Nombres y correo sintéticos largos en 360/390/414 px | Permanecen dentro del ancho |
| Inicio y Ayuda sin JavaScript | Conservan estilos y ancho correcto |
| Producción local con datos cargados | Propietario espera datos al día; proveedor selecciona el negocio QA tras cargar organizaciones |
| Aviso flotante observado | Se verifica su contención y se cierra antes de capturar para no publicar nombres/mensajes |
| Calidad técnica | Build web, typecheck y lint correctos |

Son 24 combinaciones de página/rol/ancho/texto o JavaScript por ejecución corregida, además del control de scroll y avisos. El JSON distingue viewport solicitado de ancho útil, que descuenta la barra vertical. La evidencia de desarrollo cubre estados iniciales; producción espera la carga de datos. No son pruebas nativas ni certifican todos los formularios de cada sección.

Evidencia: web-layout-baseline.json (H07, después de extraer CSS público), public-web-recheck.json (H08 original), web-layout-development.json y web-layout-production.json en evidence/. Capturas finales: web-production-owner-390.png y web-production-provider-390.png. La captura de propietario sustituye el saludo personal por Cuenta QA solo en el DOM de prueba.

Las sesiones usan las cuentas QA configuradas, que contienen datos de pruebas anteriores; no representan una base vacía dedicada a esta ejecución. Solo hubo login, lecturas, selección local de negocio, cambios sintéticos del DOM y logout. No se crearon reservas, enviaron mensajes ni modificaron perfiles.

## Archivos y alcance

CoreExperienceScreen.tsx, StatusPill.tsx, ProvidersWorkspace.tsx, ProductLandingScreen.tsx/.css y HelpCenterPage.tsx/.css. No hay migraciones, DTOs, cambios de permisos ni cambios mobile. No se repitieron builds nativos porque este bloque solo modifica web.

## Reproducir

Con web local en puerto 3100 y credenciales QA configuradas, desde packages/api-client:

~~~powershell
node --import ./scripts/smoke/register-ts-loader.mjs ../../docs/audit/2026-09-17/web-layout-regression.mjs
node --import ./scripts/smoke/register-ts-loader.mjs ../../docs/audit/2026-09-17/web-layout-regression.mjs --production
~~~

El modo production se ejecuta contra next start después del build; el modo normal contra next dev. No ejecutar ambos servidores en el mismo puerto. --baseline conserva una reproducción histórica y no debe esperarse que falle con el código corregido.

## Siguiente paso

Desplegar web y comprobar la versión servida, distribuir mobile H04/H05 y completar QA en dispositivo. Ampliar la auditoría de las 65 fichas todavía sin ejecución; las otras 45 conservan cobertura parcial. Ninguna corrección declara certificación completa de roles.
`;
await fs.writeFile(new URL('CORRECCION_WEB.md',dir),note);
const append=async(file,content)=>{const url=new URL(file,root);const old=await fs.readFile(url,'utf8');if(!old.includes(content.split('\n')[0]))await fs.writeFile(url,old.trimEnd()+'\n\n'+content+'\n');};
await append('docs/modules/core.md',`## Corrección web H07/H08 — 18/09/2026

Las consolas owner/provider ajustan el contenedor y las etiquetas a pantallas estrechas y nombres/correos largos. No recortan el panel principal para ocultar el desbordamiento. Inicio y Ayuda usan CSS estático importado, evitando la discrepancia de texto style durante hidratación y conservando presentación sin JavaScript. Sin cambios de autenticación, roles ni API. Validado localmente en desarrollo y producción; publicación pendiente. Ver docs/audit/2026-09-17/CORRECCION_WEB.md.`);
await append('docs/modules/providers.md',`## Corrección web H07 — presentación adaptable

El panel y el selector de negocio respetan el ancho disponible. Las tarjetas de detalle pasan a una columna en móvil web; la tabla semanal de capacidad se desplaza dentro de una región identificada y enfocable. Los avisos de mensajes incluyen padding/borde dentro del ancho calculado para no quedar cortados por la izquierda. No cambia capacidad, reservas ni mensajería. Pruebas locales de producción con datos cargados y negocio QA en 360/390/414/1440 px; despliegue pendiente.`);
await append('docs/ux/SCREEN_SPECIFICATIONS.md',`## H07/H08 — consolas adaptables e hidratación pública, 18/09/2026

Owner/provider web: cabecera, badges e identificadores largos deben permanecer dentro del ancho. Los paneles principales permiten contenido visible y sus columnas se ajustan al ancho; no usar overflow hidden para encubrir contenido fuera de pantalla. La tabla semanal de capacidad conserva scroll propio con nombre accesible y foco por teclado. Aviso de mensaje: tamaño border-box y ajuste de texto largo.

Inicio y Ayuda conservan CSS importado y presentación sin JavaScript, con hidratación sin discrepancias. QA local en desarrollo y build de producción: 360, 390, 414 y 1440 px; prueba de cadenas largas; producción espera datos cargados. Sin equivalencia con pruebas nativas o del sitio desplegado. Evidencia en docs/audit/2026-09-17/CORRECCION_WEB.md.`);
let report=await fs.readFile(new URL('INFORME_AUDITORIA.md',dir),'utf8');
const section=`## Actualización H07/H08 — 18/09/2026: web corregida y validada localmente

Corregidos el desbordamiento de cabeceras/paneles y el recorte del aviso de mensajes; la tabla de capacidad tiene scroll propio. Inicio y Ayuda usan CSS estático importado. Pasaron 24 combinaciones de página/rol/ancho/texto o JavaScript en desarrollo y producción local, con datos cargados en producción, sin errores de hidratación ni desbordamiento. Build, tipos y lint correctos. Ver CORRECCION_WEB.md.

El trabajo previo H01–H06 y los documentos descargables quedaron en origin/master mediante fcdb056. H07/H08 requieren despliegue web; H04/H05 requieren publicación de clientes y QA nativo. Push de código no certifica la versión publicada. La cobertura sigue en 45/110 fichas parcialmente ejecutadas.

`;
if(!report.includes('## Actualización H07/H08'))report=report.replace('## Resultado principal',section+'## Resultado principal');
report=report.replaceAll('H07/H08 siguen abiertos;','H07/H08 corregidos localmente, publicación pendiente;').replace('H06 corregido en servidor y H07/H08 abiertos.','H06 corregido en servidor; H07/H08 corregidos localmente, publicación pendiente.');
report=report.replace('4. **Web, H07–H08:** resolver desbordamiento e hidratación; repetir revisión de navegador.','4. **Web, H07–H08 — validado localmente:** desplegar y comprobar la versión publicada; regresiones de navegador y build pasaron.');
report=report.replace('El siguiente bloque de código es H07/H08: adaptación de las consolas web e hidratación; después ampliar cobertura.','H07/H08 están implementados y validados localmente. Sigue publicar clientes, verificar la versión desplegada y ampliar la cobertura pendiente.');
await fs.writeFile(new URL('INFORME_AUDITORIA.md',dir),report);
let readme=await fs.readFile(new URL('README.md',dir),'utf8');
readme=readme.replace('H07/H08 siguen abiertos.','H07/H08 están corregidos y validados en web local, pendientes de despliegue; ver `CORRECCION_WEB.md`.');
readme=readme.replace('`CORRECCION_CLINICA.md`  , `CORRECCION_REINTENTOS.md` y `CORRECCION_CAPACIDAD.md`','`CORRECCION_CLINICA.md`, `CORRECCION_REINTENTOS.md`, `CORRECCION_CAPACIDAD.md` y `CORRECCION_WEB.md`');
await fs.writeFile(new URL('README.md',dir),readme);
const handoffUrl=new URL('docs/HANDOFF.md',root);let handoff=await fs.readFile(handoffUrl,'utf8');
const heading='# Handoff 2026-09-18 - Commit/push previo y corrección web H07/H08';
if(!handoff.includes(heading))handoff=handoff.replace('# HANDOFF.md\n',`# HANDOFF.md

${heading}

- Usuario pidió commit/push de lo pendiente y continuar H07/H08. fcdb056 enviado a origin/master: canvas descargable, informe/auditoría, H01-H06, migraciones y regresiones. PDFs/ZIPs incluidos expresamente. app.json y docs/delivery/onlyoneaccess.txt siguen ajenos y sin rastrear; no leer ni publicar el segundo.
- H07: columnas minmax(0,1fr), minWidth/ajuste de texto en contenedor/badges/tarjetas, detalles apilados, selector acotado y aviso de mensajes border-box. Se retiró overflow hidden que recortaba paneles; heatmap con scroll propio y región enfocada/nombre accesible. Decoración landing acotada.
- H08: CSS estático extraído de ProductLandingScreen/HelpCenterPage a hojas importadas. Sin nuevas dependencias, cambios de API/DB/roles ni mobile.
- Desarrollo y producción local pasan 24 combinaciones de ancho/rol/ruta/texto/JS; producción espera carga de datos y selecciona negocio QA. Sin hidratación ni overflow; prueba explícita de ambos bordes y región desplazable. Avisos observados se comprueban y cierran antes de capturas. Build web, lint y tipos correctos. JSON/screenshots y CORRECCION_WEB.md documentan límites.
- Cuentas QA configuradas contienen pruebas anteriores: no son DB vacía. Solo login/lecturas/selección local/logout; no reservas ni mensajes enviados. Texto de estrés y saludo anonimizado solo en DOM.
- Código web listo para versionar en commit separado; no se ejecutó despliegue web ni distribución mobile. Push no implica despliegue. H04/H05 aún requieren publicar clientes y QA nativo. Auditoría permanece 45/110 parcial, 65 sin ejecución.
- Próximo: despliegue de clientes y verificación de versión servida, pruebas nativas y ampliar funciones sin ejecución. No reabrir H01-H06 ni repetir migraciones aplicadas.

`);await fs.writeFile(handoffUrl,handoff);
const technicalUrl=new URL('evidence/technical-validation.json',dir);const technical=JSON.parse(await fs.readFile(technicalUrl,'utf8'));
for(const item of [{check:'H07/H08 web local',result:'Correcto en desarrollo y producción',scope:'24 combinaciones por modo; producción con datos cargados, texto largo y rutas sin JavaScript'},{check:'Publicación web H07/H08',result:'Pendiente',scope:'Commit/push no sustituye despliegue ni verifica la versión servida'}]){const i=technical.findIndex(r=>r.check===item.check);if(i<0)technical.push(item);else technical[i]=item;}
await fs.writeFile(technicalUrl,JSON.stringify(technical,null,2)+'\n');
await fs.writeFile(new URL('evidence/web-layout-validation.json',dir),JSON.stringify({executedAt:new Date().toISOString(),developmentPassed:development.passed,productionPassed:production.passed,productionDataLoaded:true,build:'passed',lint:'passed',typecheck:'passed',deployed:false},null,2)+'\n');
