# Payments

## Estado actual

`documented_on_hold`

El proyecto esta en modo `payment-ready`:

- existen metodos de pago guardados (`payment_methods`)
- los bookings pueden referenciar un metodo guardado
- el pricing de la reserva se congela en `booking_pricing`
- no existe captura real de pago
- no existen refunds, chargebacks, conciliacion ni payouts

## Alcance actual implementado

### Owner

- Puede guardar un metodo de pago referencial.
- Puede seleccionar un metodo guardado o `Sin tarjeta` al preparar una reserva.
- Puede ver el metodo resumido en preview/detalle.

### Booking

- `preview_booking` valida el metodo si se adjunta.
- `create_booking` y `create_booking_from_slot` guardan la referencia opcional.
- No se crea transaccion financiera.

### Provider

- No gestiona cobros ni liquidaciones.
- Solo ve datos transaccionales de reserva y estado operativo.

### Admin

- No tiene consola de pagos reales.

## Fuera de alcance actual

- captura real
- autorizacion de pago
- webhooks del proveedor de pago
- refunds
- chargebacks
- conciliacion
- payouts/liquidaciones a proveedores
- dashboard financiero
- datos bancarios de proveedores

## Frontera funcional

Mientras el sistema siga en `payment-ready`, ningun copy de UI debe prometer cobro real.

La UI puede decir:

- `Metodo guardado`
- `Referencia de pago`
- `No se realizara ningun cobro en este MVP`

La UI no debe decir:

- `Pago completado`
- `Cobro procesado`
- `Dinero recibido`
- `Liquidacion pendiente`

## Payments MVP+

El diseno inicial vive en:

- `docs/payments/PAYMENTS_MVP_PLUS_DESIGN.md`
- `docs/payments/PAYMENTS_DECISION_RECORD.md`

Payments MVP+ debe abrirse como frente separado, con proveedor de pago validado, modelo financiero, RLS, webhooks y estrategia de captura antes de tocar codigo.

## Decision Payments-0.1

- Piloto controlado: mantener cobro fuera de app.
- Payments MVP+: Wompi Panama queda como candidato principal para evaluacion, sujeto a confirmacion comercial y pruebas sandbox. No es una decision irreversible.
- Stripe no queda como opcion default para merchant Panama local porque Panama no aparece en la disponibilidad global revisada.
- Politica objetivo: captura inmediata para servicios `instant`; preautorizacion y captura al aprobar para servicios `approval_required`, si el proveedor confirma viabilidad.

## Reglas de seguridad

- No guardar PAN completo.
- No guardar CVV.
- No exponer secret keys en mobile.
- Usar tokenizacion/checkout seguro del proveedor seleccionado.
- Mutaciones financieras deben pasar por backend seguro.
- Eventos de webhook deben ser idempotentes.

## Siguiente paso recomendado

Payments-0/0.1 queda documentalmente cerrado. Para abrir Payments-1:

1. validar cuenta comercio/sandbox Wompi Panama o proveedor alterno
2. confirmar pais/merchant/moneda
3. confirmar captura inmediata vs autorizacion/captura diferida
4. aprobar modelo `payments` / `payment_events` / `payment_refunds`
5. abrir Payments-1 con migracion y RLS solo despues de esas decisiones
