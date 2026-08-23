# Modulo PET ALERT

## Estado

`designed_not_implemented`

PET ALERT esta documentado como frente independiente para mascotas perdidas/vistas. No existen todavia tablas, RPCs, UI, paginas publicas ni notificaciones remotas de este modulo.

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

## Proximo slice

PET ALERT Slice 1A: modelo, RLS, tipos y API base del flujo "Mi mascota se perdio", sin UI y con dry-run remoto solamente.
