# HANDOFF.md

## Fecha de publicacion documentada
2026-04-26

## Objetivo de este handoff
Dejar una referencia corta y operativa para retomar el MVP sin depender del historial conversacional.

## Estado actual real
- rama actual: `master`
- baseline localizado publicado: `6e984eb docs(release): align QA/UAT localized baseline readiness`
- cierre documental QA/UAT publicado: `0432b7c docs(release): close MVP QA UAT for controlled pilot`
- HEAD operativo publicado actual: `57767b7 fix(mobile): define Android splash background color`
- `origin/master` publicado al cierre de fase: `57767b7`
- tag base anterior: `v0.1.0-mvp-baseline.1` apunta a `ea573cd`
- tag localizado publicado: `v0.1.0-mvp-baseline-es.1` apunta a `6e984eb896510f4d98cd0031769037edf8b7d663`
- remoto configurado: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`
- estado git esperado: arbol limpio y `master` alineado con `origin/master`
- localizacion al espanol: incorporada y publicada en el baseline localizado actual
- servicios locales: no asumir procesos vivos; levantar web/admin/mobile solo cuando se vaya a validar manualmente

## Estado actual del MVP
- el baseline funcional del MVP sigue alineado con el alcance documentado
- la localizacion al espanol ya forma parte del baseline publicado `v0.1.0-mvp-baseline-es.1`
- la localizacion no cambio schema, migraciones, endpoints ni flujos funcionales
- Supabase remoto estaba sano y sin drift despues de aplicar la migracion pendiente documentada
- `approval_required` esta operativo contra backend real
- smoke automatizada documentada en `PASS`
- `Core`, `Health` y `Reminders` quedaron en `PASS` dentro de la smoke canonica
- la QA/UAT manual web fue ejecutada por el usuario y queda registrada como `PASS`
- Android/mobile fue ejecutado manualmente y queda registrado como `PASS`
- ya no existe bloqueo activo de Android/mobile por entorno
- el release queda en estado `QA/UAT final completada`
- piloto controlado: `aprobado` sobre el baseline localizado publicado, sin abrir features nuevas
- fase actual del proyecto: `cerrada formalmente`

## Baseline y versionado
- baseline tecnico congelado previo: `v0.1.0-mvp-baseline.1` en `ea573cd`
- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1` en `6e984eb`
- rama publicada: `origin/master` en `57767b7`
- commit de cierre documental QA/UAT: `0432b7c`
- commit de fix Android splash background: `57767b7`
- no queda pendiente crear tag nuevo para este baseline

## Pruebas ya ejecutadas en PASS
Ultima corrida completa documentada despues de la localizacion:
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
- QA/UAT manual web ejecutada por el usuario -> `PASS`
- QA/UAT manual Android `AND-01` -> `PASS`
- QA/UAT manual Android `AND-02` -> `PASS`
- QA/UAT manual Android `AND-03` -> `PASS`

Notas:
- `web build` fallo una vez dentro del sandbox con `spawn EPERM`; al ejecutarlo fuera del sandbox paso correctamente.
- despues de los exports se limpiaron artefactos: `.codex-tmp`, `supabase/.temp`, `apps/mobile/dist`, `apps/web/.next`, `apps/admin/.next`.

## Pendientes reales no bloqueantes
- adjuntar o referenciar evidencia final de QA/UAT manual web y Android si se requiere para auditoria
- conservar triage de casos `importante_no_bloqueante` y `externa_entorno` fuera del bloqueo de salida
- preparar el paquete operativo del piloto controlado sin cambiar alcance funcional

## Fuera de alcance todavia
- produccion comercial general
- pagos reales, refunds, chargebacks, conciliacion y payouts
- clinic, commerce, pharmacy, finance, benefits y telecare
- dashboards avanzados, disputes, reschedule / rebook y checkout con cobro real

## Items BLOCK por entorno
- `EXT-01` iOS fisico depende de entorno Apple
- recovery deep link real depende de mail delivery, deep link y rate limits
- `next dev` y `next build` pueden fallar en sandbox con `spawn EPERM`; si ocurre, ejecutar fuera del sandbox

## Decision actual de release readiness
- baseline tecnico anterior: `congelado` en `v0.1.0-mvp-baseline.1`
- baseline localizado actual: `publicado` en `v0.1.0-mvp-baseline-es.1`
- estado smoke automatizada: `PASS`
- estado web manual: `PASS`
- estado Android/mobile: `PASS`
- bloqueo activo Android/mobile por entorno: `no`
- estado para QA/UAT final: `completada`
- estado para piloto controlado: `aprobado`
- fase actual del proyecto: `cerrada`
- produccion comercial: `fuera de alcance actual`

## Siguiente paso recomendado exacto
Preparar el paquete operativo del piloto controlado sobre el baseline localizado publicado, adjuntando o referenciando la evidencia manual ya ejecutada sin abrir features nuevas.

## Como retomar exactamente en la proxima sesion

### 1. Entrar al repo
```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
```

### 2. Revisar rama, baseline y limpieza
```powershell
git status -sb
git log -1 --pretty=format:"%h %s"
git describe --tags --always --dirty
```

Esperado:
- rama `master`
- tag `v0.1.0-mvp-baseline-es.1` publicado en `origin`
- baseline de release publicado en `6e984eb`
- HEAD operativo publicado en `57767b7` o posterior si existe un commit documental de cierre
- arbol limpio

### 3. Verificar baseline localizado publicado
```powershell
git ls-remote --heads origin
git ls-remote --tags origin
```

### 4. Levantar servicios solo si se va a validar manualmente
Web:
```powershell
corepack pnpm --filter @pet/web dev
```

Admin:
```powershell
corepack pnpm --filter @pet/admin dev
```

Mobile Android:
```powershell
corepack pnpm --filter @pet/mobile dev
```

### 5. Revalidacion rapida recomendada si se reabre el baseline
```powershell
corepack pnpm typecheck
npm run lint
npm run smoke:mvp
npm run smoke:mvp:critical
```

## Riesgos abiertos reales
- algunas cadenas tecnicas provenientes de Supabase/RPC o datos QA pueden seguir en ingles; no se tradujeron para no tocar contratos ni base de datos
- `payments` sigue en modo `payment-ready`, sin captura real
- `support_cases` sigue limitado a un caso por booking
- pendientes externos como iOS fisico, recovery real y picker fisico siguen fuera del bloqueo de piloto mientras no sean criterio de salida MVP
