# support.md

## Objetivo del modulo
Permitir soporte basico de plataforma para incidencias vinculadas a una reserva, sin mezclar disputas ni chat en vivo.

## Alcance MVP
- crear caso de soporte vinculado a booking
- listar mis casos
- ver detalle del caso
- seguimiento basico por estado y resolucion
- admin puede listar casos, ver detalle y actualizar estado o nota
- trazabilidad minima de la gestion administrativa en `audit_logs`

## Fuera de alcance
- disputas
- chargebacks o refunds manuales
- moderacion avanzada
- asignaciones
- SLA
- macros
- adjuntos o binarios
- soporte generico sin booking
- chat en vivo de soporte

## Dependencias
- core auth
- bookings
- admin

## Entidades
- `support_cases`
- `bookings`
- `audit_logs`

## Reglas
- todo caso de soporte debe vincularse a un booking existente
- el creador del caso debe tener acceso autorizado al booking
- el seguimiento MVP se resuelve por estado y nota o resolucion basica en el caso
- el proveedor no participa automaticamente en el caso de soporte MVP
- `messaging` sigue reservado a cliente-proveedor y no se reutiliza como canal de soporte
- el baseline actual permite un solo `support_case` por booking

## APIs relacionadas
- `GET /support-cases`
- `POST /support-cases`
- `GET /support-cases/{id}`
- `GET /admin/support-cases`
- `GET /admin/support-cases/{id}`
- `PATCH /admin/support-cases/{id}`

## Criterio de done del modulo MVP
- el usuario puede abrir un caso desde el contexto de una reserva
- puede ver su listado de casos y el detalle de cada caso
- el caso refleja seguimiento basico por estado y resolucion
- admin puede listar, abrir y actualizar el caso
