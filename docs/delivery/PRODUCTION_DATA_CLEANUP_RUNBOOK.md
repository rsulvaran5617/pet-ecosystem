# Production Data Cleanup Runbook

## Objetivo

Preparar el ambiente productivo o piloto productivo controlado de Pet Ecosystem mediante una limpieza selectiva, trazable y no destructiva de proveedores demo, historicos o de QA, preservando integridad relacional e historial transaccional.

Este runbook no autoriza borrado directo de datos. La decision por defecto es ocultar, pausar o desactivar. El borrado fisico queda reservado solo para proveedores sin historial operacional verificable.

## Principio rector

- Ocultar/desactivar antes que borrar.
- Conservar reservas, chats, evidencia, soporte, reviews y audit logs.
- Borrar solo entidades maestras sin historia transaccional.
- Ejecutar primero diagnostico, exportar resultados y revisar IDs manualmente.
- Aplicar cambios por ventana controlada y con plan de rollback logico.

## Tablas y relaciones sensibles

Provider base:

- `provider_organizations`: entidad raiz del negocio.
- `provider_public_profiles`: perfil publico, cascade desde organizacion.
- `provider_public_locations`: ubicacion publica, cascade desde organizacion.
- `provider_services`: catalogo de servicios, cascade desde organizacion.
- `provider_availability`: disponibilidad legacy, cascade desde organizacion.
- `provider_availability_rules`: reglas de cupos/capacidad, cascade desde organizacion.
- `provider_availability_exceptions`: excepciones de agenda/capacidad, cascade desde organizacion.
- `provider_documents`: documentos de aprobacion, cascade desde organizacion.

Historial transaccional que no debe borrarse:

- `bookings`: referencia `provider_organization_id` con `on delete restrict`.
- `booking_pricing`: depende de `booking_id`.
- `booking_status_history`: depende de `booking_id`.
- `booking_operations`: depende de `booking_id`.
- `booking_operation_evidence`: depende de `booking_id`.
- `booking_operation_report`: depende de `booking_id`.
- `booking_operation_notes`: depende de `booking_id`.
- `booking_operation_tokens`: depende de `booking_id`.
- `chat_threads`: referencia `provider_organization_id`.
- `chat_messages`: depende de `chat_threads`.
- `reviews`: referencia `provider_organization_id`.
- `support_cases`: referencia `provider_organization_id`.
- `audit_logs`: conserva trazabilidad y no debe limpiarse.

Storage relacionado:

- `provider-documents`: documentos de aprobacion del negocio.
- `provider-avatars`: avatar/foto publica del proveedor.
- `booking-operation-evidence`: evidencia transaccional del servicio.

## Clasificacion de proveedores

### KEEP_PROD

Proveedor real que debe quedar disponible para produccion o piloto productivo.

Criterios comunes:

- proveedor real identificado;
- servicios reales;
- ubicacion valida;
- documentos de aprobacion correctos;
- actividad esperada para piloto o produccion.

### HIDE_DEMO

Proveedor demo, historico o de QA que no debe aparecer en marketplace, pero cuya historia puede conservarse.

Criterios comunes:

- tiene reservas, chats, reviews, soporte o evidencia;
- no debe contaminar busquedas productivas;
- no conviene borrar por trazabilidad.

Accion recomendada:

- `provider_organizations.is_public = false`;
- `provider_public_profiles.is_public = false`;
- `provider_public_locations.is_public = false`;
- `provider_services.is_public = false`;
- `provider_services.is_active = false`;
- `provider_availability.is_active = false`;
- `provider_availability_rules.is_active = false`.

### ARCHIVE_HISTORY

Proveedor con historia transaccional significativa que debe conservarse como historico auditable.

Criterios comunes:

- reservas completadas o canceladas;
- evidencia operacional;
- soporte o reviews;
- necesario para auditoria de QA/piloto.

Accion recomendada:

- mismo tratamiento que `HIDE_DEMO`;
- registrar en una bitacora externa los IDs y razon de archivo;
- evitar deletes fisicos.

### DELETE_CANDIDATE

Proveedor creado por error o prueba sin historia transaccional.

Criterios obligatorios:

- cero reservas;
- cero chats;
- cero reviews;
- cero soporte;
- cero evidencia operacional;
- revision manual de documentos/storage;
- owner confirmado.

Accion recomendada:

- usar RPC existente `delete_provider_organization(target_organization_id)` desde sesion autorizada, no deletes manuales;
- si se prepara SQL directo, mantenerlo comentado y condicionado a nueva aprobacion.

### REVIEW_MANUAL

Proveedor con datos ambiguos, actividad parcial o clasificacion dudosa.

Ejemplos:

- servicios activos pero sin reservas;
- documentos cargados;
- ubicacion publica real pero owner desconocido;
- actividad reciente;
- datos compartidos entre usuarios de QA.

Accion recomendada:

- revisar manualmente antes de ocultar o borrar;
- no ejecutar cambios masivos.

## Criterios de clasificacion

Para cada provider se debe revisar:

- reservas totales;
- reservas por estado;
- chats y mensajes;
- reviews;
- soporte;
- documentos de aprobacion;
- ubicaciones publicas;
- servicios publicos/activos;
- disponibilidad legacy;
- reglas de capacidad;
- operaciones/evidencia;
- ultima actividad;
- owner_user_id;
- si es proveedor real o demo.

## Estrategia recomendada

1. Ejecutar solo los SELECT de `docs/delivery/PRODUCTION_DATA_CLEANUP_REVIEW.sql`.
2. Exportar CSV del diagnostico.
3. Clasificar cada provider como `KEEP_PROD`, `HIDE_DEMO`, `ARCHIVE_HISTORY`, `DELETE_CANDIDATE` o `REVIEW_MANUAL`.
4. Aplicar primero solo ocultamiento/desactivacion no destructiva para `HIDE_DEMO` y `ARCHIVE_HISTORY`.
5. Validar marketplace, provider web/mobile y admin.
6. Esperar una ventana adicional antes de considerar borrado fisico de `DELETE_CANDIDATE`.
7. Si se borra, usar preferentemente la RPC `delete_provider_organization`, que bloquea negocios con reservas, conversaciones, reviews o soporte.

## Checklist antes de aplicar

- Backup/export Supabase reciente.
- Confirmar ambiente correcto.
- Export CSV del diagnostico.
- Lista manual de IDs por categoria.
- Aprobacion explicita del responsable de producto/datos.
- Ventana de mantenimiento o baja actividad.
- Confirmar que no se ejecutaran deletes automaticos.
- Confirmar que no se borraran reservas, chats, evidencia, soporte, reviews ni audit logs.

## Checklist despues de aplicar

- Marketplace no muestra proveedores ocultos.
- Proveedores reales siguen visibles.
- Servicios reales siguen activos/publicos.
- Admin conserva historial de proveedores ocultos.
- Reservas historicas siguen consultables.
- Chats y soporte no muestran errores.
- No hay relaciones huerfanas.
- Se conserva lista de IDs afectados.

## Rollback logico

Para cambios no destructivos:

- reactivar `provider_organizations.is_public`;
- reactivar `provider_public_profiles.is_public`;
- reactivar `provider_public_locations.is_public`;
- reactivar `provider_services.is_public` / `is_active`;
- reactivar `provider_availability.is_active`;
- reactivar `provider_availability_rules.is_active`.

Para deletes fisicos:

- no depender de rollback logico;
- restaurar desde backup o recrear datos maestros;
- por eso el borrado fisico debe ser excepcional.

## Riesgos

- Ocultar demasiado: un provider real podria dejar de aparecer en marketplace.
- Borrar con historial: perdida de trazabilidad y posibles errores por relaciones.
- Storage huerfano: documentos/avatar pueden quedar como objetos privados sin metadata si se borran datos maestros fuera de RPC.
- Reportes distorsionados: si se elimina historia, metricas de QA/piloto pierden contexto.
- Usuario provider confundido: si se oculta un negocio activo sin comunicarlo.

## Recomendacion final

Para preparar produccion, usar `HIDE_DEMO` / `ARCHIVE_HISTORY` como camino principal. Mantener deletes para una segunda etapa y solo sobre `DELETE_CANDIDATE` sin historial, con aprobacion manual y respaldo confirmado.
