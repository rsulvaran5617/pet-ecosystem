# Reservas vencidas y pendientes de cierre — 18/09/2026

## Alcance del primer bloque

Implementación local; aún no publicada ni aplicada al backend remoto. Extiende el piloto de bookings sin cobros, penalizaciones, reprogramación ni disputas nuevas.

- `pending_approval` vence al llegar `scheduled_start_at`, usando reloj del servidor. Estado persistido nuevo: `expired`, presentado como **Expirada sin aprobación**.
- `confirmed` cuyo `scheduled_end_at` ya pasó conserva su estado de negocio, pero aparece en la bandeja **Pendientes de cierre**. No equivale a ausencia ni finalización.
- El detalle operacional distingue ausencia de check-in registrado, check-in sin check-out y check-out pendiente de finalización administrativa. La ausencia de registro no demuestra inasistencia.
- Las reservas vencidas y pendientes de cierre salen de próximas/activas y de sus contadores. Permanecen accesibles por filtros e historial. Las confirmadas pueden completarse explícitamente por su proveedor autorizado.
- La fecha final gobierna los servicios de varios días. Horas persistidas `timestamptz`; UI usa instantes ISO y refresca su clasificación cada 15 segundos.

## Persistencia y operación

`20260918150000_booking_expiration.sql` amplía las restricciones de bookings, historial y chat. Permite actor nulo en historial/auditoría para eventos del sistema; no atribuye el vencimiento al owner. Mantiene RLS. El cron escribe un evento de historial y auditoría por transición, en la misma transacción; chat se sincroniza mediante el trigger existente y bookings conserva Realtime.

`expire_unapproved_bookings()` es SECURITY DEFINER, con search_path fijo, revocada a public/anon/authenticated y concedida a service_role. No acepta IDs ni fechas proporcionadas por clientes. Procesa como máximo 500 solicitudes vencidas por ejecución, en orden, con `FOR UPDATE SKIP LOCKED`. No toca confirmadas, canceladas ni completadas. Un reintento no duplica eventos.

`approve_booking` adquiere bloqueo de fila antes de leer el estado; el trigger valida el reloj después del bloqueo al transicionar a confirmada. Rechaza aprobación tardía incluso durante el intervalo entre ejecuciones del cron. Un registro `expired` no puede revivirse ni sobrescribirse mediante RPCs con lecturas antiguas.

`20260918150100_booking_expiration_schedule.sql` habilita pg_cron y programa `expire-unapproved-bookings` cada minuto. Esto funciona sin abrir las apps. La expiración persistida puede retrasarse hasta el siguiente barrido, o más si hay backlog de más de 500 o filas bloqueadas; las aprobaciones tardías se rechazan inmediatamente. La UI identifica vencimiento temporal antes del barrido, pero no persiste estados por su cuenta.

## Publicación pendiente

1. Publicar primero clientes compatibles con `expired` (web y mobile) y confirmar la actualización de los dispositivos del piloto antes de activar cron. El APK anterior a7b89d3 no incluye este bloque. Todavía faltan acceso SSH y dispositivo QA.
2. Verificar migraciones remotas y extensiones disponibles. Aplicar solo estas dos migraciones, no todas las pendientes indiscriminadamente. La segunda activa tratamiento de solicitudes antiguas pendientes en lotes; confirmadas antiguas quedan para revisión, no se cierran automáticamente.
3. Validar job activo en `cron.job`, ejecuciones en `cron.job_run_details`, recuento de pendientes vencidas e historial/auditoría. Probar concurrencia real aprobación/barrido en QA antes de certificarla; el test local ejecuta SQL con un único motor.
4. Ante fallo del job, corregir su causa y reejecutar la misma función. No revertir expiraciones a pendientes a ciegas. Si hay que detenerlo: `select cron.unschedule('expire-unapproved-bookings');`. Conservar historial.

No se activó cron en el servidor para evitar devolver un estado desconocido a los clientes actualmente publicados.

## Validación reproducible

- `node supabase/tests/booking-expiration.test.mjs`: 19 comprobaciones PL/pgSQL con PGlite temporal; `PGLITE_MODULE_PATH` permite indicar la instalación local de la herramienta. Incluye límites temporales, permisos de invocación, reintentos, backlog, bloqueo de reapertura y persistencia de confirmadas. No ejecuta pg_cron ni prueba contención entre conexiones independientes.
- Desde `packages/api-client`: `node --import ./scripts/smoke/register-ts-loader.mjs ../config/src/booking-lifecycle.test.mjs`: 18 comprobaciones de límites horarios, zona horaria, servicios de varios días, categorías/contadores y etiquetas operacionales.
- Typecheck/lint de siete workspaces correctos. Build web de producción y exports Android/iOS correctos; estos exports no constituyen instalación ni QA nativo.
- Navegador web de producción local: 18 comprobaciones correctas de filtros, historial, ausencia de acción Aprobar en expiradas y layout a 1440/390 px. Owner tenía una confirmada pendiente de cierre; los filtros de expiradas y el proveedor QA seleccionado estaban vacíos. No se certifican transiciones remotas ni detalle operacional con esos filtros vacíos. Se corrigió el desbordamiento encontrado en el selector del historial.
- Evidencia: `docs/audit/2026-09-18-booking-lifecycle/`, con SQL, reglas temporales, navegador y resumen técnico. El navegador solo inició/cerró sesión, consultó y cambió filtros; no modificó reservas.

## Siguiente bloque funcional

Resultados explícitos **Cliente no asistió** y **Servicio no prestado por el proveedor**, con motivo y soporte del owner; recordatorios a las 24 horas y revisión administrativa a las 72 horas. No están implementados en este primer bloque. Hasta entonces, una cita confirmada no realizada permanece en pendientes de cierre y no debe marcarse completada para vaciar la bandeja.
