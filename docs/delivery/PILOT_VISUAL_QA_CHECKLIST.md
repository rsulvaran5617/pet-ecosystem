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
- estado actual: `QA visual/manual por rol en preparacion`

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
| Media | Android dev-client | Tras forzar cierre de la app, puede aparecer `Unable to load script` hasta aplicar `adb reverse tcp:8081 tcp:8081`. | `entorno`, documentado |
| Baja | Owner mobile | La captura cruda se ve grande por densidad `440` y `font_scale=1.25`; no se observo overflow roto en tabs principales. | `observado`, sin cambio |
| Baja | Admin/web headless | Chrome/Edge headless no genero screenshot estable, pero las rutas respondieron `200` y admin pudo inspeccionarse por DOM. | `entorno`, no bloqueante |

## Checklist QA manual por rol

### Owner mobile

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-OWN-VIS-01 | Inicio | Header owner, resumen del dia, chips y bottom nav visibles sin solaparse. | `PASS visual local` |
| UX-OWN-VIS-02 | Mascotas | Mascotas aparece como entrada principal al hub de mascota. | `PASS visual local` |
| UX-OWN-VIS-03 | Buscar | Copy mantiene discovery y aclara que no hay cobro real. | `PASS visual local` |
| UX-OWN-VIS-04 | Reservas | Reserva se presenta como hub de detalle, chat, resena y soporte. | `PASS visual local` |
| UX-OWN-VIS-05 | Mensajes | Mensajes queda subordinado a reservas y muestra acciones comprensibles. | `PASS visual local` |
| UX-OWN-VIS-06 | Cuenta | Perfil, hogares, direcciones, preferencias, metodos guardados y rol quedan fuera del flujo principal. | `PASS visual local` |

### Provider mobile

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-PRO-VIS-01 | Home provider | Estado operativo, checklist y reservas pendientes son lo primero. | `pendiente con usuario provider` |
| UX-PRO-VIS-02 | Negocio | Organizacion y perfil publico se entienden como configuracion operativa. | `pendiente con usuario provider` |
| UX-PRO-VIS-03 | Servicios | Servicios activos/publicos son escaneables y accionables. | `pendiente con usuario provider` |
| UX-PRO-VIS-04 | Horarios | Disponibilidad se entiende como agenda de operacion, no tabla tecnica. | `pendiente con usuario provider` |
| UX-PRO-VIS-05 | Reservas | Pendientes y confirmadas muestran acciones por estado. | `pendiente con usuario provider` |
| UX-PRO-VIS-06 | Mensajes | Conversaciones se mantienen vinculadas a reservas. | `pendiente con usuario provider` |
| UX-PRO-VIS-07 | Estado | Aprobacion y documentos explican impacto en marketplace. | `pendiente con usuario provider` |

### Admin web

| Codigo | Pantalla | Criterio visual | Estado |
| --- | --- | --- | --- |
| UX-ADM-VIS-01 | Home admin | Admin se presenta como cola de decisiones MVP, no dashboard decorativo. | `PASS composicion local` |
| UX-ADM-VIS-02 | Proveedores | Cola y detalle contextual son visibles y accionables. | `pendiente con usuario admin autenticado` |
| UX-ADM-VIS-03 | Soporte | Casos abiertos, filtros y detalle mantienen foco operativo. | `pendiente con usuario admin autenticado` |

## Criterio para cerrar QA visual del piloto

Cerrar esta fase cuando:

- owner mobile tenga evidencia final seleccionada
- provider mobile sea recorrido con usuario provider del piloto
- admin web sea recorrido con usuario admin del piloto
- los hallazgos visuales restantes sean solo polish menor o material de presentacion

## Recomendacion posterior

El siguiente frente recomendado despues de cerrar este checklist es `hardening tecnico/operativo del piloto`.

Razon:

- Payments MVP+ cambia alcance funcional y debe abrirse solo despues de validar estabilidad operativa del piloto
- el producto ya esta productizado por rol; lo que falta antes de pagos es evidencia, runbooks y confiabilidad de operacion
