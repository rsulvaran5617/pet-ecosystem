# providers.md

## Objetivo del módulo
Permitir que proveedores operen y vendan servicios en la plataforma.

## Alcance MVP
- crear organización
- completar perfil negocio
- configurar servicios
- definir disponibilidad
- cargar documentos
- ver estado de aprobación
- dashboard básico
- aceptar/rechazar solicitudes

## Alcance V2
- staff
- sucursales
- CRM básico
- reportes
- payouts visibles

## Entidades
- provider_organizations
- provider_public_profiles
- provider_services
- provider_availability
- provider_documents
- provider_staff
- provider_branches

## Reglas
- sin aprobación no hay visibilidad pública
- solo roles autorizados pueden editar organización
- servicios deben pertenecer a una organización

## Dependencias
- core
- approvals
- bookings
- messaging
- payments

## APIs relacionadas
- POST /provider/organization
- POST /provider/services
- POST /provider/availability
- GET /provider/approval-status
- GET /provider/dashboard
- POST /provider/bookings/{id}/accept
- POST /provider/bookings/{id}/reject