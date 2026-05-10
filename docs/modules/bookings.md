# bookings.md

## Objetivo del modulo
Gestionar la reserva transaccional minima del servicio seleccionado en marketplace, incluyendo preview, creacion, estados, historial, detalle y cancelacion base.

## Alcance MVP
- preview de booking
- seleccion de mascota
- resumen de servicio y precio
- creacion de booking
- booking `instant`
- booking `approval_required`
- aprobacion o rechazo provider-side para reservas `pending_approval`
- estados basicos hasta `completed`
- historial y detalle de reservas
- cancelacion segun politica base
- referencia opcional a `payment_methods` guardados
- arquitectura `payment-ready` sin captura real

## Alcance diferido
- checkout con cobro real
- reprogramacion
- rebooking
- propinas
- disputas
- refunds
- payouts

## Alcance V2 provider operations / booking operations

Este bloque pertenece a V2 no financiero y extiende la ejecucion operacional de una reserva sin abrir cobro real.

Incluye:
- timeline operativo de la reserva
- registro de check-in por proveedor
- registro de check-out por proveedor
- evidencia del servicio asociada a la reserva
- report card operacional
- internal notes del proveedor
- lectura administrativa para soporte o auditoria operativa

Limites de alcance:
- aplica sobre bookings existentes del flujo MVP
- el estado operacional no reemplaza `bookings.status`
- el estado de pago no participa en este flujo
- owner no tiene lectura directa inicial de operaciones
- internal notes son internas del proveedor y admin; no son visibles al owner
- evidencia usa storage controlado, no URL arbitraria

Queda fuera:
- cobro real
- autorizaciones, capturas, refunds, payouts o conciliacion
- reprogramacion, rebooking, propinas y disputas
- seguimiento de pedidos de commerce
- telecare, memberships o beneficios monetarios

Estado de implementacion mobile:
- Slice A check-in proveedor esta implementado en Android para reservas `confirmed` y validado manualmente: el proveedor puede registrar check-in desde `Ejecucion Operacional` y el timeline muestra `Llegada / Check-in registrado`.
- Slice B check-out proveedor esta implementado en Android para reservas `confirmed` con check-in previo y validado manualmente: el proveedor puede registrar check-out y el timeline muestra `Salida / Check-out registrado`.
- QR-2 owner mobile display esta implementado y validado manualmente en Android: el owner genera QR temporal de check-in y check-out desde reserva `confirmed`.
- QR-3 provider scanner esta implementado y validado manualmente en Android: el provider escanea QR operacional, consume el token temporal via RPC y el timeline registra check-in/check-out.
- Slice C evidencia documental queda implementado y validado manualmente en Android sobre el flujo QR: despues de check-in y check-out, provider puede cargar un documento de actividad al bucket privado `booking-operation-evidence` y el timeline muestra `Documento registrado`.
- Report card e internal notes quedan pendientes como slices separados.

## Modelo QR V2 para check-in/check-out

Decision de producto: el flujo principal futuro de check-in y check-out operacional sera por QR temporal mostrado por el owner/familia y escaneado por el proveedor. Los botones manuales existentes quedan como fallback de piloto/soporte interno, no como prueba principal de presencia.

Flujo owner:
- abre una reserva `confirmed`
- muestra un QR temporal de `check_in`
- despues del check-in, puede mostrar un QR temporal de `check_out`
- no escribe directamente en `booking_operations`
- solo puede generar tokens para reservas de hogares donde tiene permiso

Flujo provider:
- abre una reserva `confirmed` de su organizacion
- escanea el QR de `check_in` o `check_out`
- el sistema valida token, expiracion, estado, operacion esperada, booking y organizacion proveedora
- si es valido, registra la operacion y actualiza el timeline

Reglas del QR:
- el QR contiene un token temporal, no un `booking_id` plano
- el token persistido se guarda como hash
- el token es single-use, expira en ventana corta y puede revocarse
- provider externo no puede consumir tokens de otra organizacion
- evidencia operacional no reemplaza el QR como prueba principal de presencia; documenta actividad posterior a check-in/check-out

## Modelo V2 Booking Capacity / booking slots

CAP-0 abre el diseno documental para evolucionar booking desde "proximo bloque disponible" hacia slots/franjas con capacidad visible para owner y validada por backend.

Estado actual:
- `provider_availability` modela disponibilidad semanal por organizacion con `day_of_week`, `starts_at`, `ends_at` e `is_active`.
- `provider_services` define servicio, modo de booking, duracion, precio y ventana de cancelacion.
- `preview_booking` y `create_booking` resuelven el proximo bloque activo mediante `resolve_next_provider_service_window`.
- owner no elige slot; la UI solo muestra un preview resuelto.
- no existe capacidad por franja, ni conteo de cupos, ni proteccion explicita anti-sobreventa por slot.

Objetivo V2:
- provider configura franjas por servicio con capacidad maxima.
- owner ve slots proyectados por fecha como tarjetas: hora, cupos disponibles y estado.
- `pending_approval` y `confirmed` consumen cupo.
- `cancelled`, `rejected`, `expired` y `provider_cancelled` antes del inicio liberan cupo.
- `completed` no libera cupo porque el servicio ya ocurrio.
- `no_show` debe consumir cupo salvo decision operativa contraria, porque el tiempo/recurso ya fue reservado.
- la UI nunca es fuente de verdad; `create_booking_from_slot` debe validar capacidad transaccionalmente.

Alternativas evaluadas:
- A. Extender `provider_availability` con `capacity`: simple y compatible, pero mezcla recurrencia general con servicio/capacidad y maneja mal excepciones por fecha.
- B. Crear `provider_service_slots` concretos por fecha: excelente para calendario y excepciones, pero requiere generar/gestionar muchos registros y mayor mantenimiento.
- C. Modelo hibrido recomendado: reglas recurrentes por servicio con capacidad, proyeccion por RPC en rango de fechas y excepciones puntuales por fecha. Da buen balance para piloto V2.

Modelo recomendado:
- mantener compatibilidad con `provider_availability` mientras se migra gradualmente.
- crear `provider_availability_rules` o extender una entidad equivalente para reglas recurrentes por `provider_service_id`.
- agregar `provider_availability_exceptions` para cerrar, reducir capacidad o sobreescribir una fecha concreta.
- agregar campos en `bookings` para trazar el slot elegido: `availability_rule_id`, `slot_start_at`, `slot_end_at`.
- calcular cupos disponibles desde bookings existentes; evitar `reserved_count` manual salvo que se agregue una estrategia transaccional clara.

Estado CAP-2:
- provider mobile ya permite configurar reglas de disponibilidad con capacidad por servicio.

Estado CAP-3:
- owner mobile consume `get_service_booking_slots` para mostrar un calendario visual y tarjetas de slots por dia.
- `react-native-calendars` se usa solo como widget de seleccion/visualizacion; no es fuente de verdad de capacidad.
- `Generar preview` con slot seleccionado no llama RPC ni crea booking; usa el slot y snapshot del servicio para presentar una vista previa local sin consumir cupo.
- al confirmar una reserva con slot elegido, owner mobile usa `create_booking_from_slot`.
- si el cupo se agota entre preview y confirmacion, la UI muestra `Este horario acaba de llenarse. Elige otro horario disponible.`
- el flujo actual de reserva legacy sigue disponible como fallback piloto cuando no hay slots publicados.

RPCs propuestas:
- `get_service_booking_slots(target_service_id, from_date, to_date)` devuelve slots proyectados con `capacity_total`, `reserved_count`, `available_count` y estado `available | low_capacity | full | unavailable | expired`.
- `create_booking_from_slot(target_household_id, target_pet_id, target_provider_service_id, target_slot_start_at, target_slot_end_at, target_availability_rule_id, target_payment_method_id)` valida permisos, servicio, provider, regla activa, capacidad y crea booking/precio/historial en una transaccion.
- `validate_slot_capacity(...)` puede existir como helper interno para no duplicar logica.
- `hold_booking_slot(...)` queda diferido; solo justificarlo si pagos reales o checkout largo requieren retener cupo antes de crear booking.

Riesgos:
- timezone entre fecha local de negocio y `timestamptz`.
- dos owners intentando tomar el ultimo cupo simultaneamente.
- reservas `pending_approval` que bloquean cupos demasiado tiempo.
- duraciones variables por servicio dentro de una misma franja.
- multiples empleados/recursos por proveedor.
- compatibilidad futura con pagos, reprogramacion y cancelaciones provider-side.
- compatibilidad con QR operations: QR sigue despues de booking confirmado y no participa en capacidad.

## Entidades
- `provider_services`
- `bookings`
- `booking_pricing`
- `booking_status_history`
- `booking_operations` (V2 provider operations)
- `booking_operation_evidence` (V2 provider operations)
- `booking_operation_report` (V2 provider operations)
- `booking_operation_notes` (V2 provider operations)
- `booking_operation_tokens` (V2 QR provider operations, propuesta QR-1)
- `provider_availability_rules` (V2 booking capacity, propuesto)
- `provider_availability_exceptions` (V2 booking capacity, propuesto)
- `payment_methods`
- `audit_logs`

## Reglas
- todo booking debe vincular hogar, mascota, proveedor y servicio
- las nuevas reservas solo pueden usar mascotas `active`; mascotas `in_memory` conservan historial existente pero no son bookables
- el preview consume la seleccion real dejada por marketplace
- el servicio publicado define `booking_mode`, precio base, moneda y ventana base de cancelacion
- en V2 capacity, el servicio publicado tambien puede tener reglas de slot/capacidad visibles al owner
- `instant` crea la reserva en estado `confirmed`
- `approval_required` crea la reserva en estado `pending_approval`
- `pending_approval` y `confirmed` consumen cupo de slot; `completed` mantiene el cupo consumido historicamente
- el owner proveedor puede aprobar o rechazar una reserva `pending_approval`
- el owner proveedor puede marcar un booking `confirmed` como `completed`
- la cancelacion del hogar solo aplica dentro de la ventana configurada por el servicio
- `payment_methods` solo se referencian como metodo guardado; no existe captura real
- el timeline operacional resume check-in, check-out, evidencia, report card y notas internas
- check-in y check-out pertenecen al proveedor que gestiona la organizacion de la reserva
- report card y evidencia deben quedar vinculados al booking y al usuario proveedor que los registra
- internal notes no deben exponerse al owner
- evidencia debe guardar metadata relacional y archivo en storage con politicas acordes a booking/provider/admin; mientras el esquema remoto conserve `file_url not null`, el cliente escribe `file_url = storage_path` como compatibilidad privada, no como URL publica
- historial y detalle deben mantenerse visibles para miembros autorizados del hogar y para el provider owner involucrado

## Dependencias
- core
- households
- pets
- marketplace
- providers

## APIs relacionadas
- `POST /bookings/preview`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{id}`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `POST /bookings/{id}/cancel`
- `GET /bookings/services/{serviceId}/slots` (V2 booking capacity, propuesto)
- `POST /bookings/from-slot` (V2 booking capacity, propuesto)
- `GET /bookings/{id}/operations` (V2 provider operations)
- `POST /bookings/{id}/operations/check-in` (V2 provider operations)
- `POST /bookings/{id}/operations/check-out` (V2 provider operations)
- `POST /bookings/{id}/operations/tokens` (V2 QR provider operations, propuesto)
- `POST /bookings/{id}/operations/tokens/consume` (V2 QR provider operations, propuesto)
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` (V2 QR provider operations, opcional)
- `GET /bookings/{id}/operations/evidence` (V2 provider operations)
- `POST /bookings/{id}/operations/evidence` (V2 provider operations)
- `GET /bookings/{id}/operations/report-card` (V2 provider operations)
- `PUT /bookings/{id}/operations/report-card` (V2 provider operations)
- `GET /bookings/{id}/operations/internal-notes` (V2 provider operations)
- `POST /bookings/{id}/operations/internal-notes` (V2 provider operations)
- `GET /provider/bookings`

## Criterio de done del modulo MVP
- el usuario puede llegar desde marketplace al preview de booking
- puede elegir mascota y metodo guardado opcional
- puede crear bookings `instant` y `approval_required`
- puede consultar historial y detalle
- el provider owner puede recibir, aprobar o rechazar reservas pendientes
- el provider owner puede completar una reserva confirmada
- el hogar puede cancelar dentro de la politica base
