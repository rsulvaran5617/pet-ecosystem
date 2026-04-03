# apps/admin

Backoffice base para operación interna del MVP.

## Responsabilidad
- aprobación de proveedores
- soporte básico
- auditoría mínima
- operación administrativa inicial

## Estado actual
Este workspace queda listo como shell técnico inicial con Next.js + TypeScript.

## Reglas
- el admin no debe duplicar reglas de negocio del backend
- toda mutación crítica debe quedar auditada
- toda acción debe respetar permisos por rol administrativo
