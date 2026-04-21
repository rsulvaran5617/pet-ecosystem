# HANDOFF.md

## Fecha de publicacion documentada
2026-04-20

## Objetivo de este handoff
Dejar una referencia corta y operativa para retomar el MVP sin depender del historial conversacional.

## Estado actual real
- rama actual: `master`
- baseline de release publicado: `6e984eb docs(release): align QA/UAT localized baseline readiness`
- `origin/master` publicado al cierre del baseline: `6e984eb`
- tag base anterior: `v0.1.0-mvp-baseline.1` apunta a `ea573cd`
- tag localizado publicado: `v0.1.0-mvp-baseline-es.1` apunta a `6e984eb896510f4d98cd0031769037edf8b7d663`
- remoto configurado: `origin` -> `https://github.com/rsulvaran5617/pet-ecosystem.git`
- estado git esperado tras este ajuste documental: arbol limpio; la rama local puede quedar ahead hasta publicar este commit documental
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
- Android/mobile queda en `BLOCK` por entorno tecnico local, no como `FAIL` funcional
- el release sigue en estado `listo para QA/UAT final / cierre de evidencias`
- piloto controlado: `no aprobado todavia` mientras Android/mobile siga en `BLOCK` o falte cerrar evidencia critica aplicable

## Baseline y versionado
- baseline tecnico congelado previo: `v0.1.0-mvp-baseline.1` en `ea573cd`
- baseline localizado publicado: `v0.1.0-mvp-baseline-es.1` en `6e984eb`
- rama publicada: `origin/master` en `6e984eb`
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

Notas:
- `web build` fallo una vez dentro del sandbox con `spawn EPERM`; al ejecutarlo fuera del sandbox paso correctamente.
- despues de los exports se limpiaron artefactos: `.codex-tmp`, `supabase/.temp`, `apps/mobile/dist`, `apps/web/.next`, `apps/admin/.next`.

## Pendientes reales
- resolver o cambiar de entorno para Android/mobile y ejecutar `AND-01`, `AND-02` y `AND-03`
- registrar evidencia final de QA/UAT manual web ya pasada, si se requiere adjuntar capturas o videos al expediente
- registrar o completar cualquier evidencia manual admin requerida por la matriz antes de declarar piloto controlado
- triagear casos `importante_no_bloqueante` y `externa_entorno` si se incluyen en esta ronda

## Items BLOCK por entorno
- `AND-*` requiere Android emulator o dispositivo real funcional; el bloqueo actual es tecnico/local, no funcional
- `EXT-01` iOS fisico depende de entorno Apple
- recovery deep link real depende de mail delivery, deep link y rate limits
- `next dev` y `next build` pueden fallar en sandbox con `spawn EPERM`; si ocurre, ejecutar fuera del sandbox

## Decision actual de release readiness
- baseline tecnico anterior: `congelado` en `v0.1.0-mvp-baseline.1`
- baseline localizado actual: `publicado` en `v0.1.0-mvp-baseline-es.1`
- estado smoke automatizada: `PASS`
- estado web manual: `PASS`
- estado Android/mobile: `BLOCK por entorno`
- estado para QA/UAT final: `listo para cierre de evidencias y validacion Android cuando el entorno este disponible`
- estado para piloto controlado: `no aprobado todavia`
- produccion comercial: `fuera de alcance actual`

## Siguiente paso recomendado exacto
Cerrar el frente Android/mobile resolviendo el entorno tecnico y ejecutando `AND-01`, `AND-02` y `AND-03` sin abrir features nuevas. En paralelo, adjuntar o referenciar evidencia web/admin ya ejecutada si se requiere para auditoria.

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

### 5. Revalidacion rapida recomendada antes de cerrar QA/UAT
```powershell
corepack pnpm typecheck
npm run lint
npm run smoke:mvp
npm run smoke:mvp:critical
```

## Riesgos abiertos reales
- Android/mobile sigue bloqueado por entorno tecnico local
- algunas cadenas tecnicas provenientes de Supabase/RPC o datos QA pueden seguir en ingles; no se tradujeron para no tocar contratos ni base de datos
- `payments` sigue en modo `payment-ready`, sin captura real
- `support_cases` sigue limitado a un caso por booking
- el piloto controlado sigue bloqueado hasta que la matriz critica aplicable quede en `PASS`
