# admin.md

## Objetivo
Permitir la operación central de la plataforma.

## MVP
- dashboard admin básico
- proveedores pendientes
- revisión documental
- aprobar/rechazar proveedores
- soporte básico
- auditoría mínima

## V2
- disputas
- moderación de reviews
- configuración global básica

## V3
- feature flags
- configuración avanzada

## Entidades
- provider_documents
- provider_organizations
- support_cases
- audit_logs
- provider_flags

## Reglas
- toda aprobación debe quedar auditada
- el estado del proveedor controla su visibilidad pública

## APIs
- `/admin/dashboard`
- `/admin/providers/pending`
- `/admin/providers/{id}/approve`
- `/admin/providers/{id}/reject`
- `/admin/support-cases`
# admin.md

## Objetivo del módulo
Permitir la operación básica de plataforma en el MVP.

## Alcance MVP
- dashboard básico
- revisión y aprobación de proveedores
- soporte básico
- auditoría mínima

## Dependencias
- providers
- bookings
- support
- audit logs

## Regla
Toda acción administrativa sensible debe quedar trazada.
