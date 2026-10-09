# Vencimiento de citas — 08/10/2026

Operador autorizó completar expiración y cerrar las 19 confirmadas pasadas.
No se amplía automáticamente esa autorización a futuras citas confirmadas.

## Aplicado

- Migración scheduler `20260918150100_booking_expiration_schedule.sql` aplicada y
  registrada, tras comprobar función y ACL servidor/service_role.
- Job `expire-unapproved-bookings` activo cada minuto; dos ejecuciones remotas
  succeeded verificadas. El primer barrido expiró 7 solicitudes sin aprobar.
- Cierre puntual de 19 confirmadas: conjunto de IDs capturado antes; transacción
  con locks valida que siguen confirmadas y pasadas y exige exactamente 19.
  Estado `expired`, motivo administrativo y auditoría sin suplantar actor.
- Historial preserva origen confirmed y motivo; no indica servicio realizado ni ausencia.
- 19 historiales y 19 auditorías comprobados; cero chats con estado desincronizado.
- Resultado: 26 expired, cero pendientes vencidas sin aprobar, cero confirmadas pasadas.

## Semántica y compatibilidad

`expired` se presenta como Vencida. Historial distingue solicitud sin aprobación
del cierre administrativo excepcional de una confirmada. No cambia enum/API/RLS.
El cron sigue procesando solo pending_approval. Confirmadas futuras cuyo horario
termine continúan en Pendientes de cierre hasta registrar su resultado.
Clientes anteriores aceptan expired pero pueden mostrar la etiqueta antigua
Expirada sin aprobación; cambios de texto requieren publicación de clientes.

## Verificación

Regresión SQL: 19 comprobaciones PASS (PGlite, no contención real entre conexiones).
Reglas temporales: 18 comprobaciones PASS. Cron real observado en servidor.
Evidencia JSON: schedule, closure-result, verification. closure-targets contiene
solo IDs/fechas para trazabilidad operativa; no adjuntar como listado público.
Ninguna reserva fue eliminada; no se reabren expiradas mediante rollback de UI.
