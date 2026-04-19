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
- `clinic` -> `not_started`
- `commerce` -> `not_started`
- `pharmacy` -> `not_started`
- `finance` -> `not_started`
- `benefits` -> `not_started`
- `telecare` -> `not_started`

## Salvedades activas del baseline

- pagos solo en modo `payment-ready`
- la smoke canonica `full` ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre Supabase real
- la smoke automatizada sigue siendo parcial respecto del MVP completo porque aun faltan escenarios manuales de UI y canales mobile/admin end-to-end
- siguen pendientes validaciones manuales finales de QA/UAT
- el baseline esta alineado para QA/UAT, no para produccion

## Estado global del release

- estado recomendado hoy: `listo para QA/UAT`
- baseline tecnico serio y listo para `freeze` en commit/tag
- no recomendar aun `piloto controlado` sin la ejecucion manual de la matriz critica y un baseline versionado
