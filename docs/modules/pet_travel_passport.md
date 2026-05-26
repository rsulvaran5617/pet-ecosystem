# Pet Travel Passport / Expediente Internacional de Mascota

## Estado

V2 documental. No implementado. No hay migraciones, UI, RLS nuevas ni cambios de Supabase asociados a este documento.

## Objetivo

Definir el alcance V2 para un expediente digital de viaje de mascota que ayude al owner a organizar informacion, controlar vencimientos, preparar requisitos y compartir documentos con veterinarios o proveedores autorizados.

Este modulo no emite pasaportes oficiales, certificados sanitarios oficiales ni documentos gubernamentales. La app solo prepara, organiza y presenta informacion. La validez legal depende de veterinarios certificados, autoridades sanitarias, aerolineas y reglas del pais de origen/destino.

## Estado actual reutilizable

El proyecto ya cuenta con bases utiles:

- `pets`: mascota, hogar, estado `active` / `in_memory`.
- `pet_profiles`: especie, raza, sexo, fecha de nacimiento, notas y avatar privado.
- `pet_documents`: carpeta documental basica por mascota con archivos en storage privado.
- `pet_vaccines`: vacunas con fecha de aplicacion y proximo vencimiento.
- `pet_allergies`: alergias y reacciones.
- `pet_conditions`: condiciones medicas, estado y criticidad.
- `reminders`: recordatorios manuales o derivados de salud.
- `calendar_events`: representacion de agenda para recordatorios.
- owner mobile y owner web ya tienen superficies para mascotas, salud, documentos y recordatorios.

Limitaciones actuales:

- no existe microchip estructurado.
- no existe expediente de viaje por mascota.
- no existe checklist por pais/destino.
- vacunas no tienen lote, fabricante, veterinario, centro o documento soporte estructurado.
- documentos no diferencian aun documentos sanitarios de viaje con vigencia/regla.
- no existe flujo de compartir expediente con veterinario/proveedor.
- no existe validacion documental, trazabilidad de revision ni fuente oficial por requisito.

## Diferencia conceptual

### Expediente digital de viaje

Carpeta estructurada por mascota y viaje. Agrupa identidad, salud, vacunas, documentos y estado de preparacion. Sirve para que el owner sepa que tiene y que falta.

### Checklist de requisitos por pais

Lista de requisitos conocidos para un destino, especie y fecha de viaje. Debe mostrar fuente oficial y fecha de ultima revision. En V2 inicial puede ser manual; reglas por pais requieren validacion oficial antes de automatizarse.

### Carpeta documental de mascota

Repositorio privado de archivos asociados a la mascota: carnet, certificados, documentos de aerolinea, documentos emitidos por autoridades, soportes de microchip y otros adjuntos.

### Pasaporte oficial o certificado sanitario oficial

Documento emitido por autoridad competente, veterinario certificado o entidad gubernamental. Pet Ecosystem no lo emite ni lo sustituye en este alcance.

## Alcance V2 propuesto

Entra:

- expediente internacional por mascota.
- carpeta documental de viaje.
- captura estructurada de microchip y soportes.
- captura enriquecida de vacunas relevantes para viaje.
- checklist manual de preparacion.
- recordatorios de vencimiento y ventanas criticas.
- estados visuales: incompleto, en preparacion, listo para revision, vencido.
- compartir expediente con provider/veterinario autorizado, sujeto a consentimiento del owner.
- exportacion futura de resumen PDF como expediente informativo, no oficial.

No entra:

- emision legal de pasaporte.
- certificacion sanitaria oficial.
- integraciones gubernamentales.
- reglas legales reales sin fuente oficial y fecha de revision.
- aprobacion legal automatica.
- marketplace, pagos, booking, QR o geolocalizacion.

## Datos necesarios

### Datos de la mascota

- nombre.
- especie.
- raza.
- sexo.
- fecha de nacimiento real o aproximada.
- color y senas particulares.
- peso.
- foto/avatar.
- estado: activa, fallecida, archivada.

Derivado actual: nombre, especie, raza, sexo, fecha de nacimiento, avatar y estado existen parcialmente. Faltan color/senas, peso y estado archivada.

### Identificacion

- numero de microchip.
- fecha de implantacion.
- pais de implantacion.
- ubicacion del microchip.
- entidad o veterinario que lo registro.
- documento soporte del microchip.

### Vacunas

- vacuna antirrabica.
- otras vacunas relevantes.
- fecha de aplicacion.
- fecha de vencimiento.
- lote.
- fabricante.
- veterinario o centro.
- documento soporte.

Derivado actual: nombre de vacuna, fecha de aplicacion, proxima fecha y notas. Faltan lote, fabricante, centro, veterinario y soporte estructurado.

### Salud y certificados

- certificado de salud.
- certificado veterinario.
- permiso sanitario de exportacion/importacion si aplica.
- desparasitacion interna/externa.
- tratamientos requeridos.
- pruebas de laboratorio si aplica.
- observaciones medicas relevantes.

### Documentos

- carnet de vacunacion.
- certificado de rabia.
- certificado de microchip.
- certificado de salud.
- documentos de viaje.
- documentos emitidos por autoridad sanitaria.
- documentos de aerolinea.
- otros adjuntos.

### Datos del viaje

- pais origen.
- pais destino.
- ciudad destino.
- fecha estimada de viaje.
- aerolinea o medio de transporte.
- tipo de viaje: cabina, bodega, terrestre, mudanza o temporal.
- requisitos pendientes.
- estado del expediente.

## Checklist por pais / destino

Funcionalidad futura:

- pais destino.
- especie.
- fecha de viaje.
- requisitos conocidos.
- documentos requeridos.
- vencimientos criticos.
- ventanas de tiempo.
- estado: pendiente, completo, requiere revision, vencido.
- fuente oficial de referencia.
- fecha de ultima revision de la fuente.

Regla de seguridad documental: no cargar ni prometer reglas legales reales sin fuente oficial actualizada. La UI debe decir que el owner debe confirmar requisitos con la autoridad sanitaria, veterinario certificado y aerolinea.

## Modelo de datos conceptual

No crear migraciones todavia. Las siguientes entidades son candidatas V2.

### pet_identifications

Objetivo: registrar identidad sanitaria/tecnica de la mascota, especialmente microchip.

Campos principales:

- `id`
- `pet_id`
- `identification_type`
- `identifier_value`
- `implanted_on`
- `implant_country`
- `implant_location`
- `registered_by_name`
- `registered_by_license`
- `support_document_id`
- `created_by_user_id`

Relaciones: `pets`, `pet_documents`.

Visibilidad: owner y miembros autorizados del hogar; provider/veterinario solo con share autorizado; admin solo por soporte justificado.

Privacidad: microchip es dato sensible y no debe exponerse en marketplace.

Derivable actual: ninguno salvo relacion con mascota y documento soporte.

### pet_travel_profiles

Objetivo: representar un expediente/viaje preparado para una mascota.

Campos principales:

- `id`
- `pet_id`
- `household_id`
- `origin_country`
- `destination_country`
- `destination_city`
- `estimated_travel_date`
- `transport_mode`
- `travel_type`
- `airline_or_carrier`
- `status`
- `notes`
- `created_by_user_id`

Relaciones: `pets`, `households`, checklists y documentos.

Visibilidad: owner/hogar; provider solo si se comparte; admin no por defecto.

Privacidad: datos de viaje no son publicos.

Derivable actual: mascota, hogar y algunos documentos.

### pet_travel_documents

Objetivo: clasificar documentos de viaje y vincularlos al expediente.

Campos principales:

- `id`
- `pet_travel_profile_id`
- `pet_id`
- `pet_document_id`
- `travel_document_type`
- `issued_on`
- `expires_on`
- `issuing_authority`
- `country`
- `status`

Relaciones: `pet_travel_profiles`, `pet_documents`.

Visibilidad: owner/hogar; provider/veterinario con share autorizado.

Privacidad: bucket privado; solo URLs firmadas temporales.

Derivable actual: archivo y metadata base desde `pet_documents`.

### pet_travel_requirements

Objetivo: catalogar requisitos de referencia por pais/especie.

Campos principales:

- `id`
- `destination_country`
- `origin_country`
- `species`
- `requirement_type`
- `title`
- `description`
- `official_source_url`
- `source_reviewed_at`
- `effective_from`
- `effective_until`
- `status`

Relaciones: checklists y checklist items.

Visibilidad: lectura owner/provider/admin si esta publicado; edicion admin o equipo autorizado.

Privacidad: baja, pero alto riesgo regulatorio por vigencia.

Derivable actual: no existe.

### pet_travel_checklists

Objetivo: instancia de checklist para un viaje concreto.

Campos principales:

- `id`
- `pet_travel_profile_id`
- `status`
- `completion_score`
- `last_reviewed_at`
- `created_by_user_id`

Relaciones: `pet_travel_profiles`, checklist items.

Visibilidad: owner/hogar; provider compartido puede leer o sugerir faltantes segun permiso.

Privacidad: contiene inferencias de viaje y salud.

Derivable actual: vencimientos de salud y documentos.

### pet_travel_checklist_items

Objetivo: requisito individual que el owner debe cumplir o revisar.

Campos principales:

- `id`
- `pet_travel_checklist_id`
- `requirement_id`
- `title`
- `description`
- `due_on`
- `window_starts_on`
- `window_ends_on`
- `status`
- `linked_pet_document_id`
- `notes`

Relaciones: checklist, requirement opcional, documento soporte.

Visibilidad: owner/hogar; provider compartido puede leer o comentar si tiene permiso.

Privacidad: puede revelar destino y documentos sanitarios.

Derivable actual: algunos items desde vacunas con `next_due_on` y documentos cargados.

### pet_travel_events

Objetivo: historial/auditoria funcional del expediente.

Campos principales:

- `id`
- `pet_travel_profile_id`
- `event_type`
- `actor_user_id`
- `metadata`
- `created_at`

Relaciones: travel profile, usuarios.

Visibilidad: owner/hogar; admin solo soporte; provider solo eventos dentro del share.

Privacidad: audita accesos y cambios.

Derivable actual: no existe.

### pet_document_validations

Objetivo: registrar revision documental no legal realizada por provider/veterinario o admin autorizado.

Campos principales:

- `id`
- `pet_document_id`
- `pet_travel_profile_id`
- `reviewed_by_user_id`
- `reviewer_role`
- `status`
- `comments`
- `reviewed_at`

Relaciones: documento, expediente, usuario.

Visibilidad: owner/hogar; reviewer autorizado; admin soporte.

Privacidad: alto; no implica certificacion oficial salvo rol y marco legal futuro.

Derivable actual: archivo/documento base existe, validacion no.

## Seguridad y privacidad

- El owner controla el acceso al expediente.
- Un provider/veterinario solo puede ver el expediente si el owner lo comparte o si existe servicio autorizado que lo requiera.
- Admin no debe ver documentos sensibles por defecto; solo soporte, moderacion justificada o auditoria controlada.
- Documentos y avatares siguen en buckets privados.
- No exponer microchip, datos sanitarios o datos de viaje en marketplace.
- No mostrar fuentes oficiales sin fecha de ultima revision.
- Registrar trazabilidad futura de acceso, comparticion, revision y descarga.
- URLs de documentos deben ser firmadas y temporales.
- No usar documentos de viaje como prueba publica de propiedad ni identidad.

## UX Owner futura

Pantallas propuestas:

- `Expediente de viaje` dentro del detalle de mascota.
- `Preparar viaje` como CTA desde mascota.
- resumen de preparacion: incompleto, en preparacion, listo para revision, vencido.
- checklist por pais/destino.
- carpeta documental de viaje.
- alertas de vencimiento.
- compartir con veterinario/proveedor.
- exportar resumen informativo.

Tono UX:

- calido, orientador y no legalista.
- evitar falsa seguridad.
- usar mensajes como: `Confirma siempre los requisitos con fuentes oficiales antes de viajar.`

## UX Provider / Veterinario futura

Alcance propuesto:

- ver expediente compartido por owner.
- adjuntar certificado o documento al expediente si tiene permiso.
- marcar revision documental o sugerir faltantes.
- comentar observaciones.
- no aprobar legalmente salvo rol autorizado futuro y marco documental especifico.

## UX Admin futura

Alcance propuesto:

- no operar documentos medicos por defecto.
- ver metricas agregadas de uso.
- atender casos de soporte con acceso justificado.
- moderar plantillas/checklists si la plataforma administra requisitos.
- registrar revision de fuentes oficiales si existe catalogo por pais.

## Integracion con reminders

Recordatorios futuros:

- vencimiento de vacuna antirrabica.
- vencimiento de certificado de salud.
- ventana de desparasitacion.
- fecha limite para tramite sanitario.
- renovacion de documento o microchip si aplica.
- preparacion previa al viaje.
- recordatorio de verificar requisitos oficiales antes de viajar.

## Riesgos

- Riesgo legal/regulatorio por interpretar requisitos de paises.
- Informacion desactualizada por cambios de autoridades o aerolineas.
- Falsa confianza del owner si la app parece certificar el viaje.
- Documentos sanitarios y microchip son datos sensibles.
- Diferencias entre pais origen, pais destino, transito y aerolinea.
- Validez de documentos depende de emisor oficial.
- Almacenamiento seguro y acceso auditado son obligatorios.
- Compartir con providers requiere consentimiento granular.

## Slices recomendados

- PET-PASSPORT-0: documentacion y definicion de alcance.
- PET-PASSPORT-1: modelo de expediente internacional.
- PET-PASSPORT-2: carpeta documental por mascota.
- PET-PASSPORT-3: checklist manual de viaje.
- PET-PASSPORT-4: recordatorios de vencimiento.
- PET-PASSPORT-5: compartir expediente con provider/veterinario.
- PET-PASSPORT-6: checklist por pais basado en fuentes oficiales.
- PET-PASSPORT-7: revision documental asistida.
- PET-PASSPORT-8: exportacion PDF del expediente.
- PET-PASSPORT-9: integraciones futuras con autoridades/aerolineas, si aplica.

## Criterios de aceptacion V2

- Owner puede ver un expediente internacional por mascota.
- Owner puede cargar y clasificar documentos de viaje.
- Owner puede ver vencimientos y faltantes.
- Owner puede preparar checklist manual.
- La app no promete validez oficial ni emision legal de documentos.
- Documentos son privados y se acceden con URLs firmadas.
- Datos sensibles no aparecen en marketplace ni superficies publicas.
- El modulo se integra con mascotas, salud, documentos y recordatorios.
- Provider/veterinario solo ve el expediente con autorizacion del owner.
- Toda regla por pais muestra fuente oficial y fecha de revision antes de considerarse usable.

## Decisiones pendientes antes de implementar

- Definir paises iniciales soportados para checklist.
- Definir si la primera version usa solo checklist manual.
- Definir tipos documentales canonicos.
- Definir permisos granulares para compartir con provider/veterinario.
- Definir si exportacion PDF entra antes o despues de revision documental.
- Validar marco legal y disclaimers por pais.
