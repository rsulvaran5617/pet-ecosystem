# PILOT_QA_UAT_CRITICAL_RUNBOOK.md

## Objetivo
Ejecutar la parte `critica_salida` de `docs/delivery/PILOT_QA_UAT_MATRIX.md` como corrida controlada de QA/UAT antes de declarar piloto controlado.

## Alcance
- solo casos `critica_salida`
- no abre features nuevas
- no cubre pagos reales

## Estado operativo actual

| Area | Estado | Nota |
| --- | --- | --- |
| Git / baseline | `PASS` | baseline de release publicado en `6e984eb`; tag remoto `v0.1.0-mvp-baseline-es.1` apunta al mismo commit |
| Smoke automatizada | `PASS` | evidencia documentada de typecheck, lint, build/export y smoke MVP |
| `localization_es` | `PASS` | incorporada en el baseline publicado; ya no queda pendiente de commit ni tag |
| Web manual | `PASS` | validacion manual ejecutada por el usuario y reportada como funcional correctamente |
| Admin/provider critico | `PASS` | cubierto por smoke automatizada documentada y validaciones web aplicables |
| Android/mobile | `PASS` | `AND-01`, `AND-02` y `AND-03` ejecutados manualmente; ya no existe bloqueo activo de entorno |

Decision operativa actual: declarar `QA/UAT final completada` y `piloto controlado aprobado` sobre el baseline localizado publicado.

## Casos criticos incluidos

| ID | Modulo | Canal | Puede automatizar el agent hoy | Requiere UI/dispositivo real |
| --- | --- | --- | --- | --- |
| `ADM-01` | Admin / Providers | admin | si | opcional |
| `ADM-02` | Admin / Providers | admin | si | opcional |
| `ADM-04` | Admin / Support | admin | si | opcional |
| `WEB-01` | Core | web | parcial | si |
| `WEB-02` | Households | web | si | opcional |
| `WEB-03` | Pets | web | si | opcional |
| `WEB-06` | Marketplace | web | si | opcional |
| `WEB-07` | Bookings | web | si | opcional |
| `PRO-01` | Providers / Bookings | web | si | opcional |
| `WEB-08` | Messaging | web | si | opcional |
| `WEB-09` | Reviews | web | si | opcional |
| `WEB-10` | Support | web | si | opcional |
| `AND-01` | Core | Android/mobile | no | si |
| `AND-02` | Marketplace + Bookings | Android/mobile | no | si |
| `AND-03` | Messaging | Android/mobile | no | si |

## Preflight operativo
- build de referencia identificado para `web`, `admin` y `Android`
- variables de entorno validas de Supabase en `web`, `mobile` y `admin`
- actores QA disponibles: owner, member, provider y admin
- Android emulator o dispositivo usado para ejecutar `AND-01`, `AND-02` y `AND-03`
- provider pendiente con documentos o capacidad de generarlo
- capacidad de provision temporal de rol `admin` si el usuario QA admin no lo tiene persistido
- copy esperado en flujos MVP: espanol como idioma principal; registrar cualquier texto visible en ingles como hallazgo de localizacion
- para el estado actual, el preflight Android/mobile ya no esta bloqueado por entorno tecnico local

## Comando canonico para smoke automatizable
- `corepack pnpm smoke:mvp:critical`
- `corepack pnpm smoke:mvp`
- `corepack pnpm smoke:mvp:admin`
- `corepack pnpm smoke:mvp:providers`
- `corepack pnpm smoke:mvp:health`
- `corepack pnpm smoke:mvp:reminders`
- artefactos esperados por defecto en `.codex-tmp/pilot-critical`
- credenciales QA canonicas:
  - `QA_OWNER_EMAIL` / `QA_OWNER_PASSWORD`
  - `QA_MEMBER_EMAIL` / `QA_MEMBER_PASSWORD`
  - `QA_PROVIDER_EMAIL` / `QA_PROVIDER_PASSWORD`
  - `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD`

## Secuencia recomendada
1. usar `v0.1.0-mvp-baseline-es.1` como baseline publicado de referencia
2. adjuntar o referenciar evidencia de web manual `PASS`, si se requiere para auditoria
3. adjuntar o referenciar evidencia Android `AND-01`, `AND-02` y `AND-03`, si se requiere para auditoria
4. conservar pendientes no bloqueantes como follow-up operativo

## Registro minimo por caso

```md
### <CASE_ID> - <MODULO>

| Campo | Valor |
| --- | --- |
| id de caso | |
| modulo | |
| canal | |
| precondiciones | |
| pasos | |
| resultado esperado | |
| resultado obtenido | |
| estado (`pass` / `fail` / `block`) | |
| evidencia requerida | |
| observaciones | |
```

## Regla de cierre
- marcar `QA/UAT final completado` solo cuando todos los casos `critica_salida` esten en `PASS`
- marcar `piloto controlado aprobado` solo cuando ademas exista commit/tag del baseline y triage explicito de pendientes no bloqueantes
- marcar `piloto controlado no aprobado` si algun caso `critica_salida` queda en `FAIL` o `BLOCK`
- registrar Android/mobile como `PASS` en este cierre porque `AND-01`, `AND-02` y `AND-03` fueron ejecutados manualmente

## Nota de decision
No queda ningun caso `critica_salida` reportado en `fail` o `block`; el piloto controlado queda aprobado.
