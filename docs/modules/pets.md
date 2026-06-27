# pets.md

## Objetivo del modulo
Permitir registrar mascotas dentro de un hogar, consultar su perfil resumen y gestionar documentos basicos ligados a esa mascota.

## Alcance MVP
- listar mascotas del hogar
- crear mascota
- editar mascota
- marcar mascota como `En memoria` sin borrar perfil ni historial
- ver perfil resumen de mascota
- registrar si la mascota esta esterilizada, no esterilizada o sin dato indicado
- cargar foto/avatar controlado de mascota
- listar documentos basicos de mascota
- cargar documentos basicos de mascota
- clasificar documentos por tipo
- registrar y editar vigencia de documentos de mascota
- reutilizar documentos tipo `vaccination_record` como soporte/sticker de vacunas desde el modulo Salud

## Fuera de este slice MVP
- timeline
- compartir documentos con proveedores
- permisos por mascota
- expediente clinico avanzado
- borrado fisico de mascotas, documentos, salud, recordatorios o historial
- archivado o restore de documentos si no queda explicitamente pedido por release posterior

## Entidades
- `pets`
- `pet_profiles`
- `pet_documents`
- bucket privado `pet-avatars`

## Reglas
- toda mascota pertenece a un `household`
- el owner no debe ver el registro de mascota como siguiente paso si todavia no tiene hogar/familia creada o aceptada
- una mascota puede estar `active` o `in_memory`
- `in_memory` conserva documentos, salud, recordatorios e historial, y evita uso accidental en nuevas reservas
- un miembro con permiso de hogar `view` puede consultar mascotas y documentos
- un miembro con permiso de hogar `edit` o `admin` puede crear y editar mascotas
- un miembro con permiso de hogar `edit` o `admin` puede marcar o reactivar una mascota entre `active` e `in_memory`
- un miembro con permiso de hogar `edit` o `admin` puede cargar o reemplazar la foto/avatar de la mascota
- mobile owner permite reemplazar la foto/avatar de mascota desde dos fuentes: tomar foto con camara o elegir una imagen de la galeria, respetando permisos del dispositivo
- mobile/web owner permiten editar y consultar el estado de esterilizacion como dato descriptivo del perfil; no afecta reservas ni reglas operativas.
- un miembro con permiso de hogar `edit` o `admin` puede cargar documentos
- un miembro con permiso de hogar `edit` o `admin` puede editar metadata de vigencia documental sin reemplazar el archivo
- las fotos de mascota viven en Supabase Storage privado `pet-avatars` y se exponen al cliente mediante URL firmada temporal
- los documentos basicos viven en Supabase Storage y su metadata en `pet_documents`
- los documentos pueden indicar si tienen vencimiento, fecha de emision, fecha de vencimiento y ventana de aviso; el estado visual se calcula en cliente con helper compartido y no bloquea reservas automaticamente
- los documentos tipo `vaccination_record` pueden cargarse desde Salud como sticker o soporte de una vacuna, manteniendo archivo y metadata en `pet_documents`
- mobile owner conserva el contexto activo de mascota en el shell de navegacion para que la ficha, salud, documentos, recordatorios, busqueda y preparacion de reservas no pierdan foco al moverse entre opciones del menu inferior
- si la mascota activa deja de existir, cambia de hogar o queda inaccesible por permisos, el shell debe limpiar el contexto y volver a la experiencia normal sin romper la navegacion
- web owner presenta la gestion de mascotas con selector de hogares compacto, carrusel superior de mascotas y ficha inferior de resumen/documentos para la mascota seleccionada; la edicion de datos maestros se abre bajo demanda desde el icono de lapiz de cada ficha o desde la accion de crear mascota
- no se implementa `pet_timeline` ni `pet_document_shares` en este slice

## Dependencias minimas
- core
- households

## APIs
- `GET /pets?householdId={householdId}`
- `POST /pets`
- `GET /pets/{id}`
- `PATCH /pets/{id}`
- `POST /pets/{id}/memory-status`
- `POST /pets/{id}/avatar`
- `GET /pets/{id}/documents`
- `POST /pets/{id}/documents`
- `GET /households/{id}/pet-documents`
- `PATCH /pet-documents/{id}`
