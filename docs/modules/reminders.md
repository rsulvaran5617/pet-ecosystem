# reminders.md

## Objetivo del modulo
Gestionar agenda y recordatorios operativos del hogar y de la mascota sin duplicar la logica transaccional de bookings.

## Alcance MVP
- calendario
- recordatorios manuales
- fecha y hora opcional para recordatorios manuales
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
- repeticion, urgente y recordatorio adelantado quedan como REM-Advanced para un slice posterior

## Entidades
- `reminders`
- `calendar_events`

## Reglas
- un recordatorio puede pertenecer a una mascota o al hogar
- `due_at` guarda la fecha/hora canonica del recordatorio; `remind_time_enabled` indica si el usuario eligio una hora explicita o si se trata como recordatorio de dia completo
- mobile puede programar una notificacion local cuando hay hora explicita y permisos concedidos; no es push remoto ni sincroniza alertas entre dispositivos
- si una mascota queda `in_memory`, sus recordatorios historicos se conservan; crear nuevos recordatorios debe tratarse como gestion controlada, no como flujo operativo activo
- las vacunas con proxima fecha deben generar recordatorios
- mobile owner presenta recordatorios de forma progresiva: proximo cuidado, pendientes ordenados por fecha, completados recientes y validacion local de titulo/fecha/hora antes de guardar
- los eventos derivados de booking no deben adelantarse ni duplicar el dominio `bookings`
- web owner Recordatorios replica el patron funcional de mobile: selector compacto de hogar/mascota, resumen con secciones Pendientes/Completados/Calendario, formulario manual plegable y listas compactas sin cambiar contratos ni reglas

## Dependencias
- pets
- health
- bookings solo para integracion futura de agenda

## APIs relacionadas
- `GET /calendar`
- `POST /reminders`
- `POST /reminders/{id}/complete`
- `POST /reminders/{id}/snooze`
