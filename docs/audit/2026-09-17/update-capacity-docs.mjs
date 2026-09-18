import fs from 'node:fs/promises';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const append=async(file,content)=>{const url=new URL(file,root);const old=await fs.readFile(url,'utf8');if(!old.includes(content.split('\n')[0]))await fs.writeFile(url,old.trimEnd()+'\n\n'+content+'\n');};
await append('docs/modules/providers.md',`## Corrección H06 — capacidad ocupada (20260918030000)

Aplicada al servidor vinculado. Cambiar capacity en provider_availability_rules comprueba por franja futura/en curso la ocupación de pending_approval, confirmed y completed. Rechaza un valor inferior, respeta capacity_override por fecha y conserva historia pasada. Cambios aceptados quedan auditados; rechazos no cambian el valor anterior. Desactivar sigue permitido sin cancelar reservas, pero una regla inactiva también valida sus cambios de capacidad.

Trigger privado: la API existente sigue usando UPDATE bajo RLS, sin nuevos DTOs ni cambios de UI. La creación de reservas toma FOR SHARE sobre la regla para coordinarse con el UPDATE. Regresión de 16 casos antes/después y dos carreras de conexiones reales (9 comprobaciones) pasaron. Alcance: cambios de capacidad de reglas; editar excepciones y cambiar horarios/servicios son casos distintos pendientes de auditoría. Detalle en docs/audit/2026-09-17/CORRECCION_CAPACIDAD.md.`);
await append('docs/modules/bookings.md',`## Corrección H06 — reserva frente a edición simultánea de capacidad

20260918030000 conserva create_booking_from_slot y su contrato, incorporando FOR SHARE sobre la regla antes del advisory lock por slot y la lectura de disponibilidad. A READ COMMITTED, si una reserva confirma primero, la edición espera y ve su ocupación; si la capacidad se reduce primero, la reserva espera y valida contra el nuevo límite. Se probaron ambas secuencias con conexiones PostgreSQL separadas y espera por lock observada.

Un trigger en provider_availability_rules impide que capacity quede por debajo de cupos ocupados de una franja futura/en curso, usando los estados de booking_status_consumes_capacity y overrides por fecha. No modifica bookings pasados ni el flujo legacy create_booking. Evidencia: docs/audit/2026-09-17/CORRECCION_CAPACIDAD.md.`);
await append('docs/api/API_CONTRACT.md',`## Capacidad de proveedor — H06 (20260918030000)

updateProviderAvailabilityRule conserva firma y DTO y actualiza provider_availability_rules bajo RLS. Una capacidad inferior a la ocupación de una franja futura/en curso es rechazada por el servidor con «No puedes reducir la capacidad por debajo de las reservas existentes.». La actualización es atómica y no modifica la regla al fallar. Cupos se calculan por franja y estado, con excepción por fecha cuando existe; las reservas canceladas no consumen.

create_booking_from_slot conserva firma, retorno y permisos. Bloquea compartidamente la regla antes de consultar cupos para coordinar creación y edición. No cambia la política de cancelación, pagos, precios ni mascotas activas. Servidor instalado; no requiere actualizar los clientes para el control H06.`);
await append('docs/data/RLS_RULES.md',`## Capacidad ocupada H06 — trigger privado

20260918030000 agrega guard_provider_rule_capacity() como trigger SECURITY DEFINER con search_path public y EXECUTE revocado a public/anon/authenticated. Mantiene las políticas de UPDATE de reglas; el guard consulta reservas sin quedar limitado por la visibilidad del actor para no subestimar ocupación. Los cambios reales de capacity aceptados registran actor, regla, organización, servicio y capacidad anterior/nueva mediante insert_audit_log. No amplía lectura de hogares ni de reservas para proveedores.

La RPC de reserva mantiene su ACL y toma FOR SHARE sobre la regla. Se comprobó el trigger con SET ROLE authenticated y el bloqueo de edición por usuario ajeno, además de dos secuencias concurrentes a READ COMMITTED.`);
await append('docs/data/SUPABASE_SCHEMA.md',`## Migración 20260918030000 — capacidad ocupada

provider_capacity_occupied_guard agrega la función privada y trigger trg_provider_rule_capacity_guard antes de cambios de capacity en provider_availability_rules. Agrupa reservas por slot_start_at/slot_end_at, excluye franjas terminadas, usa booking_status_consumes_capacity y respeta el override por fecha de America/Panama. Registra cambios reales aceptados. Reemplaza create_booking_from_slot conservando firma y agregando FOR SHARE sobre la regla antes de calcular disponibilidad. No añade tablas, columnas ni contadores. Aplicada al servidor vinculado el 18/09/2026 UTC; pruebas y hash en docs/audit/2026-09-17/evidence/capacity-guard-*.json.`);
let report=await fs.readFile(new URL('INFORME_AUDITORIA.md',dir),'utf8');
const addition=`## Actualización H06: capacidad corregida en servidor

La migración 20260918030000 bloquea cambios de capacidad inferiores a la ocupación por franja futura/en curso. Se reprodujo el fallo anterior; pasaron 16 pruebas con candidata dentro de rollback y las mismas 16 después de aplicar. Dos conexiones reales verificaron ambas carreras (reserva primero y edición primero), con 9 comprobaciones correctas y espera por lock observada. Las reservas QA quedaron canceladas, reglas desactivadas y proveedor privado.

Sin cambios de pantallas ni nuevo binario para este control. Conserva excepciones por fecha e historial; la edición de excepciones y los cambios de horario/servicio no forman parte de este cierre. Evidencia en CORRECCION_CAPACIDAD.md. H07/H08 siguen abiertos; H04/H05 requieren publicación de clientes y QA nativo.

`;
if(!report.includes('## Actualización H06:'))report=report.replace('## Resultado principal',addition+'## Resultado principal');
report=report.replace('H06–H08 siguen abiertos. Detalle','H06 corregido en servidor y H07/H08 abiertos. Detalle');
report=report.replace('3. **Capacidad, H06:** impedir reducción incompatible con reservas y probarla en concurrencia.','3. **Capacidad, H06 — servidor corregido:** 16 regresiones y dos carreras reales pasaron; conservar cobertura de excepciones/horarios como pendiente.');
report=report.replace('H01–H05 tienen correcciones de servidor aplicadas y comprobadas;','H01–H06 tienen correcciones de servidor aplicadas y comprobadas;');
report=report.replace('El siguiente bloque de código es H06: capacidad con reservas existentes; después H07/H08 y ampliación de cobertura.','El siguiente bloque de código es H07/H08: adaptación de las consolas web e hidratación; después ampliar cobertura.');
await fs.writeFile(new URL('INFORME_AUDITORIA.md',dir),report);
let readme=await fs.readFile(new URL('README.md',dir),'utf8');
readme=readme.replace('H01–H05 tienen correcciones','H01–H06 tienen correcciones').replace('H06–H08 siguen abiertos.','H06 pasó regresiones y dos carreras reales; H07/H08 siguen abiertos. Ver `CORRECCION_CAPACIDAD.md`.').replace('y `CORRECCION_REINTENTOS.md`. La evidencia',' , `CORRECCION_REINTENTOS.md` y `CORRECCION_CAPACIDAD.md`. La evidencia');
await fs.writeFile(new URL('README.md',dir),readme);
const handoffUrl=new URL('docs/HANDOFF.md',root);let handoff=await fs.readFile(handoffUrl,'utf8');
const heading='# Handoff 2026-09-17 - H06 capacidad aplicada y probada en concurrencia';
const section=`${heading}

- Continuación autorizada por usuario. Aplicada solo 20260918030000_provider_capacity_occupied_guard.sql tras baseline exacto y candidata en rollback; hash idéntico al probado. No commit/push ni deploy de clientes.
- Trigger privado SECURITY DEFINER sobre cambios reales de capacity impide bajar de la ocupación por franja futura/en curso; respeta overrides, estados consumidores y audita cambios aceptados. Historial pasado no bloquea cambios futuros. RLS/DTO/UI sin cambios.
- create_booking_from_slot conserva contrato y todas sus validaciones; agrega FOR SHARE sobre regla antes de advisory lock por slot y consulta. Evita carreras entre nuevas reservas y edición de capacidad.
- Baseline reproduce H06; 16/16 candidata y 16/16 instalada. Concurrencia real por Management API: dos conexiones por carrera, reserva primero y edición primero, espera pg_stat_activity observada; 9/9 checks correctos. READ COMMITTED, no carga masiva.
- Fixtures de regresión revertidos. Concurrencia retiene reglas QA 862f1353-6d84-469a-b983-2472367fcd22 y 9cf6f9ec-ca9f-457e-846c-c0762907d728 desactivadas; tres reservas canceladas. Organización/perfil/servicio QA siguen privados. Publicación transaccional se restauró antes del commit.
- Documentación y evidencia: docs/audit/2026-09-17/CORRECCION_CAPACIDAD.md y evidence/capacity-guard-*.json. Runner remoto normal revierte; runner de concurrencia crea/cancela QA. No repetir --apply ni esperar que --baseline reproduzca después del fix.
- Alcance: actualización capacity de reglas y RPC de reserva por slot. No se certifican edición directa de excepciones, cambios de horario/servicio ni legacy create_booking. No se modificaron apps, por lo que no se repitieron builds; typecheck/lint se comprueban al cierre.
- Siguiente: H07/H08 (overflow de consolas/hidratación), publicación de clientes H04/H05 y QA nativo. Auditoría mantiene 45/110 fichas con evidencia parcial y 65 sin ejecutar. Conservar archivos previos ajenos.

`;
if(!handoff.includes(heading))handoff=handoff.replace('# HANDOFF.md\n','# HANDOFF.md\n\n'+section);await fs.writeFile(handoffUrl,handoff);
const technicalUrl=new URL('evidence/technical-validation.json',dir);const technical=JSON.parse(await fs.readFile(technicalUrl,'utf8'));
for(const item of [{check:'Capacidad H06 remota',result:'16/16 antes y después',scope:'Trigger privado, reglas por slot, cancelación, historial, overrides, auditoría y RLS'},{check:'Concurrencia H06',result:'9/9 correctas',scope:'Dos carreras en conexiones PostgreSQL reales, READ COMMITTED y espera por lock observada'}]){const i=technical.findIndex(r=>r.check===item.check);if(i<0)technical.push(item);else technical[i]=item;}
await fs.writeFile(technicalUrl,JSON.stringify(technical,null,2)+'\n');
