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
- `qa_smoke` -> `closed_with_notes`
- `qa_manual_web` -> `closed_with_notes`
- `qa_android_mobile` -> `closed_with_notes`
- `localization_es` -> `closed_with_notes`
- `role_based_ux_productization` -> `closed_with_notes`
- `ux_hardening_non_blocking` -> `closed_with_notes`
- `visual_polish_manual_qa` -> `closed_with_notes`
- `visual_alignment_reference_canon` -> `partial`
- `pilot_operations_hardening` -> `closed_with_notes`
- `booking_capacity_v2` -> `partial`
- `clinic` -> `not_started`
- `commerce` -> `not_started`
- `pharmacy` -> `not_started`
- `finance` -> `not_started`
- `benefits` -> `not_started`
- `telecare` -> `not_started`

## Salvedades activas del baseline

- pagos solo en modo `payment-ready`
- la smoke canonica `full` ya cubre `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre Supabase real
- smoke automatizada documentada en `PASS`
- la UI principal de `web`, `mobile` y `admin` quedo localizada al espanol, validada con lint/typecheck/build/export/smoke e incorporada en el baseline publicado `v0.1.0-mvp-baseline-es.1`
- la localizacion al espanol ya no esta pendiente de commit ni de tag
- la productizacion UX por rol quedo implementada sobre capacidades MVP existentes: owner mobile shell/Home, Mascotas hub, Reservas hub transaccional, consola provider mobile-first, admin web backoffice y hardening UX no bloqueante
- el polish visual/manual QA por rol quedo cerrado con `PASS`: owner mobile con `QA_OWNER`, provider mobile con `QA_PROVIDER` y admin web autenticado con `QA_ADMIN`
- el hardening tecnico/operativo del piloto queda cerrado con notas en `docs/delivery/PILOT_OPERATIONS_HARDENING.md`; lint, typecheck, web build, admin build, mobile build, smokes canonicas y `git diff --check` estan en `PASS`
- la QA/UAT manual web fue ejecutada por el usuario y queda registrada como `PASS`
- Android/mobile fue ejecutado manualmente y `AND-01`, `AND-02` y `AND-03` quedan registrados como `PASS`
- ya no existe bloqueo activo de Android/mobile por entorno
- V2 provider operations / booking operations: Slice A check-in, Slice B check-out, QR-2 owner QR display y QR-3 provider scanner quedan implementados y validados manualmente en Android sobre Supabase remoto. El flujo principal de check-in/check-out queda como QR temporal owner -> provider, dejando botones manuales como fallback piloto. Evidencia queda pausada y sera fotos/documentos de actividad, no prueba principal de presencia; report card e internal notes siguen pendientes.
- V2 booking capacity: CAP-0 documental, CAP-1 backend/RPC, CAP-2 provider UI y CAP-3 owner UI estan en curso sobre `feature/v2-booking-capacity`. Modelo: reglas recurrentes por servicio, excepciones por fecha, slots calculados por RPC y creacion transaccional de booking desde slot para evitar sobreventa. Provider mobile permite configurar horarios con capacidad; owner mobile muestra calendario/slots y crea booking desde slot cuando hay cupo elegido. El flujo legacy queda como fallback piloto.
- Visual alignment reference canon: fase visual controlada iniciada sobre las referencias en `docs/ux/reference/`. Se deriva guia minima en `docs/ux/VISUAL_STYLE_GUIDE.md` y se alinean tokens, cards, chips, botones, navegacion mobile y shell/admin cards sin cambiar logica funcional, backend, DB, contratos API ni reglas de negocio.
- quedan pendientes externos/no bloqueantes de evidencia o ampliacion de cobertura fuera del criterio de salida MVP
- el baseline esta alineado para piloto controlado, no para produccion comercial

## Estado global del release

- estado recomendado hoy: `QA/UAT final completada`, con web manual en `PASS` y Android/mobile en `PASS`
- baseline tecnico congelado en `v0.1.0-mvp-baseline.1`
- baseline localizado actual publicado en `v0.1.0-mvp-baseline-es.1` sobre `6e984eb`
- piloto controlado: `aprobado`
- fase UX por rol: `cerrada`
- fase actual del proyecto: `hardening tecnico/operativo del piloto cerrado`; siguiente frente elegible `Payments MVP+` si se decide abrir nuevo alcance funcional
- checklist visual/manual: `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`
- HEAD operativo publicado antes del handoff actual: `cfc70b7`
- pendientes restantes: `no bloqueantes`; evidencia visual final si se requiere paquete auditable y pendientes externos de entorno
- fuera de alcance todavia: produccion comercial, pagos reales, clinic, commerce, pharmacy, finance, benefits y telecare
