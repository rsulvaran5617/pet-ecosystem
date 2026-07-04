# households.md

## Web Foster Console

La ruta web `/foster` puede crear una Familia Protectora separada cuando el usuario autenticado aun no tiene un household `protective`.

- El flujo reutiliza `createHousehold` con `householdType = protective`.
- Luego prepara y envia el perfil protector a revision admin mediante el API Foster existente.
- Un `Hogar familiar` owner no se convierte automaticamente en Familia Protectora.
- La aprobacion admin sigue siendo obligatoria antes de publicar mascotas o gestionar solicitudes.

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
- un owner nuevo debe crear o aceptar un hogar antes de registrar la primera mascota
- la app mobile debe priorizar la creacion de hogar/familia cuando el owner autenticado no tiene hogares disponibles
- los permisos minimos son:
  - `view`
  - `edit`
  - `book`
  - `pay`
  - `admin`
- en este MVP las invitaciones se resuelven contra usuarios ya existentes en `profiles.email`
- todo acceso a mascotas y datos sensibles debe pasar por household membership
- web owner debe mantener oculto el formulario de creacion de hogar por defecto y abrirlo solo desde una accion explicita de nuevo hogar

## Separacion Owner vs Familia Protectora

Decision de diseno 2026-06-29:

- un hogar/familia debe tener un tipo operativo principal.
- `owner`: hogar familiar normal para mascotas propias.
- `protective`: familia protectora/acogida para mascotas bajo custodia temporal, rescate o adopcion responsable.
- una misma fila de `households` no debe operar simultaneamente como `owner` y `protective`.
- si una misma persona necesita ambos contextos, debe pertenecer a dos hogares distintos: uno owner y otro protective.
- las funciones normales de owner siguen disponibles para hogares `owner`.
- las funciones Foster/Adoption solo deben habilitarse para hogares `protective` con perfil protector aprobado por admin.
- el tipo operativo debe modelarse en `households` mediante `household_type` o campo equivalente, con default conservador `owner` para datos existentes.

Reglas esperadas para un slice posterior:

- hogares `owner` no pueden crear publicaciones de adopcion ni iniciar transferencias Foster.
- hogares `protective` no deben mezclarse visualmente con mascotas propias del hogar familiar.
- `protective_household_profiles` deja de representar una capacidad adicional sobre cualquier owner y pasa a ser el perfil de revision/aprobacion de hogares tipo `protective`.
- la migracion debe ser no destructiva: no borrar hogares, miembros, mascotas ni historiales.
- si existen perfiles protectores ya aprobados o en revision, se debe proponer una politica explicita de migracion antes de marcar esos hogares como `protective`.

Foster-Household-B:

- migracion local propuesta: `20260629110000_household_type_owner_protective.sql`.
- agrega `household_type` con default `owner` y constraint `owner | protective`.
- no realiza backfill automatico de hogares existentes a `protective`.
- actualiza `create_household` para aceptar un tipo explicito con default `owner`.
- owner mobile permite crear `Hogar familiar` o `Familia protectora` como hogares separados.
- owner mobile oculta la solicitud protectora cuando el hogar seleccionado es `owner` y muestra copy para crear/seleccionar una familia protectora separada.
- reporte de impacto: `docs/delivery/FOSTER_HOUSEHOLD_TYPE_IMPACT_REPORT.md`.
- decision vigente: `HOGAR SULVARAN VELASCO` permanece `owner`; antes de aplicar remoto se debe crear o seleccionar un hogar protector separado.

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
