# Modulo PET ALERT

## Estado

`slice_1a_local_not_applied`

PET ALERT esta documentado como frente independiente para mascotas perdidas/vistas. Slice 1A prepara localmente tablas, RLS, tipos y API del flujo owner. No se ha aplicado remoto y todavia no existen UI, paginas publicas ni notificaciones remotas.

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

Auditar y aplicar de forma controlada PET ALERT Slice 1A. Despues corresponde Slice 2: UI mobile owner para "Mi mascota se perdio".
