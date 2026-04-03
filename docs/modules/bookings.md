# bookings.md

## Objetivo
Gestionar la reserva y ciclo transaccional de servicios.

## MVP
- preview
- selección de mascota
- checkout
- booking instantáneo
- booking bajo aprobación
- historial
- cancelación básica

## V2
- reprogramación
- rebooking
- ejecución de servicio
- report card
- propinas

## Entidades
- bookings
- booking_pricing
- booking_status_history
- payments
- refunds

## Reglas
- todo booking debe tener mascota, hogar, proveedor y servicio
- la política de cancelación debe verse antes de pagar
- el historial de reservas debe conservarse

## APIs
- `/bookings/preview`
- `/bookings`
- `/bookings/{id}`
- `/bookings/{id}/cancel`
- `/bookings/{id}/reschedule`
- `/bookings/{id}/rebook`
# bookings.md

## Objetivo del módulo
Gestionar reservas, estados transaccionales y su vínculo con pagos.

## Alcance MVP
- preview
- checkout
- booking instantáneo
- booking con aprobación
- estados básicos
- historial de reservas
- cancelación según política base

## Dependencias
- marketplace
- providers
- pets
- households
- payments

## Regla
Toda reserva debe vincular mascota, hogar, proveedor y servicio.
