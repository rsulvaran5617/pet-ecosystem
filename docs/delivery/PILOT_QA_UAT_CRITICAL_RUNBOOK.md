# PILOT_QA_UAT_CRITICAL_RUNBOOK.md

## Objetivo
Ejecutar la parte `critica_salida` de `docs/delivery/PILOT_QA_UAT_MATRIX.md` como corrida controlada de QA/UAT antes de declarar piloto controlado.

## Alcance
- solo casos `critica_salida`
- no abre features nuevas
- no cubre pagos reales

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
- Android emulator o dispositivo disponible para `AND-*`
- provider pendiente con documentos o capacidad de generarlo
- capacidad de provision temporal de rol `admin` si el usuario QA admin no lo tiene persistido
- copy esperado en flujos MVP: espanol como idioma principal; registrar cualquier texto visible en ingles como hallazgo de localizacion

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
1. `ADM-01`
2. `ADM-02`
3. `WEB-01`
4. `WEB-02`
5. `WEB-03`
6. `WEB-06`
7. `WEB-07`
8. `PRO-01`
9. `WEB-08`
10. `WEB-09`
11. `WEB-10`
12. `ADM-04`
13. `AND-01`
14. `AND-02`
15. `AND-03`

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

## Nota de decision
No declarar `piloto controlado` mientras algun caso `critica_salida` permanezca en `fail` o `block`.
