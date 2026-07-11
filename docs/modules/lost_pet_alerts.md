# Lost Pet Alerts / Alertas comunitarias de mascota extraviada

## Estado

`documented_on_hold`.

Este frente queda documentado como desarrollo futuro. No esta implementado en mobile, web, admin, Supabase, RLS, RPCs ni notificaciones push.

## Objetivo futuro

Permitir que un hogar reporte una mascota extraviada y active una alerta comunitaria controlada para otros usuarios de la app, priorizando privacidad, consentimiento, moderacion y alcance geografico razonable.

## Principios de producto

- No debe mezclarse con reservas, pagos, proveedores, Foster/adopcion ni marketplace comercial.
- No debe exponer direccion exacta del hogar ni ubicacion en tiempo real.
- No debe enviar alertas masivas sin consentimiento del receptor.
- Debe tener expiracion, cierre como `Encontrada` y trazabilidad.
- Debe prevenir abuso: limites de frecuencia, reportes, revision admin para alcances amplios y copy claro.
- La primera version recomendada debe ser in-app antes de activar push remoto.

## Alcance recomendado por slices

### LOST-0 Decision Record

- Definir politica de privacidad, consentimiento, alcance geografico, expiracion y abuso.
- Definir si las alertas son por ciudad, zona o radio aproximado.
- Definir si se requiere moderacion admin antes de publicar alertas amplias.

### LOST-1 In-app Alerts

- Crear alerta desde el perfil de una mascota activa.
- Estados: `draft`, `active`, `found`, `expired`, `cancelled`, `reported`.
- Mostrar alertas activas en una seccion in-app para usuarios con consentimiento.
- Cerrar alerta como `Mascota encontrada`.
- No enviar push remoto todavia.

### LOST-2 Preferences

- Preferencias por usuario para recibir alertas comunitarias.
- Opciones minimas:
  - recibir / no recibir alertas
  - ciudad o zona
  - especies de interes si aplica

### LOST-3 Remote Notifications

- Activar notificaciones push remotas solo con opt-in.
- Segmentar por ciudad/zona/radio aproximado.
- Mantener fallback in-app si el usuario rechaza permisos.

### LOST-4 Sighting Reports

- Permitir que otro usuario reporte informacion o posible avistamiento.
- Contacto controlado por mensaje interno o canal moderado.
- No exponer datos personales sin consentimiento.

## Modelo conceptual futuro

Tabla candidata `lost_pet_alerts`:

- `id uuid primary key`
- `pet_id uuid`
- `household_id uuid`
- `created_by_user_id uuid`
- `status text`
- `title text`
- `description text`
- `last_seen_at timestamptz`
- `city text`
- `state_region text`
- `country_code text`
- `approximate_location_label text`
- `latitude double precision nullable`
- `longitude double precision nullable`
- `location_precision text`
- `contact_mode text`
- `expires_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz`

Tablas candidatas diferidas:

- `lost_pet_alert_sightings`
- `lost_pet_alert_reports`
- `lost_pet_alert_notification_preferences`

## RLS esperada

- El hogar propietario puede crear y gestionar alertas de sus mascotas.
- Otros usuarios solo pueden leer alertas `active` dentro del alcance publico definido.
- Datos sensibles del hogar, direccion exacta y contacto privado no deben exponerse.
- Admin puede moderar, suspender o cerrar alertas reportadas.
- Mutaciones criticas deben ir por RPC auditables.

## UX esperada

### Owner mobile

- En ficha de mascota: CTA `Reportar extraviada`.
- Formulario compacto:
  - foto principal
  - zona aproximada
  - fecha/hora vista por ultima vez
  - descripcion
  - preferencia de contacto
  - confirmacion de privacidad
- Estado visible: `Activa`, `Encontrada`, `Expirada`, `Cancelada`.

### Usuarios receptores

- Seccion in-app `Mascotas extraviadas cerca`.
- Card con foto, nombre, especie, zona aproximada, fecha/hora y CTA `Tengo informacion`.
- Sin direccion exacta ni datos sensibles.

### Admin

- Cola de alertas reportadas o de alto alcance.
- Acciones: aprobar alcance amplio, suspender, cerrar por abuso, revisar reportes.

## Criterios de aceptacion futuros

- Una alerta no expone direccion exacta del hogar.
- Una alerta tiene expiracion automatica.
- El owner puede marcar la mascota como encontrada.
- Los receptores pueden optar por no recibir alertas.
- Push remoto no se activa sin permisos y consentimiento.
- La alerta no crea reservas, pagos, adopciones ni transferencias.

## Fuera de alcance por ahora

- Implementacion mobile/web/admin.
- Migraciones Supabase.
- Notificaciones push remotas.
- Tracking en tiempo real.
- Integracion con autoridades.
- Geocodificacion externa.
- Publicacion global sin moderacion.
