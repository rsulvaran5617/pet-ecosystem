# Foster Household Type Impact Report

Fecha: 2026-06-29

## Objetivo

Preparar el slice Foster-Household-B para separar hogares `owner` y `protective` sin borrar datos, duplicar mascotas ni romper de forma silenciosa los flujos Foster/Adoption existentes.

## Diagnostico remoto agregado

Consulta ejecutada con `npx supabase db query --linked` usando solo conteos agregados.

| Metrica | Resultado |
| --- | ---: |
| Total de households | 117 |
| Households con protective profile | 1 |
| Protective profiles aprobados | 1 |
| Protective profiles pending_review | 0 |
| Protective profiles draft | 0 |
| Protective profiles rejected | 0 |
| Protective profiles suspended | 0 |
| Households con adoption listings | 1 |
| Adoption listings totales | 2 |
| Households con transferencias Foster como emisor | 0 |
| Transferencias Foster totales | 0 |
| Pets asociadas a households con protective profile | 5 |
| Households con protective profile y bookings | 1 |
| Households con protective profile, pets y bookings | 1 |

## Candidato detectado

| Household ref | Nombre | Perfil protector | Pets | Listings | Transfers | Bookings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `a535cebe` | HOGAR SULVARAN VELASCO | approved | 5 | 2 | 0 | 43 |

## Interpretacion

- Existe un unico hogar con perfil protector aprobado.
- Ese hogar ya tiene publicaciones Foster activas/historicas.
- Ese mismo hogar tambien tiene historial de reservas.
- Por lo tanto, convertir automaticamente todos los hogares con perfil protector a `protective` es tecnicamente posible, pero debe aprobarse de forma explicita porque mezcla datos owner y Foster en el mismo hogar historico.

## Riesgos de migracion automatica

- El hogar candidato podria contener mascotas propias y mascotas en acogida en la misma lista.
- Al exigir `household_type = protective`, las funciones Foster quedarian correctamente restringidas, pero el hogar podria dejar de comportarse como owner familiar si la UX futura separa estrictamente ambos contextos.
- Si se aplica la migracion sin backfill, las funciones Foster quedarian bloqueadas para el hogar candidato hasta marcarlo como `protective`.
- Si se aplica backfill automatico, se formaliza que ese hogar es protector, aunque tenga historial owner.

## Decision del producto

No aplicar backfill automatico en este slice.

Decision confirmada por producto:

- `HOGAR SULVARAN VELASCO` debe permanecer como hogar familiar `owner`.
- No debe convertirse automaticamente en familia protectora/acogida.
- Las capacidades Foster futuras deben operar desde un hogar `protective` separado.

Siguiente paso antes de aplicar remoto:

1. Crear o seleccionar un household separado para actuar como familia protectora.
2. Si el household se crea desde la app actualizada, debe nacer como `protective`; si ya existe, marcarlo como `protective` mediante backfill asistido y auditado.
3. Mantener `HOGAR SULVARAN VELASCO` como `owner`.

Ejemplo de backfill solo para un household protector separado:

```sql
update public.households
set household_type = 'protective',
    updated_at = now()
where id = '<HOUSEHOLD_ID_PROTECTOR_APROBADO>';
```

No ejecutar este update sobre `HOGAR SULVARAN VELASCO`.

## Estado de este slice

- La migracion propuesta agrega `household_type` con default `owner`.
- La migracion refuerza helpers/RLS/RPC Foster para exigir `household_type = protective`.
- La migracion redefine `create_household` con `next_household_type` opcional para permitir crear familias protectoras separadas sin convertir hogares existentes.
- Owner mobile distingue `Hogar familiar` y `Familia protectora`; la solicitud protectora no se muestra como accion valida sobre un hogar `owner`.
- La migracion no convierte datos existentes automaticamente.
- Resultado esperado del dry-run: debe mostrar esta migracion y cualquier otra pendiente previa, como Foster-3B si aun no fue aplicada remoto.
- Riesgo aceptado: al aplicar esta migracion sin hogar protector separado, las funciones Foster quedan bloqueadas para `HOGAR SULVARAN VELASCO` hasta que exista un household `protective` aprobado.
