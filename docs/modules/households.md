# households.md

## Objetivo
Permitir que varias personas compartan el cuidado de una o más mascotas.

## MVP
- crear hogar
- invitar miembros
- aceptar/rechazar invitación
- ver miembros
- asignar permisos básicos

## V2
- permisos por mascota
- historial por miembro

## Entidades
- households
- household_members
- household_invitations

## Reglas
- un hogar debe tener al menos un admin
- los permisos mínimos son:
  - view
  - edit
  - book
  - pay
  - admin

## APIs
- `/households`
- `/households/{id}/invitations`
- `/household-invitations/{id}/accept`
- `/household-invitations/{id}/reject`
# households.md

## Objetivo del módulo
Gestionar hogares, miembros e invitaciones.

## Alcance MVP
- crear hogar
- invitar miembros
- aceptar invitación
- permisos básicos por miembro

## Dependencias
- core
- pets
- reminders

## Regla
Todo acceso a mascotas y datos sensibles debe pasar por household membership.
