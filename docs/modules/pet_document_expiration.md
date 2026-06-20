# Pet Document Expiration

## Objetivo

Controlar la vigencia de documentos del expediente de mascota sin convertirlo todavia en pasaporte, adopcion, pagos ni automatizaciones clinicas avanzadas.

## Alcance del slice

- agregar metadata de vigencia en `pet_documents`:
  - `has_expiration`
  - `issued_at`
  - `expires_at`
  - `expiration_warning_days`
- permitir cargar documentos con o sin vencimiento.
- permitir editar la vigencia despues de cargar el documento.
- mostrar estados visuales: `Sin vencimiento`, `Fecha pendiente`, `Vigente`, `Por vencer` y `Vencido`.
- mostrar alertas de atencion documental dentro del expediente de la mascota en mobile y web owner.

## Fuera de alcance

- recordatorios automaticos derivados de documentos.
- notificaciones push.
- pasaporte oficial o certificados oficiales.
- adopcion/foster.
- pagos.
- booking, QR y evidencia operacional.
- revision admin de documentos de mascota.

## Reglas funcionales

- los documentos siguen perteneciendo a una mascota y heredan permisos del hogar.
- un miembro con permiso `view` puede consultar documentos y su estado de vigencia.
- un miembro con permiso `edit` o `admin` puede cargar documentos y editar metadata de vigencia.
- si `has_expiration = true`, `expires_at` es obligatorio en UI/API.
- `expiration_warning_days` solo acepta `7`, `15`, `30`, `60` o `90`.
- `expires_at` no puede ser anterior a `issued_at`.
- el calculo de estado usa fechas de calendario, no horas, para evitar ruido por zona horaria.
- la vigencia documental no cambia reglas de reserva ni bloquea automaticamente mascotas.

## Modelo

Tabla existente:

- `pet_documents`

Campos agregados:

- `has_expiration boolean not null default false`
- `issued_at date null`
- `expires_at date null`
- `expiration_warning_days integer not null default 30`

Indice:

- `pet_documents_expires_at_idx` sobre `expires_at` cuando `has_expiration = true`.

## UX

- Mobile owner y web owner muestran un bloque `Documentos que requieren atencion` dentro del expediente de la mascota.
- Cada documento muestra chip de vigencia y texto de ayuda cuando falta fecha, esta por vencer o esta vencido.
- La edicion de vigencia usa el mismo formulario de documentos y no requiere volver a cargar el archivo.
