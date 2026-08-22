# ADOPTION-PUBLIC-FUNNEL Data Model

Modelo del embudo publico de adopcion. Slice 4 prepara localmente las entidades de interes publico; la migracion no debe aplicarse remoto sin dry-run y aprobacion.

## Reutilizacion actual

### `protective_household_public_profiles`

Uso actual:

- Perfil publico moderado de Familia Protectora.
- Slug publico.
- Logo.
- Mision/historia/contactos/enlaces.
- Informacion opcional de apoyo/donaciones declarada.

Uso para el embudo:

- Base de `/protectoras/[slug]`.
- Debe seguir moderado por admin.
- Puede necesitar campos de estado publico mas explicitos si los actuales no cubren `published/suspended`.

### `pet_adoption_listings`

Uso actual:

- Publicacion de mascota.
- Slug publico.
- Estados: `draft`, `pending_review`, `published`, `paused`, `closed`, `rejected`, `adopted`.
- Trazabilidad de publicacion responsable.

Uso para el embudo:

- Base de `/adopciones/[petSlug]`.
- Fuente para solicitud inicial publica.
- No debe duplicar `pets`.

### `pet_adoption_applications`

Uso actual:

- Solicitud formal autenticada.
- Relacion con listing y owner.
- Estados de pipeline.

Uso para el embudo:

- Destino final de una solicitud inicial cuando el usuario ya entra a app owner.
- Puede vincularse a una solicitud publica convertida.

### `pet_transfer_records`

Uso actual:

- Transferencia responsable con consentimiento.

Uso para el embudo:

- Cierre formal dentro de app owner.
- No debe crearse desde landing publica.

## Entidades propuestas

### `adoption_public_requests`

Objetivo:

Capturar interes inicial desde la web publica sin requerir cuenta owner inmediata.

Campos sugeridos:

- `id uuid primary key`
- `listing_id uuid references pet_adoption_listings(id)`
- `protective_household_id uuid references households(id)`
- `pet_id uuid references pets(id)`
- `requester_name text`
- `requester_email text`
- `requester_phone text null`
- `requester_city text null`
- `motivation text`
- `experience text null`
- `housing_type text null`
- `has_other_pets boolean null`
- `has_children boolean null`
- `privacy_acknowledged_at timestamptz`
- `status text`
- `source_url text null`
- `utm_source text null`
- `utm_medium text null`
- `utm_campaign text null`
- `linked_owner_user_id uuid null`
- `linked_owner_household_id uuid null`
- `converted_application_id uuid null references pet_adoption_applications(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Estados:

- `submitted`
- `in_review`
- `preselected`
- `invited_to_app`
- `owner_registered`
- `household_created`
- `converted_to_application`
- `rejected`
- `cancelled`
- `expired`

Publico/privado:

- Privado para Familia Protectora autorizada y admin.
- El visitante solo deberia consultar por token seguro o email verificado.

Riesgos:

- Spam.
- Datos personales sin cuenta.
- Duplicados por mascota/email.

Implementacion Slice 4:

- Estados implementados: `submitted`, `in_review`, `preselected`, `rejected`, `cancelled`, `expired`.
- Los estados de conversion a owner/app quedan para Slice 5 y no se simulan en Slice 4.
- La tabla no concede lectura directa anonima; la creacion publica ocurre por RPC validada.
- `adoption_public_request_status_history` conserva cada transicion operativa.

### `adoption_invites`

Objetivo:

Generar link seguro para que un interesado preseleccionado continue en app owner.

Campos sugeridos:

- `id uuid primary key`
- `public_request_id uuid references adoption_public_requests(id)`
- `listing_id uuid references pet_adoption_listings(id)`
- `protective_household_id uuid references households(id)`
- `invite_token_hash text`
- `recipient_email text`
- `recipient_phone text null`
- `status text`
- `expires_at timestamptz`
- `sent_at timestamptz null`
- `opened_at timestamptz null`
- `claimed_by_user_id uuid null`
- `claimed_at timestamptz null`
- `created_by_user_id uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Estados:

- `created`
- `sent`
- `opened`
- `claimed`
- `expired`
- `revoked`

Publico/privado:

- Token nunca se guarda en claro.
- Solo se expone la pagina puente por token.

MVP o futuro:

- MVP del Slice 5.

### `adoption_request_status_history`

Objetivo:

Auditar cambios de estado de la solicitud inicial.

Campos sugeridos:

- `id uuid primary key`
- `public_request_id uuid references adoption_public_requests(id)`
- `from_status text null`
- `to_status text`
- `changed_by_user_id uuid null`
- `change_reason text null`
- `created_at timestamptz`

Publico/privado:

- Privado.
- Visible para Familia Protectora autorizada y admin.

MVP o futuro:

- MVP desde Slice 4 si se requiere trazabilidad seria.

### `protective_needs`

Objetivo:

Declarar necesidades actuales de la fundacion sin procesar pagos.

Campos sugeridos:

- `id uuid primary key`
- `protective_household_id uuid references households(id)`
- `title text`
- `description text`
- `need_type text`
- `priority text`
- `is_public boolean`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

Tipos sugeridos:

- alimento
- medicinas
- transporte
- voluntariado
- insumos
- hogar temporal
- otro

MVP o futuro:

- Futuro. Puede entrar despues de la landing base.

### `protective_campaigns`

Objetivo:

Agrupar necesidades o historias de impacto en campanas publicas.

Campos sugeridos:

- `id uuid primary key`
- `protective_household_id uuid references households(id)`
- `title text`
- `description text`
- `campaign_type text`
- `status text`
- `published_at timestamptz null`
- `starts_at timestamptz null`
- `ends_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`

MVP o futuro:

- Futuro. No debe bloquear Slice 2.

### `adoption_funnel_events`

Objetivo:

Registrar eventos de embudo sin exponer datos personales.

Campos sugeridos:

- `id uuid primary key`
- `event_name text`
- `protective_household_id uuid null`
- `listing_id uuid null`
- `public_request_id uuid null`
- `invite_id uuid null`
- `actor_user_id uuid null`
- `anonymous_session_id text null`
- `metadata jsonb null`
- `created_at timestamptz`

Eventos sugeridos:

- `protective_landing_viewed`
- `pet_listing_viewed`
- `share_clicked`
- `public_request_started`
- `public_request_submitted`
- `public_request_preselected`
- `invite_sent`
- `invite_opened`
- `app_store_clicked`
- `owner_registered_from_invite`
- `owner_household_created_from_invite`
- `application_completed_from_invite`
- `adoption_transfer_accepted`

MVP o futuro:

- Futuro o Slice 8. Puede comenzar con logs simples si no hay infraestructura de analytics.

## Ajustes potenciales sobre tablas existentes

### `protective_household_public_profiles`

Campos conceptuales a revisar antes de migrar:

- `public_profile_status`
- `public_profile_published_at`
- `public_profile_reviewed_by`
- `public_profile_reviewed_at`
- `public_profile_rejection_reason`

Nota:

El modelo actual ya tiene moderacion de perfil publico. Estos campos solo deben agregarse si el estado existente no permite diferenciar aprobado, publicado, suspendido y rechazado.

### `pet_adoption_listings`

Campos conceptuales a revisar:

- `share_enabled`
- `public_status`
- `public_request_count`

Nota:

El listado actual ya tiene `public_slug`, `share_status` y estados de publicacion. Evitar duplicar campos si ya cubren el caso.

## Reglas de privacidad y RLS esperadas

- Lectura anonima solo para landings y listings publicados.
- Solicitudes publicas solo visibles para:
  - Familia Protectora propietaria.
  - Admin.
  - Solicitante mediante token o flujo autenticado.
- Invitaciones solo por token seguro y/o usuario reclamante.
- Token debe expirar.
- No exponer documentos privados.
- No exponer gastos privados.
- No exponer direccion exacta.
- No permitir que owners regulares creen publicaciones Foster.
- No permitir que providers comerciales accedan por defecto.

## Compatibilidad con mascotas existentes

- Las mascotas ya publicadas pueden aparecer en landing si su listing esta publicado y su Familia Protectora tiene perfil publico aprobado/publicado.
- Las mascotas sin fotos o ficha incompleta deben mostrar un estado de calidad y no deberian entrar en landing masiva hasta completar minimos definidos.

## Brechas tecnicas

- Falta lead publico no autenticado.
- Falta invitacion con token hacia app owner.
- Falta deep link contextual.
- Falta atribucion de conversion.
- Falta pagina publica agregada por fundacion si `/protectoras/[slug]` no existe aun.
- Falta tablero especifico de solicitudes publicas separadas de solicitudes formales.

## Slice 2 implementado sin migracion

La landing publica MVP de fundacion usa exclusivamente entidades existentes:

- `protective_household_public_profiles` para identidad publica, slug, logo, mision, historia, contacto, redes, necesidades y apoyo declarado.
- `pet_adoption_listings` para mascotas publicadas y compartibles.
- `pet_adoption_listing_media` para imagen principal de cada mascota.

No se agrega campo de portada institucional en Slice 2. Si se requiere imagen hero dedicada, debe evaluarse un campo futuro en `protective_household_public_profiles`, por ejemplo `cover_storage_bucket` y `cover_storage_path`, con bucket privado y lectura publica solo cuando el perfil este aprobado/publicado.

No se agrega tabla de `protective_needs` en Slice 2. La seccion de necesidades usa `needsSummary` si existe y se omite si no hay contenido.
