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

## Entidades
- `provider_services`
- `bookings`
- `booking_pricing`
- `booking_status_history`
- `booking_operations` (V2 provider operations)
- `booking_operation_evidence` (V2 provider operations)
- `booking_operation_report` (V2 provider operations)
- `booking_operation_notes` (V2 provider operations)
- `payment_methods`
- `audit_logs`

## Reglas
- todo booking debe vincular hogar, mascota, proveedor y servicio
- el preview consume la seleccion real dejada por marketplace
- el servicio publicado define `booking_mode`, precio base, moneda y ventana base de cancelacion
- `instant` crea la reserva en estado `confirmed`
- `approval_required` crea la reserva en estado `pending_approval`
- el owner proveedor puede aprobar o rechazar una reserva `pending_approval`
- el owner proveedor puede marcar un booking `confirmed` como `completed`
- la cancelacion del hogar solo aplica dentro de la ventana configurada por el servicio
- `payment_methods` solo se referencian como metodo guardado; no existe captura real
- el timeline operacional resume check-in, check-out, evidencia, report card y notas internas
- check-in y check-out pertenecen al proveedor que gestiona la organizacion de la reserva
- report card y evidencia deben quedar vinculados al booking y al usuario proveedor que los registra
- internal notes no deben exponerse al owner
- evidencia debe guardar metadata relacional y archivo en storage con politicas acordes a booking/provider/admin
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
- `GET /bookings/{id}/operations` (V2 provider operations)
- `POST /bookings/{id}/operations/check-in` (V2 provider operations)
- `POST /bookings/{id}/operations/check-out` (V2 provider operations)
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
