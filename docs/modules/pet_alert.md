# Modulo PET ALERT

## Estado

`slice_5_controlled_claims_applied_remote`

PET ALERT esta documentado como frente independiente para mascotas perdidas/vistas. Slice 1A de tablas, RLS, tipos y API owner esta aplicado remoto. Slice 2 agrega en mobile owner el recorrido guiado `Mi mascota se perdio`. Slice 3 agrega ficha publica web sanitizada y formulario de avistamiento protegido por sesion. Slice 4 esta aplicado remoto para reportes comunitarios autenticados. Slice 5 esta aplicado remoto para reclamo autenticado y contacto controlado. Notificaciones remotas todavia no existen.

## Alcance aprobado para diseno

- Flujo owner desde una mascota registrada.
- Flujo comunitario desde una observacion.
- Avistamientos, claims controlados, historial y moderacion.
- Paginas publicas compartibles con proyecciones seguras.

## Fuera de alcance inicial

- push masivo o por proximidad;
- tracking y ubicacion continua;
- mapa de calor o matching automatico;
- pagos/recompensas;
- declaracion de abandono;
- transferencia de mascota/custodia;
- mezcla con Foster/adopcion.

## Documentos relacionados

- `docs/product/PET_ALERT.md`
- `docs/ux/PET_ALERT_UX.md`
- `docs/data/PET_ALERT_DATA_MODEL.md`
- `docs/api/PET_ALERT_API_CONTRACT.md`
- `docs/release/PET_ALERT_RISKS.md`

## Slice 2 mobile owner

- Entrada contextual desde la ficha de una mascota owner activa.
- Cuatro pasos: ultimo avistamiento, zona aproximada, descripcion publica y vista previa.
- Contacto interno por defecto, sin GPS, mapa ni direccion exacta.
- Guardado de borrador y publicacion por 30 dias mediante las RPC existentes.
- Estado activo con compartir texto seguro, refrescar avistamientos y marcar encontrada.
- No aparece en hogares protectores ni mascotas `in_memory`.

## Slice 5 reclamo y contacto controlado

- Una persona autenticada puede indicar que reconoce una mascota de un reporte comunitario.
- El claim exige una sena privada, consentimiento de contacto y aplica rate limit server-side.
- Solo existe una solicitud activa por usuario/reporte y una aprobada por reporte.
- El autor del reporte revisa en mobile y decide aprobar o rechazar.
- El contacto del reportante solo se proyecta al reclamante despues de aprobar.
- No cambia ownership, no transfiere custodia y no mezcla PET ALERT con Foster.

## Proximo slice

QA integral de Slices 1A-5 y definicion de moderacion administrativa antes de abrir fotos comunitarias, escritura anonima o notificaciones push.

## Slice 3 ficha publica

- `/pet-alert/mascota-perdida/[slug]` muestra exclusivamente el DTO publico sanitizado.
- La ficha expone foto publica controlada, descripcion, zona aproximada, fecha, senas, comportamiento y nota medica explicitamente publica.
- Nunca muestra `household_id`, coordenadas, direccion, contacto privado ni expediente.
- `/pet-alert/mascota-perdida/[slug]/avistamiento` exige sesion autenticada antes del envio.
- El contacto del reportante solo se comparte si marca consentimiento explicito.
- El owner comparte desde mobile el enlace real de la ficha publica.

## Slice 4 reporte comunitario

- Nueva entidad separada `pet_alert_community_sightings`; no crea `pets`, hogares, adopciones ni transferencias.
- Solo usuarios autenticados publican y pueden cerrar sus reportes; el backend limita a tres altas por hora.
- Mobile owner ofrece `Vi una mascota perdida` desde Inicio, con reporte manual sin GPS, mapa ni direccion exacta.
- `/pet-alert` lista DTOs sanitizados; `/pet-alert/reportar-mascota-vista` crea con sesion y `/pet-alert/mascota-vista/[slug]` muestra la ficha compartible.
- La primera version no carga fotos ni expone identidad/contacto del reportante. Escritura anonima, claims y moderacion avanzada quedan diferidos.
