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

## Cierre de productizacion UX por rol

La fase de productizacion UX posterior al MVP funcional queda `cerrada`.

Este cierre reorganiza la experiencia existente sin cambiar backend, base de datos, migraciones ni contratos API. No abre V2/V3 y no incorpora capacidades fuera del MVP.

Estado por rol:

- owner mobile: shell por rol, Home owner, Cuenta fuera del flujo principal, Mascotas como hub y Reservas como hub transaccional
- provider: consola separada con Home provider, negocio, perfil publico, servicios, disponibilidad, documentos, estado, reservas y mensajes dentro del alcance MVP
- admin web: backoffice refinado con Home admin, cola de proveedores, cola de soporte y detalle contextual

Hardening UX no bloqueante completado:

- empty states orientados a accion
- indicadores simples derivados de datos actuales
- copy consistente con `payment-ready`
- continuidad visual entre hubs
- reduccion de copy tecnico visible para usuarios
- polish visual inicial de bajo riesgo en owner mobile y admin web

No queda hueco estructural UX dentro del alcance MVP. El frente activo es ejecutar QA visual/manual por rol usando `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`; Cuenta provider ya fue ajustada para no mostrar hogares ni tarjetas guardadas, y debe revalidarse con `QA_PROVIDER`. Despues de cerrar provider mobile completo y admin autenticado, el siguiente frente recomendado es hardening tecnico/operativo del piloto antes de mover el frente hacia pagos o capacidades nuevas.

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

Con este alcance cerrado, el estado actual es `QA/UAT final completada`.
La smoke canonica ya valida `Core`, `Households`, `Pets`, `Health`, `Reminders` y el bloque transaccional critico sobre backend real.
La smoke automatizada documentada esta en `PASS`.
El baseline localizado actual esta publicado como `v0.1.0-mvp-baseline-es.1` en `6e984eb`.
El HEAD operativo publicado de cierre de fase esta en `57767b7`.
El HEAD remoto observado antes de publicar la productizacion UX por rol esta en `65da809`.
La QA/UAT manual web esta registrada como `PASS`.
Android/mobile esta registrado como `PASS` para `AND-01`, `AND-02` y `AND-03`.
Ya no existe bloqueo activo de Android/mobile por entorno.
Piloto controlado: `aprobado`.
Pendientes restantes: `no bloqueantes`, principalmente evidencia visual/manual QA por rol y pendientes externos de entorno.
Produccion comercial sigue fuera de alcance actual.
