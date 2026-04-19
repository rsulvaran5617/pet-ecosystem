# apps/admin

Backoffice Next.js del MVP.

## Responsabilidad

- autenticacion de usuario con rol `admin`
- aprobacion y rechazo de proveedores
- triage basico de soporte

## Estado actual

Ya no es shell tecnico. Este workspace opera sobre Supabase real y cubre el alcance administrativo minimo prometido por el MVP.

## Reglas

- no duplicar reglas de negocio del backend
- toda mutacion critica debe quedar trazada
- toda accion debe respetar el rol global `admin`
