# reviews.md

## Objetivo del modulo
Permitir dejar una review basica, textual y con rating, vinculada a un booking completado.

## Alcance MVP
- dejar review vinculada a booking completado
- rating basico de 1 a 5
- comentario textual basico
- restriccion para que solo el cliente elegible pueda dejar la review
- navegacion minima desde booking hacia review
- visibilidad de la review para el cliente que la dejo y para el owner proveedor del booking

## Fuera de alcance en este slice
- fotos o adjuntos en reviews
- moderacion avanzada
- rewards por review
- disputas
- soporte
- respuesta publica del proveedor
- agregados publicos de rating si no existe politica canonica explicita

## Dependencias
- core auth
- households
- pets
- marketplace solo como origen previo del servicio reservado
- bookings

## Entidades
- `reviews`
- `bookings`
- `provider_organizations`
- `provider_services`

## Reglas
- una review solo puede existir una vez por booking
- solo el usuario que realizo la reserva puede dejar la review
- el booking debe estar en estado `completed`
- bookings `cancelled`, `pending_approval` o solo `confirmed` no son elegibles para review
- el owner de la organizacion proveedora puede ver la review del booking asociado
- el rating agregado publico del proveedor queda fuera de este slice hasta que exista una politica canonica documentada para exponerlo en marketplace

## APIs relacionadas
- `GET /bookings/{id}/review`
- `POST /bookings/{id}/review`

## Criterio de done del modulo MVP
- existe handoff minimo desde booking hacia review
- el cliente elegible puede dejar rating y comentario
- no se pueden dejar reviews duplicadas
- el proveedor no puede dejar la review del cliente
- la visibilidad queda restringida a participantes autorizados del booking
