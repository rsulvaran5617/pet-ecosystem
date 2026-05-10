# pets.md

## Objetivo del modulo
Permitir registrar mascotas dentro de un hogar, consultar su perfil resumen y gestionar documentos basicos ligados a esa mascota.

## Alcance MVP
- listar mascotas del hogar
- crear mascota
- editar mascota
- ver perfil resumen de mascota
- cargar foto/avatar controlado de mascota
- listar documentos basicos de mascota
- cargar documentos basicos de mascota
- clasificar documentos por tipo

## Fuera de este slice MVP
- timeline
- compartir documentos con proveedores
- permisos por mascota
- expediente clinico avanzado
- archivado o restore de documentos si no queda explicitamente pedido por release posterior

## Entidades
- `pets`
- `pet_profiles`
- `pet_documents`
- bucket privado `pet-avatars`

## Reglas
- toda mascota pertenece a un `household`
- un miembro con permiso de hogar `view` puede consultar mascotas y documentos
- un miembro con permiso de hogar `edit` o `admin` puede crear y editar mascotas
- un miembro con permiso de hogar `edit` o `admin` puede cargar o reemplazar la foto/avatar de la mascota
- un miembro con permiso de hogar `edit` o `admin` puede cargar documentos
- las fotos de mascota viven en Supabase Storage privado `pet-avatars` y se exponen al cliente mediante URL firmada temporal
- los documentos basicos viven en Supabase Storage y su metadata en `pet_documents`
- no se implementa `pet_timeline` ni `pet_document_shares` en este slice

## Dependencias minimas
- core
- households

## APIs
- `GET /pets?householdId={householdId}`
- `POST /pets`
- `GET /pets/{id}`
- `PATCH /pets/{id}`
- `POST /pets/{id}/avatar`
- `GET /pets/{id}/documents`
- `POST /pets/{id}/documents`
