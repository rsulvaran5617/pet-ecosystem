# marketplace.md

## Objetivo del módulo
Permitir descubrir y contratar servicios pet.

## Alcance MVP
- home marketplace
- búsqueda
- filtros básicos
- perfil proveedor
- selección de servicio
- checkout
- historial de reservas

## Alcance V2
- favoritos
- cotizaciones
- recurrencia
- ranking avanzado

## Entidades
- provider_organizations
- provider_public_profiles
- provider_services
- provider_availability
- provider_coverage_areas
- bookings
- booking_pricing

## Reglas
- solo proveedores aprobados pueden ser visibles
- una reserva debe vincular mascota, hogar, proveedor y servicio
- la política de cancelación debe mostrarse antes de pagar

## Dependencias
- providers
- bookings
- payments
- pets
- households

## APIs relacionadas
- GET /marketplace/home
- GET /marketplace/providers
- GET /marketplace/providers/{id}
- POST /bookings/preview
- POST /bookings

## Criterio de done del módulo MVP
- usuario descubre proveedor;
- elige servicio;
- paga;
- reserva queda creada con estado correcto.