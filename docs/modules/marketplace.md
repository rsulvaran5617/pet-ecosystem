# marketplace.md

## Objetivo del modulo
Permitir discovery publico de proveedores pet aprobados y dejar lista la seleccion de servicio para el flujo transaccional de booking.

## Alcance MVP
- home marketplace
- busqueda
- filtros basicos
- perfil publico del proveedor
- avatar/foto publica del proveedor cuando exista en storage controlado
- ubicacion publica del proveedor en modo lista cuando el proveedor la publico
- distancia aproximada solo cuando el cliente recibe coordenadas de origen opcionales ya disponibles
- seleccion de servicio
- handoff real hacia booking preview cuando el usuario ya tiene sesion

## Alcance diferido
- favoritos
- ranking avanzado
- cotizaciones
- recurrencia
- discovery geolocalizado por cercania
- mapa de proveedores aprobados
- ordenamiento por distancia desde hogar, direccion seleccionada o ubicacion actual
- Geo-0 prepara `provider_public_locations` y PostGIS; no habilita mapa, permisos de ubicacion ni tracking todavia
- Geo-2 muestra ubicacion publica en cards/listas y deja preparada distancia aproximada sin mapa, permisos mobile ni tracking

## Entidades
- `provider_organizations`
- `provider_public_profiles`
- `provider_public_locations` (V2 Geo-0)
- `provider_services`
- `provider_availability`
- bucket privado con lectura controlada `provider-avatars`

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
- si el perfil tiene avatar controlado en `provider-avatars`, marketplace lo muestra mediante URL firmada temporal; si no, usa placeholder visual
- ubicacion geolocalizada solo puede exponerse desde `provider_public_locations` cuando la organizacion/perfil/servicios son publicos y aprobados
- el proveedor decide precision publica: `exact`, `approximate` o `city`
- Geo-2 muestra nombre visible, ciudad/pais y precision publica en marketplace; `distanceKm` solo se calcula si el filtro incluye `nearLatitude`/`nearLongitude`
- marketplace geolocalizado no debe exponer direcciones privadas de owners ni guardar ubicacion actual sin consentimiento
- no hay tracking en tiempo real dentro de Geo-0/Geo-2
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
- `GET /marketplace/provider-locations` (V2 Geo-0, base para mapa/filtros por distancia)

## Criterio de done del modulo MVP
- el usuario descubre proveedores aprobados
- puede buscar y filtrar
- puede abrir el perfil publico del proveedor
- puede seleccionar un servicio
- si ya esta autenticado, puede pasar al preview de booking sin perder contexto
