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
- Evidencia, report card e internal notes quedan pendientes como slices separados.

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
- evidencia operacional queda pausada como prueba principal de presencia; mas adelante sera solo fotos/documentos de actividad

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
