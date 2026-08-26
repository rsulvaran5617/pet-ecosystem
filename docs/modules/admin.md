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
- moderacion automatica de imagenes Pet Alert y su bandeja especializada; queda documentada como propuesta futura pendiente de aprobacion

## Dependencias
- providers
- bookings
- support
- audit_logs
- pet_alert

## Propuesta futura - Moderacion de contenido Pet Alert

Pet Ecosystem Admin es la superficie recomendada para la decision humana sobre imagenes de Pet Alert. El diseno futuro separa imagenes nuevas, resultados automaticos ambiguos o de riesgo alto, contenido denunciado y casos resueltos. La clasificacion automatica es evidencia auxiliar y nunca reemplaza la autorizacion administrativa en el primer release.

La especificacion completa de bandejas, estados, acciones, permisos, auditoria y criterios de aceptacion se mantiene en `docs/modules/pet_alert_external_owner_reports.md`. No existe implementacion activa, proveedor seleccionado ni cambios de Supabase asociados a esta propuesta.

## Entidades
- `provider_documents`
- `provider_organizations`
- `support_cases`
- `audit_logs`

## Reglas
- el estado del proveedor controla su visibilidad publica
- admin puede listar proveedores pendientes, abrir detalle y aprobar o rechazar
- la revision de proveedor muestra un checklist de readiness para piloto con perfil publico, servicios, horarios/capacidad, ubicacion publica, documentos y visibilidad
- el checklist solo ordena informacion existente; no cambia reglas de aprobacion ni crea datos nuevos
- admin puede abrir documentos de aprobacion mediante URL firmada temporal de storage para auditoria read-only antes de aprobar/rechazar
- la auditoria documental no crea estado por documento en MVP; la decision formal sigue siendo a nivel proveedor
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
