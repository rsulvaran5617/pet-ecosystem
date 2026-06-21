# Hogares de acogida, rescate y adopcion de mascotas

## Estado

Nodo V2.5 no financiero abierto por slices controlados.

Foster-1A y Foster-2A ya estan implementados y aplicados remoto: familia protectora aprobada por admin y transferencia privada de mascota con consentimiento. Foster-3A queda implementado localmente como vitrina controlada de adopcion/acogida responsable con galeria de fotos, revision admin y lectura por familias autenticadas; requiere aplicar migracion remota antes de QA.

Este alcance no modifica flujos actuales de owner, provider, bookings, payments, QR, evidencias, geolocalizacion ni marketplace comercial de servicios.

## Foster-3A - Vitrina controlada de adopcion/acogida

Decision de alcance:

- Se implementan publicaciones moderadas de mascotas bajo custodia de una familia protectora aprobada.
- La mascota conserva `pets.id`; no se duplica expediente.
- La vitrina queda separada del marketplace comercial: no hay precios, reservas, checkout ni venta de mascotas.
- Se implementa galeria de fotos en bucket privado `pet-adoption-media` con URLs firmadas temporales.
- Videos quedan diferidos a Foster-3B para validar limites, moderacion y experiencia de reproduccion sin ampliar riesgo del primer slice.
- El CTA `Me interesa` es informativo en Foster-3A; solicitudes formales quedan para Foster-4A y conexion con transferencia para Foster-6A.

Modelo implementado localmente:

- `pet_adoption_listings`
  - referencia a `pet_id` y `household_id`.
  - estados `draft`, `pending_review`, `published`, `paused`, `closed`, `rejected`.
  - textos publicos seguros: historia, personalidad, salud publica, compatibilidades, necesidades especiales y requisitos.
  - ciudad/pais sin direccion exacta.
- `pet_adoption_listing_media`
  - archivos del bucket privado `pet-adoption-media`.
  - `media_type`, `display_order`, `is_cover` y `moderation_status`.

Reglas:

- Solo familias protectoras aprobadas pueden crear/editar publicaciones de mascotas de su hogar.
- Mascotas `in_memory` no pueden publicarse.
- Solo una publicacion activa por mascota.
- Admin revisa/aprueba/rechaza/pausa publicaciones antes de mostrarlas.
- Usuarios autenticados leen solo publicaciones `published`.
- No se exponen documentos privados, direccion exacta ni datos sensibles de la familia protectora.

UI implementada localmente:

- Owner mobile `Mascotas`: bloque para preparar publicacion de adopcion, cargar fotos y enviar a revision cuando el hogar es familia protectora aprobada.
- Owner mobile `Mascotas`: vitrina read-only `Mascotas que buscan hogar` con cards publicadas y CTA informativo.
- Admin web `Familias protectoras`: cola de publicaciones pendientes con detalle, fotos firmadas y acciones aprobar/rechazar/pausar.

## Decision recomendada

Este nodo debe tratarse como **V2.5 no financiero**.

Justificacion:

- Reutiliza foundations ya existentes: households, pets, documentos, salud, vacunas, reminders, marketplace, messaging/support y admin.
- No depende de pagos reales ni debe convertirse en venta de mascotas.
- Requiere nuevas reglas de confianza, privacidad, moderacion y transferencia de custodia digital.
- Es mas grande que un slice V2 operativo, pero no pertenece a V3 porque no depende de memberships, autoship, telecare, farmacia avanzada ni beneficios complejos.
- Conviene abrirlo despues de estabilizar marketplace, admin/moderacion y mensajeria, pero antes de verticales comerciales complejas.

## A. Resumen ejecutivo

El nodo de hogares de acogida, rescate y adopcion permite que instituciones, fundaciones, rescatistas o hogares temporales registren mascotas bajo custodia temporal y, cuando corresponda, las publiquen como mascotas que buscan un hogar responsable.

Problema que resuelve:

- Muchas mascotas rescatadas viven temporalmente con rescatistas o fundaciones sin expediente digital ordenado.
- La adopcion suele depender de publicaciones informales, poca trazabilidad, informacion incompleta y procesos manuales.
- El adoptante necesita confianza, contexto de salud, comportamiento y requisitos claros antes de solicitar una adopcion.
- La plataforma necesita diferenciar adopcion responsable de venta encubierta o marketplace comercial.

Valor para el owner/adoptante:

- descubre mascotas disponibles para adopcion en un entorno confiable.
- revisa informacion publica estructurada antes de aplicar.
- puede dar seguimiento a sus solicitudes.
- si adopta, recibe una transferencia digital controlada de la mascota a su hogar.

Valor para foster/fundacion/rescatista:

- organiza mascotas bajo custodia.
- mantiene expediente, fotos, documentos, salud y notas.
- publica mascotas listas para adopcion sin exponer datos sensibles.
- recibe y gestiona solicitudes de adopcion.
- transfiere custodia digital de forma trazable.

Valor para la plataforma:

- amplifica el impacto social de Pet Ecosystem.
- aumenta confianza y utilidad del ecosistema de mascotas.
- crea un nodo de marketplace no comercial, separado del marketplace de servicios.
- prepara futuras alianzas con fundaciones, rescatistas y municipios.

Por que encaja con Pet Ecosystem:

- Pet Ecosystem ya gestiona hogares, mascotas, documentos, salud, recordatorios, marketplace, mensajes, soporte y admin.
- La adopcion responsable conecta directamente con el ciclo de vida de una mascota y su hogar.
- El enfoque es de custodia, bienestar y trazabilidad, no de venta.

## B. Actores

### Owner regular

Usuario que registra y gestiona mascotas propias dentro de su hogar. Puede descubrir mascotas en adopcion y solicitar adoptar, pero no puede publicar mascotas privadas como disponibles sin pasar por rol foster aprobado.

### Foster owner / hogar de acogida

Usuario o hogar validado que cuida temporalmente mascotas rescatadas o cedidas. Puede crear expedientes de mascotas en acogida, preparar publicaciones y gestionar solicitudes.

### Institucion de rescate / fundacion

Entidad organizada que administra multiples mascotas, hogares temporales, solicitudes y procesos internos. Puede requerir aprobacion y verificacion mas estricta que un foster individual.

### Adoptante interesado

Owner regular o usuario autenticado que revisa mascotas disponibles y envia una solicitud de adopcion responsable.

### Admin de plataforma

Equipo de plataforma que valida perfiles foster/instituciones, modera publicaciones, revisa denuncias, bloquea contenido y audita transferencias.

### Provider comercial

Negocio proveedor de servicios pet: grooming, paseos, veterinaria, guarderia u otros servicios. No es el mismo actor que foster. No obtiene acceso automatico a mascotas en acogida ni solicitudes de adopcion.

## C. Diferencia entre owner regular y foster owner

Owner regular:

- registra mascotas propias.
- gestiona documentos, salud y recordatorios privados.
- sus mascotas no aparecen en marketplace.
- no publica adopciones por defecto.

Foster owner:

- registra mascotas bajo custodia temporal.
- puede marcar mascotas como `en acogida`.
- puede solicitar publicacion de una mascota como `buscando hogar`.
- debe pasar aprobacion o validacion especial.
- acepta responsabilidades y terminos de adopcion responsable.
- puede gestionar solicitudes y transferencia de custodia.

Regla clave:

- una mascota privada nunca debe volverse publica por accidente.
- solo mascotas clasificadas como foster/adoption, bajo un actor aprobado, pueden publicarse.

## D. Modelo funcional propuesto

Recomendacion: **extender `pets` con tablas asociadas, no duplicar mascotas**.

Justificacion:

- `pets`, `pet_profiles`, `pet_documents`, salud y reminders ya modelan expediente base.
- Duplicar mascotas en una tabla paralela generaria dos fuentes de verdad.
- El estado foster/adoption es un contexto de custodia y publicacion, no una especie distinta de mascota.
- La transferencia digital necesita mover o vincular la mascota entre hogares conservando historial permitido.

Entidades futuras sugeridas:

### foster_profiles

Perfil de un usuario/hogar aprobado para actuar como foster individual.

Campos conceptuales:

- `id`
- `user_id`
- `household_id`
- `display_name`
- `city`
- `region`
- `country`
- `verification_status`
- `public_contact_policy`
- `bio`
- `created_at`
- `updated_at`

### foster_organizations

Entidad para fundaciones, instituciones o grupos de rescate.

Campos conceptuales:

- `id`
- `owner_user_id`
- `name`
- `legal_name`
- `organization_type`
- `city`
- `region`
- `country`
- `verification_status`
- `is_public`
- `public_profile`
- `created_at`
- `updated_at`

### foster_pets

Contexto de acogida para una mascota existente en `pets`.

Campos conceptuales:

- `id`
- `pet_id`
- `foster_profile_id`
- `foster_organization_id`
- `intake_date`
- `intake_source`
- `custody_type`
- `care_status`
- `adoption_readiness_status`
- `behavior_notes`
- `special_needs_notes`
- `created_by_user_id`
- `created_at`
- `updated_at`

### adoption_listings

Publicacion controlada de una mascota en acogida.

Campos conceptuales:

- `id`
- `foster_pet_id`
- `title`
- `summary`
- `public_story`
- `city`
- `region`
- `country`
- `approximate_location_policy`
- `size`
- `estimated_age_label`
- `compatibility_children`
- `compatibility_dogs`
- `compatibility_cats`
- `health_public_summary`
- `adoption_requirements`
- `publication_status`
- `review_status`
- `published_at`
- `paused_at`
- `closed_at`

### adoption_applications

Solicitud enviada por un adoptante.

Campos conceptuales:

- `id`
- `adoption_listing_id`
- `applicant_user_id`
- `applicant_household_id`
- `applicant_name`
- `contact_email`
- `contact_phone`
- `housing_type`
- `has_other_pets`
- `has_children`
- `previous_pet_experience`
- `adoption_motivation`
- `time_availability`
- `terms_accepted_at`
- `status`
- `created_at`
- `updated_at`

### adoption_status_history

Historial de cambios de estado de publicacion, solicitud y transferencia.

Campos conceptuales:

- `id`
- `subject_type`
- `subject_id`
- `from_status`
- `to_status`
- `changed_by_user_id`
- `reason`
- `created_at`

### adoption_documents

Documentos ligados a la adopcion, no necesariamente al expediente medico completo.

Campos conceptuales:

- `id`
- `adoption_application_id`
- `pet_document_id`
- `document_type`
- `visibility`
- `uploaded_by_user_id`
- `created_at`

### adoption_screening_notes

Notas internas de revision de una solicitud.

Campos conceptuales:

- `id`
- `adoption_application_id`
- `created_by_user_id`
- `note_text`
- `visibility`
- `created_at`

No deben ser visibles para el adoptante salvo que se cree un campo de comunicacion separado.

### pet_transfer_records

Registro de transferencia de custodia digital hacia el nuevo hogar.

Campos conceptuales:

- `id`
- `pet_id`
- `from_household_id`
- `to_household_id`
- `adoption_application_id`
- `transfer_status`
- `consented_by_foster_at`
- `consented_by_adopter_at`
- `completed_at`
- `created_by_user_id`
- `created_at`

## E. Estados de mascota en acogida

Estados propuestos para `foster_pets.care_status` o equivalente:

- `draft`: expediente de acogida iniciado, no listo.
- `under_care`: mascota bajo cuidado/rescate, aun no lista para adopcion.
- `ready_for_adoption`: expediente y salud minima suficientes para publicar.
- `published`: mascota visible en marketplace de adopcion.
- `application_in_review`: hay solicitudes activas en evaluacion.
- `reserved`: una solicitud fue preseleccionada o aprobada, pendiente de entrega.
- `adopted`: custodia digital transferida o adopcion cerrada.
- `archived`: expediente cerrado sin adopcion publica.
- `deceased`: baja sensible conectada con el modulo de mascota en memoria.

Regla:

- `deceased` debe conectarse con `pets.status = in_memory` o un estado sensible equivalente, sin borrar historial.

## F. Estados de publicacion en marketplace

Estados propuestos para `adoption_listings.publication_status`:

- `not_published`: no publicada.
- `pending_review`: pendiente de revision.
- `published`: visible en marketplace de adopcion.
- `paused`: oculta temporalmente.
- `withdrawn`: retirada por foster/admin.
- `adopted`: cerrada por adopcion.

Estados de revision:

- `not_submitted`
- `submitted`
- `approved`
- `rejected`
- `flagged`

## G. Flujo completo extremo a extremo

1. Registro de foster owner o institucion.
2. Validacion/aprobacion por admin.
3. Creacion de mascota en acogida asociada a un hogar/foster/institucion.
4. Carga de fotos, documentos, vacunas, salud y notas de comportamiento.
5. Evaluacion de si la mascota esta lista para adopcion.
6. Creacion y envio de publicacion para revision.
7. Publicacion en marketplace de adopcion tras aprobacion.
8. Busqueda por parte de adoptantes.
9. Interes o solicitud de adopcion.
10. Revision de solicitud por foster/institucion.
11. Aprobacion, rechazo o solicitud de informacion adicional.
12. Coordinacion de entrevista, visita o encuentro.
13. Entrega/adopcion.
14. Transferencia de custodia digital al nuevo owner.
15. Cierre automatico o manual de la publicacion.
16. Seguimiento post-adopcion opcional.

## H. Marketplace de adopcion

Debe ser una superficie separada del marketplace de servicios.

Principios:

- no mezclar con grooming, paseos, veterinarias, reservas comerciales ni pagos.
- no vender mascotas.
- no mostrar direccion exacta del foster.
- usar ubicacion aproximada: ciudad, zona o region.
- priorizar bienestar, compatibilidad y adopcion responsable.

Filtros propuestos:

- especie.
- tamano.
- edad aproximada.
- ciudad/zona.
- condicion especial.
- compatibilidad con ninos.
- compatibilidad con otras mascotas.
- sexo.
- esterilizacion si aplica.
- vacunacion basica si aplica.

Cards:

- foto.
- nombre.
- especie.
- edad aproximada.
- ciudad/zona.
- estado publico de salud.
- etiqueta `Busca hogar`.
- compatibilidad principal.
- CTA `Ver perfil`.

## I. Perfil publico de mascota en adopcion

Debe incluir:

- fotos.
- nombre.
- especie.
- sexo.
- edad estimada.
- tamano.
- personalidad.
- historia breve.
- estado de salud publico.
- vacunas relevantes.
- esterilizacion si aplica.
- condiciones especiales.
- requisitos de adopcion.
- ciudad/zona.
- foster/fundacion visible solo segun politica publica.
- boton `Solicitar adopcion`.
- aviso de adopcion responsable.

No debe incluir:

- direccion exacta.
- documentos medicos privados completos.
- microchip completo.
- datos personales del foster no autorizados.
- informacion de solicitudes de otras personas.

## J. Solicitud de adopcion

Datos minimos:

- nombre del solicitante.
- correo y telefono de contacto.
- hogar asociado.
- experiencia previa con mascotas.
- tipo de vivienda.
- si tiene otras mascotas.
- si tiene ninos.
- motivo de adopcion.
- disponibilidad de tiempo.
- ciudad/zona.
- aceptacion de terminos.
- documentos opcionales.
- estado de solicitud.

Estados de solicitud:

- `draft`
- `submitted`
- `in_review`
- `more_info_requested`
- `approved`
- `rejected`
- `withdrawn`
- `cancelled`
- `completed`

## K. Transferencia de custodia

La transferencia de custodia digital debe ser explicita, auditada y reversible solo por proceso de soporte/admin.

Datos que se transfieren:

- identidad publica/base de la mascota.
- avatar/fotos autorizadas.
- documentos seleccionados para entrega.
- resumen de salud permitido.
- vacunas relevantes permitidas.
- recordatorios futuros seleccionados.
- historial publico de adopcion.

Datos que quedan historicos:

- hogar/foster anterior.
- publicacion de adopcion.
- solicitud aprobada.
- fecha de transferencia.
- actor que confirmo la entrega.
- consentimientos.

Datos que no deben transferirse automaticamente:

- notas internas del foster.
- screening notes de otros solicitantes.
- documentos privados no marcados para compartir.
- datos personales de foster/rescatistas.
- denuncias o reportes internos no destinados al adoptante.

Consentimiento:

- foster/institucion confirma entrega.
- adoptante confirma recepcion y acepta terminos.
- ambos eventos quedan en audit trail.

## L. Privacidad y seguridad

- Mascotas privadas nunca aparecen en marketplace.
- Solo mascotas foster/adoption pueden publicarse.
- Direccion exacta del foster no se publica.
- Admin puede moderar perfiles, publicaciones y solicitudes.
- Adoptantes ven solo informacion publica.
- Solicitudes solo visibles para foster/institucion y admin.
- Historial medico sensible requiere visibilidad controlada.
- Documentos privados deben usar bucket privado y URLs firmadas temporales.
- Microchip no debe exponerse completo en publicacion.
- Mensajes o contacto deben pasar por canales controlados cuando sea posible.
- Debe existir mecanismo de denuncia o reporte.

## M. Reglas RLS propuestas

- Foster owner aprobado gestiona sus mascotas en acogida.
- Owner regular no publica mascotas privadas salvo que tenga rol foster aprobado.
- Institucion gestiona mascotas y publicaciones de su propia organizacion.
- Admin puede revisar, aprobar, pausar, retirar y auditar publicaciones.
- Adoptante ve listings publicados y sus propias solicitudes.
- Foster/institucion ve solicitudes de sus publicaciones.
- Provider comercial no tiene acceso por defecto.
- Marketplace solo lee `adoption_listings` publicadas.
- Documentos sensibles no tienen lectura publica.
- Transferencias de custodia requieren permisos de ambos lados o RPC controlada.
- Notas internas de screening no son visibles para adoptantes.

## N. Moderacion y riesgos

Riesgos:

- publicaciones falsas.
- venta encubierta de mascotas.
- adopciones fraudulentas.
- exposicion de datos sensibles.
- abandono o mal uso del flujo.
- falsificacion documental.
- ubicacion sensible de hogares temporales.
- discriminacion o criterios poco transparentes.
- disputas post-adopcion.

Mitigaciones:

- validacion admin de fosters/instituciones.
- revision de publicaciones antes de visibilidad publica.
- prohibicion explicita de venta.
- denuncias/reportes desde perfiles.
- terminos legales de adopcion responsable.
- ubicacion aproximada.
- trazabilidad de cambios y transferencias.
- bloqueo o pausa de publicaciones sospechosas.

## O. UX por rol

### Foster mobile/web

- Home foster.
- Mis mascotas en acogida.
- Crear mascota en acogida.
- Expediente de mascota.
- Salud y documentos.
- Preparar publicacion.
- Publicar para adopcion.
- Solicitudes recibidas.
- Detalle de solicitud.
- Mensajes/seguimiento.
- Transferencia/adopcion.

### Owner/adoptante

- Marketplace de adopcion.
- Perfil de mascota.
- Solicitar adopcion.
- Mis solicitudes.
- Seguimiento de solicitud.
- Mensajes de adopcion si aplica.
- Mascota adoptada agregada a mi hogar.

### Admin

- Aprobar foster/institucion.
- Moderar publicaciones.
- Revisar reportes.
- Ver solicitudes sospechosas.
- Bloquear publicacion.
- Auditar transferencia.
- Gestionar terminos/plantillas.

## P. Reutilizacion de modulos existentes

Se puede reutilizar:

- Households: hogar adoptante, hogar foster, permisos.
- Pets: mascota base.
- Pet profiles: datos maestros.
- Pet documents: documentos privados.
- Health/vaccines: salud base.
- Reminders: seguimiento de vacunas, citas y post-adopcion.
- Marketplace: discovery, filtros, cards, perfiles publicos.
- Admin: aprobacion y moderacion.
- Messaging: comunicacion controlada si se habilita.
- Support: denuncias, disputas y soporte.
- Avatars/fotos: imagenes controladas.
- Geolocalizacion aproximada: ciudad/zona, sin direccion exacta.

No reutilizar sin adaptacion:

- Provider services.
- Provider availability.
- Bookings.
- Payments.
- QR operacional.
- Evidencias de servicios.

## Q. Brechas tecnicas

- Rol `foster_owner` o perfil foster aprobado.
- Modelo de institucion/fundacion.
- Relacion foster-pet.
- Publicacion de mascotas en adopcion.
- Marketplace de adopcion separado.
- Solicitudes de adopcion.
- Flujo de transferencia de custodia.
- Moderacion admin.
- RLS nuevas.
- Contratos API.
- Audit trail.
- Trazabilidad de consentimiento.
- Terminos legales.
- Denuncias/reportes.
- Politica de documentos transferibles.

## R. Slices recomendados

- Foster-0: documentacion y decision de alcance.
- Foster-1: roles y perfil foster.
- Foster-2: mascota en acogida.
- Foster-3: publicacion de adopcion.
- Foster-4: marketplace de adopcion.
- Foster-5: solicitudes de adopcion.
- Foster-6: mensajeria/seguimiento.
- Foster-7: transferencia de custodia.
- Foster-8: admin/moderacion.
- Foster-9: analitica de adopciones.

## S. Criterios de aceptacion

- Un foster aprobado puede registrar una mascota en acogida.
- Una institucion aprobada puede gestionar mascotas bajo su custodia.
- Una mascota privada no puede publicarse accidentalmente.
- Una mascota en acogida puede publicarse como `Busca hogar`.
- El marketplace de adopcion esta separado del marketplace de servicios.
- Un owner regular puede ver mascotas publicadas para adopcion.
- Un owner regular puede enviar solicitud de adopcion.
- Foster/institucion puede aceptar, rechazar o pedir mas informacion.
- Admin puede moderar foster, publicaciones y reportes.
- La mascota adoptada puede transferirse digitalmente a un nuevo hogar.
- Direcciones privadas no se exponen.
- No se mezclan adopciones con servicios comerciales.
- No se habilitan pagos ni venta de mascotas.

## T. Limites explicitos

- No es una tienda de mascotas.
- No es venta ni compra de animales.
- No cobra por adopcion dentro de este alcance.
- No reemplaza contratos legales de adopcion externos.
- No expone datos personales sensibles.
- No publica mascotas de owners regulares sin rol foster aprobado.
- No convierte foster en provider comercial.

## U. Decision 2026-06-20: Familia protectora y transferencia privada primero

El siguiente refinamiento recomendado es separar claramente dos capacidades:

1. **Familia protectora**: perfil adicional asociado a un `household`, aprobado por admin, para fundaciones, rescatistas, hogares temporales o familias de acogida.
2. **Transferencia privada de custodia**: flujo controlado para mover una mascota existente de una familia protectora a otra familia receptora, conservando expediente e historia permitida.

Esta decision evita abrir de inmediato el marketplace publico de adopcion. La primera version debe enfocarse en custodia privada, consentimiento y trazabilidad.

### U.1 Familia protectora como perfil adicional

Recomendacion: no convertir `households` en multiples tipos rigidos ni agregar un flag simple como unica fuente de verdad. Una familia protectora debe modelarse como perfil adicional de un hogar normal:

- `households` sigue representando la familia/hogar base.
- `protective_household_profiles` representa la capacidad especial de acogida/proteccion.
- una familia normal puede solicitar convertirse en protectora.
- admin debe aprobar, rechazar, suspender o reactivar el perfil.
- el hogar conserva sus permisos normales para mascotas propias.

Ventajas:

- no rompe el flujo actual de owners.
- permite que una familia sea owner regular y protectora aprobada.
- permite validacion, documentos y moderacion sin contaminar cada hogar.
- mantiene separado lo domestico de lo institucional.

### U.2 Modelo conceptual privado antes de adopcion publica

Entidades conceptuales para el primer frente:

#### protective_household_profiles

- `household_id uuid primary key`
- `status text`: `draft | pending_review | approved | rejected | suspended`
- `display_name text`
- `organization_type text`: `individual_rescuer | foster_home | foundation | temporary_home | other`
- `city text`
- `state_region text`
- `country_code text`
- `contact_notes text`
- `review_notes text`
- `reviewed_by_user_id uuid null`
- `reviewed_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`

#### pet_custody_contexts

- `id uuid primary key`
- `pet_id uuid`
- `household_id uuid`
- `custody_type text`: `owner | foster | rescue | temporary`
- `status text`: `active | ended | transferred | cancelled`
- `started_at timestamptz`
- `ended_at timestamptz null`
- `created_by_user_id uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

#### pet_transfer_records

- `id uuid primary key`
- `pet_id uuid`
- `from_household_id uuid`
- `to_household_id uuid`
- `initiated_by_user_id uuid`
- `accepted_by_user_id uuid null`
- `status text`: `pending | accepted | rejected | cancelled | expired`
- `recipient_email text null`
- `consent_snapshot jsonb`
- `transfer_notes text null`
- `created_at timestamptz`
- `accepted_at timestamptz null`
- `cancelled_at timestamptz null`

### U.3 Regla de ownership/custodia

Para el primer slice transaccional se recomienda:

- mantener `pets.id` como identidad estable de la mascota.
- no duplicar mascota.
- al aceptar transferencia, cambiar el hogar responsable de la mascota de forma transaccional y crear historial en `pet_transfer_records`.
- cerrar el `pet_custody_context` anterior y abrir uno nuevo para el hogar receptor.
- dejar un rastro auditado con actor, fecha, consentimiento y snapshot de datos compartidos.

Decision a validar antes de migracion:

- si el modelo actual usa `pets.household_id` como ownership operativo, el RPC de transferencia debe actualizarlo al aceptar.
- si se quiere conservar acceso limitado del hogar anterior, debe existir una tabla de permisos historicos o vistas read-only especificas; no debe quedar acceso completo por defecto.

### U.4 Expediente que viaja con la mascota

Viaja automaticamente en la primera propuesta:

- datos base de `pets`.
- perfil de `pet_profiles`.
- avatar privado si existe.
- estado de esterilizacion.
- vacunas.
- alergias.
- condiciones.
- documentos de salud marcados como compartibles o incluidos en consentimiento.
- estado `in_memory` si aplica, sin reactivar mascotas fallecidas.

Requiere consentimiento explicito o decision granular:

- documentos sensibles no medicos.
- documentos de identidad/microchip completos.
- notas privadas de rescatista/foster.
- recordatorios futuros.
- datos personales del hogar anterior.

No viaja automaticamente:

- conversaciones.
- reservas historicas comerciales.
- soporte.
- notas internas.
- screening notes de otros adoptantes.
- datos privados de otros miembros del hogar anterior.

### U.5 Recordatorios, reservas e historial

Recordatorios:

- los recordatorios pasados quedan como historial del hogar anterior si contienen datos privados.
- los recordatorios futuros deben poder cancelarse, copiarse al nuevo hogar o transferirse solo si fueron incluidos en consentimiento.
- recomendacion inicial: no transferir recordatorios automaticamente; proponerlos como checklist posterior a la transferencia.

Reservas historicas:

- no se transfieren como gestion activa al nuevo hogar.
- pueden permanecer como historial asociado al household que contrato el servicio.
- el nuevo hogar no debe ver conversaciones ni pagos/metodos del hogar anterior.

Historial medico:

- vacunas, alergias, condiciones y documentos de salud son parte del expediente de la mascota y si deben viajar, salvo exclusion explicita.

### U.6 UX recomendada por rol

Owner mobile / Cuenta o Hogar:

- accion `Solicitar familia protectora`.
- estado visible: `Borrador`, `En revision`, `Aprobada`, `Rechazada`, `Suspendida`.
- copy claro: ser familia protectora permite custodiar y transferir mascotas con trazabilidad; no habilita venta ni cobros.

Owner mobile / Mascotas:

- badge `En acogida` o `Custodia protectora` cuando aplique.
- accion `Transferir mascota` solo para familia protectora aprobada y mascota bajo su custodia.
- pantalla de confirmacion con resumen de expediente compartido.

Transferencia:

- seleccionar receptor por email o invitacion de hogar.
- mostrar que la mascota conserva expediente.
- mostrar que reservas, chats y datos privados no se comparten.
- requerir confirmacion del emisor y aceptacion del receptor.

Admin web:

- cola de solicitudes de familia protectora.
- detalle del hogar solicitante.
- aprobar, rechazar o suspender.
- auditoria de transferencias.
- bloqueo de uso indebido.

### U.7 Respuestas a decisiones abiertas

1. Familia protectora debe ser perfil adicional de `household`, no tipo rigido ni provider comercial.
2. Debe permitirse solicitud self-service, pero activacion final por admin.
3. La historia se conserva con `pet_transfer_records`, `pet_custody_contexts` y `audit_logs`.
4. Viajan datos de mascota, perfil, salud, vacunas, condiciones, alergias y documentos autorizados.
5. Requieren consentimiento documentos sensibles, recordatorios futuros y cualquier dato no estrictamente medico.
6. Recordatorios no deben transferirse automaticamente en el primer slice.
7. Reservas historicas quedan con el hogar que contrato; no se abren al receptor.
8. La familia anterior pierde acceso operativo completo salvo permiso historico explicitamente definido.
9. La familia receptora ve solo invitacion, resumen minimo y expediente compartido despues de aceptar.
10. Admin debe auditar perfil protector, transferencias, consentimientos, rechazos, cancelaciones y reportes.
11. Primer slice de menor riesgo: `Foster-1A protective household profile documented/admin-approved`, seguido de `Foster-2A private pet transfer`.

### U.8 Slices refinados

- Foster-0A: documentacion de familia protectora y transferencia privada.
- Foster-1A: solicitud y aprobacion de familia protectora.
- Foster-2A: transferencia privada por invitacion/aceptacion.
- Foster-3A: historial de custodia en ficha de mascota.
- Foster-4A: consentimiento granular de documentos/recordatorios.
- Foster-5A: adopcion publica/marketplace separado, solo despues de validar transferencia privada.

## V. Foster-1A: diseno tecnico detallado de Familia Protectora

Estado: implementacion local preparada. Incluye migracion, RLS, RPCs, tipos compartidos, API client, UI owner minima y UI admin minima. No se aplico remoto; requiere dry-run/aprobacion antes de `supabase db push`.

Objetivo del slice:

- permitir que una familia/hogar existente solicite ser reconocida como familia protectora.
- permitir que admin apruebe, rechace o suspenda esa solicitud.
- dejar lista la base de permisos para que un slice posterior habilite transferencia privada de mascotas.
- no abrir marketplace publico de adopcion.

### V.1 Tabla propuesta `protective_household_profiles`

Campos minimos:

- `household_id uuid primary key references households(id) on delete cascade`
- `status text not null check (status in ('draft', 'pending_review', 'approved', 'rejected', 'suspended')) default 'draft'`
- `display_name text not null`
- `organization_type text not null check (organization_type in ('individual_rescuer', 'foster_home', 'foundation', 'temporary_home', 'other'))`
- `city text not null`
- `state_region text null`
- `country_code text not null default 'PA'`
- `contact_notes text null`
- `public_notes text null`
- `review_notes text null`
- `submitted_at timestamptz null`
- `reviewed_by_user_id uuid null references auth.users(id)`
- `reviewed_at timestamptz null`
- `created_by_user_id uuid not null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Restricciones recomendadas:

- `display_name` no debe estar vacio.
- `city` no debe estar vacia.
- `country_code` debe ser ISO-3166 alpha-2.
- `submitted_at` debe existir cuando `status = pending_review`.
- `reviewed_at` y `reviewed_by_user_id` deben existir cuando `status in ('approved', 'rejected', 'suspended')`.
- solo debe existir un perfil protector por `household_id`.

Indices recomendados:

- `protective_household_profiles(status)`
- `protective_household_profiles(country_code, city)`
- `protective_household_profiles(reviewed_by_user_id)` cuando no sea null.

### V.2 Ownership y permisos

Regla base:

- solo miembros activos del hogar con permiso `admin` pueden crear, editar borrador o enviar a revision el perfil protector.
- miembros con permiso `view` pueden ver el estado del perfil protector de su hogar.
- admin de plataforma puede ver perfiles en revision, aprobar, rechazar, suspender y consultar auditoria.

Transiciones permitidas para familia:

- ausencia de perfil -> `draft`
- `draft` -> `pending_review`
- `rejected` -> `draft` si se permite corregir y reenviar

Transiciones permitidas para admin:

- `pending_review` -> `approved`
- `pending_review` -> `rejected`
- `approved` -> `suspended`
- `suspended` -> `approved`

Transiciones no permitidas:

- familia no puede auto-aprobarse.
- familia no puede pasar directo de `draft` a `approved`.
- familia no puede editar campos base mientras `pending_review` si eso invalida revision; recomendacion: permitir solo volver a `draft`.
- perfil `suspended` no puede iniciar transferencias futuras.

### V.3 RLS esperada

Lectura:

- miembros del hogar pueden leer su propio `protective_household_profiles`.
- admin puede leer todos.
- ningun acceso anonimo.
- marketplace/adopcion publica no lee esta tabla en Foster-1A.

Insercion:

- miembro con permiso `admin` del hogar puede insertar perfil para su `household_id`.
- `created_by_user_id` debe ser `auth.uid()`.

Actualizacion por familia:

- miembro con permiso `admin` puede editar campos de perfil solo cuando `status in ('draft', 'rejected')`.
- miembro con permiso `admin` puede enviar a revision, estableciendo `status = pending_review` y `submitted_at = now()`.
- no puede modificar `review_notes`, `reviewed_by_user_id` ni `reviewed_at`.

Actualizacion por admin:

- admin puede aprobar, rechazar o suspender.
- admin debe completar `review_notes` cuando rechaza o suspende.
- admin debe escribir `reviewed_by_user_id = auth.uid()` y `reviewed_at = now()`.

Eliminacion:

- no recomendada en Foster-1A. Si se requiere, solo admin y preferiblemente soft-delete/suspension.

### V.4 RPCs recomendadas

Aunque algunas operaciones podrian hacerse con RLS directa, se recomienda RPC para transiciones de estado:

- `submit_protective_household_profile(target_household_id uuid)`
  - valida membresia admin del hogar.
  - valida campos minimos.
  - cambia `draft/rejected` a `pending_review`.
  - setea `submitted_at`.
  - escribe audit log.

- `review_protective_household_profile(target_household_id uuid, decision text, notes text)`
  - solo admin.
  - `decision in ('approved', 'rejected', 'suspended')`.
  - valida transicion.
  - setea `reviewed_by_user_id`, `reviewed_at`, `review_notes`.
  - escribe audit log.

Para UI se puede exponer desde API client como:

- `getProtectiveHouseholdProfile(householdId)`
- `upsertProtectiveHouseholdProfile(input)`
- `submitProtectiveHouseholdProfile(householdId)`
- `listPendingProtectiveHouseholdProfiles()` admin
- `reviewProtectiveHouseholdProfile(householdId, decision, notes)` admin

### V.5 UX owner mobile/web

Ubicacion sugerida:

- `Cuenta` o `Hogar` dentro del rol owner.

Estados:

- sin perfil: CTA `Solicitar familia protectora`.
- `draft`: formulario editable y CTA `Enviar a revision`.
- `pending_review`: card de estado `En revision`; bloquear edicion directa.
- `approved`: card `Familia protectora aprobada`; explicar que el siguiente paso futuro habilitara transferencias.
- `rejected`: mostrar motivo y CTA `Corregir solicitud`.
- `suspended`: mostrar estado restringido y canal de soporte.

Campos de formulario:

- nombre visible de la familia protectora.
- tipo: rescatista individual, hogar temporal, fundacion, familia de acogida u otro.
- ciudad.
- region/provincia.
- pais.
- notas de contacto/contexto.
- descripcion publica corta opcional.

Copy obligatorio:

- `Ser familia protectora permite custodiar y transferir mascotas con trazabilidad. No habilita venta, cobros ni publicacion publica automatica.`

### V.6 UX admin web

Ubicacion sugerida:

- nuevo bloque futuro en Admin: `Familias protectoras`.
- puede iniciar como subcola dentro de backoffice admin MVP si se implementa pequeno.

Pantallas:

- cola de solicitudes pendientes.
- detalle de solicitud con household, solicitante, ciudad, tipo, notas y fecha de envio.
- acciones: `Aprobar`, `Rechazar`, `Suspender`.
- campo obligatorio de nota para rechazo/suspension.

Estados vacios:

- `No hay familias protectoras pendientes de revision.`

### V.7 Criterios de aceptacion Foster-1A

- un hogar con miembro admin puede crear borrador de perfil protector.
- el borrador exige nombre visible, tipo, ciudad y pais.
- el hogar puede enviar solicitud a revision.
- mientras esta en revision, el usuario ve estado claro y no puede auto-aprobarse.
- admin puede listar solicitudes `pending_review`.
- admin puede aprobar o rechazar con nota.
- estado aprobado queda visible para el hogar.
- estado rechazado muestra motivo y permite correccion.
- estado suspendido bloquea capacidades futuras.
- no se crean transferencias de mascota en este slice.
- no se publica ninguna mascota en marketplace.
- no se tocan pagos, booking, QR, evidencia, provider services ni geolocalizacion.

### V.8 Riesgos de Foster-1A

- Riesgo de abuso: usuarios se declaran protectores sin verificacion real. Mitigacion: aprobacion admin obligatoria.
- Riesgo legal: una aprobacion no equivale a certificacion legal. Mitigacion: copy y terminos claros.
- Riesgo de privacidad: exponer datos del hogar. Mitigacion: no publicarlo en marketplace y no mostrar direccion exacta.
- Riesgo operativo: admin sin capacidad de revisar. Mitigacion: mantener cola simple y estados claros.
- Riesgo de scope creep: saltar a adopcion publica. Mitigacion: bloquear marketplace hasta Foster-5A.

### V.9 Preparacion para Foster-2A

Foster-1A solo habilita la condicion previa: `protective_household_profiles.status = approved`.

Foster-2A debera validar:

- hogar emisor tiene perfil protector aprobado.
- mascota esta bajo custodia del hogar emisor.
- receptor acepta transferencia.
- `pets.id` se conserva.
- se registra `pet_transfer_records`.
- no viajan datos privados no consentidos.

## Proximas decisiones antes de implementar

- Definir si foster sera rol global, perfil especial o tipo de organizacion.
- Definir politica de verificacion de fundaciones/rescatistas.
- Definir terminos legales de adopcion responsable.
- Definir campos publicos minimos por especie.
- Definir flujo exacto de transferencia de custodia.
- Definir si mensajeria entra en Foster-6 o se mantiene fuera inicialmente.
- Definir si la primera version permite solo solicitudes, no transferencia digital.

## W. Foster-2A: transferencia privada de mascota

Estado: implementacion local preparada. Incluye migracion, RLS, RPCs, tipos compartidos, API client, UI owner mobile minima y auditoria admin web. No se aplica remoto sin dry-run/aprobacion.

### W.1 Alcance

Foster-2A permite que una familia protectora aprobada invite a otra familia a recibir una mascota existente. La mascota conserva `pets.id` y su expediente permitido. No se duplica mascota y no se abre marketplace publico de adopcion.

Fuera de alcance:

- marketplace publico de adopcion.
- pagos, checkout o cobros.
- booking, QR, evidencia operacional o provider services.
- transferencia automatica de reservas, chats, pagos, soporte o recordatorios futuros.
- consentimiento granular avanzado por documento.

### W.2 Modelo implementado

`pet_custody_contexts` registra custodias historicas de una mascota:

- `pet_id`.
- `household_id`.
- `custody_type`: `owner | foster | rescue | temporary`.
- `status`: `active | ended | transferred | cancelled`.
- `started_at` / `ended_at`.
- `created_by_user_id`.

`pet_transfer_records` registra invitaciones y consentimiento:

- `pet_id`.
- `from_household_id`.
- `to_household_id`.
- `recipient_email`.
- `recipient_user_id`.
- `initiated_by_user_id`.
- `accepted_by_user_id`.
- `status`: `pending | accepted | rejected | cancelled | expired`.
- `consent_snapshot`.
- `transfer_notes`.
- fechas de expiracion, aceptacion, rechazo y cancelacion.

### W.3 RPCs

- `create_pet_transfer_invitation(target_pet_id, target_from_household_id, target_recipient_email, notes)`
  - exige familia protectora aprobada.
  - exige permiso admin del hogar emisor.
  - bloquea mascotas `in_memory`.
  - evita mas de una transferencia pendiente por mascota.
  - crea snapshot de consentimiento con conteos de documentos/salud y exclusiones.

- `accept_pet_transfer(target_transfer_id, target_to_household_id)`
  - exige invitacion pendiente y no expirada.
  - exige que el receptor coincida por usuario o email.
  - exige permiso admin sobre el hogar receptor.
  - actualiza `pets.household_id` transaccionalmente.
  - cierra custodia anterior y abre custodia nueva.

- `reject_pet_transfer(target_transfer_id)`
  - permite al receptor rechazar una invitacion dirigida a su cuenta/email.

- `cancel_pet_transfer(target_transfer_id)`
  - permite al hogar emisor cancelar una invitacion pendiente.

Funciones de consulta:

- `list_incoming_pet_transfer_invitations()`.
- `list_outgoing_pet_transfer_records(target_household_id)`.
- `list_pet_custody_history(target_pet_id)`.
- `list_pet_transfer_records_for_admin()`.

### W.4 RLS

- `pet_transfer_records` se lee solo por hogares emisores, hogares receptores, receptor por email/usuario o admin.
- `pet_custody_contexts` se lee por hogares involucrados, custodio actual o admin.
- escrituras directas cliente no se conceden; las mutaciones ocurren por RPC transaccional.
- el receptor ve antes de aceptar un resumen minimo, no expediente completo.
- al aceptar, RLS existente sobre `pets.household_id` da acceso al expediente permitido.

### W.5 Politica de datos

Viaja con la mascota:

- datos base de mascota.
- perfil.
- avatar.
- esterilizacion.
- vacunas.
- alergias.
- condiciones.
- documentos visibles por politica inicial del expediente.

No viaja automaticamente:

- reservas historicas.
- conversaciones.
- pagos/metodos.
- soporte.
- recordatorios futuros.
- datos privados del hogar anterior.

Los recordatorios futuros quedan como tarea posterior de confirmacion/recreacion en Foster-4A.

### W.6 UX owner/admin

Owner mobile:

- en Mascotas, una familia protectora aprobada ve `Transferir mascota`.
- el formulario pide email receptor y nota.
- el copy explica que la mascota conserva expediente permitido y que reservas/chats/pagos/recordatorios no se transfieren.
- Hogares muestra bandeja `Invitaciones de mascota` para aceptar o rechazar.

Admin web:

- `Familias protectoras` incluye auditoria read-only de transferencias privadas.

### W.7 Criterios de aceptacion

- una familia protectora aprobada puede crear invitacion para una mascota propia activa.
- una familia no aprobada no puede iniciar transferencia.
- una mascota `in_memory` no puede transferirse.
- no puede haber dos transferencias pendientes para la misma mascota.
- receptor acepta desde un hogar donde tiene permiso admin.
- aceptar mueve `pets.household_id` y conserva `pets.id`.
- reservas, chats, pagos y soporte no cambian de hogar.
- admin puede auditar transferencias.
