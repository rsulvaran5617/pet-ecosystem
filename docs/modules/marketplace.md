# pets.md

## Objetivo del módulo
Gestionar la entidad principal del sistema: la mascota.

## Alcance MVP
- lista de mascotas
- crear mascota
- editar mascota
- perfil resumen
- documentos básicos

## Alcance V2
- timeline
- compartir documentos
- relación con proveedor veterinario principal

## Entidades
- pets
- pet_profiles
- pet_documents
- pet_document_shares
- pet_timeline_events

## Pantallas
- lista de mascotas
- crear mascota
- editar mascota
- perfil mascota
- documentos

## Reglas
- una mascota pertenece a un hogar
- una mascota puede tener múltiples documentos
- solo miembros autorizados del hogar pueden verla
- la documentación sensible debe respetar permisos

## Dependencias
- households
- profiles
- storage
- reminders
- health

## APIs relacionadas
- GET /pets
- POST /pets
- GET /pets/{id}
- PATCH /pets/{id}
- GET /pets/{id}/documents
- POST /pets/{id}/documents

## Criterio de done del módulo MVP
- un usuario puede crear una mascota;
- verla en listado;
- editarla;
- subir un documento;
- acceder a su ficha resumen.