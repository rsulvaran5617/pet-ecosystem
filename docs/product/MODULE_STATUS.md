# MODULE_STATUS.md

## Escala usada

- `closed`
- `closed_with_notes`
- `partial`
- `not_started`

## Estado actual por modulo

- `core` -> `closed_with_notes`
- `households` -> `closed_with_notes`
- `pets` -> `closed_with_notes`
- `health` -> `closed_with_notes`
- `reminders` -> `closed_with_notes`
- `marketplace` -> `closed_with_notes`
- `bookings` -> `closed_with_notes`
- `messaging` -> `closed_with_notes`
- `reviews` -> `closed_with_notes`
- `support` -> `closed_with_notes`
- `providers` -> `closed_with_notes`
- `admin` -> `closed_with_notes`
- `payments` -> `partial`
- `qa_smoke` -> `partial`
- `qa_manual_web` -> `closed_with_notes`
- `qa_android_mobile` -> `partial`
- `localization_es` -> `closed_with_notes`
- `clinic` -> `not_started`
- `commerce` -> `not_started`
- `pharmacy` -> `not_started`
- `finance` -> `not_started`
- `benefits` -> `not_started`
- `telecare` -> `not_started`

## Salvedades activas del baseline

- pagos solo en modo `payment-ready`
- la smoke canonica `full` ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre Supabase real
- la UI principal de `web`, `mobile` y `admin` quedo localizada al espanol, validada con lint/typecheck/build/export/smoke e incorporada en `master` en `8c5b7d3`
- la localizacion al espanol ya no esta pendiente de commit, pero si queda recomendado congelarla con tag propio
- la QA/UAT manual web fue ejecutada por el usuario y queda registrada como `PASS`
- Android/mobile sigue pendiente por `BLOCK` de entorno tecnico local, no por `FAIL` funcional
- la smoke automatizada sigue siendo parcial respecto del MVP completo porque aun faltan escenarios manuales de canales mobile/admin end-to-end o su evidencia formal
- el baseline esta alineado para QA/UAT, no para produccion

## Estado global del release

- estado recomendado hoy: `listo para cierre de QA/UAT`, con web manual en `PASS` y Android/mobile en `BLOCK` por entorno
- baseline tecnico congelado en `v0.1.0-mvp-baseline.1`
- baseline localizado actual incorporado en `8c5b7d3`, pendiente de tag propio
- no recomendar aun `piloto controlado` mientras Android/mobile siga en `BLOCK` o sin tag del baseline localizado
