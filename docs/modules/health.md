# health.md

## Objetivo
Centralizar la información sanitaria de la mascota.

## MVP
- dashboard simple
- vacunas
- alergias
- condiciones

## V2
- medicación
- laboratorios
- imágenes
- incidentes
- compartir expediente

## Entidades
- pet_vaccines
- pet_allergies
- pet_conditions
- pet_medications
- pet_labs
- pet_incidents

## Reglas
- la salud pertenece a la mascota
- el acceso debe respetar permisos del hogar
- condiciones críticas deben resaltarse

## APIs
- `/pets/{id}/vaccines`
- `/pets/{id}/allergies`
- `/pets/{id}/conditions`
- `/pets/{id}/medications`
# health.md

## Objetivo del módulo
Gestionar la salud base de la mascota para el MVP.

## Alcance MVP
- vacunas
- alergias
- condiciones
- dashboard de salud simple

## Dependencias
- pets
- documents
- reminders

## Regla
Los registros sensibles deben respetar ownership y household access.
