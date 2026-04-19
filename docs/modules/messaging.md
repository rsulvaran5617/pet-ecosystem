# messaging.md

## Objetivo del modulo
Habilitar comunicacion basica entre cliente y proveedor, siempre vinculada a una reserva existente.

## Alcance MVP
- inbox de threads
- detalle de chat vinculado a booking
- envio basico de mensajes de texto
- navegacion minima desde booking hacia el chat asociado

## Fuera de alcance en este slice
- adjuntos
- chat libre desacoplado del booking
- reviews
- soporte
- automatizaciones avanzadas
- unread counters o notificaciones persistidas no canonicas

## Dependencias
- bookings
- marketplace solo como origen previo de la reserva
- core auth
- providers solo por el owner de la organizacion involucrada en la reserva

## Entidades
- `chat_threads`
- `chat_messages`

## Reglas
- cada thread nace automaticamente al crearse un booking
- el thread pertenece a un solo booking
- solo pueden ver y escribir en el thread:
  - el usuario que realizo la reserva
  - el owner de la organizacion proveedora del booking
- no se habilitan conversaciones fuera del scope autorizado de la reserva
- el inbox y el detalle deben poder resolverse sin exponer datos privados fuera de ese scope

## APIs relacionadas
- `GET /chats`
- `GET /chats/{threadId}/messages`
- `POST /chats/{threadId}/messages`

## Criterio de done del modulo MVP
- existe inbox funcional de threads vinculados a bookings
- se puede abrir el detalle del thread desde booking
- se pueden enviar mensajes de texto basicos
- la visibilidad queda restringida por participantes autorizados
- adjuntos, reviews y soporte siguen fuera de alcance
