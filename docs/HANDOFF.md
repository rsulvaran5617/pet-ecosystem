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
- fase actual: `QA visual/manual por rol en ejecucion`
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

## Ajustes QA visual de Cuenta provider

Durante la revision visual con `QA_PROVIDER` se detectaron dos elementos fuera de contexto en modo provider:

- `Crear un hogar`, que pertenece al modo propietario
- tarjetas guardadas / metodos de pago, que pertenecen al flujo owner `payment-ready`

Estado aplicado:

- Cuenta provider ya no muestra gestion de hogares
- Cuenta provider ya no muestra formulario ni listado de tarjetas guardadas
- Cuenta provider conserva perfil, preferencias, direcciones y cambio de rol
- Cuenta provider muestra un aviso de alcance: pagos reales, payouts, liquidaciones y facturacion provider siguen fuera del MVP
- Cuenta owner conserva hogares y metodos guardados

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

## Pendientes reales

- revalidar Cuenta provider con `QA_PROVIDER`
- continuar recorrido provider mobile completo: Home, Negocio, Servicios, Horarios, Reservas, Mensajes y Estado
- ejecutar admin web con usuario admin autenticado
- preparar evidencia visual final si se requiere paquete auditable

## BLOCK por entorno

- `EXT-01` iOS fisico depende de entorno Apple
- recovery deep link real depende de mail delivery, deep link y rate limits
- Android dev-client puede requerir `adb reverse tcp:8081 tcp:8081` despues de reiniciar app o Metro
- `next dev` / `next build` pueden fallar en sandbox con `spawn EPERM`; si ocurre, ejecutar fuera del sandbox
- no hay bloqueo activo Android/mobile registrado para el piloto actual

## Siguiente frente recomendado

Completar QA visual/manual por rol. Si no aparecen huecos estructurales, abrir `hardening tecnico/operativo del piloto` antes de `Payments MVP+`.

Payments MVP+ cambia alcance funcional; no debe abrirse antes de cerrar evidencia visual/manual y estabilidad operativa del piloto.

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
3. `docs/ux/ROLE_BASED_SCREEN_ARCHITECTURE.md`
4. `docs/delivery/MVP_SCOPE.md`
5. `docs/product/MODULE_STATUS.md`
6. `docs/delivery/PILOT_QA_UAT_MATRIX.md`

### Siguiente paso correcto

Revalidar QA visual de Cuenta provider y continuar QA manual por rol:

- provider mobile: confirmar que Cuenta no muestra `Crear un hogar` ni tarjetas guardadas, y que mantiene roles/cambio de modo
- provider mobile: continuar Home, Negocio, Servicios, Horarios, Reservas, Mensajes y Estado
- admin web: Home admin, Proveedores, Soporte con usuario admin autenticado

No abrir Payments MVP+, hardening tecnico profundo ni V2/V3 hasta cerrar esa evidencia visual/manual.

### Prompt exacto recomendado para continuar

```text
Quiero continuar la QA visual/manual por rol sobre la UX productizada, empezando por revalidar Cuenta provider.

Contexto:
- La productizacion UX por rol ya esta cerrada.
- El hardening UX no bloqueante y el polish visual inicial ya estan aplicados.
- Cuenta provider fue ajustada para no mostrar gestion de hogares ni tarjetas guardadas.
- No quiero abrir nuevas features.
- No quiero tocar backend, DB, APIs ni migraciones.
- No quiero abrir V2/V3.

Objetivo:
levantar mobile/admin, revalidar Cuenta provider con QA_PROVIDER y continuar evidencia/manual QA lista para piloto controlado.

Antes de tocar codigo:
1. revisa docs/HANDOFF.md
2. revisa docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md
3. revisa git status, branch, ultimos commits y tags
4. levanta mobile con `npx expo start --dev-client --port 8081` y `adb reverse tcp:8081 tcp:8081`
5. enumera hallazgos visuales por severidad

Durante el trabajo:
- solo aplicar ajustes visuales menores si son de bajo riesgo
- conservar copy en espanol
- no cambiar logica de negocio ni contratos

Al final:
1. correr lint/typecheck/build donde aplique
2. actualizar `docs/delivery/PILOT_VISUAL_QA_CHECKLIST.md`
3. resumir evidencia visual pendiente o capturada
4. recomendar si el siguiente frente es Payments MVP+ o hardening tecnico/operativo
```
