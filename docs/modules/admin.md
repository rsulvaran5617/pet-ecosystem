# admin.md

## Objetivo del modulo
Permitir la operacion minima de plataforma requerida por el MVP.

## Alcance MVP
- login admin
- revision y aprobacion de proveedores
- soporte basico
- trazabilidad minima en `audit_logs` para mutaciones administrativas criticas

## Fuera de alcance
- dashboard admin avanzado
- configuracion global
- moderacion avanzada de reviews
- asignaciones operativas
- disputas

## Dependencias
- providers
- bookings
- support
- audit_logs

## Entidades
- `provider_documents`
- `provider_organizations`
- `support_cases`
- `audit_logs`

## Reglas
- el estado del proveedor controla su visibilidad publica
- admin puede listar proveedores pendientes, abrir detalle y aprobar o rechazar
- el soporte MVP se gestiona desde admin, no desde un rol separado de soporte
- admin puede listar casos, abrir detalle y actualizar estado o resolucion basica
- approvals y actualizaciones administrativas criticas dejan rastro minimo en `audit_logs`

## APIs relacionadas
- `GET /admin/providers/pending`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `GET /admin/support-cases`
- `GET /admin/support-cases/{id}`
- `PATCH /admin/support-cases/{id}`
