# PILOT_VISUAL_QA_CHECKLIST.md

## Proposito

Checklist operativo para preparar material visual del piloto y ejecutar QA manual por rol sobre la UX productizada.

No abre features nuevas, no cambia backend, base de datos, contratos API ni migraciones.

## Estado base

- fecha de preparacion: `2026-04-28`
- rama: `master`
- commit base: `b20799a chore(ux): close role-based productization handoff`
- productizacion UX por rol: `cerrada`
- hardening UX no bloqueante: `aplicado`
- polish visual inicial: `aplicado`
- estado actual: `QA visual/manual por rol cerrada`

## Entorno levantado

| Superficie | Comando | Resultado |
| --- | --- | --- |
| Web | `corepack pnpm --filter @pet/web dev` | `UP` en `http://localhost:3000` |
| Admin | `corepack pnpm --filter @pet/admin dev` | `UP` en `http://localhost:3001` |
| Mobile | `corepack pnpm --filter @pet/mobile dev` | `UP` en Metro `8081` |
| Android conectado | `adb devices` | `85975329 device` |

Nota Android:

- si la app instalada muestra `Unable to load script` despues de reiniciar, ejecutar `adb reverse tcp:8081 tcp:8081` y recargar la app
- esto es un ajuste de entorno/dev-client, no un cambio funcional del producto

## Evidencia visual local capturada

Las capturas de esta corrida quedaron como evidencia local temporal en:

- `.codex-tmp/qa-visual/owner-inicio.png`
- `.codex-tmp/qa-visual/owner-mascotas.png`
- `.codex-tmp/qa-visual/owner-buscar.png`
- `.codex-tmp/qa-visual/owner-reservas.png`
- `.codex-tmp/qa-visual/owner-mensajes.png`
- `.codex-tmp/qa-visual/owner-cuenta.png`

Estas capturas no se versionan en git porque son evidencia local de ejecucion. Si se requiere evidencia auditable del piloto, mover la seleccion final a un paquete externo o carpeta versionada acordada.

## Hallazgos visuales priorizados

| Severidad | Superficie | Hallazgo | Estado |
| --- | --- | --- | --- |
| Media | Admin web | La tipografia global monospace hacia que el backoffice se sintiera mas tecnico que operativo. | `corregido` con fuente system sans-serif |
| Media | Provider mobile | En Cuenta provider aparecia `Crear un hogar`, una accion propia del modo propietario aunque el usuario tenga ambos roles. | `corregido`; hogares queda solo en Cuenta owner |
| Media | Provider mobile | En Cuenta provider aparecian tarjetas guardadas, que pertenecen al flujo owner `payment-ready` y no a payouts/liquidaciones del proveedor. | `corregido`; provider ve solo alcance de pagos MVP |
| Media | Provider mobile | En el onboarding de Cuenta provider aparecia `Agregar metodo de pago`, una tarea owner-only de tarjetas guardadas. | `corregido`; la tarea se muestra solo en Cuenta owner |
| Baja | Provider mobile | La tarjeta informativa `Pagos reales fuera del MVP` aclaraba alcance, pero hacia que Cuenta provider se sintiera tecnica durante QA visual. | `corregido`; alcance queda documentado y no como tarjeta visible |
| Baja | Owner/Provider mobile | Campos de fecha, hora y vencimiento se veian como texto libre sin guia suficiente. | `corregido`; placeholders y ayudas breves sin cambiar formatos ni contratos |
| Baja | Owner mobile | El header owner mostraba chips tecnicos (`pasos`, rol y `sin cobro real`) que competian con el titulo de la seccion. | `corregido`; header owner queda limpio y orientado a navegacion |
| Baja | Owner mobile | Inicio owner mostraba chips de cuenta (`pasos`, rol y `metodos guardados`) que no aportaban a la tarea principal. | `corregido`; inicio queda enfocado en acciones y resumen |
| Media | Owner mobile | Mascotas mezclaba selector de hogar, formulario de crear mascota, lista y detalle en una sola superficie plana. | `corregido`; navegacion interna por vistas `lista`, `crear`, `editar` y `detalle` |
| Media | Owner mobile | Buscar mezclaba contexto, filtros, navegacion tecnica, resultados, proveedor y seleccion en una sola superficie larga. | `corregido`; navegacion interna por vistas `inicio`, `resultados`, `proveedor` y `seleccion` |
| Media | Owner mobile | Reservas mezclaba preparacion, mascota, metodo opcional, preview, historial y detalle en una sola superficie; algunas tarjetas se estrechaban hasta volver el texto casi vertical. | `corregido`; navegacion interna por vistas `historial`, `servicio`, `mascota`, `metodo`, `preview` y `detalle` |
| Baja | Owner mobile | El detalle de una reserva tenia una accion `Historial` poco evidente para volver a la lista. | `corregido`; el detalle muestra `Volver a la lista de reservas` como accion visible |
| Media | Owner mobile | Mensajes mostraba bandeja y detalle en una misma superficie; la relacion hilo-reserva no quedaba clara y algunas tarjetas comprimian el texto. | `corregido`; navegacion interna por vistas `bandeja` y `conversacion` con contexto de reserva |
| Media | Provider mobile | Negocio mezclaba lista de organizaciones y formulario de crear/editar en una sola superficie, haciendo confusa la navegacion. | `corregido`; navegacion interna por vistas `lista`, `crear` y `editar` |
| Media | Provider mobile | Reservas entrantes comprimía información variable en filas estrechas y podía mostrar el nombre del servicio en vertical. | `corregido`; cards verticales full-width con estado, datos clave y acciones separadas |
| Media | Android dev-client | Tras forzar cierre de la app, puede aparecer `Unable to load script` hasta aplicar `adb reverse tcp:8081 tcp:8081`. | `entorno`, documentado |
| Baja | Owner mobile | La captura cruda se ve grande por densidad `440` y `font_scale=1.25`; no se observo overflow roto en tabs principales. | `observado`, sin cambio |
| Baja | Admin/web headless | Chrome/Edge headless no genero screenshot estable, pero las rutas respondieron `200` y admin pudo inspeccionarse por DOM. | `entorno`, no bloqueante |

## Checklist QA manual por rol

## Confirmaciones manuales registradas

| Fecha | Actor | Canal | Alcance | Resultado | Notas |
| --- | --- | --- | --- | --- | --- |
| 2026-05-03 | QA_OWNER | Android/mobile | Inicio, Mascotas, Buscar, Reservas, Mensajes y Cuenta | `PASS` | Revision visual owner completada sin bloqueos criticos. |
| 2026-05-03 | QA_PROVIDER | Android/mobile | Home, Negocio, Servicios, Horarios, Reservas, Mensajes, Estado y Cuenta | `PASS` | Revision visual provider completada despues de ajustes de Negocio y Reservas. |
| 2026-05-03 | QA_ADMIN | Admin web | Home admin, Proveedores y Soporte | `PASS` | Revision visual admin web autenticado completada sin bloqueos criticos. |

### Owner mobile

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-OWN-VIS-01 | Inicio | Header owner limpio, resumen del dia y bottom nav visibles sin solaparse. | `PASS con QA_OWNER` |
| UX-OWN-VIS-02 | Mascotas | Mascotas muestra lista como entrada principal; crear/editar viven en vistas internas con cancelar y fecha `AAAA-MM-DD`. | `PASS con QA_OWNER` |
| UX-OWN-VIS-03 | Buscar | Discovery avanza por vistas internas: busqueda/filtros, resultados, proveedor y preparacion de reserva. | `PASS con QA_OWNER` |
| UX-OWN-VIS-04 | Reservas | Reservas separa historial, servicio importado, mascota, metodo opcional, preview y detalle; las tarjetas del historial se mantienen legibles y el detalle permite volver claramente a la lista. | `PASS con QA_OWNER` |
| UX-OWN-VIS-05 | Mensajes | Mensajes abre bandeja por reserva desde el tab y conversacion contextual desde `Detalle de reserva > Chat`; cada conversacion permite volver a la bandeja. | `PASS con QA_OWNER` |
| UX-OWN-VIS-06 | Cuenta | Perfil, hogares, direcciones, preferencias, metodos guardados y rol quedan fuera del flujo principal. | `PASS con QA_OWNER` |

### Provider mobile

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-PRO-VIS-01 | Home provider | Estado operativo, checklist y reservas pendientes son lo primero. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-02 | Negocio | Organizacion y perfil publico se entienden como configuracion operativa. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-03 | Servicios | Servicios activos/publicos son escaneables y accionables. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-04 | Horarios | Disponibilidad se entiende como agenda de operacion; horas muestran guia `HH:mm`. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-05 | Reservas | Pendientes y confirmadas muestran acciones por estado. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-06 | Mensajes | Conversaciones se mantienen vinculadas a reservas. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-07 | Estado | Aprobacion y documentos explican impacto en marketplace. | `PASS con QA_PROVIDER` |
| UX-PRO-VIS-08 | Cuenta | Perfil, preferencias, direcciones y cambio de rol se mantienen visibles; hogares, tarjetas guardadas, tarjeta de pagos y la tarea `Agregar metodo de pago` no aparecen dentro de modo provider. | `PASS con QA_PROVIDER` |

### Admin web

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-ADM-VIS-01 | Home admin | Admin se presenta como cola de decisiones MVP, no dashboard decorativo. | `PASS con QA_ADMIN` |
| UX-ADM-VIS-02 | Proveedores | Cola y detalle contextual son visibles y accionables. | `PASS con QA_ADMIN` |
| UX-ADM-VIS-03 | Soporte | Casos abiertos, filtros y detalle mantienen foco operativo. | `PASS con QA_ADMIN` |

## Criterio para cerrar QA visual del piloto

Cerrar esta fase cuando:

- owner mobile tenga evidencia final seleccionada
- provider mobile sea recorrido con usuario provider del piloto
- admin web sea recorrido con usuario admin del piloto
- los hallazgos visuales restantes sean solo polish menor o material de presentacion

Estado al 2026-05-03:

- owner mobile: `PASS` con `QA_OWNER`
- provider mobile: `PASS` con `QA_PROVIDER`
- admin web autenticado: `PASS` con `QA_ADMIN`
- QA visual/manual por rol: `cerrada`

## Recomendacion posterior

El siguiente frente recomendado despues de cerrar este checklist es `hardening tecnico/operativo del piloto`.

Razon:

- Payments MVP+ cambia alcance funcional y debe abrirse solo despues de validar estabilidad operativa del piloto
- el producto ya esta productizado por rol; lo que falta antes de pagos es evidencia, runbooks y confiabilidad de operacion

Runbook activo: `docs/delivery/PILOT_OPERATIONS_HARDENING.md`.
