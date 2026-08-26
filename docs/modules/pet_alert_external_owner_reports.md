# PET ALERT 8 - Reporte externo de mascota extraviada

## Estado de implementacion 8B

Implementado localmente y pendiente de despliegue controlado. La implementacion adopta Resend para correo transaccional, Cloudflare Turnstile para antiabuso, Edge Function como unica puerta publica y moderacion admin obligatoria. No crea cuentas Auth y falla cerrada si falta configuracion de seguridad.

El primer release emite un token privado de administracion una sola vez, pero su recuperacion y las acciones de editar, retirar o marcar encontrada se difieren a PET ALERT 8C.

## 1. Resumen ejecutivo

PET ALERT 8 extiende el centro comunitario para que una persona que no tiene cuenta en Pet Ecosystem pueda reportar la perdida de su propia mascota. El reporte no exige registro previo, pero no puede publicarse hasta verificar un correo y superar controles basicos contra abuso.

La recomendacion es conservar `pet_alert_lost_pets` como entidad canonica del boletin y agregar una identidad externa privada. Asi, las alertas de owners registrados y las de propietarios externos comparten directorio, ficha publica, avistamientos, moderacion, URL y QR sin duplicar reglas.

Este documento es diseno preparatorio. No crea tablas, RPC, Edge Functions, UI ni cambios remotos.

## 2. Diagnostico actual

### Capacidades reutilizables

- `pet_alert_lost_pets`: boletin de mascota perdida con slug, vigencia, estados y proyeccion publica.
- `pet_alert_lost_pet_sightings`: avistamientos asociados a una alerta owner.
- `pet_alert_status_history`: trazabilidad de estados.
- `pet_alert_media` y bucket privado `pet-alert-media`: base de media controlada.
- `list_public_pet_alert_directory`: directorio publico unificado y sanitizado.
- `get_public_pet_alert_lost_pet_by_slug`: ficha publica por slug.
- moderacion y auditoria de PET ALERT.
- pagina `/pet-alert`, filtros, ficha publica, sharing y cartel QR.
- patron de media comunitaria con MIME acotado, limite de tamano y URLs firmadas.

### Diferencias entre los tres recorridos

| Recorrido | Identidad de quien actua | Relacion con `pets.id` | Afirmacion | Administracion |
| --- | --- | --- | --- | --- |
| Owner registrado | Usuario autenticado y miembro del hogar | Obligatoria | Reporta su mascota registrada | Sesion y permisos del household |
| Propietario externo | Contacto verificado, sin cuenta obligatoria | No existe inicialmente | Declara que la mascota es suya | Enlace privado rotativo y revalidacion |
| Avistamiento comunitario | Observador; actualmente autenticado en algunos recorridos | Ninguna | Solo informa que vio una mascota | Autor del reporte o moderacion |

Verificar un correo externo prueba control del canal, no propiedad de la mascota.

### Huecos actuales

- `pet_alert_lost_pets` asume `pet_id`, `household_id` y autor autenticado.
- no existe identidad temporal de reportante externo.
- no existe challenge OTP propio del dominio.
- no existe token revocable para administrar sin sesion.
- faltan estados previos a publicacion y retiro voluntario diferenciados.
- falta consentimiento granular para contacto publico.
- falta recuperacion segura del acceso de administracion.
- faltan limites especificos para escritura anonima.

## 3. Personas y casos de uso

### Reportante externo

Persona sin cuenta que necesita publicar rapidamente, conservar control del caso y recibir ayuda sin exponer su domicilio ni contacto por defecto.

### Colaborador comunitario

Persona que consulta la ficha y aporta un avistamiento. No obtiene datos privados del reportante.

### Moderador

Admin que revisa alertas, denuncias, posibles duplicados o disputas de propiedad y puede pausar, restaurar, rechazar o cerrar contenido con justificacion.

### Owner futuro

Reportante que posteriormente crea una cuenta y solicita vincular el boletin existente a una mascota registrada, sin perder slug, QR, fotos ni historial.

## 4. Flujo publico completo

### Entrada

1. La persona abre `/pet-alert`.
2. Presiona `Reportar mi mascota`.
3. La UI explica que no necesita cuenta, pero debera verificar su correo.

### Paso 1 - La mascota

- nombre;
- especie;
- raza opcional;
- sexo y edad aproximada opcionales;
- tamano;
- color principal;
- senas distintivas;
- foto principal obligatoria;
- hasta tres fotos adicionales en el primer release.

### Paso 2 - El extravio

- fecha y hora aproximadas;
- ciudad y pais;
- region/zona o referencia aproximada;
- descripcion breve de las circunstancias;
- sin domicilio exacto, GPS ni tracking.

### Paso 3 - Contacto y consentimiento

- nombre del contacto;
- correo obligatorio;
- telefono opcional;
- canal preferido;
- consentimiento separado para publicar nombre, correo o telefono;
- aceptacion versionada de privacidad, terminos y responsabilidad.

Por defecto, nombre, correo y telefono permanecen privados.

### Paso 4 - Verificacion

1. Se crea un challenge asociado a un borrador opaco.
2. Se envia un codigo de un solo uso al correo normalizado.
3. El codigo expira en 10 minutos.
4. Se permiten como maximo cinco intentos y tres reenvios por hora.
5. La respuesta siempre es neutral para no revelar si el correo ya tiene cuenta.
6. Tras verificar, el challenge queda consumido y no puede reutilizarse.

### Paso 5 - Vista previa

- muestra exactamente el contenido publico;
- separa visualmente los datos privados;
- permite corregir antes de enviar;
- informa que Pet Ecosystem verifico el contacto, no la propiedad.

### Paso 6 - Publicacion

1. El backend valida challenge, consentimiento, media y limites.
2. Crea o promueve el boletin canonico.
3. Si requiere moderacion, queda `pending_review`; de lo contrario pasa a `published`.
4. Genera slug publico estable y QR existente.
5. Emite un token privado de administracion mostrado una sola vez.
6. Envia al correo un enlace de acceso o recuperacion.

## 5. Modelo de estados

Estados externos propuestos para el boletin canonico:

- `draft`: datos incompletos; no publico.
- `pending_verification`: espera confirmar el correo; no publico.
- `pending_review`: contacto verificado, espera moderacion; no publico.
- `published`: visible y recibe avistamientos.
- `paused`: oculto temporalmente por admin o control de riesgo.
- `found`: mascota encontrada; ficha publica conserva cierre positivo.
- `withdrawn`: retirada por el reportante; no aparece en directorio.
- `rejected`: rechazada por moderacion; no publica.
- `expired`: vencida sin renovacion; no aparece como activa.

### Transiciones

| Desde | Hacia | Actor | Condicion |
| --- | --- | --- | --- |
| `draft` | `pending_verification` | Reportante | Campos minimos y foto principal validos |
| `pending_verification` | `pending_review` | Backend | OTP valido y consentimiento vigente |
| `pending_review` | `published` | Admin o regla controlada | Revision aprobada |
| `pending_review` | `rejected` | Admin | Motivo obligatorio |
| `published` | `paused` | Admin | Riesgo, denuncia o disputa |
| `paused` | `published` | Admin | Riesgo resuelto |
| `published` | `found` | Reportante/admin | Reautenticacion para accion critica |
| `published` | `withdrawn` | Reportante/admin | Confirmacion explicita |
| `published` | `expired` | Sistema | Fin de vigencia sin renovacion |
| `expired` | `published` | Reportante | Revalidacion y renovacion permitidas |

Los estados actuales `active`, `sighting_received`, `possible_match`, `flagged`, `closed` pueden mantenerse internamente durante una migracion compatible. Antes de implementar debe definirse una tabla de equivalencias para no romper mobile ni DTO publicos.

### Visibilidad y avistamientos

- Solo `published`, `found` y, si se decide, cierres historicos sanitizados tienen ficha publica.
- `paused`, `withdrawn`, `rejected` y `expired` no aparecen en busqueda activa.
- Marcar `found` cierra nuevos avistamientos, pero conserva los existentes.
- Retirar o pausar nunca borra automaticamente historial ni evidencia.

## 6. Modelo de datos propuesto

### Decision recomendada

Usar una ampliacion compatible de `pet_alert_lost_pets` con `source_type`:

- `registered_pet`: alerta actual ligada a `pet_id` y `household_id`.
- `external_owner`: alerta ligada a una identidad externa privada.

No crear una segunda tabla de boletines publicos.

### Ampliacion de `pet_alert_lost_pets`

Campos propuestos:

- `source_type text not null default 'registered_pet'`;
- `external_reporter_id uuid null`;
- `apparent_size text null`;
- `apparent_sex text null`;
- `primary_color text null`;
- `terms_version text null`;
- `privacy_version text null`;
- `consented_at timestamptz null`.

Constraint de origen:

- `registered_pet`: `pet_id`, `household_id` y `created_by_user_id` presentes; `external_reporter_id` nulo.
- `external_owner`: `external_reporter_id` presente; `pet_id` y `household_id` nulos hasta vinculacion futura.

Los datos publicos comunes siguen en el boletin canonico. Los contactos no deben copiarse a columnas publicamente proyectables.

### `pet_alert_external_reporters`

Entidad privada de contacto:

- `id uuid primary key`;
- `email_normalized text not null`;
- `contact_name text not null`;
- `phone_encrypted text null` o equivalente protegido;
- `preferred_contact_mode text not null`;
- `publish_name boolean not null default false`;
- `publish_email boolean not null default false`;
- `publish_phone boolean not null default false`;
- `email_verified_at timestamptz null`;
- `terms_version text not null`;
- `privacy_version text not null`;
- `consented_at timestamptz not null`;
- `linked_user_id uuid null`;
- `created_at`, `updated_at`.

El correo normalizado requiere indice para recuperacion, no exposicion. Si el proyecto no dispone de cifrado de campos, el telefono debe permanecer opcional y el acceso restringirse a RPC/servidor; no se debe improvisar cifrado reversible en cliente.

### `pet_alert_external_verification_challenges`

- `id uuid primary key`;
- `external_reporter_id uuid`;
- `purpose text` (`publish`, `recover`, `critical_action`, `link_account`);
- `code_hash text not null`;
- `expires_at timestamptz not null`;
- `attempt_count integer default 0`;
- `resend_count integer default 0`;
- `consumed_at timestamptz null`;
- `revoked_at timestamptz null`;
- `created_at timestamptz`.

Nunca guardar OTP en texto plano.

### `pet_alert_external_access_tokens`

- `id uuid primary key`;
- `external_reporter_id uuid`;
- `lost_pet_alert_id uuid`;
- `token_hash text not null unique`;
- `expires_at timestamptz not null`;
- `last_used_at timestamptz null`;
- `revoked_at timestamptz null`;
- `rotated_from_id uuid null`;
- `created_at timestamptz`.

El token en claro solo se entrega al emitirlo. Se recomiendan 256 bits aleatorios y comparacion de hash en backend.

### Auditoria

Reutilizar `pet_alert_status_history`, moderacion y `audit_logs`. Anadir eventos de dominio para:

- OTP solicitado/verificado/bloqueado;
- token emitido/rotado/revocado;
- publicacion externa creada/editada;
- cambio de consentimiento;
- encontrada/retirada/renovada;
- vinculacion futura solicitada/aprobada.

No registrar OTP, token, correo completo, telefono completo ni IP completa en texto libre.

### Indices y constraints

- una alerta externa activa por combinacion conservadora no debe imponerse como constraint automatico;
- indice por `external_reporter_id`, estado y fecha;
- indice parcial para alertas externas publicadas;
- indice por hash de token;
- indice por challenge, proposito y expiracion;
- `expires_at > created_at`;
- consentimientos publicos falsos por defecto;
- limite de una foto principal;
- FK con borrado restringido o anonimizado, nunca cascade destructivo sobre boletines.

### Retencion

- challenges consumidos: 30 dias para seguridad y luego purga/anominizacion;
- tokens revocados: conservar hash y metadata minima 90 dias;
- borradores no verificados: purga en 7 dias;
- rechazados: conservar 90 dias para apelacion/abuso;
- boletines cerrados: conservar version publica sanitizada segun politica legal;
- contactos: anonimizar cuando termine la finalidad y retencion aplicable.

La politica final debe validarse legalmente para Panama antes de produccion publica.

## 7. Matriz de privacidad

| Dato | Publico por defecto | Reportante | Admin | Interaccion controlada | Regla |
| --- | --- | --- | --- | --- | --- |
| Nombre de mascota | Si | Si | Si | Si | Parte del boletin |
| Especie/raza/tamano/color | Si | Si | Si | Si | Minimizado |
| Fotos de mascota | Si | Si | Si | Si | Consentimiento y moderacion |
| Ciudad/zona aproximada | Si | Si | Si | Si | Nunca domicilio exacto |
| Fecha aproximada | Si | Si | Si | Si | Sin historial de ubicacion |
| Nombre de contacto | No | Si | Si | Solo si consiente | Consentimiento revocable |
| Correo | No | Si | Si | Solo si consiente | Preferir relay interno futuro |
| Telefono | No | Si | Si | Solo si consiente | Opcional y protegido |
| OTP/token/hash | No | No despues de uso | Metadata minima | No | Nunca texto plano |
| IP/huella antifraude | No | No | Solo seguridad | No | Hash truncado y retencion corta |
| Avistamientos | Proyeccion sanitizada | Si | Si | Si | Contacto privado separado |
| Datos de menores | No recolectar | No | No | No | Prohibidos en texto/fotos |
| Domicilio/coordenadas exactas | No recolectar | No | No | No | Fuera de alcance |

## 8. Modelo de autorizacion

### Publico anonimo

- leer exclusivamente RPC/proyecciones sanitizadas;
- iniciar borrador y challenge mediante endpoint protegido;
- verificar OTP;
- no leer tablas privadas;
- no escribir directamente estados finales.

### Reportante externo

- operar solo el boletin ligado a un token valido y no revocado;
- editar un conjunto permitido de campos;
- acciones criticas requieren OTP reciente;
- no puede cambiar moderacion ni ownership;
- no puede leer datos privados de colaboradores fuera del canal controlado.

### Owner autenticado

- conserva las policies actuales sobre alertas `registered_pet`;
- no obtiene acceso a reportes externos por compartir correo;
- la vinculacion futura exige RPC transaccional y verificacion.

### Admin

- acceso a cola y detalle privado por RPC/admin role;
- decisiones justificadas y auditadas;
- no puede recuperar OTP ni tokens en claro.

## 9. Amenazas y mitigaciones

| Amenaza | Mitigacion minima |
| --- | --- |
| Spam automatizado | CAPTCHA, rate limit por correo/red y honeypot accesible |
| Enumeracion de cuentas | Respuestas OTP neutrales y tiempos equivalentes |
| Suplantacion de propietario | Disclaimer, contacto verificado, moderacion y disputa |
| Robo de enlace | Token de alta entropia, expiracion, rotacion y OTP para acciones criticas |
| Fuerza bruta OTP | Hash, expiracion, intentos limitados y enfriamiento |
| Exposicion de contacto | Privado por defecto y consentimiento granular |
| Fotos sensibles | MIME real, tamanos, moderacion, eliminacion y denuncia |
| Duplicados | Advertencia por coincidencias, nunca fusion automatica |
| Alteracion directa de estado | RPC `security definer` acotada y RLS sin writes directos |
| Abuso de avistamientos | Rate limit, trazabilidad y contacto privado |
| Disputa de propiedad | Pausa preventiva, revision admin y conservacion de evidencia |
| Token en logs | Redaccion de URL/query y prohibicion de analytics sobre token |

## 10. Storage y archivos

- Reutilizar bucket privado `pet-alert-media`.
- Separar paths: `external-lost-pets/{alert_id}/{media_id}.{ext}`.
- Foto principal obligatoria; maximo cuatro imagenes iniciales.
- Tipos: JPEG, PNG y WebP verificados por contenido, no solo extension.
- Limite recomendado: 10 MB por archivo, con compresion cliente opcional.
- El upload se autoriza mediante operacion temporal; el cliente anonimo no recibe permiso general sobre el bucket.
- La metadata se registra solo despues de confirmar upload.
- Publicacion mediante URL firmada/proyeccion existente.
- Retirar el reporte revoca proyeccion publica, no borra de inmediato evidencia.
- Bloquear metadatos EXIF de ubicacion mediante sanitizacion server-side o proceso de imagen antes de exposicion publica.

## 11. OTP y recuperacion de acceso

### Decision

Supabase Auth OTP no debe usarse silenciosamente si crea un usuario, porque contradice la promesa de publicar sin cuenta. La primera implementacion debe confirmar si existe un proveedor transaccional de correo ya configurado.

Recomendacion:

- endpoint server-side/Edge Function minima para generar OTP criptografico, guardar hash y enviar correo;
- reutilizar el proveedor SMTP/transaccional ya aprobado para el proyecto;
- no enviar correo desde mobile/web con credenciales publicas.

Si no existe proveedor transaccional, Pet Alert 8B queda bloqueado hasta seleccionar uno. No debe degradarse a publicar sin verificar.

### Recuperacion

1. El usuario indica correo y slug o referencia no sensible.
2. La respuesta siempre es neutral.
3. Si coincide, recibe OTP.
4. Tras verificar, se revocan tokens anteriores y se emite uno nuevo.
5. La rotacion queda auditada.

## 12. Moderacion y abuso

- `pending_review` obligatorio durante piloto.
- Posteriormente, publicacion automatica solo para riesgo bajo con moderacion posterior.
- Reutilizar `pet_alert_moderation_cases` y extender target si fuera necesario.
- Denuncia disponible desde la ficha publica.
- Motivos: informacion falsa, fraude, contenido sensible, acoso, seguridad animal, datos personales y otro.
- Admin puede pausar, restaurar, rechazar o cerrar.
- Rechazo y cierre requieren motivo interno; copy publico no revela datos del denunciante.
- Limites iniciales sugeridos: tres challenges/hora/correo, cinco/dia/red truncada y dos boletines activos/correo, sujetos a QA.

## 13. Deteccion de duplicados

Calcular candidatos por:

- especie;
- ciudad/zona;
- ventana temporal;
- nombre/raza normalizados;
- color y senas descriptivas.

Mostrar al reportante posibles coincidencias antes de publicar y a admin durante revision. No bloquear ni fusionar automaticamente. Comparacion de imagenes, reconocimiento facial/biometrico y matching automatico quedan fuera de alcance.

## 14. Vinculacion futura a una cuenta

1. El reportante crea una cuenta verificando el mismo correo.
2. Desde el enlace privado solicita vinculacion.
3. Selecciona o registra una mascota.
4. El backend valida identidad del canal, acceso al pet y ausencia de conflicto.
5. Una RPC transaccional asigna `pet_id`, `household_id`, `created_by_user_id` y cambia `source_type`.
6. Se conserva el mismo `pet_alert_lost_pets.id`, slug, QR, media, avistamientos e historial.
7. Se revocan tokens externos.

Esta capacidad corresponde a Pet Alert 8E, no a 8B.

## 15. UX y copy

### Stepper

`Mascota` -> `Extravío` -> `Contacto` -> `Verificar` -> `Revisar`

- una tarea principal por pantalla;
- botones grandes y copy simple;
- regreso sin perder datos en la sesion local;
- indicador de campos obligatorios;
- errores junto al campo y resumen accesible;
- foco y labels aptos para lector de pantalla;
- vista previa diferenciando `Visible para todos` y `Solo para administracion`.

### Copy canonico

- CTA: `Reportar mi mascota`.
- Confianza: `Puedes publicar una alerta sin crear una cuenta. Verificaremos tu correo para proteger el reporte.`
- Privacidad: `No publiques tu domicilio exacto. La zona aproximada es suficiente.`
- OTP: `Te enviamos un codigo para confirmar que podemos contactarte.`
- Publicacion: `Tu contacto fue verificado. Pet Ecosystem no valida automaticamente la propiedad de la mascota.`
- Encontrada: `¡Que buena noticia! Marca el caso como encontrado para informar a la comunidad.`
- Sin avistamientos: `Aun no recibimos informacion. Comparte el boletin o descarga su codigo QR.`
- Error recuperable: `No pudimos completar este paso. Tus datos siguen aqui; vuelve a intentarlo.`

## 16. Contratos esperados

Nombres conceptuales sujetos a revision durante Pet Alert 8B:

- `start_external_lost_pet_report(input)` -> `draftReference`, limites y challenge pendiente.
- `request_external_report_email_code(draftReference, email)` -> respuesta neutral.
- `verify_external_report_email_code(challengeReference, code)` -> proof temporal, nunca token admin final.
- `preview_external_lost_pet_report(draftReference, proof)` -> DTO publico/privado.
- `submit_external_lost_pet_report(draftReference, proof)` -> slug, estado y acceso privado emitido.
- `get_external_lost_pet_report_management(accessToken)` -> DTO privado acotado.
- `update_external_lost_pet_report(accessToken, input)`.
- `mark_external_lost_pet_found(accessToken, recentOtpProof)`.
- `withdraw_external_lost_pet_report(accessToken, recentOtpProof)`.
- `request_external_report_access_recovery(email, reference)`.

Las operaciones con OTP/token deben vivir detras de un limite server-side; no como funciones publicas que filtren hashes o permitan bypass de rate limit.

## 17. RLS esperada

- Sin `select` directo anonimo sobre contactos, challenges o tokens.
- Sin `insert/update/delete` directo anonimo sobre `pet_alert_lost_pets`.
- Lectura publica solo por RPC sanitizada existente.
- Policies actuales de alertas registradas se mantienen mediante `source_type`.
- Acceso externo se resuelve en endpoint/RPC que valida hash, expiracion, revocacion y scope.
- Admin accede mediante rol administrativo ya existente.
- Media hereda visibilidad del boletin y no la mera posesion del path.
- Tokens y challenges no se incluyen en vistas, realtime ni backups de soporte exportables.

## 18. Criterios de aceptacion

- Una persona sin cuenta completa el formulario y verifica correo.
- Nada se publica antes de verificar.
- La ficha no expone correo, telefono ni domicilio por defecto.
- El boletin aparece en el directorio y reutiliza la ficha/QR actuales.
- El enlace privado no contiene IDs predecibles y puede revocarse.
- Encontrar o retirar exige revalidacion reciente.
- Avistamientos existentes se conservan al cerrar.
- Moderacion puede pausar y restaurar con auditoria.
- Rate limit y CAPTCHA reducen automatizacion abusiva.
- El sistema no afirma haber validado propiedad.
- No se crea `pets`, household, transferencia ni adopcion.
- La ruta futura permite vincular sin duplicar el boletin.

## 19. Plan por slices

### Pet Alert 8A - Diseno tecnico

- Objetivo: cerrar este documento, privacidad, amenazas y decisiones.
- Fuera: codigo, migraciones, correo.
- Dependencias: revision legal y proveedor de correo.
- Riesgo: asumir capacidades de envio inexistentes.
- Criterio: diseno aprobado y decisiones abiertas identificadas.
- Validacion: `git diff --check`.
- Complejidad: media.

### Pet Alert 8B - Reporte publico y correo verificado

- Objetivo: formulario, identidad privada, OTP, media y publicacion moderada.
- Fuera: administracion completa, vinculacion a cuenta y automatizacion de moderacion.
- Dependencias: proveedor de correo, CAPTCHA, migracion/RLS y Storage.
- Riesgos: spam, PII, enumeracion y abuso de archivos.
- Criterio: reporte no registrado publicado solo despues de OTP y revision.
- Validaciones: types/API/web/admin, SQL tests, RLS adversarial y dry-run.
- Complejidad: alta.

### Pet Alert 8C - Administracion privada

- Objetivo: token rotativo, editar, renovar, encontrar, retirar y recuperar acceso.
- Fuera: vinculacion a cuenta.
- Dependencias: 8B y correo.
- Riesgos: secuestro de enlace y replay.
- Criterio: operaciones acotadas, revocables y auditadas.
- Complejidad: alta.

### Pet Alert 8D - Moderacion y abuso

- Objetivo: denuncias, limites reforzados, duplicados y disputas.
- Fuera: ML/biometria.
- Dependencias: 8B/8C y consola admin.
- Riesgos: falsos positivos y carga operativa.
- Criterio: admin puede pausar/restaurar/rechazar con historial.
- Complejidad: media-alta.

### Pet Alert 8E - Vinculacion a cuenta

- Objetivo: convertir administracion externa en ownership autenticado sin duplicar boletin.
- Fuera: transferencias de custodia.
- Dependencias: 8C, households y pets.
- Riesgos: conflictos de identidad/propiedad.
- Criterio: conserva ID, slug, QR, media, avistamientos e historial.
- Complejidad: alta.

## 20. Riesgos residuales

- La verificacion de correo no prueba propiedad.
- La moderacion puede convertirse en cuello de botella.
- Un contacto publicado por consentimiento puede copiarse fuera de la plataforma.
- CAPTCHA y rate limit reducen, pero no eliminan abuso distribuido.
- Las fotos pueden contener datos sensibles no detectados automaticamente.
- La normativa y retencion requieren revision legal antes de lanzamiento abierto.
- El proveedor de correo y su entregabilidad son dependencias externas criticas.

## 21. Recomendacion final

El diseno esta listo para preparar Pet Alert 8B una vez resueltas tres decisiones:

1. proveedor transaccional de correo para OTP;
2. mecanismo CAPTCHA compatible con web publica;
3. politica legal de retencion, consentimiento y contacto publico para Panama.

Durante el piloto, usar `pending_review` obligatorio. No implementar publicacion anonima directa, OTP en cliente, tokens permanentes ni contacto publico por defecto.

## 22. Prompt para implementar Pet Alert 8B

```text
Quiero implementar Pet Alert 8B: reporte publico de mascota extraviada por una persona no registrada, con correo verificado y moderacion previa.

Fuente de verdad:
- docs/modules/pet_alert_external_owner_reports.md
- docs/modules/pet_alert.md
- docs/data/PET_ALERT_DATA_MODEL.md
- docs/api/PET_ALERT_API_CONTRACT.md
- docs/ux/PET_ALERT_UX.md
- docs/release/PET_ALERT_RISKS.md

Antes de modificar:
1. Confirmar proveedor transaccional de correo aprobado y CAPTCHA disponible.
2. Revisar migraciones, RLS, Storage, tipos y API actuales de PET ALERT.
3. Proponer el delta exacto y detenerse si falta infraestructura de correo.

Alcance:
- ampliar el boletin canonico con `source_type` compatible;
- crear identidad externa privada, challenges OTP y acceso seguro minimo;
- crear formulario web progresivo desde `/pet-alert/reportar-mi-mascota`;
- exigir foto principal, correo verificado y consentimiento versionado;
- publicar inicialmente en `pending_review`;
- reutilizar directorio, ficha publica, avistamientos, media, moderacion y QR;
- agregar cola admin necesaria para aprobar/rechazar;
- mensajes en espanol y accesibilidad basica.

Seguridad obligatoria:
- OTP y tokens solo como hash en base de datos;
- token de alta entropia, scope acotado, expiracion y revocacion;
- ninguna lectura directa anonima de PII;
- ninguna escritura anonima directa sobre tablas canonicas;
- rate limit, CAPTCHA y respuestas anti-enumeracion;
- MIME real, limite de archivos y paths no predecibles;
- contacto privado por defecto;
- auditoria sin secretos ni PII completa.

Fuera de alcance:
- administracion privada completa (8C);
- vinculacion futura a cuenta (8E);
- GPS, tracking, mapa, push, matching automatico o biometrico;
- Payments, booking, QR operacional, evidencia, providers y Foster.

Validaciones:
- typecheck de types/api-client/web/admin;
- lint/build de web/admin;
- tests SQL de constraints, RPC y transiciones;
- pruebas RLS anon/auth/admin y casos adversariales;
- git diff --check;
- Supabase dry-run solamente.

No aplicar remoto, no hacer commit y no hacer push hasta revision.

Entrega:
- diagnostico;
- migracion propuesta;
- modelo de privacidad/RLS implementado;
- archivos modificados;
- validaciones;
- guia QA publica/admin;
- riesgos residuales;
- confirmacion de que no se creo cuenta, pet, household ni segundo boletin.
```
