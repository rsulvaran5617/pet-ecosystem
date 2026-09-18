# Corrección H06 — capacidad frente a reservas existentes

Estado: **aplicada al servidor vinculado y verificada**, 17/09/2026 Panamá (18/09/2026 UTC). No requiere publicar nuevas pantallas ni un binario mobile para activar este control.

## Comportamiento

Al modificar la capacidad de una regla, el servidor comprueba las reservas que consumen cupo en cada franja futura o en curso. Rechaza una capacidad inferior a las reservas existentes con el mensaje «No puedes reducir la capacidad por debajo de las reservas existentes». El valor anterior permanece.

Se permiten aumentos y reducciones hasta la ocupación existente. Cancelar libera cupo. No se suman reservas de fechas diferentes; se respetan los overrides de capacidad por fecha. Las franjas ya terminadas no bloquean cambios futuros y sus reservas no se modifican. Desactivar una regla conserva las reservas y no permite evadir el control al modificar después su capacidad.

## Implementación

`supabase/migrations/20260918030000_provider_capacity_occupied_guard.sql`:

- Trigger privado `guard_provider_rule_capacity`, SECURITY DEFINER y search_path fijo, sobre cambios reales de capacity. Comprueba los estados definidos por `booking_status_consumes_capacity` y lee toda la ocupación aunque el proveedor no pueda leer directamente los hogares por RLS.
- Registra los cambios aceptados mediante `insert_audit_log`; no crea auditorías al rechazar ni ante una asignación del mismo valor.
- `create_booking_from_slot` toma FOR SHARE sobre la regla antes del bloqueo advisory por slot y antes de calcular cupos. Las reservas de una regla pueden compartir el bloqueo; editarla debe esperar. La edición y una nueva reserva no pueden validar simultáneamente contra estados anteriores diferentes.
- Se conservan firmas, DTOs, ACL de la RPC, RLS, reglas de mascotas activas, pago referencial y zona America/Panama. No se cambió código de apps.

Alcance acotado: edición de capacidad de reglas y creación por `create_booking_from_slot`. No redefine cambios de horario/servicio, mutaciones directas de excepciones, el flujo legacy `create_booking` ni la política de cierres. Las excepciones existentes se respetan; editar una excepción es un caso pendiente de auditoría. No modifica reservas históricas ni crea un contador manual.

## Evidencia

| Prueba | Resultado |
| --- | --- |
| Baseline remoto dentro de rollback | Reproduce la reducción 2 → 1 con dos reservas |
| Candidata dentro de rollback | 16/16 comprobaciones correctas |
| Migración instalada | 16/16 comprobaciones correctas |
| Dos conexiones, reserva antes de edición | Se observa espera por lock; reserva confirma y edición incompatible se rechaza |
| Dos conexiones, edición antes de reserva | Se observa espera por lock; edición confirma y reserva sin cupo se rechaza |
| Comprobaciones de concurrencia | 9/9 correctas; estado final capacidad igual o superior a ocupación |

La regresión incluye reducción exacta, aumento, cancelación, historial pasado, estados que consumen cupo, separación por fecha, override, regla inactiva, RLS de proveedor y rechazo de usuario ajeno. Las pruebas de concurrencia usan transacciones PostgreSQL reales a READ COMMITTED y observan `pg_stat_activity`: no son una simulación local de promesas ni una prueba de carga.

El preflight comprobó el proyecto vinculado y la coincidencia exacta de la RPC remota con el baseline de `20260604073000_booking_capacity_panama_timezone.sql`; verificó que la candidata probada tenía el mismo SHA-256. Se aplicó únicamente la migración H06 y se registró su versión en la misma transacción. Sin push global, commit Git, push Git o despliegue de clientes.

Evidencia portable: `evidence/capacity-guard-baseline.json`, `capacity-guard-candidate.json`, `capacity-guard-installed.json`, `capacity-guard-deploy.json`, `capacity-guard-concurrency.json` y `capacity-guard-postcheck.json`.

Typecheck y lint de los siete workspaces, además de git diff --check, pasaron. No se repitieron builds de clientes porque H06 no cambió las apps. Las funciones SQL se compilaron y ejecutaron en el servidor real; el postcheck compara los cuerpos instalados, el trigger habilitado y el registro de migración.

## Datos QA

Solo se usaron el proveedor privado QA, su servicio y la mascota sintética. Las pruebas de regresión revirtieron publicación, reglas y reservas. En concurrencia se crearon dos reglas y tres reservas; al terminar se cancelaron las reservas y se desactivaron las reglas. La publicación temporal fue interna a las transacciones y se restauró antes del commit; el negocio/perfil/servicio permanecieron privados frente a otras sesiones.

Reglas retenidas como evidencia: `862f1353-6d84-469a-b983-2472367fcd22` y `9cf6f9ec-ca9f-457e-846c-c0762907d728`. No hubo cobros ni mensajes. Los JSON no contienen credenciales.

## Reproducir

```powershell
node docs/audit/2026-09-17/capacity-guard-remote.mjs
```

Usa credenciales de gestión ya configuradas y termina en ROLLBACK. El runner sale distinto de cero si falla alguna comprobación.

`capacity-guard-concurrency.mjs` crea registros QA persistentes y luego los cancela/desactiva; ejecutarlo solo de forma deliberada con los fixtures dedicados. `--baseline` documenta el servidor anterior y ya no debe esperarse que reproduzca el fallo. No repetir `capacity-guard-deploy.mjs --apply`, porque la migración ya está registrada.

## Pendiente

H07/H08: corregir desbordamiento de las consolas web y errores de hidratación. H04/H05 todavía requieren publicación de clientes y QA nativo. La auditoría general conserva 45/110 fichas con alguna ejecución parcial y 65 sin ejecución; resolver H06 no equivale a certificar todas las funciones de reservas.
