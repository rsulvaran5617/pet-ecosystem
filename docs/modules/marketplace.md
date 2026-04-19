# marketplace.md

## Objetivo del modulo
Permitir discovery publico de proveedores pet aprobados y dejar lista la seleccion de servicio para el flujo transaccional de booking.

## Alcance MVP
- home marketplace
- busqueda
- filtros basicos
- perfil publico del proveedor
- seleccion de servicio
- handoff real hacia booking preview cuando el usuario ya tiene sesion

## Alcance diferido
- favoritos
- ranking avanzado
- cotizaciones
- recurrencia

## Entidades
- `provider_organizations`
- `provider_public_profiles`
- `provider_services`
- `provider_availability`

## Pantallas
- home marketplace
- resultados de busqueda
- perfil proveedor
- seleccion de servicio

## Reglas
- solo proveedores aprobados pueden ser visibles en marketplace
- marketplace consume perfiles publicos, servicios y disponibilidad publicados por `providers`
- el discovery publico lista organizaciones con `approval_status = approved` e `is_public = true`
- los proveedores sin perfil publico o sin al menos un servicio publico no aparecen en discovery
- la seleccion de servicio no crea por si sola el booking
- la seleccion deja preparado el contexto para `Bookings`
- en web, el discovery puede verse sin autenticacion; reservar sigue requiriendo sesion valida

## Dependencias
- providers
- households
- pets
- bookings para el paso transaccional posterior

## APIs relacionadas
- `GET /marketplace/home`
- `GET /marketplace/providers`
- `GET /marketplace/providers/{id}`

## Criterio de done del modulo MVP
- el usuario descubre proveedores aprobados
- puede buscar y filtrar
- puede abrir el perfil publico del proveedor
- puede seleccionar un servicio
- si ya esta autenticado, puede pasar al preview de booking sin perder contexto
