# households.md

## Objetivo del modulo
Permitir que varias personas compartan el cuidado de una o mas mascotas a traves de un hogar comun.

## Alcance MVP
- crear hogar
- listar hogares
- ver detalle basico del hogar
- invitar miembros
- aceptar invitacion
- rechazar invitacion
- ver miembros
- asignar permisos basicos por miembro

## Fuera de MVP
- permisos por mascota
- historial por miembro
- notificaciones avanzadas
- invitaciones a usuarios que todavia no existen en core

## Entidades
- `households`
- `household_members`
- `household_invitations`

## Reglas
- un hogar debe tener al menos un admin
- los permisos minimos son:
  - `view`
  - `edit`
  - `book`
  - `pay`
  - `admin`
- en este MVP las invitaciones se resuelven contra usuarios ya existentes en `profiles.email`
- todo acceso a mascotas y datos sensibles debe pasar por household membership

## Dependencias minimas
- core

## APIs
- `GET /households`
- `POST /households`
- `GET /households/{id}`
- `GET /household-invitations`
- `POST /households/{id}/invitations`
- `POST /household-invitations/{id}/accept`
- `POST /household-invitations/{id}/reject`
- `PATCH /households/{id}/members/{memberId}/permissions`
