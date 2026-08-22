# ADOPTION-PUBLIC-FUNNEL

Landing publica de fundaciones y conversion responsable hacia app owner.

## Estado operativo 2026-08-21

- Slice 1 documental: completado como definicion de alcance, modelo conceptual, UX, contrato futuro y riesgos.
- Slice 2 landing publica de Familia Protectora: implementado en `/protectoras/[slug]` con datos reales del perfil publico aprobado, mascotas publicadas, contacto/redes declaradas y bloque opcional de apoyo.
- Slice 3 ficha publica de mascota: implementado en `/adopciones/[petSlug]` como pagina publica profesional con galeria, historia, personalidad, salud publica, requisitos, compatibilidad, ubicacion general y enlace de regreso a la Familia Protectora.
- Slice 4 solicitud inicial publica: implementado localmente en `/adopciones/[petSlug]/solicitar`, con consentimiento, honeypot, controles de duplicados/rate limit y bandeja Web Foster `Interes publico` separada de solicitudes formales.
- Slice 5 invitacion hacia app owner: implementado localmente con token de un solo uso almacenado como hash, vigencia controlada, CTA Web Foster, enlace compartible y pagina puente `/adoption-invite/[token]`. El estado `invited_to_app` no crea solicitud formal ni transfiere custodia.
- Slice 6 conversion a Owner: implementado localmente con deep link mobile, claim autenticado por correo destinatario, hogar familiar obligatorio y conversion idempotente a `pet_adoption_applications`. El estado `converted_to_application` no cambia custodia.
- No se han creado migraciones para este frente publico, no se tocaron RLS ni Supabase remoto y no se expusieron documentos privados, gastos, comprobantes, solicitudes, notas internas ni direcciones exactas.
- El cierre formal de adopcion sigue dentro del flujo autenticado owner/foster existente. La ficha publica orienta el interes, pero aun no captura una solicitud publica ligera.
- Para verlo en produccion, la gota debe actualizarse al commit mas reciente de `origin/master`.

Siguiente paso recomendado: validar y aplicar de forma controlada las migraciones pendientes de Slices 4, 5 y 6 en orden, seguido por QA completo desde enlace publico hasta solicitud formal.

## Resumen ejecutivo

ADOPTION-PUBLIC-FUNNEL propone una capa publica de captacion para Familias Protectoras y fundaciones, separada del cierre formal de adopcion. La landing publica aumenta visibilidad, difusion, confianza e interes inicial; la app mobile owner conserva el proceso responsable: cuenta, hogar, solicitud formal, aprobacion, transferencia y expediente.

El principio de producto es simple:

- No bloquear la visibilidad publica.
- No exigir instalar la app para conocer fundaciones o mascotas.
- Si exigir app owner para avanzar formalmente, crear hogar, aceptar transferencia y recibir expediente.

Este frente no reemplaza el flujo Foster existente. Lo ordena como embudo medible:

```text
Landing publica de fundacion
  -> ficha publica de mascota
  -> solicitud inicial ligera
  -> revision por protectora
  -> invitacion a continuar en app owner
  -> registro/login owner
  -> creacion o seleccion de hogar
  -> solicitud formal de adopcion
  -> aprobacion
  -> transferencia responsable
  -> mascota en Mis mascotas
  -> seguimiento post-adopcion
```

## Estado actual reutilizable

Pet Ecosystem ya cuenta con piezas importantes para este alcance:

- `protective_household_profiles`: operacion privada de la Familia Protectora.
- `protective_household_public_profiles`: perfil publico moderado, slug, logo, redes y apoyo/donaciones declaradas.
- `pet_adoption_listings`: publicaciones de mascotas en adopcion, slug publico, estados y trazabilidad.
- `pet_adoption_listing_media`: galeria publica controlada de la mascota.
- `pet_adoption_applications`: solicitudes formales autenticadas.
- `pet_adoption_application_status_history`: historial de estados.
- `pet_transfer_records`: transferencia responsable y trazabilidad.
- `pet_documents`: expediente privado por mascota.
- `foster_pet_expenses`: gastos privados de acogida.
- Web Foster, Mobile Foster, Mobile Owner y Admin ya tienen superficies base.

Lo que falta es una capa intermedia de captacion publica no autenticada y conversion contextual hacia owner mobile.

## Diferencia conceptual

### Landing publica de fundacion

Vitrina institucional para que una fundacion explique quienes son, que mascotas tienen disponibles, que impacto generan y como contactarse o apoyar. Debe ser compartible y entendible por visitantes anonimos.

### Ficha publica de mascota

Perfil publicable de una mascota especifica. Muestra informacion segura: fotos, historia, personalidad, requisitos, ciudad aproximada y familia protectora. No expone documentos privados, direccion exacta ni notas internas.

### Solicitud inicial ligera

Lead publico de interes. No equivale a adopcion, no transfiere custodia y no crea expediente owner. Sirve para que la Familia Protectora filtre interes real antes de invitar al proceso formal.

### Solicitud formal owner

Solicitud autenticada dentro de app owner. Debe conectar con un hogar owner y permitir seguimiento, evaluacion y transferencia responsable.

## Flujo completo por actor

### Visitante publico

1. Entra a `/protectoras/[slug]`.
2. Revisa perfil, mision, impacto, mascotas, necesidades y formas de apoyo declaradas.
3. Abre `/adopciones/[petSlug]`.
4. Lee ficha de la mascota.
5. Envia solicitud inicial ligera desde `/adopciones/[petSlug]/solicitar`.
6. Recibe confirmacion y espera revision.

### Familia Protectora

1. Publica o mantiene su landing publica aprobada.
2. Publica mascotas con datos minimos de calidad.
3. Recibe solicitudes iniciales.
4. Revisa, descarta o preselecciona.
5. Invita al interesado a continuar en app owner.
6. Da seguimiento al estado: invitado, owner registrado, hogar creado, solicitud formal, transferencia pendiente, adoptado.

### Adoptante owner

1. Recibe link de invitacion.
2. Abre app si esta instalada o llega a pagina puente si no la tiene.
3. Hace login o crea cuenta.
4. Crea o selecciona hogar owner.
5. Completa perfil de adoptante y solicitud formal.
6. Acepta condiciones si la solicitud avanza.
7. Acepta transferencia responsable.
8. Ve la mascota en `Mis mascotas`.

### Sistema

1. Mantiene trazabilidad del lead publico, invitacion y solicitud formal.
2. Evita duplicar mascotas.
3. Protege documentos privados.
4. Registra conversiones del embudo.
5. Conserva historial de adopcion para protectora y owner.

## Reglas de negocio propuestas

- Cualquier visitante puede ver landings publicas publicadas.
- Cualquier visitante puede ver fichas publicas publicadas.
- Cualquier visitante puede enviar una solicitud inicial ligera.
- Solo Familias Protectoras aprobadas pueden publicar landing.
- Solo Familias Protectoras aprobadas pueden publicar mascotas.
- La solicitud inicial no es una adopcion formal.
- Para avanzar formalmente, el interesado debe tener cuenta owner.
- Para cerrar adopcion, el owner debe tener hogar creado.
- La transferencia responsable solo ocurre dentro de app owner.
- Documentos privados de mascota no se muestran publicamente.
- Gastos privados no se muestran publicamente en este slice.
- Notas internas no se muestran publicamente.
- La direccion exacta no se publica.
- La mascota no se duplica al transferirse.
- La mascota adoptada pasa al hogar owner con trazabilidad.
- La protectora conserva historial de adopcion.
- El owner recibe expediente segun permisos definidos.
- Pet Ecosystem no procesa donaciones en este MVP.
- Las formas de apoyo declaradas son responsabilidad de la fundacion y quedan sujetas a moderacion.

## Plan por slices

### SLICE 0 - Discovery tecnico/documental

- Revisar Foster/adoption actual.
- Revisar owner onboarding y hogares.
- Revisar rutas web publicas actuales.
- Revisar deep linking mobile.
- Revisar aprobaciones admin.
- Documentar brechas.

Estado: cubierto documentalmente para orientar Slice 1.

### SLICE 1 - Diseno funcional y documentacion

- `docs/product/ADOPTION_PUBLIC_FUNNEL.md`
- `docs/ux/ADOPTION_PUBLIC_FUNNEL_UX.md`
- `docs/data/ADOPTION_PUBLIC_FUNNEL_DATA_MODEL.md`
- `docs/api/ADOPTION_PUBLIC_FUNNEL_API_CONTRACT.md`
- `docs/release/ADOPTION_PUBLIC_FUNNEL_RISKS.md`

Estado: este documento forma parte de Slice 1.

### SLICE 2 - Landing publica MVP de fundacion

- Pagina publica por slug.
- Perfil, logo, mision, ciudad aproximada, redes y apoyo declarado.
- Mascotas publicadas.
- Boton compartir.
- Sin solicitud inicial si el riesgo operativo se considera alto.

Estado implementado:

- Ruta web publica `/protectoras/[slug]`.
- Usa `getPublicProtectiveProfileBySlug(slug)` y `listPublishedPetAdoptionListings()`.
- No requiere migracion para la primera version.
- Muestra solo perfiles publicos con `isPublic = true` y `moderationStatus = approved`.
- Muestra solo mascotas con publicacion `published`, `shareStatus = enabled` y `publicSlug`.
- Omite documentos, gastos privados, solicitudes, notas internas y direccion exacta.
- Las necesidades se muestran solo si ya existe `needsSummary`.
- Las metricas se limitan a datos derivados confiables de la respuesta publica actual.

### SLICE 3 - Ficha publica de mascota

- Ficha publica compartible.
- Fotos, historia, personalidad, salud publica y requisitos.
- CTA `Quiero adoptar`.
- SEO basico y previews sociales.

Estado implementado:

- Ruta existente `/adopciones/[petSlug]` reforzada como ficha publica profesional.
- Usa `getPublicPetAdoptionListingBySlug(slug)`.
- Muestra hero visual, galeria publica, historia, personalidad, salud publica, requisitos, compatibilidad y estado.
- Agrega CTA `Quiero adoptar` hacia la seccion de adopcion responsable, sin abrir aun formulario publico.
- Agrega `Compartir` con Web Share API y fallback a copiar enlace.
- Agrega enlace `Ver protectora` hacia `/protectoras/[slug]`.
- Mantiene copy de privacidad: no muestra documentos, direccion exacta, gastos, comprobantes ni notas internas.
- Mantiene el cierre formal dentro de app owner para futuros slices.

### SLICE 4 - Solicitud inicial publica

- Formulario corto.
- Validacion antispam y consentimiento.
- Bandeja de solicitudes publicas para protectora.

### SLICE 5 - Invitacion a app owner

- Token seguro.
- Email/link.
- Pagina puente.
- Deep link.
- Estado `Invitado a app`.

### SLICE 6 - App owner contextual

- Abrir solicitud desde token.
- Login/register.
- Crear o seleccionar hogar.
- Continuar solicitud formal.

### SLICE 7 - Transferencia responsable conectada

- Aprobacion.
- Aceptacion owner.
- Transferencia.
- Mascota aparece en `Mis mascotas`.

### SLICE 8 - Metricas de embudo

- Visitas, solicitudes, invitaciones, instalaciones atribuidas, owners registrados, hogares creados y adopciones cerradas.

## Criterios de aceptacion del frente

- La fundacion obtiene una landing publica profesional y compartible.
- Las mascotas publicadas son visibles sin instalar app.
- El interesado puede enviar una solicitud inicial ligera.
- La Familia Protectora puede preseleccionar e invitar a app owner.
- La app owner captura al adoptante real con cuenta y hogar.
- La transferencia responsable no ocurre fuera de la app.
- No se exponen documentos, direccion exacta ni notas privadas.
- El embudo puede medirse desde visita hasta adopcion cerrada.

## Preguntas abiertas para Product Owner

- El dominio publico definitivo sera `petecosyst.com` para todos los enlaces o habra subdominios por protectora?
- La solicitud inicial ligera debe permitir telefono, email o ambos?
- Se permitiran mensajes publicos antes de que el usuario instale la app?
- Que datos minimos exige Pet Ecosystem para que una mascota pueda aparecer en la landing?
- El CTA de apoyo/donacion debe aparecer en landing de fundacion, ficha de mascota o ambos?
- Se medira atribucion de instalacion desde links sin proveedor externo al inicio?
- El owner puede continuar una solicitud desde web o obligatoriamente desde mobile?

## Recomendacion de siguiente slice

Implementar primero SLICE 2 y SLICE 3 juntos solo si la ficha publica actual necesita ajuste visual/SEO. Si la ficha por mascota ya esta suficientemente usable, comenzar con SLICE 2: landing publica de fundacion, porque es el mayor diferenciador para convencer a Familias Protectoras y no requiere aun resolver invitaciones ni deep links.
