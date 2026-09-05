# PET ALERT Data Model

## Enfoque

El modelo mantiene separados ownership conocido y reporte comunitario. No duplica `pets` ni agrega `lost` a `pets.status`. Las coordenadas precisas, contactos y evidencias permanecen en tablas protegidas; las consultas publicas usan RPCs que devuelven DTOs sanitizados.

## Entidades

### `pet_alert_lost_pets`

- `id uuid` PK
- `pet_id uuid` FK `pets`
- `household_id uuid` FK `households`
- `created_by uuid` FK auth user/profile
- `status text`
- `alert_slug text unique`
- `last_seen_at timestamptz`
- `last_seen_city`, `last_seen_region`, `last_seen_country`
- `last_seen_reference`, `last_seen_notes`
- `last_seen_lat`, `last_seen_lng` privados
- `location_precision text`
- `public_description`, `distinctive_marks`, `behavior_notes`
- `medical_public_notes`
- `contact_mode text`
- contactos opcionales privados y flags de consentimiento
- `share_enabled boolean`
- `published_at`, `found_at`, `closed_at`, `expires_at`
- `close_reason`
- `created_at`, `updated_at`

Constraint parcial: una fila con estado operativo (`active`, `sighting_received`, `possible_match`, `flagged`) por `pet_id`.

### `pet_alert_lost_pet_sightings`

- `id uuid` PK
- `alert_id uuid` FK con borrado restringido
- `reporter_user_id uuid` nullable
- nombre/contacto privados y consentimiento
- `sighted_at`, zona y referencia
- coordenadas privadas opcionales y precision
- `notes`, `status`
- `created_at`, `updated_at`

Estados: `new`, `reviewed`, `possible_lead`, `discarded`, `flagged`.

### `pet_alert_community_sightings`

- `id uuid` PK
- `report_slug text unique`
- `reporter_user_id uuid` nullable
- `reporter_manage_token_hash text` nullable para gestion anonima
- identidad/contacto privados y consentimiento
- `anonymous boolean`
- `status text`
- especie, tamano, color, raza aparente, sexo aparente
- collar, senas, comportamiento y situacion
- fecha/hora, zona, ciudad/region/pais
- coordenadas privadas opcionales y precision
- `share_enabled`, `published_at`, `closed_at`, `expires_at`
- `created_at`, `updated_at`

### `pet_alert_community_claims`

- `id uuid` PK
- `community_sighting_id uuid` FK
- `claimant_user_id uuid` FK
- `status text`
- `claimed_pet_id uuid` nullable, validado contra acceso del claimant
- nombre alegado, evidencia, senas privadas, fecha/zona
- consentimiento de contacto
- `reviewed_by`, `reviewed_at`, `decision_reason`
- `created_at`, `updated_at`

Slice 5 materializa esta entidad con snapshots privados del reclamante y del reportante. El snapshot del reportante solo se completa al aprobar y solo se devuelve al reclamante aprobado mediante RPC. Indices parciales impiden mas de un claim activo por usuario/reporte y mas de un claim aprobado por reporte.

### `pet_alert_community_claim_history`

- `id uuid` PK
- `claim_id uuid` FK con borrado restringido
- `old_status`, `new_status`
- `changed_by_user_id`
- `reason`, `created_at`

Registra creacion, revision y cancelacion mediante RPCs; los clientes no escriben directamente.

Un usuario no puede mantener mas de un claim operativo por reporte.

### `pet_alert_status_history`

- `id uuid` PK
- FKs nullable a alerta owner, reporte comunitario o claim
- check: exactamente un objetivo
- `old_status`, `new_status`, `changed_by`, `reason`
- `created_at`

Solo se inserta mediante mutaciones controladas.

### `pet_alert_media`

- `id uuid` PK
- FKs nullable a alerta, avistamiento, reporte o claim
- check: exactamente un objetivo
- `storage_bucket`, `storage_path`, `media_type`, `visibility`
- `created_by`, `created_at`

No guarda URLs firmadas persistentes. Bucket privado propuesto: `pet-alert-media`.

### `pet_alert_moderation_cases`

Objetivo tipado, reportante autenticado, motivo, estado `open | resolved | dismissed`, snapshot del estado previo y resolucion administrativa. Una unicidad parcial evita duplicar un caso abierto del mismo usuario sobre el mismo objetivo.

### `pet_alert_moderation_history`

Registra apertura y resolucion. Los clientes no insertan directamente y solo admin consulta el historial completo.

## Indices

- slug unico y estado/publicacion para consultas publicas;
- `pet_id`, `household_id`, `created_by`;
- `alert_id + created_at` para avistamientos;
- `community_sighting_id + status` para claims;
- ciudad/pais/estado/fecha para discovery limitado;
- expiracion para mantenimiento.

## Integridad

- FKs con `restrict` en casos e historial; no borrado en cascada de evidencia.
- Checks de estados, precision, modos de contacto y coordenadas validas.
- Timestamps de cierre requeridos segun estado.
- Triggers/RPC registran historial y audit log.
- Cierre logico; no eliminacion destructiva desde clientes.

## Expiracion

El estado efectivo puede derivarse al leer mientras no exista scheduler. Un job futuro puede materializar `expired` de manera idempotente. Renovar exige confirmacion del responsable.

## Compatibilidad

- `pets.id` y `household_id` no cambian.
- QR puede enlazar a PET ALERT en un slice posterior sin alterar su validacion actual.
- No se copian documentos, vacunas, reservas, chats ni datos Foster.
### `pet_alert_community_sighting_media`

- Galeria opcional de hasta tres imagenes por reporte comunitario.
- Conserva reporte/slug, ruta privada, MIME, tamano, orden y actor creador.
- No contiene coordenadas ni cambia ownership o custodia. La posicion cero es portada.
# Proyeccion publica Slice 7B

El centro comunitario no agrega una tabla duplicada. `list_public_pet_alert_directory` compone una proyeccion de solo lectura desde `pet_alert_lost_pets` y `pet_alert_community_sightings`, limitada a contenido compartible, vigente y no pausado. Los estados se agrupan en `active` y `found` exclusivamente para presentacion publica.
# PET ALERT MAP-2

`pet_alert_lost_pets` y `pet_alert_lost_pet_sightings` conservan sus pares de
coordenadas existentes como ubicacion privada. `pet_alert_community_sightings`
agrega un par privado equivalente. Las tres entidades agregan:

- `public_latitude/public_longitude`, generadas en servidor;
- `location_accuracy_meters`, `location_source` y `location_captured_at`;
- `public_location_visible`;
- puntos PostGIS privados/publicos generados e indices GiST parciales publicos.

Los checks exigen pares completos, rangos geograficos validos, fuente conocida y
metadata de captura para ubicaciones confirmadas. Los registros anteriores usan
`legacy_text`, no se geocodifican automaticamente y no aparecen en el mapa.
