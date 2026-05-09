# HANDOFF.md

## Fecha de publicacion documentada

2026-04-29

## Objetivo de este handoff

Dejar una referencia operativa para retomar el piloto sin depender del historial conversacional.

## Estado actual real

- rama actual: `master`
- remoto: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`
- HEAD publicado antes de este handoff: `cfc70b7 chore(qa): prepare pilot visual checklist`
- baseline tecnico previo: `v0.1.0-mvp-baseline.1` en `ea573cd`
- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1` en `6e984eb`
- cierre UX productizada: `b20799a chore(ux): close role-based productization handoff`
- QA/UAT final: `completada`
- piloto controlado: `aprobado`
- fase UX por rol: `cerrada`
- fase actual: `hardening tecnico/operativo del piloto cerrado`
- working tree al iniciar este handoff: cambios locales de Cuenta provider y checklist visual

## Que ya quedo cerrado

- shell owner mobile + Home owner
- Cuenta owner separada del flujo principal
- Mascotas como hub contextual
- Reservas como hub transaccional con chat, review y soporte subordinados
- consola provider mobile-first
- backoffice admin web-only refinado
- hardening UX no bloqueante
- polish visual inicial
- checklist visual del piloto iniciado

## Actualizacion V2 provider operations

- Rama de trabajo: `feature/v2-booking-operations-clean`
- La migracion remota de booking operations V2 ya fue aplicada al Supabase remoto.
- Slice A mobile provider check-in queda implementado y validado manualmente en Android: desde una reserva confirmada del proveedor aparece `Registrar check-in`, se ejecuta correctamente y el timeline pasa a mostrar `Llegada / Check-in registrado` con fecha/hora.
- Slice B mobile provider check-out queda implementado y validado manualmente en Android: desde una reserva confirmada con check-in registrado aparece `Registrar check-out`, se ejecuta correctamente y el timeline pasa a mostrar `Salida / Check-out registrado`; el estado operacional avanza a `Evidencia requerida`.
- Decision QR-0: el flujo principal futuro para check-in/check-out sera QR temporal mostrado por owner/familia y escaneado por provider; los botones manuales quedan fallback piloto.
- QR-2 owner mobile display queda implementado y validado manualmente en Android: el owner genera QR temporal de check-in/check-out desde una reserva confirmada.
- QR-3 provider scanner queda implementado y validado manualmente en Android: el provider escanea el QR operacional del owner, consume el token via RPC y el timeline registra check-in/check-out sin crash de camara ni error RLS.
- Los cambios locales exploratorios de Slice C evidencia fueron pausados en stash antes del rediseño QR.
- Fuera de estos slices quedan evidencia, report card e internal notes.

## Actualizacion V2 Booking Capacity

- Rama de trabajo documental: `feature/v2-booking-capacity`
- Baseline de partida: `v0.2.0-booking-qr-ops.1`
- CAP-0 abre diseno documental para slots/franjas con capacidad.
- Evidencia documental/actividad queda pausada y preservada en stash; no se mezcla con capacity.
- Modelo actual diagnosticado: `provider_availability` semanal por organizacion sin capacidad; `preview_booking`/`create_booking` eligen el proximo bloque activo.
- Modelo recomendado: hibrido, con reglas recurrentes por servicio, excepciones puntuales por fecha, proyeccion de slots por RPC y creacion transaccional de booking desde slot.
- Principio de seguridad: owner no modifica capacidad; provider administra solo sus organizaciones; backend valida cupo final y evita sobreventa.
- QR operations no cambia: sigue despues de que la reserva existe y no participa en seleccion de cupo.
- CAP-1 backend quedo aplicado y publicado en `feature/v2-booking-capacity`: tablas `provider_availability_rules` / `provider_availability_exceptions`, columnas de slot en `bookings`, RPC `get_service_booking_slots` y RPC transaccional `create_booking_from_slot`.
- CAP-2 provider UI queda implementado en mobile: la consola provider muestra `Horarios y capacidad`, permite crear/editar reglas por servicio con dia, horario, capacidad y estado activo/inactivo.
- CAP-3 owner UI queda implementado localmente: owner selecciona fecha/slot con `react-native-calendars` como capa visual, tarjetas propias de cupo y `create_booking_from_slot` como unica mutacion final cuando hay slot elegido.
- El flujo legacy de preview/create booking se conserva como fallback piloto cuando no hay slots publicados.

## Ajustes QA visual de Cuenta provider


Durante la revision visual con `QA_PROVIDER` se detectaron dos elementos fuera de contexto en modo provider:

- `Crear un hogar`, que pertenece al modo propietario
- tarjetas guardadas / metodos de pago, que pertenecen al flujo owner `payment-ready`
- tarea de onboarding `Agregar metodo de pago`, que tambien pertenece al flujo owner `payment-ready`
- tarjeta informativa `Pagos reales fuera del MVP`, util para QA pero demasiado tecnica dentro de Cuenta provider

Estado aplicado:

- Cuenta provider ya no muestra gestion de hogares
- Cuenta provider ya no muestra formulario ni listado de tarjetas guardadas
- Cuenta provider ya no muestra la tarea owner-only `Agregar metodo de pago` dentro de onboarding
- Cuenta provider ya no muestra la tarjeta informativa de pagos; el alcance `payment-ready` queda en documentacion QA
- Cuenta provider conserva perfil, preferencias, direcciones y cambio de rol
- Cuenta owner conserva hogares, metodos guardados y la tarea `Agregar metodo de pago`
- Campos mobile de fecha/hora/vencimiento recibieron placeholders y ayudas breves (`AAAA-MM-DD`, `HH:mm`, `MM`, `AAAA`) sin cambiar formatos ni contratos
- Header owner queda mas limpio: se retiraron chips tecnicos de progreso, rol y `sin cobro real` del encabezado superior
- Inicio owner queda mas limpio: se retiraron chips de cuenta, rol y metodos guardados del bloque principal
- Mascotas owner ahora usa navegacion interna por vistas (`lista`, `crear`, `editar`, `detalle`) para evitar una superficie plana de formulario/lista/detalle
- Buscar owner ahora usa navegacion interna por vistas (`inicio`, `resultados`, `proveedor`, `seleccion`) y elimina el bloque tecnico `Navegacion`
- Reservas owner ahora usa navegacion interna por vistas (`historial`, `servicio`, `mascota`, `metodo`, `preview`, `detalle`) para separar preparacion, preview, historial y detalle; las tarjetas del historial evitan el texto comprimido/vertical
- Mensajes owner ahora usa navegacion interna por vistas (`bandeja`, `conversacion`): el tab abre bandeja de hilos por reserva y `Detalle de reserva > Chat` abre la conversacion contextual
- QA visual owner mobile fue revisada con `QA_OWNER` y queda en `PASS`
- QA visual provider mobile fue revisada con `QA_PROVIDER` y queda en `PASS`
- QA visual admin web autenticado fue revisada con `QA_ADMIN` y queda en `PASS`

No se tocaron backend, base de datos, APIs, contratos ni migraciones.

## Validaciones en PASS

Validaciones historicas del baseline:

- `corepack pnpm typecheck` -> `PASS`
- `npm run lint` -> `PASS`
- `corepack pnpm --filter @pet/web build` -> `PASS`
- `corepack pnpm --filter @pet/admin build` -> `PASS`
- `npx expo export --platform android` -> `PASS`
- `npx expo export --platform ios` -> `PASS`
- `npm run smoke:mvp` -> `PASS`
- `npm run smoke:mvp:admin` -> `PASS`
- `npm run smoke:mvp:providers` -> `PASS`
- `npm run smoke:mvp:critical` -> `PASS`
- QA/UAT manual web -> `PASS`
- Android manual `AND-01`, `AND-02`, `AND-03` -> `PASS`

Validaciones ejecutadas despues de los ajustes QA visual de Cuenta provider:

- `corepack pnpm --filter @pet/mobile lint` -> `PASS`
- `corepack pnpm --filter @pet/mobile typecheck` -> `PASS`
- `corepack pnpm --filter @pet/mobile build` -> `PASS`
- `git diff --check` -> `PASS`

Validaciones ejecutadas durante hardening tecnico/operativo:

- `corepack pnpm lint` -> `PASS`
- `corepack pnpm typecheck` -> `PASS`
- `corepack pnpm --filter @pet/web build` -> `PASS`
- `corepack pnpm --filter @pet/admin build` -> `PASS`
- `corepack pnpm --filter @pet/mobile build` -> `PASS`
- `git diff --check` -> `PASS` sin errores; solo avisos LF -> CRLF del entorno Windows
- `corepack pnpm smoke:mvp` -> `PASS`
- `corepack pnpm smoke:mvp:critical` -> `PASS`
- `corepack pnpm smoke:mvp:admin` -> `PASS`
- `corepack pnpm smoke:mvp:providers` -> `PASS`
- `corepack pnpm smoke:mvp:health` -> `PASS`
- `corepack pnpm smoke:mvp:reminders` -> `PASS`

## Pendientes reales

- preparar evidencia visual final si se requiere paquete auditable

## BLOCK por entorno

- `EXT-01` iOS fisico depende de entorno Apple
- recovery deep link real depende de mail delivery, deep link y rate limits
- Android dev-client puede requerir `adb reverse tcp:8081 tcp:8081` despues de reiniciar app o Metro
- `next dev` / `next build` pueden fallar en sandbox con `spawn EPERM`; si ocurre, ejecutar fuera del sandbox
- no hay bloqueo activo Android/mobile registrado para el piloto actual

## Siguiente frente recomendado

Hardening tecnico/operativo cerrado con notas. El siguiente frente elegible es `Payments MVP+` si se decide abrir nuevo alcance funcional.

Payments MVP+ cambia alcance funcional y debe abrirse como frente separado, actualizando documentacion de alcance antes de implementar.

## Cómo retomar exactamente en la próxima sesión

### Rama actual

- `master`
- remoto: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`

### Referencias de commit/tag

- baseline tecnico: `v0.1.0-mvp-baseline.1` -> `ea573cd`
- baseline localizado MVP: `v0.1.0-mvp-baseline-es.1` -> `6e984eb`
- cierre UX productizada: `b20799a`
- checklist visual piloto: `cfc70b7`
- HEAD de continuidad: tomar `git log -1 --oneline --decorate` como referencia principal despues de publicar este handoff

### Comandos para levantar

Web:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/web dev
```

Admin:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/admin dev
```

Mobile:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
npx expo start --dev-client --port 8081
```

Android:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
```

### Documentos que deben leerse primero

1. `docs/HANDOFF.md`
2. `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`
3. `docs/delivery/PILOT_OPERATIONS_HARDENING.md`
4. `docs/ux/ROLE_BASED_SCREEN_ARCHITECTURE.md`
5. `docs/delivery/MVP_SCOPE.md`
6. `docs/product/MODULE_STATUS.md`
7. `docs/delivery/PILOT_QA_UAT_MATRIX.md`

### Siguiente paso correcto

Siguiente paso recomendado:

- decidir si se congela este estado con commit/tag de cierre operativo
- preparar paquete de evidencia auditable si el piloto lo requiere
- evaluar apertura formal de `Payments MVP+` como nuevo alcance funcional

No abrir V2/V3 ni pagos reales sin actualizar alcance, modelo de datos, API y reglas operativas.

### Prompt exacto recomendado para continuar

```text
Quiero continuar despues del cierre de QA visual/manual por rol, abriendo hardening tecnico/operativo del piloto.

Contexto:
- La productizacion UX por rol ya esta cerrada.
- El hardening UX no bloqueante y el polish visual inicial ya estan aplicados.
- Owner mobile quedo en PASS con QA_OWNER.
- Provider mobile quedo en PASS con QA_PROVIDER.
- Admin web autenticado quedo en PASS con QA_ADMIN.
- No quiero abrir nuevas features.
- No quiero tocar backend, DB, APIs ni migraciones.
- No quiero abrir V2/V3.

Objetivo:
revisar estado operativo del piloto, validar scripts/builds/runbooks necesarios y preparar evidencia final si se requiere paquete auditable.

Antes de tocar codigo:
1. revisa docs/HANDOFF.md
2. revisa docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md
3. revisa git status, branch, ultimos commits y tags
4. enumera riesgos operativos por severidad

Durante el trabajo:
- solo aplicar ajustes visuales menores si son de bajo riesgo
- conservar copy en espanol
- no cambiar logica de negocio ni contratos

Al final:
1. correr lint/typecheck/build donde aplique
2. actualizar `docs/delivery/PILOT_OPERATIONS_HARDENING.md`
3. resumir evidencia tecnica/operativa pendiente o capturada
4. recomendar si el siguiente frente puede ser Payments MVP+ o si falta cerrar smoke/evidencia
```
