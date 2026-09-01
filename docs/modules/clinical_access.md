# CLINICAL ACCESS-2

## Estado del documento

- Frente: `CLINICAL ACCESS-2 - Acceso profesional y escritura clinica autorizada`.
- Slice actual: `2A - diseno, consentimiento y arquitectura`.
- Estado: 2A documentado y 2B implementado localmente, pendiente de revision y migracion remota.
- Release: V2, dominio `clinic`, apoyado en `core`, `providers`, `households`, `pets` y `health`.
- Este documento no autoriza migraciones ni implementacion de escritura clinica.

## 1. Resumen ejecutivo

Clinical Access-1 permite que un owner entregue mediante QR una consulta web temporal y revocable del expediente de una mascota. El acceso es anonimo, de solo lectura y no acredita a quien lo abre.

Clinical Access-2 debe agregar identidad profesional y consentimiento de escritura sin convertir el QR en una llave de modificacion. La arquitectura recomendada separa cuatro controles:

1. El QR demuestra posesion temporal de un enlace, no identidad profesional.
2. La cuenta autenticada identifica al usuario, pero no demuestra licencia veterinaria.
3. La verificacion profesional acredita una identidad y, cuando aplique, su relacion con una clinica.
4. Una autorizacion explicita del owner define mascota, alcance, vigencia y acciones permitidas.

La informacion incorporada por profesionales debe ser `append-only`. Un profesional agrega una atencion o rectificacion atribuida; no edita ni elimina el historial del owner o de terceros. Cada escritura debe validarse en una operacion transaccional del servidor y quedar vinculada a profesional, organizacion, consentimiento y sesion.

## 2. Diagnostico del estado actual

### Capacidades disponibles

- `profiles`, `user_roles` y Supabase Auth identifican usuarios autenticados.
- El rol `provider` habilita operacion comercial general.
- `provider_organizations` tiene owner, aprobacion de plataforma y perfil publico.
- `provider_services.category = veterinary` clasifica una oferta comercial.
- `pet_vaccines`, `pet_allergies`, `pet_conditions` y `pet_documents` forman el expediente basico owner.
- `audit_logs` ofrece un patron de trazabilidad para mutaciones criticas.
- Clinical Access-1 agrega grants temporales, eventos y una proyeccion web sanitizada.

### Brechas relevantes

- No existe una identidad profesional veterinaria verificada.
- La aprobacion de provider valida una organizacion para operar/publicarse; no acredita licencia sanitaria.
- La categoria comercial `veterinary` no demuestra que el usuario sea veterinario.
- `provider_organizations` usa hoy un owner gestor; no existe una membresia de staff operativa suficiente para atribuir actos clinicos individuales.
- Las tablas de salud actuales no modelan encounter, autor profesional, organizacion, consentimiento ni rectificacion.
- El dominio `clinic` figura como V2 y `not_started`.
- Clinical Access-1 es anonimo y no debe ampliarse directamente con mutaciones.

Conclusion: no es seguro reutilizar el rol provider como credencial clinica ni permitir `insert/update` directo sobre las tablas owner. Clinical Access-2 requiere un subdominio clinico separado y progresivo.

## 3. Alcance de Clinical Access-1

Clinical Access-1 permite:

- generar un token temporal por 1 hora, 1 dia o 1 semana;
- consultar una proyeccion web de identidad basica, vacunas, alergias, condiciones y metadata documental;
- revocar el acceso;
- auditar creacion, consulta, expiracion y revocacion;
- conservar unicamente el hash del token en base de datos.

## 4. Limites actuales

Clinical Access-1 no:

- identifica al lector;
- acredita un profesional;
- vincula una clinica;
- solicita consentimiento de escritura;
- permite crear o corregir informacion;
- permite abrir archivos privados;
- representa una consulta medica formal;
- reemplaza obligaciones legales, consentimiento informado o regulacion profesional.

## 5. Modelo progresivo de Clinical Access-2

### 2A - Diseno y consentimiento

Define identidad, estados, permisos, entidades, contratos, RLS, auditoria, UX y riesgos. No implementa codigo.

### 2B - Identificacion profesional

El lector del QR puede consultar como en Clinical Access-1. Para aspirar a escritura debe autenticarse. La web muestra su identidad, organizacion y estado de verificacion. Un usuario no verificado conserva solo lectura.

Implementacion local:

- perfil profesional individual con verificacion manual;
- vinculacion opcional solo a organizaciones provider gestionadas directamente por el solicitante;
- contexto autenticado dentro de la URL temporal sin persistir el token en tablas o logs;
- cola Admin para verificar, rechazar o suspender;
- sin documentos de acreditacion, staff, solicitudes de escritura ni mutaciones clinicas.

### 2C - Consentimiento de escritura

El profesional verificado solicita un alcance. El owner aprueba o rechaza desde Mobile con identidad, clinica, mascota, vigencia y acciones visibles. La autorizacion es revocable y no reutilizable para otra mascota.

Implementacion local: solicitudes granulares vinculadas al grant, mascota y profesional; revision owner con scopes solicitados; autorizacion temporal y revocacion inmediata. No habilita todavia formularios ni mutaciones clinicas.

### 2D - Anexos clinicos

El profesional autorizado crea una atencion append-only con hallazgos, diagnosticos, vacunas, indicaciones, tratamientos y documentos. No modifica registros historicos.

### 2E - Historial y auditoria

Owner, profesional autorizado y admin ven proyecciones acordes a su rol. Se muestran autor, organizacion, consentimiento, fechas, rectificaciones y eventos relevantes.

## 6. Matriz de roles y permisos

| Actor | Leer con QR vigente | Solicitar escritura | Aprobar escritura | Crear anexo | Rectificar propio anexo | Editar/borrar historial | Revocar |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Visitante anonimo | Si | No | No | No | No | No | No |
| Usuario autenticado no verificado | Si | No | No | No | No | No | No |
| Profesional pendiente/rechazado | Si | No | No | No | No | No | No |
| Profesional verificado | Si | Si | No | Solo con autorizacion activa | Si, mediante nueva rectificacion | No | No |
| Owner con `edit/admin` | Si | No | Si | No en calidad profesional | No | No sobre anexos profesionales | Si |
| Miembro household con solo `view` | Si, si recibe el enlace | No | No | No | No | No | No |
| Admin plataforma | Auditoria justificada | No | No en nombre del owner | No | No | No | Puede suspender identidad/sesion por seguridad |

Regla: ser owner de una organizacion provider no concede por si solo permiso clinico.

## 7. Estados de sesion y autorizacion

### Sesion de acceso

- `read_only`: QR valido, consulta anonima o autenticada.
- `professional_identity_required`: el usuario intenta iniciar el camino de escritura sin autenticarse.
- `professional_pending_verification`: autenticado, pero sin acreditacion aprobada.
- `expired`: termino la vigencia.
- `revoked`: el owner cerro el acceso.
- `completed`: la atencion autorizada fue confirmada y cerrada.

### Solicitud de escritura

- `write_requested`: enviada al owner.
- `write_approved`: consentimiento activo.
- `write_rejected`: owner rechazo.
- `write_revoked`: owner retiro el consentimiento.
- `expired`: vencio sin uso o durante la sesion.
- `completed`: el profesional confirmo el anexo final.

Las transiciones deben ser monotónicas. Un estado terminal no vuelve a activo; una nueva necesidad genera una nueva solicitud.

## 8. Modelo de consentimiento

El consentimiento debe ser explicito, informado, granular, temporal y revocable.

Debe capturar como snapshot:

- owner autorizante;
- mascota;
- profesional y estado de verificacion;
- organizacion/clinica, si aplica;
- acciones solicitadas;
- inicio y vencimiento;
- texto de consentimiento y version;
- fecha de aprobacion/rechazo/revocacion;
- motivo opcional de rechazo y motivo de revocacion cuando exista actividad;
- grant de lectura que origino el flujo.

Alcances sugeridos, todos desactivados por defecto:

- `create_encounter`;
- `record_diagnosis`;
- `record_vaccine`;
- `record_recommendation`;
- `record_treatment`;
- `upload_clinical_document`.

No incluir `edit_pet`, `delete_health_record`, `transfer_pet`, `read_household` ni acceso a contacto privado.

La expiracion del QR no debe ampliar la autorizacion. La vigencia efectiva es el minimo entre grant, solicitud aprobada, verificacion profesional y sesion autenticada.

## 9. Acciones permitidas y prohibidas

### Permitidas con autorizacion activa

- crear una atencion clinica;
- registrar hallazgos y diagnosticos dentro de esa atencion;
- registrar vacuna aplicada con datos de procedencia;
- registrar indicaciones y tratamiento recomendado;
- adjuntar receta, informe o resultado a la atencion;
- cerrar la atencion;
- rectificar una entrada propia mediante un nuevo registro enlazado.

### Prohibidas

- editar datos maestros o avatar de la mascota;
- cambiar household, custodia u ownership;
- editar/eliminar datos creados por owner u otro profesional;
- sobrescribir un anexo cerrado;
- borrar archivos para ocultar historia;
- crear reservas, cobros o transferencias;
- reutilizar consentimiento para otra mascota, profesional u organizacion;
- usar service role desde web/mobile;
- escribir directamente desde UI en tablas clinicas;
- presentar la verificacion de plataforma como licencia gubernamental si no lo es.

## 10. Propuesta de entidades

Los nombres son conceptuales y requieren aprobacion antes de una migracion.

### `clinical_professional_profiles`

- `id`, `user_id` unico;
- nombre profesional y tipo de profesional;
- identificador/licencia cifrado o minimizado segun decision legal;
- jurisdiccion y pais;
- `verification_status` (`draft`, `pending`, `verified`, `rejected`, `suspended`, `expired`);
- fechas de verificacion/vencimiento;
- `verified_by_user_id` y notas privadas admin;
- timestamps.

No debe usar `user_roles.provider` como sustituto.

### `clinical_organization_profiles`

- `id`;
- `provider_organization_id` opcional y unico;
- nombre legal/visible;
- estado de verificacion clinica;
- jurisdiccion;
- timestamps.

La aprobacion comercial del provider y la verificacion clinica permanecen separadas.

### `clinical_organization_memberships`

- profesional;
- organizacion clinica;
- rol operativo;
- estado;
- vigencia y timestamps.

Esto resuelve la ausencia actual de staff atribuible. No debe implementarse hasta definir administracion de membresias.

### `clinical_write_requests`

- grant de lectura origen;
- mascota y household;
- profesional y organizacion snapshots;
- scopes solicitados;
- estado;
- mensaje al owner;
- vencimiento y timestamps.

### `clinical_write_authorizations`

- solicitud unica;
- owner autorizante;
- scopes aprobados;
- version/texto de consentimiento;
- aprobacion, vencimiento, revocacion y finalizacion;
- timestamps.

### `clinical_encounters`

- autorizacion;
- mascota;
- profesional y organizacion;
- fecha de atencion;
- tipo de atencion;
- resumen;
- estado `draft`, `finalized`, `corrected`;
- finalizacion y timestamps.

Un draft solo puede editarlo su autor mientras la autorizacion siga activa. Al finalizar queda inmutable.

### `clinical_entries`

- encounter;
- tipo (`finding`, `diagnosis`, `vaccine`, `recommendation`, `treatment`);
- payload estructurado y versionado o columnas explicitas por subtipo;
- `corrects_entry_id` opcional;
- autor y timestamps.

Preferencia: DTOs y columnas explicitas para campos clinicos consultables; JSON solo para snapshots/versionado, no para ocultar todo el dominio.

### `clinical_documents`

- encounter;
- tipo, titulo, mime, tamano;
- bucket/path privado;
- checksum;
- autor y timestamps;
- `supersedes_document_id` para correccion.

### `clinical_audit_events`

- entidad y evento;
- actor, profesional y organizacion;
- mascota, grant, solicitud/autorizacion y encounter;
- contexto minimo sin contenido clinico innecesario;
- timestamp.

## 11. Propuesta de contratos API/RPC

Todos los nombres son candidatos.

### 2B

- `get_my_clinical_professional_context()`
- `get_clinical_access_authenticated_context(raw_token)`

### 2C

- `request_clinical_write_access(raw_token, organization_id, scopes, note)`
- `list_pet_clinical_write_requests(pet_id)`
- `review_clinical_write_request(request_id, decision, approved_scopes, expires_at)`
- `revoke_clinical_write_authorization(authorization_id, reason)`

### 2D

- `create_clinical_encounter(authorization_id, idempotency_key, input)`
- `save_clinical_encounter_draft(encounter_id, input)`
- `finalize_clinical_encounter(encounter_id, idempotency_key)`
- `create_clinical_entry(encounter_id, input)`
- `create_clinical_correction(entry_id, authorization_id, input)`
- `prepare_clinical_document_upload(encounter_id, metadata)` mediante Edge Function o RPC mas signed upload;
- `finalize_clinical_document_upload(document_id, checksum)`.

### Lectura

- `get_owner_clinical_timeline(pet_id)`
- `get_clinical_encounter(encounter_id)` segun scope;
- `get_clinical_document_signed_url(document_id)`.

Cada mutacion valida internamente sesion, identidad, verificacion, membresia, mascota, scopes, estado, vencimiento y revocacion. La UI nunca decide el permiso final.

## 12. Propuesta RLS

- RLS activa en todas las entidades.
- Sin `insert/update/delete` directo para solicitudes, autorizaciones, encounters, entries, documentos o auditoria.
- Escritura exclusivamente por RPC/Edge Function transaccional `security definer` con `search_path` fijo y permisos revocados a `public`.
- Owner con `can_view_pet` consulta timeline; solo `can_edit_pet` revisa/revoca autorizaciones.
- Profesional consulta solicitudes y encounters donde `professional_user_id = auth.uid()` y su verificacion/membresia es valida.
- Organizacion no hereda acceso masivo al expediente; cada usuario accede por atribucion individual y autorizacion.
- Admin consulta verificacion y auditoria bajo funcion administrativa; no recibe permiso de alterar contenido clinico.
- Storage privado con paths derivados de `encounter_id/document_id`; URLs firmadas cortas y policy/helper que valide actor y relacion.
- No exponer `raw_token`, hashes, datos de contacto, household ni notas admin en DTOs clinicos.

## 13. Eventos de auditoria

Eventos minimos:

- identidad profesional enviada, aprobada, rechazada, suspendida o vencida;
- QR consultado por usuario autenticado;
- escritura solicitada;
- solicitud aprobada o rechazada;
- autorizacion revocada o vencida;
- encounter creado, borrador actualizado y finalizado;
- entrada creada y rectificada;
- carga, consulta y supersesion de documento;
- intento denegado por scope, expiracion, revocacion o identidad;
- accion administrativa de seguridad.

La auditoria debe almacenar identificadores y contexto de seguridad, no duplicar texto clinico sensible.

## 14. Mapa UX Owner Mobile

1. Salud > Acceso temporal.
2. Elegir `Solo consultar` o `Permitir solicitar registro clinico`.
3. La escritura nunca aparece seleccionada por defecto.
4. Generar QR y mostrar vigencia/revocacion.
5. Al recibir solicitud, mostrar una tarjeta prioritaria con:
   - mascota;
   - profesional;
   - clinica;
   - verificacion;
   - scopes en lenguaje simple;
   - vencimiento.
6. Owner revisa y aprueba/rechaza.
7. Durante la autorizacion, Salud muestra `Acceso profesional activo` y `Revocar`.
8. Al finalizar, notificar y mostrar el nuevo anexo en el historial.

Copy recomendado:

- `El codigo QR permite consultar el expediente. Registrar informacion requiere tu aprobacion.`
- `La Dra. Ana Perez de Clinica Central solicita registrar la atencion de Luna.`
- `Puede agregar diagnostico, indicaciones y documentos hasta las 4:30 p. m.`
- `Puedes retirar este permiso en cualquier momento.`

## 15. Mapa UX Profesional Web

1. Escanear QR y consultar expediente.
2. Seleccionar `Identificarme para solicitar registro`.
3. Iniciar sesion o crear cuenta profesional, sin perder el token/contexto.
4. Ver identidad y estado de verificacion.
5. Si no esta verificado: conservar lectura y explicar siguiente paso.
6. Si esta verificado: en 2C, solicitar scopes y organizacion.
7. Esperar aprobacion con actualizacion manual o realtime controlado.
8. Con autorizacion, abrir stepper:
   - datos de atencion;
   - hallazgos/diagnostico;
   - vacunas/tratamiento;
   - documentos;
   - revisar;
   - confirmar.
9. Mantener visibles mascota, profesional, clinica, scopes y tiempo restante.
10. Finalizar y mostrar comprobante inmutable.

## 16. Expiracion y revocacion

- Cada RPC calcula vigencia en servidor; nunca confia en reloj del cliente.
- La vigencia efectiva usa el menor vencimiento aplicable.
- Revocar lectura invalida nuevas consultas y debe suspender drafts asociados que no hayan sido finalizados.
- Revocar escritura impide guardar/finalizar desde ese instante.
- Un encounter ya finalizado permanece en historial.
- Si vence durante la edicion, la UI conserva una copia local no sensible solo durante la sesion y explica que debe solicitar nueva autorizacion; no intenta escribir con permiso vencido.
- No hay reactivacion: se crea un nuevo grant/consentimiento.

## 17. Riesgos de seguridad y privacidad

| Riesgo | Mitigacion requerida |
| --- | --- |
| QR reenviado | Lectura limitada; escritura exige login, verificacion y consentimiento especifico. |
| Provider presentado como veterinario | Verificacion profesional separada y copy legal preciso. |
| Robo de token | Hash, alta entropia, expiracion, revocacion, no logs y `Referrer-Policy: no-referrer`. |
| Escalada de scope | Validacion transaccional server-side en cada mutacion. |
| Edicion retroactiva | Modelo append-only y rectificaciones enlazadas. |
| Suplantacion en clinica | Membresia verificada, atribucion individual y suspension central. |
| Documento malicioso | Allowlist MIME, limites, checksum, escaneo y bucket privado. |
| Exceso de datos | DTO minimo por scope y sin datos household/contacto. |
| Carrera entre revocacion y guardado | Lock/validacion de autorizacion dentro de la misma transaccion. |
| Doble envio | `idempotency_key` unico por autor/operacion. |
| Responsabilidad regulatoria | Revision legal en Panama antes de piloto clinico; politica de retencion y consentimiento versionado. |

## 18. Estrategia append-only

- El owner mantiene control del expediente, pero no puede reescribir silenciosamente una nota profesional finalizada.
- El profesional edita su draft antes de finalizar.
- Finalizar fija contenido, autor, organizacion, consentimiento y timestamp.
- Una correccion crea una nueva entrada con `corrects_entry_id` y razon; ambas permanecen visibles.
- Una vacuna profesional puede proyectarse en el resumen de vacunas, pero su fuente clinica permanece distinguible.
- Los documentos se superseden; no se reemplazan destruyendo evidencia.
- Eliminacion fisica solo por politica legal excepcional, con proceso admin auditado y no desde UI cotidiana.

## 19. Slices de implementacion

### 2A - Actual

Documento y decisiones. Sin codigo.

### 2B - Identidad profesional read-only

- autenticacion web conservando retorno seguro al token;
- perfil profesional y estado de verificacion;
- vinculacion opcional a provider organization;
- admin de verificacion basica;
- contexto autenticado de lectura;
- sin solicitudes ni escritura.

### 2C - Solicitud y consentimiento

- solicitud granular;
- inbox owner mobile;
- aprobar/rechazar/revocar;
- expiracion y auditoria;
- sin contenido clinico todavia.

### 2D - Encounter append-only

- draft y finalizacion;
- entradas clinicas estructuradas;
- documentos privados;
- rectificacion;
- validacion transaccional e idempotencia.

### 2E - Timeline y operacion

- timeline owner;
- consulta profesional historica limitada;
- auditoria admin;
- estados, notificaciones y QA regulatoria.

## 20. Criterios de aceptacion del diseno

- QR no concede escritura.
- Usuario autenticado no equivale a profesional verificado.
- Provider aprobado no equivale a clinica/profesional acreditado.
- Consentimiento identifica mascota, profesional, organizacion, scopes y vigencia.
- Escritura es append-only y atribuible.
- Revocacion se valida en servidor en cada mutacion.
- No existe acceso directo de cliente a tablas sensibles.
- Documentos permanecen privados.
- Owner puede entender y retirar permisos con lenguaje simple.
- Admin no puede modificar silenciosamente historia clinica.
- Los slices 2B y 2C no introducen escritura clinica anticipada.

## 21. Plan de QA

### Seguridad

- token invalido, vencido, revocado y reutilizado;
- usuario anonimo intentando solicitar/escribir;
- provider no verificado intentando presentarse como profesional;
- profesional suspendido durante sesion;
- autorizacion para otra mascota/organizacion;
- scope no aprobado;
- revocacion concurrente con guardado;
- acceso directo REST/Storage denegado;
- token ausente de logs, errores y analytics.

### Funcional

- login conserva retorno al expediente correcto;
- identidad y organizacion correctas;
- estados terminales no se reactivan;
- owner recibe y entiende solicitud;
- expiracion usa hora servidor;
- doble submit no duplica encounter;
- rectificacion conserva original;
- timeline atribuye correctamente.

### UX y accesibilidad

- mobile owner en pantallas pequenas y texto ampliado;
- web profesional en celular, tablet y desktop;
- foco, teclado, labels, contraste y mensajes humanos;
- nunca mostrar IDs, estados tecnicos ni errores SQL.

### Regresion

- Clinical Access-1 sigue leyendo anonimamente;
- Salud owner, documentos, vacunas y hogares no cambian;
- provider marketplace/booking no obtiene acceso clinico indirecto.

## 22. Recomendacion para el primer slice implementable

Implementar `Clinical Access-2B` como identidad profesional de solo lectura, sin solicitudes y sin escritura. Debe probar que autenticacion, verificacion y atribucion funcionan antes de introducir consentimiento.

Decisiones que deben aprobarse antes de 2B:

1. La verificacion profesional sera manual por admin durante el piloto.
2. Que documentos/atributos minimos acreditan a un veterinario en Panama.
3. Si una clinica debe existir primero como `provider_organization` aprobada o puede tener perfil clinico independiente.
4. Quien administra membresias de profesionales dentro de una clinica.
5. Politica de retencion, suspension y expiracion de credenciales.
6. Copy legal: Pet Ecosystem verifica documentos de plataforma, pero no sustituye a la autoridad competente.

## Prompt exacto para implementar Clinical Access-2B

```text
Quiero implementar CLINICAL ACCESS-2B: identidad profesional autenticada en modo solo lectura.

Contexto:
- Clinical Access-1 esta implementado y aplicado remoto.
- El owner genera un QR temporal y revocable.
- `/clinical-access/[token]` permite consulta web anonima de solo lectura.
- El diseno aprobado vive en `docs/modules/clinical_access.md`.
- Clinic sigue siendo V2 y no debe abrir escritura clinica en este slice.

Objetivo:
Permitir que quien abre el QR pueda autenticarse como profesional, recuperar el mismo contexto de lectura y ver su identidad, organizacion y estado de verificacion. Solo profesionales verificados quedaran marcados como elegibles para solicitar escritura en un slice posterior.

Alcance:
1. Crear el modelo minimo de perfil profesional y verificacion manual admin.
2. Vincular opcionalmente el perfil a una organizacion provider sin asumir que provider aprobado equivale a acreditacion clinica.
3. Conservar el retorno seguro a `/clinical-access/[token]` despues del login.
4. Mostrar en web:
   - lectura anonima existente;
   - CTA `Identificarme como profesional`;
   - identidad autenticada;
   - organizacion, si existe;
   - estado de verificacion en lenguaje humano.
5. Mantener solo lectura para todos los estados.
6. Agregar una cola admin minima para aprobar, rechazar o suspender perfiles con justificacion y auditoria.

Restricciones obligatorias:
- No implementar solicitudes de escritura.
- No implementar consentimiento owner.
- No crear encounters ni entradas clinicas.
- No permitir mutaciones sobre vacunas, alergias, condiciones o documentos.
- No convertir `provider`, `approval_status = approved` o servicio `veterinary` en verificacion automatica.
- No exponer token en logs, analytics, errores ni tablas.
- No usar service role en clientes.
- No otorgar acceso directo a tablas sensibles.
- No modificar ownership, hogares, reservas, pagos ni Foster/Pet Alert.
- No instalar dependencias sin necesidad demostrada.
- No hacer commit ni push hasta revision.
- No aplicar migracion remota sin dry-run y autorizacion explicita.

Antes de modificar:
- Leer `AGENTS.md` y documentos obligatorios.
- Leer `docs/modules/clinical_access.md`, `docs/modules/providers.md`, `docs/modules/health.md`, modelo de datos, RLS, contrato API y HANDOFF.
- Revisar Clinical Access-1 completo.
- Confirmar el modelo real de provider organizations, roles, perfiles y admin.
- Presentar diagnostico breve y archivos previstos.

Arquitectura esperada:
- tipos compartidos en `packages/types`;
- cliente tipado en `packages/api-client`;
- UI profesional solo en `apps/web`;
- verificacion operada en `apps/admin`;
- migracion incremental con RLS desde el inicio;
- RPC transaccionales para enviar/revisar perfil;
- auditoria mediante patron existente;
- DTOs sin documentos privados ni notas admin fuera de admin.

Estados minimos:
- `draft`
- `pending`
- `verified`
- `rejected`
- `suspended`
- `expired`

UX web:
- La mascota sigue siendo protagonista.
- El CTA de identidad aparece despues del resumen de acceso, no antes del expediente critico.
- Login debe conservar el destino sin colocar el token en almacenamiento persistente innecesario.
- Usuario no verificado ve `Tu identidad profesional aun no esta verificada. Puedes continuar consultando en modo solo lectura.`
- Usuario verificado ve su nombre, clinica y `Identidad profesional verificada por Pet Ecosystem`, con aclaracion de que la plataforma no sustituye a la autoridad regulatoria.
- No mostrar formularios ni promesas de escritura.

Validaciones:
- lint/typecheck/build de types, api-client, web y admin;
- pruebas de RLS/RPC para anonimo, usuario comun, profesional y admin;
- regresion de `/clinical-access/[token]` anonimo;
- `git diff --check`;
- `supabase db push --dry-run --include-all --linked --yes` solamente.

Entrega:
1. Diagnostico.
2. Migracion local y RLS propuestas.
3. Archivos modificados.
4. Flujo profesional web y admin.
5. Controles de seguridad.
6. Validaciones ejecutadas.
7. Riesgos residuales.
8. Guia manual de QA.
9. No hacer commit, push ni migracion remota.
```
