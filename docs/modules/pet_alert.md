# Modulo PET ALERT

## Estado

`slice_2_mobile_owner_implemented`

PET ALERT esta documentado como frente independiente para mascotas perdidas/vistas. Slice 1A de tablas, RLS, tipos y API owner esta aplicado remoto. Slice 2 agrega en mobile owner el recorrido guiado `Mi mascota se perdio`: borrador, vista previa, publicacion, estado activo, consulta de avistamientos y cierre como encontrada. Paginas publicas y notificaciones remotas todavia no existen.

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

## Proximo slice

Slice 3: ficha publica de alerta y formulario protegido para reportar avistamientos. No habilitar insercion anonima sin rate limiting, captcha y moderacion.
