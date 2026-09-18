# Corrección web H07/H08 — 18/09/2026

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
