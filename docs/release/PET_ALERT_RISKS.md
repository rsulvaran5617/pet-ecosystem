# PET ALERT Risks and Release Gates

## Riesgos principales

| Riesgo | Severidad | Mitigacion | Gate |
| --- | --- | --- | --- |
| Exposicion de domicilio/contacto | Critica | DTO publico, zona aproximada, consentimiento y tests RLS | Pruebas negativas obligatorias |
| Reclamo falso o acoso | Critica | Login, evidencia privada, contacto controlado, auditoria/admin | Sin contacto automatico |
| Inserciones anonimas abusivas | Alta | RPC, rate limit, captcha/honeypot, moderacion | No abrir anonimo sin proteccion |
| Contenido peligroso/sensible | Alta | Reportar abuso, `flagged`, moderacion y storage privado | Cola admin operativa |
| Coordenadas reveladas por API/media | Alta | Redaccion, precision publica y limpieza EXIF | Test de payload/media |
| Doble alerta/claim | Alta | Indices parciales y transacciones | Test de concurrencia |
| Alerta obsoleta compartida | Media | Expiracion, estado visible y ficha cerrada | Politica definida |
| Confusion con adopcion/abandono | Media | Dominio y copy separados | Revision UX/legal |
| Expectativa de respuesta de emergencia | Media | Avisos claros y recursos locales | Copy aprobado |
| Push masivo o spam | Alta | Fuera del MVP | Diseno separado futuro |

## Privacidad

- Minimizar datos desde el formulario, no solo al renderizar.
- Remover EXIF de imagen antes o durante upload cuando sea viable.
- Guardar contacto y ubicacion exacta en columnas no publicas.
- URLs firmadas de corta duracion.
- Evidencia de claim nunca se comparte publicamente.
- Definir retencion de datos y mecanismo de cierre/anonimizacion posterior.
- Registrar consentimiento de contacto y publicacion medica.

## Seguridad operacional

- Mensaje persistente: "No te pongas en riesgo".
- No recomendar perseguir, capturar o confrontar.
- Herida/riesgo dirige a autoridad, veterinaria o fundacion local.
- No prometer verificacion de identidad ni recuperacion garantizada.
- La plataforma no entrega custodia ni resuelve propiedad automaticamente.

## Gates de release

### Slice 1A

- RLS revisada con matriz de actores.
- Indice de una alerta activa por mascota.
- Auditoria de todas las transiciones.
- Lectura publica sin PII demostrada.
- Dry-run unico y validaciones de tipos/API.

### Paginas publicas

- Rate limiting y proteccion de formularios.
- Moderacion y reporte de abuso disponibles.
- Metadata social no contiene ubicacion exacta.
- Accesibilidad y responsive verificados.

### Claims

- Evidencia privada.
- Flujo admin/disputa operativo.
- Sin transferencia de ownership.
- Politica de retencion y contacto aprobada.

## Pendientes de decision

- Periodo exacto de expiracion y renovacion.
- Autoridad/moderador responsable y SLA.
- Proveedor de captcha/rate limit para anonimos.
- Politica legal y de retencion por pais.
- Nivel de precision publica permitido por zona.
- Si se aceptan recompensas; recomendacion inicial: no.
- Recursos locales de emergencia mostrados por pais.

## Criterio de salida del Slice 0

El producto, UX, datos, API, privacidad y riesgos permiten implementar Slice 1A sin decidir aun mapa, push, recompensas, matching o integraciones externas.
