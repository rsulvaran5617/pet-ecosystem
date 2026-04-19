# MVP_SCOPE.md

## Objetivo del MVP

Cerrar una primera version funcional del ecosistema pet que permita operar el flujo duenio -> provider -> admin sin abrir V2/V3.

## Entra en este MVP

### Para duenios

- registro, login, verificacion y recovery
- perfil, preferencias, direcciones y metodos guardados
- households y permisos basicos
- pets, documentos y salud base
- reminders y calendario basico
- discovery de marketplace
- preview y creacion de bookings
- bookings `instant` y `approval_required`
- referencia opcional a `payment_methods` guardados
- chat ligado a booking
- review basica sobre booking `completed`
- soporte basico ligado a booking

### Para providers

- crear organizacion
- editar perfil de negocio
- mantener perfil publico
- configurar servicios y disponibilidad
- subir documentos de aprobacion
- consultar estado de aprobacion
- recibir reservas de su organizacion
- aprobar o rechazar bookings `pending_approval`
- marcar bookings `confirmed` como `completed`

### Para plataforma

- listar proveedores pendientes
- abrir detalle y aprobar o rechazar proveedor
- listar soporte, abrir detalle y actualizar estado o resolucion
- registrar trazabilidad minima en `audit_logs`

## Decision activa de pagos

Este cierre queda en modo `payment-ready`:

- `payment_methods` existe y puede referenciarse desde `bookings`
- no hay captura real de pago
- no hay refunds, chargebacks ni conciliacion

## Fuera de alcance

- clinic
- commerce
- pharmacy
- finance
- benefits
- telecare
- payouts
- ingresos basicos del provider
- dashboard admin avanzado
- dashboard provider avanzado
- disputes
- reschedule / rebook
- checkout con cobro real

## Criterio de salida

### Owner

1. crea cuenta
2. crea hogar
3. registra mascota
4. carga al menos un documento o registro de salud
5. descubre proveedor en marketplace
6. selecciona servicio
7. crea booking
8. chatea
9. el booking llega a `completed`
10. deja review
11. puede abrir soporte

### Provider

1. crea organizacion
2. configura perfil, servicios y disponibilidad
3. sube documentos
4. admin aprueba
5. recibe booking
6. aprueba o rechaza si el servicio es `approval_required`
7. completa el servicio cuando corresponda

### Admin

1. revisa proveedores pendientes
2. aprueba o rechaza
3. atiende soporte basico
4. conserva trazabilidad minima

## Estado recomendado de release

Con este alcance cerrado, la meta inmediata es `listo para QA/UAT`.
La smoke canonica ya valida `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre backend real.
No debe declararse `piloto controlado` hasta completar validaciones funcionales finales y baseline reproducible.
