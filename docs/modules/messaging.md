# messaging.md

## Objetivo
Permitir comunicación trazable entre actores del ecosistema.

## MVP
- inbox
- chat ligado a booking
- mensajes de texto
- notificación básica

## V2
- adjuntos
- chat ligado a citas o pedidos

## Entidades
- chat_threads
- chat_participants
- chat_messages

## Reglas
- el chat debe tener contexto transaccional en MVP
- solo participantes autorizados pueden verlo
- el historial debe ser consultable para soporte

## APIs
- `/chats`
- `/chats/{threadId}/messages`
- `/chats/{threadId}/attachments`
# messaging.md

## Objetivo del módulo
Habilitar comunicación básica entre cliente y proveedor vinculada a reservas.

## Alcance MVP
- inbox
- chat básico vinculado a booking

## Dependencias
- bookings
- providers
- households

## Regla
No habilitar conversaciones fuera del scope autorizado de la reserva.
