# health.md

## Objetivo del modulo
Gestionar la salud base de la mascota dentro del alcance MVP.

## Alcance MVP
- dashboard de salud simple por mascota
- vacunas:
  - listar
  - registrar
  - editar
- alergias:
  - listar
  - registrar
  - editar
- condiciones:
  - listar
  - registrar
  - editar
- visualizacion de salud basica dentro del perfil resumen de mascota

## Fuera de MVP
- medicacion
- laboratorios
- imagenes clinicas
- incidentes
- compartir expediente

## Entidades
- pet_vaccines
- pet_allergies
- pet_conditions

## Dependencias
- core
- households
- pets

## Reglas
- la salud pertenece a la mascota
- el acceso respeta permisos derivados del hogar y de la mascota
- listar requiere acceso de lectura a la mascota
- registrar o editar requiere permisos derivados de `edit` o `admin` en el hogar
- las condiciones criticas deben resaltarse en el dashboard simple
- en MVP no existe share activo hacia proveedores o clinica

## API conceptual
- GET `/pets/{id}/health`
- GET `/pets/{id}/vaccines`
- POST `/pets/{id}/vaccines`
- PATCH `/pets/{id}/vaccines/{vaccineId}`
- GET `/pets/{id}/allergies`
- POST `/pets/{id}/allergies`
- PATCH `/pets/{id}/allergies/{allergyId}`
- GET `/pets/{id}/conditions`
- POST `/pets/{id}/conditions`
- PATCH `/pets/{id}/conditions/{conditionId}`
