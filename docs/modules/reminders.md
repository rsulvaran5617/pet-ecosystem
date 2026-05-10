# reminders.md

## Objetivo del modulo
Gestionar agenda y recordatorios operativos del hogar y de la mascota sin duplicar la logica transaccional de bookings.

## Alcance MVP
- calendario
- recordatorios manuales
- completar o posponer
- recordatorios automaticos por vacunas

## Integracion con bookings
- `Bookings` ya existe en el baseline MVP
- la agenda de `Reminders` no incorpora todavia eventos derivados de reservas
- esa integracion sigue diferida para un hardening posterior y no bloquea el cierre actual del modulo

## Alcance diferido
- bandeja de pendientes
- medicacion
- automatizaciones adicionales
- eventos de agenda derivados de bookings

## Entidades
- `reminders`
- `calendar_events`

## Reglas
- un recordatorio puede pertenecer a una mascota o al hogar
- si una mascota queda `in_memory`, sus recordatorios historicos se conservan; crear nuevos recordatorios debe tratarse como gestion controlada, no como flujo operativo activo
- las vacunas con proxima fecha deben generar recordatorios
- los eventos derivados de booking no deben adelantarse ni duplicar el dominio `bookings`

## Dependencias
- pets
- health
- bookings solo para integracion futura de agenda

## APIs relacionadas
- `GET /calendar`
- `POST /reminders`
- `POST /reminders/{id}/complete`
- `POST /reminders/{id}/snooze`
