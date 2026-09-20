# Foundation-1C: integridad de transiciones

2026-09-20. Correccion local, migracion remota pendiente.

## Alcance entregado (1C.1)

Migracion `20260920190000_pet_sos_transition_integrity.sql`, sin reescribir
migraciones aplicadas ni modificar registros existentes.

- Aprobar claim requiere reporte vigente, compartible y en sighting_open,
  sheltered_by_reporter o possible_owner_claim, validado bajo bloqueo del reporte.
- Rechazar claims pendientes sigue permitido para limpiar solicitudes, pero no
  altera reportes cerrados, recuperados, bloqueados ni con propietario verificado.
- No se rebaja estado del reporte si existe otro claim aprobado.
- Claims inexistentes, actor ajeno y decisiones NULL se rechazan explicitamente.
- Moderacion bloquea el recurso antes de actuar. Captura estado efectivo en nueva
  columna nullable `pet_alert_moderation_cases.target_status_at_action`.
- Restore exige recurso flagged y un bloqueo previo con snapshot confiable;
  la denuncia usada para restaurar debe ser posterior a ese bloqueo. Se restaura
  el estado al bloquear, nunca el snapshot de cuando se creo una denuncia antigua.
- Un bloqueo repetido o una restauracion obsoleta no produce exito ficticio.
- Close no sobreescribe recuperaciones ni estados terminales, incluso si estan
  temporalmente flagged. Dismiss continua disponible para cerrar un caso sin
  cambiar la publicacion.
- Identidad admin NULL falla cerrado. Se revoca EXECUTE anon/PUBLIC en ambas RPC.
- Firmas, respuestas existentes y permisos legitimamente autenticados conservados.
  La columna adicional del composite de moderacion no entra al DTO cliente.

## Errores y compatibilidad

Se conserva PET_ALERT_REPORT_NOT_AVAILABLE para aprobacion fuera de precondiciones.
Nuevo PET_ALERT_MODERATION_STALE_STATE exige refrescar/revisar el caso; no reintentar
a ciegas ni editar el recurso directamente. Los clientes existentes manejan error
de RPC por su camino actual; no se agrega una pantalla nueva en este slice.

Los bloqueos anteriores a esta migracion no tienen snapshot de accion fiable.
No hay backfill inferido ni restauracion automatica. Requieren revision manual
controlada antes de habilitar restauracion; crear otra denuncia no reconstruye
el estado perdido. No usar rollback al SQL vulnerable como mecanismo de soporte.

## Atomicidad y concurrencia

Review bloquea claim y despues reporte como el contrato anterior. La elegibilidad
se revisa despues del bloqueo: una decision posterior a un cierre lo observa y
no lo revierte. El indice unico existente sigue evitando dos claims aprobados.
Moderacion bloquea caso y recurso, consulta el ultimo bloqueo resuelto y registra
el estado antes de escribir. reviewed_at usa clock_timestamp para ordenar por
momento de accion, no por inicio de transacciones que pudieron esperar.

Tests secuenciales simulan estados cambiados antes de ejecutar una accion y
verifican rechazo/preservacion. NO prueban contencion multiconexion ni ausencia
de deadlocks en produccion. Ese ensayo sigue requerido antes de ampliar SOS.

## Verificacion

- `node supabase/tests/pet-sos-transitions.test.mjs`: 42 checks, incluye reproduccion
  aislada del baseline inseguro, estados terminales, permisos, flags legacy,
  snapshot efectivo, restauracion y operaciones legitimas.
- Fixture PGlite con cuerpos SQL reales y tablas/auth/helpers simplificados;
  no afirma coverage de constraints/RLS/Storage completos ni QA nativo.
- Regresion de autorizacion de ubicacion Foundation-1A y tests Foundation-1B.
- Lint y typecheck de paquetes afectados; diff check antes de commit.

## Pendientes de Foundation-1C completo

Esta entrega corrige las dos brechas prioritarias; NO completa el feed geografico.
Siguen pendientes consultas acotadas/PostGIS/EXPLAIN, saneamiento EXIF y medios,
concurrencia con conexiones reales y conservar semantica de resguardo al salir de
possible_owner_claim. No habilitar map-first, push o derivacion Foster por aplicar
esta migracion. RLS y contratos existentes no se sustituyen por flags cliente.
