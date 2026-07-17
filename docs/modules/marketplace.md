# marketplace.md

## Objetivo del modulo
Permitir discovery publico de proveedores pet aprobados y dejar lista la seleccion de servicio para el flujo transaccional de booking.

## Alcance MVP
- home marketplace
- landing publica de identidad en `apps/web` como entrada informativa del producto; no crea reservas ni expone datos privados
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
- Geo-3 permite seleccionar un origen controlado por zonas/ciudades aproximadas; direcciones guardadas quedan diferidas hasta que el contrato de `user_addresses` exponga coordenadas de forma trazable. No usa GPS ni geocoding externo
- Geo-4 agrega preview de mapa en mobile owner con MapLibre y ubicacion publica exacta declarada por proveedores; no pide GPS, no guarda ubicacion actual y mantiene fallback de lista
- Foster-4A queda separado de Owner mobile Buscar: `Mascotas que buscan hogar` se abre desde Owner Inicio en una pantalla dedicada. Buscar queda enfocado en servicios/proveedores y reservas. Solo lista publicaciones Foster aprobadas; no crea reservas, solicitudes ni transferencias. Owner Mascotas queda enfocado en gestion propia y publicaciones propias de familias protectoras.

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
- el proveedor publica una ubicacion visible para marketplace; el owner la ve como ubicacion exacta publicada por el proveedor
- Geo-2 muestra nombre visible, ciudad/pais y ubicacion publica en marketplace; `distanceKm` solo se calcula si el filtro incluye `nearLatitude`/`nearLongitude`
- Geo-3 no expone `user_addresses`: marketplace solo recibe coordenadas de filtro desde zonas controladas y muestra distancia aproximada
- Geo-4 mapa solo dibuja providers ya visibles para marketplace con `provider_public_locations.is_public = true`; los pins usan la coordenada publica exacta declarada por el proveedor y no exponen direcciones privadas del owner
- owner Buscar usa un widget compacto: campo principal, categorias rapidas y filtros avanzados bajo demanda desde el icono del buscador.
- Owner Buscar puede abrir un modo de busqueda enfocada con sugerencias, busquedas recientes visuales, filtros bajo demanda y panel modal de filtros. Los filtros funcionales siguen siendo los existentes: texto, categoria, ciudad/especie y origen controlado para distancia.
- Owner Buscar conserva internamente el contexto hogar/mascota para preparar reservas, pero lo muestra como una pastilla compacta `Mascota activa` con accion `Cambiar`; la ficha grande de contexto queda fuera de la UI para priorizar busqueda y resultados.
- Owner Buscar muestra el proveedor seleccionado en una card compacta con avatar/logo reducido, nombre legible, ciudad, ubicacion publica y categorias derivadas de sus servicios; la etiqueta visual de origen no forma parte del flujo funcional.
- UX-MOBILE-FLOWS Slice 1J mantiene Buscar enfocado en servicios: la vista de proveedor seleccionado ya no muestra la card intermedia de navegacion `Explorar/Resultados/Proveedor`, las cards de resultados no usan copy de piloto y los filtros visibles bajo demanda se limitan a opciones con comportamiento implementado.
- web owner Buscar replica el patron funcional de mobile owner: barra principal, chips de categorias, busquedas recientes, sugerencias, filtros bajo demanda, contexto hogar/mascota y cards visuales de proveedores antes del handoff a Reservas
- web owner Buscar mantiene el contexto hogar/mascota en una ficha lateral, oculta la navegacion interna duplicada y concentra el contenido en busqueda guiada, resultados, proveedor y seleccion de servicio segun el paso activo.
- en el detalle de proveedor, si no existen bloques publicos semanales pero si hay servicios publicados, la seccion `Disponibilidad` muestra los servicios con CTA `Ver cupos` para consultar slots reales por servicio sin crear reservas desde marketplace
- Owner Inicio enlaza a discovery Foster dedicado: cards de mascotas publicadas con foto, nombre, especie, edad, ciudad/pais, esterilizacion, resumen publico y detalle read-only. El CTA `Me interesa` solo muestra aviso informativo durante piloto. Buscar no abre esta vista automaticamente.
- marketplace geolocalizado no debe exponer direcciones privadas de owners ni guardar ubicacion actual sin consentimiento
- no hay tracking en tiempo real dentro de Geo-0/Geo-4
- la seleccion de servicio no crea por si sola el booking
- la seleccion deja preparado el contexto para `Bookings`
- si el owner tiene una mascota activa, Buscar la usa como contexto de preparacion de reserva cuando no existe otra mascota elegida explicitamente
- en web owner, la accion `Abrir vista previa de la reserva` cambia al modulo `Reservas` y conserva la seleccion importada para generar el preview transaccional.
- cuando el owner elige un slot desde Buscar, el handoff conserva proveedor, servicio, hogar/mascota si existen y `selectedBookingSlot`; Reservas abre directamente el paso pendiente sin repetir la seleccion de horario
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
