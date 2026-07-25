# UX-FOSTER-FLOWS - Onboarding progresivo para Familias Protectoras

## Estado

Documento de diseno UX/arquitectura de navegacion. UX-FOSTER-1A queda implementado en mobile como intencion guiada de registro sin cambios Supabase, migraciones, RLS ni contratos API.

Este documento prepara la separacion de experiencia entre:

- hogar owner normal: mascotas propias, salud, documentos, recordatorios, marketplace de servicios y reservas.
- familia protectora: custodia/acogida temporal, publicaciones de adopcion, solicitudes y transferencia privada.

## Resumen ejecutivo

El modelo tecnico Foster ya esta avanzado: existen hogares `owner` y `protective`, perfiles protectores, perfil publico moderado, publicaciones con galeria, solicitudes, pipeline y transferencia privada. El principal problema actual es de experiencia: una familia protectora puede sentirse como un owner normal que descubre funciones escondidas dentro de Hogares o Mascotas.

La recomendacion es mantener Foster como capacidad del `household`, no como rol global duro, pero presentar la experiencia como una intencion clara desde el registro y onboarding: `Rescatar o dar mascotas en adopcion`. Esa intencion debe guiar al usuario a crear una `Familia protectora` separada (`household_type = protective`) y luego avanzar por un tren de pasos.

Principio central:

> A nivel UX, el usuario elige "Soy familia protectora / rescatista"; a nivel datos, se crea y opera un household `protective` aprobado por admin.

## Diagnostico del flujo actual

### Lo que ya existe

- `households.household_type = owner | protective`.
- `protective_household_profiles` para revision interna/admin de familias protectoras.
- `protective_household_public_profiles` para perfil publico moderado.
- `pet_adoption_listings` para publicaciones moderadas de mascotas en adopcion.
- `pet_adoption_listing_media` para galeria privada/moderada de hasta 8 fotos.
- `pet_adoption_applications` para solicitudes estructuradas.
- `pet_adoption_application_status_history` para historial de estados.
- `pet_transfer_records` y `pet_custody_contexts` para transferencia privada con consentimiento.
- Mobile owner muestra `Mascotas que buscan hogar` como pantalla separada de Buscar.
- Web `/foster` funciona como consola separada para familias protectoras.
- Admin revisa familias protectoras, perfiles publicos, publicaciones, fotos y solicitudes.

### Flujo actual funcional

1. El usuario crea cuenta.
2. El usuario crea o selecciona un hogar.
3. Si necesita operar como familia protectora, debe crear un hogar tipo `protective`.
4. Completa y envia el perfil protector.
5. Admin aprueba o rechaza la familia protectora.
6. La familia protectora aprobada crea su perfil publico.
7. Admin aprueba el perfil publico.
8. La familia protectora registra una mascota bajo acogida.
9. Prepara una publicacion de adopcion.
10. Carga fotos publicas.
11. Envia la publicacion a revision.
12. Admin aprueba la publicacion y modera fotos.
13. Adoptantes ven la mascota en `Mascotas que buscan hogar` o `/adopciones/{slug}`.
14. Adoptante envia solicitud estructurada.
15. Familia protectora revisa solicitud y puede avanzar a revision, entrevista, aprobacion o rechazo.
16. Una solicitud aprobada puede iniciar transferencia privada.
17. La familia receptora acepta la transferencia.
18. Solo al aceptar la transferencia cambia `pets.household_id`, la solicitud pasa a `converted_to_transfer` y la publicacion pasa a `adopted`.

### Donde se puede confundir el usuario

- Registro: no hay una intencion inicial suficientemente clara para "familia protectora".
- Rol vs contexto: el usuario puede pensar que necesita otro rol global, cuando realmente necesita un hogar `protective`.
- Hogares: crear `Hogar familiar` y `Familia protectora` vive en el mismo modulo, pero tienen finalidades distintas.
- Mascotas: registrar una mascota propia y registrar una mascota bajo acogida usan el mismo modelo `pets`, pero no deben sentirse como la misma tarea.
- Perfil protector vs perfil publico: ambos son "perfiles", pero uno es revision interna y otro es presentacion publica.
- Publicacion aprobada vs solicitud aprobada: aprobar una publicacion solo la hace visible; aprobar una solicitud no mueve la mascota.
- Transferencia aceptada: este es el unico cierre real de adopcion.
- Web/mobile: existen capacidades en ambas superficies, pero no siempre se perciben como el mismo tren de proceso.

## Decision de arquitectura UX

Decision recomendada:

- Mantener Foster como capacidad del `household`.
- No crear un rol global nuevo como primer paso.
- Agregar una intencion visible de onboarding: `Rescatar o dar mascotas en adopcion`.
- Esa intencion debe crear o guiar a crear un household `protective`.
- El usuario puede tener hogar owner y familia protectora, pero deben operar como contextos separados.

Razon:

- El modelo actual ya protege ownership y custodia desde `household_members`.
- La aprobacion debe depender de la familia/hogar, no solo del usuario.
- Un mismo usuario puede administrar una familia protectora y tambien tener mascotas propias, sin mezclar mascotas ni historial.
- Cambiar a rol global duro ahora aumentaria riesgo de permisos, migraciones y regresiones.

## Principios UX para Familias Protectoras

1. Separar intencion desde el inicio.
   - El usuario debe poder decir "quiero rescatar o dar mascotas en adopcion" antes de entrar al flujo owner normal.

2. Un siguiente paso principal.
   - Cada estado Foster debe mostrar una accion dominante y ocultar acciones futuras hasta que sean relevantes.

3. Tren visible.
   - Usar un stepper: `Familia -> Aprobacion -> Perfil publico -> Mascota -> Publicacion -> Solicitudes -> Transferencia`.

4. Lenguaje humano.
   - Evitar `household`, `listing`, `pending_review`, `converted_to_transfer`.
   - Usar `Familia protectora`, `Publicacion`, `En revision`, `Adopcion cerrada`.

5. No mezclar adopcion con servicios comerciales.
   - Foster no usa pagos, booking, QR, capacidad, marketplace de servicios ni provider operations.

6. Privacidad y confianza.
   - Publicar solo ciudad/pais, historia segura, fotos moderadas y contacto controlado.
   - No exponer direccion exacta, documentos privados, notas internas ni datos sensibles.

## Mapa de estados Foster

| Estado | Condicion tecnica | Debe ver el usuario | CTA principal | Ocultar o posponer |
| --- | --- | --- | --- | --- |
| Sin sesion | Sin session | Opciones de acceso y eleccion de intencion | Crear cuenta | Consola Foster |
| Intencion Foster elegida | Usuario en registro/onboarding | Flujo guiado para familia protectora | Crear Familia Protectora | Mascotas propias, reservas |
| Sin familia protectora | No hay household `protective` | Estado vacio con explicacion | Crear Familia Protectora | Publicaciones, solicitudes, transferencias |
| Familia creada sin perfil interno | `household_type = protective` sin `protective_household_profiles` | Formulario corto de revision | Completar solicitud | Publicar mascotas |
| En revision interna | `protective_household_profiles.status = pending_review` | Estado de espera y que revisa admin | Actualizar estado | Crear publicaciones |
| Rechazada | `status = rejected` | Motivo y posibilidad de corregir | Corregir solicitud | Mascotas/publicaciones publicas |
| Aprobada sin perfil publico | `status = approved`, sin public profile | Explicar confianza publica | Crear perfil publico | Publicar publicamente |
| Perfil publico en revision | public profile `pending_review` | Estado de revision | Esperar revision | Discovery publico |
| Lista para operar | familia approved + public profile approved/is_public | Dashboard Foster simple | Registrar mascota bajo acogida | Setup repetitivo |
| Mascota bajo acogida sin publicacion | pet activa en hogar protective sin listing | Ficha de mascota y guia | Preparar publicacion | Solicitudes |
| Publicacion en borrador | listing `draft` | Completar contenido/fotos | Enviar a revision | Compartir publicamente |
| Publicacion en revision | listing `pending_review` | Estado de espera admin | Revisar estado | Solicitudes nuevas |
| Publicada | listing `published` | Ficha visible, compartir, solicitudes | Revisar solicitudes | Setup de familia |
| Solicitud nueva | application `submitted` | Bandeja de solicitudes | Revisar solicitud | Transferencia |
| En entrevista | application `interview` | Seguimiento del solicitante | Aprobar o rechazar | Cerrar adopcion |
| Solicitud aprobada | application `approved` sin transferencia | Aviso de custodia pendiente | Iniciar transferencia | Marcar adoptada manualmente |
| Transferencia pendiente | transfer `pending` | La familia receptora debe aceptar | Dar seguimiento | Crear otra transferencia duplicada |
| Adoptada | transfer `accepted`, listing `adopted` | Cierre de adopcion | Ver historial | Editar como publicacion activa |

## Flujo progresivo recomendado

### Registro / acceso

Opciones visibles:

- `Cuidar mis mascotas`.
- `Ofrecer servicios`.
- `Rescatar o dar mascotas en adopcion`.

Si el usuario elige Foster:

- crear cuenta igual que hoy.
- guardar la intencion en estado local/transitorio de onboarding, no necesariamente en base de datos.
- despues del login, dirigir a crear `Familia protectora`.

Copy recomendado:

- Titulo: `Familia protectora`
- Texto: `Crea un espacio separado para mascotas bajo acogida y adopciones responsables. Tus mascotas propias seguiran en tu hogar familiar.`
- CTA: `Crear Familia Protectora`

### Familia protectora nueva

Paso 1: datos basicos.

- nombre de la familia/fundacion/rescatista.
- tipo: rescatista, hogar temporal, fundacion, refugio, otro.
- ciudad/pais.

Paso 2: datos para revision.

- contacto interno.
- experiencia o notas de cuidado.
- compromiso de adopcion responsable.

Paso 3: envio.

- mensaje claro: `Nuestro equipo revisara tu solicitud antes de habilitar publicaciones.`

### Familia aprobada

Mostrar un panel simple:

- Estado: `Aprobada`.
- Siguiente paso: `Crear perfil publico`.
- Explicacion: `El perfil publico ayuda a que las familias interesadas conozcan quien cuida a las mascotas.`

### Perfil publico

Paso progresivo:

1. nombre publico.
2. mision/historia.
3. ciudad/pais.
4. politica de contacto.
5. enviar a revision admin.

### Mascotas bajo acogida

Despues de perfil publico aprobado:

- CTA principal: `Registrar mascota bajo acogida`.
- Empty state: `Cuando una mascota este bajo tu cuidado, registrala aqui para preparar su publicacion responsable.`

### Publicacion de mascota

Wizard recomendado:

1. `Mascota`: datos basicos ya existentes.
2. `Historia`: historia breve y personalidad.
3. `Salud publica`: resumen seguro, vacunas relevantes, esterilizacion si aplica.
4. `Fotos`: galeria emocional, maximo 8, portada.
5. `Revision`: enviar a admin.
6. `Visible`: ficha publicada y compartible.

### Solicitudes y transferencia

Pipeline:

1. `Nueva`.
2. `En revision`.
3. `Entrevista`.
4. `Aprobada`.
5. `Transferencia pendiente`.
6. `Adoptada`.

Regla visible:

`Aprobar una solicitud no mueve la mascota. La adopcion se cierra solo cuando la familia receptora acepta la transferencia privada.`

## Mapa de navegacion mobile

### Sin intencion Foster

Mantener bottom nav owner actual:

- Inicio
- Mascotas
- Buscar
- Reservas
- Mensajes
- Cuenta

### Con intencion Foster o hogar protective activo

Recomendacion para slices futuros:

- Inicio: estado guiado de familia protectora.
- Mascotas: `Mascotas bajo acogida`.
- Publicaciones: publicaciones/fotos/revision.
- Solicitudes: bandeja/pipeline.
- Cuenta: familia, perfil publico, invitaciones.

Si no se agrega nuevo bottom nav en el primer slice, usar un panel superior progresivo dentro de Inicio/Cuenta que lleve al flujo correcto.

Reglas:

- No mostrar `Buscar servicios` como accion principal si el usuario esta en modo Foster.
- No mostrar reservas comerciales como primera accion en familia protectora.
- Mantener `Mascotas que buscan hogar` para adoptantes, no como consola de gestion.

## Mapa de navegacion web `/foster`

Estados recomendados:

1. Sin sesion:
   - explicar que `/foster` es para familias protectoras.
   - CTA: `Iniciar sesion o crear cuenta`.

2. Sin familia protectora:
   - CTA: `Crear Familia Protectora`.
   - formulario cerrado por defecto.

3. En revision:
   - tarjeta de estado.
   - que revisara admin.
   - boton `Actualizar`.

4. Aprobada sin perfil publico:
   - CTA dominante `Crear perfil publico`.

5. Perfil publico pendiente:
   - estado claro y bloqueo suave de publicacion publica.

6. Lista para operar:
   - dashboard con siguiente accion.
   - secciones:
     - `Mascotas bajo acogida`.
     - `Publicaciones`.
     - `Solicitudes`.
     - `Transferencias`.

Regla visual:

- El bloque superior debe decir que falta ahora.
- Las secciones futuras deben quedar debajo o colapsadas hasta que existan datos.

## Diferencias entre Owner y Familia Protectora

| Tema | Owner | Familia protectora |
| --- | --- | --- |
| Finalidad | Cuidar mascotas propias | Cuidar mascotas bajo acogida y adopcion |
| Hogar | `household_type = owner` | `household_type = protective` |
| Mascotas | Propias/adoptadas | Bajo custodia temporal |
| Acciones principales | Salud, documentos, recordatorios, reservas | Perfil publico, publicar adopcion, solicitudes, transferencia |
| Marketplace | Servicios/proveedores | Adopcion responsable separada |
| Transferencia | Recibe invitaciones | Inicia transferencia privada |
| Admin | No aprueba hogar owner normal | Aprueba familia, perfil y publicaciones |

## Copy recomendado por estado

### Sin familia protectora

Titulo: `Aun no tienes una Familia Protectora`

Texto: `Crea un espacio separado para mascotas bajo acogida. Tus mascotas propias seguiran en tu hogar familiar.`

CTA: `Crear Familia Protectora`

### En revision

Titulo: `Tu Familia Protectora esta en revision`

Texto: `Revisaremos los datos basicos antes de habilitar publicaciones de adopcion.`

CTA: `Actualizar estado`

### Aprobada sin perfil publico

Titulo: `Crea tu perfil publico`

Texto: `Las familias interesadas necesitan conocer quien cuida a las mascotas antes de enviar una solicitud.`

CTA: `Crear perfil publico`

### Lista para operar

Titulo: `Ya puedes registrar mascotas bajo acogida`

Texto: `Registra una mascota, prepara su historia y agrega fotos claras antes de enviarla a revision.`

CTA: `Registrar mascota bajo acogida`

### Publicacion en revision

Titulo: `Publicacion en revision`

Texto: `Admin revisara la historia y las fotos antes de hacerla visible para familias interesadas.`

CTA: `Actualizar estado`

### Solicitud aprobada

Titulo: `Solicitud aprobada, falta transferencia`

Texto: `La mascota seguira bajo tu custodia hasta que la familia receptora acepte la transferencia privada.`

CTA: `Iniciar transferencia`

## Que ocultar hasta que sea relevante

- Publicaciones antes de que la familia protectora este aprobada.
- Solicitudes antes de tener publicaciones visibles.
- Transferencias antes de aprobar una solicitud.
- Edicion avanzada de perfil antes de crear el perfil inicial.
- Estados tecnicos (`pending_review`, `converted_to_transfer`, `household_type`).
- Datos de hogar owner cuando el usuario esta en contexto Foster.
- Marketplace comercial de servicios dentro de la consola Foster.

## CTAs por estado

| Estado | CTA primario | CTA secundario |
| --- | --- | --- |
| Sin familia protectora | Crear Familia Protectora | Abrir app general |
| Borrador de familia | Enviar a revision | Editar datos |
| En revision | Actualizar estado | Ver datos enviados |
| Rechazada | Corregir solicitud | Ver nota admin |
| Aprobada sin perfil publico | Crear perfil publico | Ver familia |
| Perfil publico borrador | Enviar perfil a revision | Editar |
| Perfil publico aprobado | Registrar mascota bajo acogida | Editar perfil |
| Sin mascotas | Registrar mascota bajo acogida | Ver guia |
| Mascota sin publicacion | Preparar publicacion | Editar mascota |
| Publicacion borrador | Enviar a revision | Agregar fotos |
| Publicacion publicada | Ver solicitudes | Compartir ficha |
| Solicitud nueva | Revisar solicitud | Rechazar con nota |
| Solicitud en entrevista | Aprobar solicitud | Rechazar |
| Solicitud aprobada | Iniciar transferencia | Ver detalle |
| Transferencia pendiente | Actualizar | Ver historial |
| Adoptada | Ver cierre | Registrar otra mascota |

## Riesgos

- Confundir intencion Foster con rol global y duplicar permisos innecesariamente.
- Mostrar acciones Foster en hogares owner normales.
- Permitir publicar desde una familia sin perfil publico aprobado, debilitando confianza.
- Ocultar demasiado y dificultar tareas avanzadas a familias con alta operacion.
- Mezclar publicaciones de adopcion con marketplace comercial de servicios.
- Romper QA de usuarios que tienen owner y protective en la misma cuenta.
- Crear estados visuales que no correspondan a RLS/RPC server-side.

## Quick wins

1. Agregar opcion visual `Rescatar o dar mascotas en adopcion` en registro/onboarding, guardada como intencion local.
2. Al elegir Foster, llevar al usuario a `Cuenta/Hogares` o `/foster` con el formulario de crear Familia Protectora abierto.
3. En mobile, mostrar un panel `Modo Familia Protectora` cuando el household activo sea `protective`.
4. En `/foster`, mostrar una sola accion primaria segun estado de familia/perfil/publicaciones.
5. Renombrar copys ambiguos:
   - `Mascotas` -> `Mascotas bajo acogida` dentro de Foster.
   - `Perfil` -> `Perfil publico`.
   - `Aprobada` -> `Solicitud aprobada, falta transferencia` cuando aplique.

## Slices de implementacion

### UX-FOSTER-1A - Intencion Foster en registro/onboarding

Estado: implementado localmente.

Objetivo:

- Permitir que un usuario nuevo elija `Rescatar o dar mascotas en adopcion`.
- Guiarlo inmediatamente a crear una `Familia Protectora`, sin cambiar el modelo de roles.

Archivos probables:

- `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`
- `apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx`
- `apps/mobile/src/features/households/hooks/useHouseholdsWorkspace.ts`
- `apps/web/src/features/foster/components/FosterConsoleWorkspace.tsx` si se replica en web.
- `docs/ux/FOSTER_PROGRESSIVE_ONBOARDING.md`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/HANDOFF.md`

Riesgo:

- Medio. Toca onboarding y puede afectar primera experiencia owner si no se mantiene el default owner.

Criterios de aceptacion:

- El registro muestra tres intenciones claras: cuidar mascotas propias, ofrecer servicios o crear una Familia Protectora.
- Elegir Foster no crea rol global nuevo; registra el rol tecnico `pet_owner` y conserva Foster como capacidad del household.
- Al completar registro/login en la misma sesion, el usuario queda guiado a crear una Familia Protectora `protective`.
- Crear hogar owner normal sigue funcionando igual y no convierte hogares familiares en protectores.
- Usuarios existentes no cambian de flujo salvo que elijan crear familia protectora.

Validaciones:

- `corepack pnpm --filter @pet/mobile lint`
- `corepack pnpm --filter @pet/mobile typecheck`
- `corepack pnpm --filter @pet/mobile build`
- `git diff --check`

### UX-FOSTER-1B - Home/estado progresivo para familia protectora mobile

Estado: implementado localmente.

Objetivo:

- Si el contexto activo es `protective`, mostrar una home Foster con siguiente paso y evitar que la familia protectora parezca un owner normal.
- La pantalla `Inicio` muestra estado de revision, tren corto `Familia -> Revision -> Mascotas -> Publicar -> Adoptar`, CTA contextual y accesos a mascotas bajo acogida, vitrina y perfil/revision.
- Si el hogar activo es `owner`, se conserva la home owner actual.

Archivos probables:

- `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`
- `apps/mobile/src/features/pets/components/PetsWorkspace.tsx`
- `apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/HANDOFF.md`

Riesgo:

- Medio. Toca shell owner y contexto activo.

Criterios de aceptacion:

- Un household `protective` aprobado ve acciones Foster primero.
- Un household `owner` conserva home owner actual.
- No se mezclan mascotas propias y mascotas bajo acogida.

Validaciones:

- mobile lint/typecheck/build.
- `git diff --check`.

### UX-FOSTER-1C - Wizard de creacion/solicitud de Familia Protectora

Estado: implementado localmente.

Objetivo:

- Convertir la solicitud protectora en pasos cortos: identidad, ubicacion, experiencia/contacto, revision.
- La implementacion mobile reutiliza `HouseholdsWorkspace` y los RPC/API existentes; no cambia modelo, RLS ni contratos.
- El usuario avanza por pasos, ve completitud, revisa un resumen final y solo desde `Revision` puede guardar borrador o enviar a revision administrativa.

Archivos probables:

- `apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx`
- `apps/web/src/features/foster/components/FosterConsoleWorkspace.tsx`
- `packages/api-client/src/foster.ts` solo si falta dato, evitar contrato nuevo.

Riesgo:

- Bajo/medio. Principalmente presentacion sobre API existente.

Criterios de aceptacion:

- El usuario ve progreso.
- No puede enviar sin datos minimos.
- Estado de revision queda claro.

Validaciones:

- mobile/web lint/typecheck/build segun superficie tocada.
- `git diff --check`.

### UX-FOSTER-1D - Wizard de publicacion de mascota

Estado: implementado localmente.

Objetivo:

- Reorganizar publicacion como tren: mascota, historia, salud publica, fotos, revision, visible.
- La implementacion mobile divide la vitrina de adopcion en pasos `Mascota`, `Historia`, `Salud`, `Fotos` y `Revision/Visible`, reutilizando las mismas acciones de guardar, subir fotos, enviar a revision, pausar y cerrar.
- Registrar mascota sigue sin publicar adopcion; las fotos nuevas mantienen moderacion individual y guardar textos no despublica publicaciones visibles.

Archivos probables:

- `apps/mobile/src/features/pets/components/PetsWorkspace.tsx`
- `apps/web/src/features/foster/components/FosterConsoleWorkspace.tsx`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/HANDOFF.md`

Riesgo:

- Medio. Toca flujo con media, publicacion y estados.

Criterios de aceptacion:

- Registrar mascota no publica adopcion.
- Guardar textos no despublica publicaciones `published`.
- Agregar fotos mantiene moderacion individual.
- Enviar a revision queda separado de guardar borrador.

Validaciones:

- mobile/web lint/typecheck/build.
- `git diff --check`.

### UX-FOSTER-1E - Bandeja simplificada de solicitudes

Objetivo:

- Hacer que solicitudes se vean como bandeja por estado y siguiente accion.

Archivos probables:

- `apps/mobile/src/features/foster/components/AdoptionApplicationsInbox.tsx`
- `apps/web/src/features/foster/components/FosterConsoleWorkspace.tsx`
- `packages/api-client/src/foster.ts` solo si falta consulta, evitar cambios de contrato.

Riesgo:

- Medio. Toca pipeline operativo, pero puede reutilizar RPCs existentes.

Criterios de aceptacion:

- Solicitudes nuevas son faciles de encontrar.
- Solicitudes aprobadas muestran que falta transferencia.
- Rechazar exige nota si la regla ya existe server-side.

Validaciones:

- mobile/web lint/typecheck/build.
- `git diff --check`.

### UX-FOSTER-1F - Cierre guiado de transferencia/adopcion

Objetivo:

- Clarificar el cierre real: aprobacion de solicitud -> transferencia pendiente -> aceptacion adoptante -> adopcion cerrada.

Archivos probables:

- `apps/mobile/src/features/foster/components/AdoptionDiscoveryWorkspace.tsx`
- `apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx`
- `apps/web/src/features/foster/components/FosterConsoleWorkspace.tsx`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/HANDOFF.md`

Riesgo:

- Medio. Toca comunicacion entre solicitante y familia protectora.

Criterios de aceptacion:

- Adoptante entiende que debe aceptar invitacion.
- Familia protectora entiende que aprobar no mueve custodia.
- Al aceptar transferencia, la nueva mascota queda enfocada en el hogar receptor.

Validaciones:

- mobile/web lint/typecheck/build.
- `git diff --check`.

## Primer slice recomendado

Implementar primero `UX-FOSTER-1A - Intencion Foster en registro/onboarding`.

Motivo:

- Es el punto donde nace la confusion.
- No requiere migracion si se maneja como intencion de onboarding.
- Permite guiar al usuario hacia la arquitectura correcta (`household_type = protective`) sin crear roles nuevos.
- Mantiene owner/provider sin regresion si se conserva el default actual.

## Prompt exacto para implementar UX-FOSTER-1A

```text
Quiero implementar UX-FOSTER-1A: intencion Foster en registro/onboarding mobile.

Contexto:
- Foster debe seguir siendo capacidad de `household`, no rol global nuevo.
- Ya existe `households.household_type = owner | protective`.
- El objetivo es que desde registro/onboarding el usuario pueda elegir una intencion clara:
  1. Cuidar mis mascotas.
  2. Ofrecer servicios.
  3. Rescatar o dar mascotas en adopcion.
- Si elige Foster, la app debe guiarlo a crear una `Familia Protectora` separada, no convertir su hogar owner.

Restricciones:
- No tocar Supabase.
- No crear migraciones.
- No ejecutar supabase db push.
- No cambiar contratos API.
- No crear rol global nuevo.
- No romper registro owner/provider actual.
- No tocar Payments, booking, QR, evidencia, provider services ni geolocalizacion.
- No tocar marketplace comercial.
- Mantener cambios acotados a mobile onboarding/households y documentacion minima.

Antes de modificar:
1. Revisar:
   - docs/ux/FOSTER_PROGRESSIVE_ONBOARDING.md
   - apps/mobile/src/features/core/screens/CoreHomeScreen.tsx
   - apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx
   - apps/mobile/src/features/households/hooks/useHouseholdsWorkspace.ts
   - packages/types/src/households.ts
   - packages/api-client/src/households.ts

Implementacion esperada:
1. En registro/onboarding mobile, presentar una seleccion de intencion clara:
   - `Cuidar mis mascotas`
   - `Ofrecer servicios`
   - `Rescatar o dar mascotas en adopcion`
2. Mantener los roles existentes sin crear rol global Foster.
3. Si el usuario elige Foster:
   - despues de login/registro, dirigirlo al flujo de Hogares con tipo `protective` preseleccionado;
   - mostrar copy: `Crea una Familia Protectora separada para mascotas bajo acogida.`;
   - no mostrar como primer paso el registro de mascota owner.
4. Si el usuario elige owner:
   - mantener flujo actual de crear hogar familiar y primera mascota.
5. Si el usuario elige provider:
   - mantener flujo provider actual.
6. Si el usuario ya existe:
   - no forzar cambios;
   - permitir crear familia protectora desde Cuenta/Hogares como hoy.

Documentacion:
- Actualizar docs/ux/FOSTER_PROGRESSIVE_ONBOARDING.md si cambia la decision.
- Actualizar docs/ux/SCREEN_SPECIFICATIONS.md.
- Actualizar docs/HANDOFF.md.

Validaciones:
- corepack pnpm --filter @pet/mobile lint
- corepack pnpm --filter @pet/mobile typecheck
- corepack pnpm --filter @pet/mobile build
- git diff --check

Entrega:
1. Diagnostico breve.
2. Archivos modificados.
3. Comportamiento implementado.
4. Confirmacion de que Foster sigue siendo household capability.
5. Confirmacion de que owner/provider no se rompieron.
6. Validaciones ejecutadas.
7. Guia QA:
   - registrar owner;
   - registrar provider;
   - registrar con intencion Foster;
   - crear Familia Protectora;
   - confirmar que no se crea rol global nuevo;
   - confirmar que hogares owner siguen separados.
8. No hacer commit ni push hasta revision.
```
