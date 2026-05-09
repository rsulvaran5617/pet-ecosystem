# VISUAL_STYLE_GUIDE.md

## Estado

Fase: `visual_alignment_reference_canon`

Esta guia deriva el sistema visual minimo desde las referencias en `docs/ux/reference/`. Las imagenes son canon visual para esta fase. La implementacion debe preservar la funcionalidad existente y no cambiar backend, Supabase, RLS, RPCs, pagos, permisos ni reglas de negocio.

## Referencias canon

- `owner-home-reference.png`
- `pets-hub-reference.png`
- `marketplace-reference.png`
- `booking-detail-reference.png`
- `scheduller_and_capacity_for_booking.png`
- `provider-schedule-reference.png`
- `admin-dashboard-reference.png`
- `aprov-providers_dashboard.png`
- `support-case_admin.png`

## Paleta

- Fondo principal mobile: `#fbfaf7`, con tono calido suave.
- Fondo alterno / legacy compatible: `#f7f2e7`.
- Cards: `#ffffff` o `rgba(255,255,255,0.94)`.
- Texto principal: `#101828`.
- Texto secundario: `#5f6675`.
- Lineas/bordes: `rgba(16,24,40,0.1)`.
- Accion primaria owner/provider: teal `#00978f`.
- Accion primaria hover/pressed: `#00847d`.
- Teal suave: `#e6f7f5`.
- Exito: `#16a36a` / `#dcfce7`.
- Advertencia/cupo bajo: `#f97316` / `#ffedd5`.
- Error/lleno/rechazo: `#ef4444` / `#fee2e2`.
- Morado servicio/mensajes: `#7c3aed` / `#ede9fe`.
- Azul informativo: `#2563eb` / `#dbeafe`.
- Admin sidebar: azul noche `#06264b` / `#071f3d`.
- Admin accion: teal oscuro `#008a97`.

## Jerarquia tipografica

- H1 mobile: 30-34 px, peso 800, linea compacta.
- H2/seccion: 22-26 px, peso 750/800.
- Card title: 17-20 px, peso 700.
- Body: 14-16 px, linea 20-24 px.
- Metadata/chips: 11-13 px, peso 700.
- Admin H1: 28-32 px, peso 800.
- Admin tabla: 13-14 px, filas densas pero respiradas.

## Radios y spacing

- Cards mobile: 18-22 px.
- Secciones destacadas: 24-28 px.
- Inputs: 14-16 px.
- Botones: pill `999px`.
- Chips: pill `999px`.
- Padding card mobile: 14-18 px.
- Padding seccion mobile: 18-22 px.
- Gap base: 10-14 px.
- Admin cards: 16-18 px.
- Admin sidebar items: 12-14 px.

## Sombras

- Mobile card: sombra suave, vertical, baja opacidad.
- Mobile card elevada: `shadowOpacity` aprox. `0.08`, `shadowRadius` 22.
- Admin card: `0 14px 40px rgba(15,23,42,0.08)`.
- Evitar sombras duras y bordes negros.

## Navegacion

- Owner mobile: bottom nav blanca, borde superior sutil, icono/label compacto, activo teal.
- Provider mobile: bottom nav equivalente con secciones propias; activo teal.
- Admin web: sidebar azul noche, logo/brand visible arriba, items con activo teal.

## Cards y tablas admin

- Admin usa layout denso, escaneable, con sidebar fijo.
- Cards metricas blancas con icon tile circular y badge de estado.
- Tablas con bordes suaves, filas separadas, fila seleccionada con teal muy claro.
- Detalle lateral en card blanca persistente.
- Botones admin primarios teal, secundarios outline, peligro outline rojo.

## Criterio visual

- Mantener UI clara, profesional, mobile-first.
- No introducir landing pages ni copy explicativo innecesario.
- Las pantallas deben parecer parte del mismo producto aunque owner, provider y admin tengan distintas densidades.
