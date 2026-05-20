# Payments-0.1 Decision Record

## Estado

`documented_on_hold`

## Fecha

2026-05-20

## Contexto

Pet Ecosystem esta actualmente en modo `payment-ready`.

Esto significa:

- existen metodos guardados en `payment_methods`
- `bookings.selected_payment_method_id` puede referenciar un metodo guardado
- `booking_pricing` congela el precio de la reserva
- preview/create booking validan el metodo si se adjunta
- no hay captura real de dinero
- no hay webhooks financieros
- no hay refunds
- no hay conciliacion
- no hay payouts a proveedores

El mercado inicial definido es Panama.

Este record no implementa pagos; solo deja una decision documental para avanzar con Payments MVP+ en una fase posterior.

El resultado de Payments-0/0.1 es:

- MVP actual sin pagos reales.
- Metodos de pago guardados solo como referencia visual/operativa.
- Piloto controlado con cobro fuera de app.
- Wompi Panama como candidato principal, no como decision irreversible.
- Sin captura, autorizacion, refund, conciliacion ni payout implementados.

## Requisitos minimos para pagos reales

Un proveedor de pago viable para Pet Ecosystem debe cubrir:

- tokenizacion segura de tarjeta
- soporte de tarjetas locales/internacionales para Panama
- soporte de moneda inicial `USD`
- creacion de transacciones desde backend seguro
- webhooks/eventos para estados asincronos
- consulta de estado de transaccion
- refunds o void/cancelacion segun el flujo
- trazabilidad por referencia de booking
- ambiente sandbox
- documentacion publica suficiente
- separacion entre llave publica y llave privada
- opcion de autorizacion/captura o preautorizacion/captura si se mantiene aprobacion provider

## Fuentes revisadas

- Stripe Global Availability: `https://stripe.com/global`
- Wompi Panama Quick Start: `https://docs.wompi.co/en/docs/panama/inicio-rapido/`
- Wompi Panama Payment Methods: `https://docs.wompi.co/en/docs/panama/metodos-de-pago/`
- Wompi Panama Payment Sources & Tokenization: `https://docs.wompi.co/en/docs/panama/fuentes-de-pago/`
- Wompi Panama Events: `https://docs.wompi.co/en/docs/panama/eventos/`
- Wompi Panama Preauthorization & Capture: `https://docs.wompi.co/en/docs/panama/preauth-capture/`
- MyPay / 3Tech Panama: `https://www.3techpanama.com/productos/mypay.html`
- Exirom Developer Docs: `https://developers.exirom.com/`

## Alternativas evaluadas

### A. Mantener cobro fuera de app durante piloto

Descripcion:

- La app sigue gestionando reserva, QR, evidencia y seguimiento.
- El pago real ocurre por fuera de la app: transferencia, efectivo, Yappy, POS del proveedor u otro mecanismo manual.
- La app no registra captura financiera real.
- Se puede registrar manualmente en la bitacora del piloto que el pago fue realizado fuera de app, pero sin convertirlo en estado financiero del sistema.

Ventajas:

- Menor riesgo operativo.
- No requiere migraciones.
- No requiere certificacion ni llaves de proveedor.
- No expone al piloto a fallos de pagos reales.
- Permite validar demanda, operacion y soporte primero.

Desventajas:

- No valida checkout real.
- No valida conciliacion.
- No automatiza refunds.
- Puede crear friccion manual.

### B. Wompi Panama

Descripcion:

Proveedor regional con documentacion especifica para Panama.

Capacidades relevantes documentadas:

- API REST.
- Sandbox/Production.
- tarjetas credito/debito Visa/Mastercard.
- metodo Clave para Panama.
- tokenizacion de tarjetas.
- payment sources para cargos posteriores.
- eventos/webhooks `transaction.updated`.
- estados finales de transaccion: `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`.
- preautorizacion y captura.

Ventajas:

- Encaja con mercado inicial Panama.
- Soporta moneda `USD` en ejemplos de Panama.
- Tiene documentacion directa para tokenizacion, eventos y preauth/capture.
- Reduce incertidumbre frente a Stripe para merchant panameno.
- Permite un diseno compatible con reservas `approval_required`.

Desventajas:

- Requiere cuenta comercio Wompi Panama.
- Requiere revisar contrato, fees, onboarding, limites y tiempos de liquidacion.
- Requiere confirmar detalles operativos de refunds/voids para el caso de uso exacto.
- Requiere implementar backend seguro y webhook idempotente.

### C. Gateway local/regional empresarial

Ejemplos revisados:

- MyPay / 3Tech Panama
- Exirom u otro procesador regional con API, webhooks, 3DS y tokenizacion

Ventajas:

- Puede tener mejor encaje bancario/local.
- Puede ofrecer conciliacion y soporte empresarial.
- Puede integrar multiples adquirentes.

Desventajas:

- Mas negociacion comercial.
- Mas dependencia de soporte proveedor.
- Puede ser mas pesado para MVP+.
- Puede requerir certificacion o setup mas largo.

### D. Stripe

Descripcion:

Proveedor internacional con excelente experiencia developer.

Observacion para Panama:

- En la pagina oficial de disponibilidad global, Panama no aparece en la lista de paises/regiones soportados para abrir una cuenta Stripe local.
- Stripe menciona alternativas como registrar interes o Stripe Atlas para empresas fuera de paises soportados.

Ventajas:

- Payment Intents, Setup Intents, webhooks, refunds y tooling maduros.
- Muy buena documentacion.
- Buen camino futuro si existe entidad compatible en pais soportado.

Desventajas:

- No es opcion directa para merchant panameno local segun disponibilidad oficial revisada.
- Usar Atlas/entidad extranjera introduce complejidad legal, fiscal y bancaria.
- No recomendado como primera opcion para piloto Panama sin decision empresarial previa.

### E. PayPal

Descripcion:

Proveedor internacional reconocido.

Ventajas:

- Marca conocida.
- Checkout hospedado posible.

Desventajas:

- Debe confirmarse soporte real de merchant, retiro de fondos, restricciones y experiencia local en Panama.
- Menos alineado con tarjetas locales/Clave.
- Puede complicar soporte y conciliacion para servicios locales.

## Tabla comparativa

| Alternativa | Fit Panama | Tokenizacion | Webhooks | Preauth/capture | Refunds/voids | Complejidad | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cobro fuera de app piloto | Alto | No aplica | No aplica | No aplica | Manual | Baja | Usar en piloto controlado |
| Wompi Panama | Alto | Si | Si | Si | Confirmar detalle operativo | Media | Candidato principal MVP+ |
| Gateway local/regional | Medio/Alto | Depende proveedor | Depende proveedor | Depende proveedor | Depende proveedor | Media/Alta | Evaluar si Wompi no cubre contrato |
| Stripe | Bajo para merchant Panama local | Si | Si | Si | Si | Alta por disponibilidad | No usar como default Panama |
| PayPal | Medio/Bajo | Parcial segun producto | Si | Limitado/depende flujo | Si | Media | Alternativa secundaria |

## Modelos de cobro evaluados

### Pago inmediato

El owner paga al confirmar la reserva.

Ventajas:

- Mas simple de entender.
- Menos estados financieros.
- Reduce reservas falsas.
- Encaja bien con servicios `instant`.

Desventajas:

- Para servicios `approval_required`, si el provider rechaza, se requiere void/refund.
- Puede causar friccion si el owner paga antes de saber si el provider acepta.

### Autorizacion y captura al aprobar

El owner autoriza fondos al solicitar. El provider aprueba. El sistema captura al aprobar.

Ventajas:

- Mejor para servicios que requieren aprobacion.
- Evita cobrar definitivamente si el provider rechaza.
- Encaja con booking `pending_approval`.

Desventajas:

- Requiere preauth/capture robusto.
- Requiere manejar expiracion de autorizacion.
- Requiere UX mas clara.
- Aumenta dependencia de estados asincronos y webhooks.

### Cobro fuera de app para piloto

El pago se maneja manualmente fuera de la app.

Ventajas:

- Cero riesgo financiero tecnico en la primera prueba.
- Permite validar operacion antes de dinero real en app.
- Evita mezclar soporte de piloto con soporte financiero.

Desventajas:

- No prueba Payments MVP+.
- No automatiza conciliacion.

## Decision recomendada para piloto controlado

Mantener `cobro fuera de app` durante el piloto controlado.

Motivo:

- El piloto busca validar owner/provider/admin, reservas por capacidad, QR, evidencia, marketplace y soporte.
- Introducir dinero real agrega riesgo financiero, legal y de soporte.
- El sistema ya esta productizado para operar reservas sin cobro real.
- El piloto debe generar evidencia operativa antes de abrir responsabilidad financiera.

Condicion:

- El copy del piloto debe seguir diciendo que no hay cobro real en la app.
- Si un proveedor cobra por fuera, debe registrarse fuera del sistema como acuerdo operativo de piloto.

## Decision recomendada para Payments MVP+

Usar Wompi Panama como candidato principal para evaluacion Payments MVP+, sujeto a confirmacion comercial y sandbox. Esta decision no es irreversible: puede cambiar si contrato, sandbox, soporte operativo, refunds, tiempos de autorizacion o liquidacion no cubren el caso de uso.

Politica inicial recomendada:

- Servicios `instant`: captura inmediata al confirmar reserva.
- Servicios `approval_required`: preautorizacion al crear solicitud; captura al aprobar; void/cancelacion si se rechaza o expira.

Si la preautorizacion no resulta viable por contrato, expiracion o UX, usar una politica alternativa:

- servicios `approval_required` no cobran hasta que el provider aprueba;
- luego el owner debe completar pago antes de confirmar definitivamente;
- esto reduce riesgo financiero pero agrega un paso adicional.

## Decision de arquitectura

Payments MVP+ debe implementarse backend-first.

Reglas:

- No guardar PAN ni CVV.
- No exponer llaves privadas en mobile/admin/web.
- Crear pagos desde backend seguro.
- Procesar webhooks con idempotencia.
- Usar `booking_id` y referencia unica en metadata del proveedor.
- No cambiar cupos por preview.
- No confirmar booking financiero hasta que el estado de pago sea compatible con la politica.

## Decisiones pendientes

Antes de Payments-1:

1. Confirmar cuenta comercio Wompi Panama.
2. Confirmar fees, liquidacion, refunds/voids y soporte de Clave.
3. Confirmar si el negocio operara como marketplace cobrando en nombre propio o solo como orquestador.
4. Confirmar si habra comision de plataforma desde MVP+ o se difiere.
5. Confirmar politica fiscal/recibos.
6. Confirmar tiempos maximos de autorizacion para `approval_required`.
7. Confirmar si se permitira `Sin tarjeta` cuando el servicio requiera pago real.

## Riesgos

- Riesgo PCI si se implementa captura de tarjeta incorrectamente.
- Riesgo de estados inconsistentes si webhook falla.
- Riesgo de sobreventa si payment flow intenta reservar cupo antes de booking transaccional.
- Riesgo de soporte si se cobra y el provider no aprueba.
- Riesgo de expiracion de autorizacion.
- Riesgo de conciliacion si se mezclan pagos fuera de app y dentro de app.
- Riesgo legal/fiscal si se cobra como marketplace sin definir responsabilidad.

## Proximos slices sugeridos

### Payments-0.2 Sandbox/comercial readiness

- Crear checklist para activar cuenta Wompi Panama.
- Confirmar credenciales sandbox.
- Confirmar contrato, fees, refunds y liquidacion.
- No tocar codigo funcional.

### Payments-1 Data model/RLS

- Crear migracion `payments`, `payment_events`, `payment_refunds`.
- Agregar tipos compartidos.
- Agregar RLS y politicas.
- Dry-run antes de remoto.

### Payments-2 Backend payment adapter

- Crear adapter server-side para Wompi.
- Crear webhook idempotente.
- No tocar UI aun.

### Payments-3 Owner payment method real

- Sustituir captura manual referencial por tokenizacion segura.
- Guardar payment source/reference.

### Payments-4 Booking checkout real

- Integrar pago con confirmacion de reserva.
- Mantener booking capacity y QR intactos.

### Payments-5 Admin payments console

- Mostrar pagos, eventos, fallos y refunds.

## Veredicto

- Piloto controlado: continuar sin pagos reales dentro de la app.
- Payments MVP+: Wompi Panama es el candidato principal.
- Stripe no es default para Panama local.
- Payment flow recomendado: captura inmediata para `instant`; preautorizacion/captura para `approval_required`, si sandbox y contrato lo confirman.
