# Hogares de acogida, rescate y adopcion de mascotas

## Estado

Nodo futuro V2.5 no financiero. Documentado, no implementado.

No hay codigo, migraciones, Supabase, RLS reales, API clients ni UI asociados a este documento. Este alcance no modifica flujos actuales de owner, provider, bookings, payments, QR, evidencias, geolocalizacion ni marketplace de servicios.

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

## Proximas decisiones antes de implementar

- Definir si foster sera rol global, perfil especial o tipo de organizacion.
- Definir politica de verificacion de fundaciones/rescatistas.
- Definir terminos legales de adopcion responsable.
- Definir campos publicos minimos por especie.
- Definir flujo exacto de transferencia de custodia.
- Definir si mensajeria entra en Foster-6 o se mantiene fuera inicialmente.
- Definir si la primera version permite solo solicitudes, no transferencia digital.
