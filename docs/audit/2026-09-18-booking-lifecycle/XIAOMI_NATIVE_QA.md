# Prueba nativa Xiaomi Android

Dispositivo: Xiaomi 2201123G (cupid), Android 15, pantalla 1080 x 2400.
Build probado: d39c53e, EAS a999dad8-a3d8-4ff8-9767-e478a4877ef3.
SHA256 instalado: 13e37c3608c09e48444bcc7f7889d5edab1fb638339c75b0001879b8499ad2df.

La actualizacion inicial fue rechazada por firma diferente. Con autorizacion
expresa del usuario se desinstalo la version anterior y se instalo el APK QA.
La instalacion y el arranque terminaron correctamente. Se utilizo la cuenta QA
owner existente. No se modificaron reservas ni se activaron migraciones/cron.

| Caso | Resultado | Evidencia observada mediante ADB/UIAutomator |
| --- | --- | --- |
| Conexion USB | PASS | Dispositivo autorizado |
| Instalacion | PASS | Android devuelve Success |
| Identidad del artefacto | PASS | SHA256 instalado coincide con APK QA |
| Arranque e inicio de sesion Owner | PASS | Inicio autenticado y navegacion inferior disponibles |
| Reservas Owner | PASS | Datos cargados: Todas 1, Activas 0, Pendientes de cierre 1 |
| Filtro Pendientes de cierre | PASS parcial | Muestra una reserva historica etiquetada Pendiente de cierre |
| Filtro Expiradas | PASS parcial | Cero registros y mensaje No hay expiradas para mostrar |
| Transicion real a expired | NOT_RUN | Backend/cron aun sin activar; filtro sin registros |
| Provider login y negocio QA | PASS | Negocio privado QA seleccionado |
| Provider filtros de cierre y expiradas | PASS parcial | Filtros seleccionables con mensajes vacios correspondientes |
| Provider Completadas y detalle | PASS parcial | Una reserva completada, detalle e historial abiertos |
| Provider cierre real de atencion | NOT_RUN | No se mutaron reservas |
| Camara, QR, GPS y notificaciones | NOT_RUN | Fuera de esta comprobacion de reservas |

Primer login automatizado rechazo los datos porque la entrada de correo no
coincidia con la credencial esperada. Se repitio rellenando los campos por
separado y el acceso funciono. No se registra como fallo de autenticacion de app.

## Hallazgos pendientes

- En Pendientes de cierre, con una reserva visible, se conserva el bloque
  Sin reservas activas. Revisar pertinencia del resumen para el filtro seleccionado.
- La reserva historica muestra Unknown provider. Investigar si falta relacion
  de datos en el fixture y proporcionar un fallback en espanol.

Esta corrida no certifica el flujo completo, el layout visual por capturas,
las transiciones de backend ni la adopcion por todos los dispositivos del piloto.
Al finalizar la continuacion, la app queda en Provider QA con detalle/historial
de una reserva completada abierto. Se rechazo guardar las credenciales en Google.

## Correcciones locales y limites al 19/09/2026

- Resumen Siguiente paso limitado al filtro Activas; retirado bloque redundante
  Sin reservas activas que aparecia en los demas filtros.
- Nombre de proveedor ausente o vacio usa Proveedor no disponible.
- Consulta SELECT-only Owner: 56 reservas, 25 proveedores referenciados y 1
  proveedor visible. No hubo error de consulta; no demuestra borrado ni prueba
  cual policy explica cada ausencia. No se ampliaron permisos.
- Lint/tipos mobile y api-client, tipos web/admin y export Android/iOS correctos.
- Ajustes aun no incluidos en APK instalado: regresion nativa pendiente.
- No migraciones, cron, commit, push ni builds EAS nuevos en esta continuacion.
