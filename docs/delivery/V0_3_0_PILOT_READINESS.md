# V0.3.0 Pilot Readiness

## Identificacion del baseline

- version: `v0.3.0-booking-capacity-ops.1`
- branch: `master`
- hash: `a677f7bf8aa60b9758af13c5d578c27c7b100a00`
- tag: `v0.3.0-booking-capacity-ops.1`
- fecha de cierre: 2026-05-09
- estado de publicacion: publicado en `origin/master` y tag remoto publicado
- estado Git al cierre: working tree limpio y sincronizado con `origin/master`

## Alcance incluido

- booking por capacidad con reglas provider de disponibilidad/capacidad
- calendario de slots para owner
- seleccion de slot por servicio
- preview con slot seleccionado sin consumir cupo
- confirmacion de reserva consumiendo cupo server-side
- bloqueo de sobreventa cuando el cupo se agota
- QR check-in owner -> provider
- QR check-out owner -> provider
- evidencia documental posterior al check-out
- timeline operacional con `Documento registrado`
- visual alignment owner/provider/admin segun referencias canon

## Alcance excluido

- Payments reales, captura, refunds, payouts o conciliacion
- geolocalizacion
- report card operacional
- notas internas
- V2 comerciales no financieros no incluidos en este baseline
- clinic, commerce, pharmacy, finance, benefits y telecare

## Evidencia tecnica

- `corepack pnpm --filter @pet/types typecheck`: PASS
- `corepack pnpm --filter @pet/api-client typecheck`: PASS
- `corepack pnpm --filter @pet/mobile lint`: PASS
- `corepack pnpm --filter @pet/mobile typecheck`: PASS
- `corepack pnpm --filter @pet/mobile build`: PASS
- `corepack pnpm --filter @pet/admin lint`: PASS
- `corepack pnpm --filter @pet/admin typecheck`: PASS
- `corepack pnpm --filter @pet/admin build`: PASS
- `git diff --check HEAD~1..HEAD`: PASS
- Supabase dry-run: `npx supabase db push --dry-run --include-all --linked --yes` reporto `Remote database is up to date.`
- Admin web build: PASS
- Mobile build: PASS
- Working tree limpio al cierre del baseline tecnico.

## Evidencia funcional

Los flujos criticos fueron validados manualmente en Android para cerrar el baseline `v0.3.0-booking-capacity-ops.1`:

- flujo provider capacity validado
- flujo owner booking por slot validado
- `Generar preview` no consume cupo
- `Confirmar reserva` crea booking y consume cupo
- cupo agotado bloquea segunda reserva y muestra mensaje en espanol
- QR check-in validado
- QR check-out validado
- provider carga evidencia documental despues del check-out
- timeline refresca y muestra `Documento registrado`

## Checklist manual Android desde master

- [ ] Provider crea regla de capacidad asociada a servicio.
- [ ] Provider confirma dia, horario, capacidad y estado activo.
- [ ] Owner busca proveedor aprobado.
- [ ] Owner selecciona servicio.
- [ ] Owner ve slots disponibles.
- [ ] Owner selecciona slot.
- [ ] Owner genera preview.
- [ ] Preview no consume cupo.
- [ ] Owner confirma reserva.
- [ ] Confirmacion consume cupo.
- [ ] Cupo agotado bloquea segunda reserva con capacidad 1.
- [ ] Owner genera QR check-in.
- [ ] Provider escanea QR check-in.
- [ ] Timeline muestra check-in registrado.
- [ ] Owner genera QR check-out.
- [ ] Provider escanea QR check-out.
- [ ] Timeline muestra check-out registrado.
- [ ] Provider carga evidencia documental.
- [ ] Metadata de evidencia queda registrada.
- [ ] Timeline muestra `Documento registrado`.

## Veredicto

Baseline `v0.3.0-booking-capacity-ops.1` queda aprobado para piloto controlado.

Produccion comercial general sigue fuera de alcance. `Payments MVP+` debe abrirse despues como frente separado, solo cuando cierre la operacion piloto inicial.

## Riesgos residuales

- El producto sigue en modo `payment-ready`; no hay cobro real.
- Timezone y capacidad deben observarse durante piloto, especialmente en slots cercanos al cambio de dia local.
- La concurrencia del ultimo cupo esta mitigada server-side, pero debe observarse con datos reales de piloto.
- Stashes historicos siguen intactos y no deben mezclarse sin revision.
- Evidencia documental usa compatibilidad legacy `file_url = storage_path` cuando el esquema remoto aun exige `file_url not null`; no se expone URL publica arbitraria.
- El piloto debe monitorearse con usuarios controlados y registro de incidencias.

## Proximos pasos

- Preparar paquete operativo del piloto.
- Definir actores piloto.
- Definir monitoreo y soporte.
- Registrar incidencias.
- No abrir Payments hasta cerrar operacion piloto `v0.3.0`.
