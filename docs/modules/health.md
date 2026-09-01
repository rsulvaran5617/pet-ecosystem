# health.md

## Objetivo del modulo
Gestionar la salud base de la mascota dentro del alcance MVP.

## Alcance MVP
- dashboard de salud simple por mascota
- vacunas:
  - listar
  - registrar
  - editar
  - adjuntar sticker o soporte documental reutilizando documentos de mascota
- alergias:
  - listar
  - registrar
  - editar
- condiciones:
  - listar
  - registrar
  - editar
- visualizacion de salud basica dentro del perfil resumen de mascota

## Fuera de MVP
- medicacion
- laboratorios
- imagenes clinicas
- incidentes
- edicion clinica por terceros; el acceso temporal de solo lectura se entrega como slice controlado posterior al MVP base

## Entidades
- pet_vaccines
- pet_allergies
- pet_conditions

## Dependencias
- core
- households
- pets

## Reglas
- la salud pertenece a la mascota
- el acceso respeta permisos derivados del hogar y de la mascota
- listar requiere acceso de lectura a la mascota
- registrar o editar requiere permisos derivados de `edit` o `admin` en el hogar
- las condiciones criticas deben resaltarse en el dashboard simple
- el resumen de vacunas no debe marcar `Al dia` solo por existir registros: usa `next_due_on` para mostrar `Al dia`, `Por vencer`, `Vencida`, `Revisar` o `Sin registro`
- la vigencia documental de mascota pertenece al expediente documental y puede coexistir con cartillas/certificados cargados en `pet_documents`; no altera el calculo clinico de vacunas
- el sticker o foto de vacuna se guarda como documento de mascota tipo `vaccination_record`; Salud lo muestra como evidencia asociada a la vacuna sin crear una tabla clinica nueva
- owner mobile Salud permite consultar el sticker asociado desde la vacuna con accion de ojo y editar su vigencia documental con accion de calendario; estas acciones operan sobre `pet_documents` y no modifican `administered_on` ni `next_due_on`
- owner mobile Salud valida antes de guardar que `next_due_on` no sea anterior a `administered_on`, mostrando un mensaje humano y evitando exponer errores tecnicos de constraints al usuario.
- web owner presenta salud con selector compacto de hogares, carrusel superior de mascotas y ficha inferior por mascota con resumen, vacunas, alergias y condiciones en tarjetas compactas; los formularios de alta/edicion se abren bajo demanda desde acciones `+` o desde `Editar`
- `Clinical Access-1` permite al owner generar desde mobile un enlace QR de solo lectura por 1 hora, 1 dia o 1 semana; la consulta ocurre exclusivamente en web y puede revocarse antes del vencimiento
- la vista temporal incluye identidad basica, vacunas, alergias, condiciones y metadata documental; nunca expone archivos, rutas de Storage, datos del hogar ni acciones de escritura
- cada creacion, consulta, vencimiento y revocacion queda auditable; el token aleatorio solo se entrega al owner al crearlo y en base de datos se conserva unicamente su hash
- este slice no acredita identidad veterinaria ni permite incorporar datos clinicos; esas capacidades requieren un frente posterior de profesionales verificados y consentimiento por accion
- `Clinical Access-2B` agrega identidad profesional autenticada y verificacion manual de plataforma, pero conserva el expediente completo en modo de solo lectura
- `Clinical Access-2E` agrega en Salud el `Historial profesional` read-only para owner Mobile/Web. Las vacunas profesionales permanecen como entradas de origen en este timeline; no se duplican automaticamente en `pet_vaccines`.

## API conceptual
- GET `/pets/{id}/health`
- GET `/pets/{id}/vaccines`
- POST `/pets/{id}/vaccines`
- PATCH `/pets/{id}/vaccines/{vaccineId}`
- GET `/pets/{id}/allergies`
- POST `/pets/{id}/allergies`
- PATCH `/pets/{id}/allergies/{allergyId}`
- GET `/pets/{id}/conditions`
- POST `/pets/{id}/conditions`
- PATCH `/pets/{id}/conditions/{conditionId}`
