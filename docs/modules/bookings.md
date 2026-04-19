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

## Entidades
- `provider_services`
- `bookings`
- `booking_pricing`
- `booking_status_history`
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
- `GET /provider/bookings`

## Criterio de done del modulo MVP
- el usuario puede llegar desde marketplace al preview de booking
- puede elegir mascota y metodo guardado opcional
- puede crear bookings `instant` y `approval_required`
- puede consultar historial y detalle
- el provider owner puede recibir, aprobar o rechazar reservas pendientes
- el provider owner puede completar una reserva confirmada
- el hogar puede cancelar dentro de la politica base
