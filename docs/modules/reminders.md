# reminders.md

## Objetivo
Gestionar seguimiento activo de tareas, eventos y cuidados.

## MVP
- calendario
- recordatorios manuales
- recurrencia simple
- completar o posponer
- recordatorios por vacunas
- integración con bookings

## V2
- bandeja de pendientes
- medicación
- automatizaciones adicionales

## Entidades
- reminders
- reminder_occurrences
- calendar_events

## Reglas
- un recordatorio puede pertenecer a una mascota o al hogar
- bookings confirmados deben verse en agenda
- las vacunas con próxima fecha deben generar recordatorio

## APIs
- `/calendar`
- `/reminders`
- `/reminders/{id}/complete`
- `/reminders/{id}/snooze`
# reminders.md

## Objetivo del módulo
Gestionar agenda y recordatorios relacionados con salud y reservas.

## Alcance MVP
- calendario
- recordatorios manuales
- recordatorios automáticos por vacunas
- integración con bookings

## Dependencias
- pets
- health
- bookings

## Regla
Los recordatorios deben reutilizar datos existentes y no duplicar entidades clínicas avanzadas.
