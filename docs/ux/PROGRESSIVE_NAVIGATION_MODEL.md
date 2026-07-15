# Modelo progresivo de navegacion y experiencia guiada

## Estado

Documento de diseno UX/arquitectura de navegacion.

UX-PROG-1 Owner Home progresivo queda implementado en mobile owner como primer slice de bajo riesgo. No cambia Supabase, no crea migraciones, no cambia RLS, no cambia contratos API y no elimina funcionalidades existentes.

UX-MOBILE-FLOWS Slice 1A inicia el rediseño guiado por referencias visuales en el acceso mobile sin sesion. El alcance se limita al shell de bienvenida/login/registro/OTP/recuperacion y mantiene la misma API de autenticacion.

UX-MOBILE-FLOWS Slice 1B convierte la compuerta owner sin hogar en un paso guiado para crear un `Hogar familiar` antes de mostrar Inicio/Mascotas. La gestion completa de hogares permanece disponible en Cuenta.

UX-MOBILE-FLOWS Slice 1C convierte el estado owner con hogar pero sin mascota en un paso guiado para registrar la primera mascota. El shell bloquea temporalmente Inicio/Buscar/Reservas/Mensajes hasta crear la mascota y luego conserva esa mascota como contexto activo.

UX-MOBILE-FLOWS Slice 1D agrega una guia suave posterior a la primera mascota: desde la ficha se sugieren acciones no obligatorias para foto, documentos y busqueda de servicios, manteniendo la navegacion normal.

UX-MOBILE-FLOWS Slice 1E ajusta Inicio owner como guia diaria contextual: la accion principal prioriza reservas y recordatorios de la mascota activa; si no hay pendientes operativos, sugiere completar foto o buscar servicios.

UX-MOBILE-FLOWS Slice 1F simplifica `Mascotas > Detalle`: la ficha principal muestra una accion recomendada y mueve edicion/estado En memoria a `Gestion avanzada` colapsable para reducir carga visual.

UX-MOBILE-FLOWS Slice 1G aplica progresion en `Mascotas > Salud > Vacunas`: el bloque muestra una guia breve, CTA contextual para registrar vacunas y validacion local para impedir que la proxima dosis sea anterior a la fecha de aplicacion antes de llamar al API.

UX-MOBILE-FLOWS Slice 1H aplica progresion en `Mascotas > Docs`: el bloque muestra siguiente paso documental, CTA contextual, errores inline y valida que la fecha de vencimiento no sea anterior a la fecha de emision antes de llamar al API.

## Resumen ejecutivo

Pet Ecosystem ya tiene una base funcional amplia para owner, provider, admin y familias protectoras. El principal riesgo antes de abrir la app a usuarios finales no es la falta de capacidades, sino la carga cognitiva generada por mostrar demasiadas opciones, estados y acciones al mismo tiempo.

El modelo progresivo propone que la app deje de comportarse como una lista plana de modulos y pase a comportarse como una experiencia guiada por tareas. Cada pantalla principal debe responder tres preguntas:

1. Donde estoy.
2. Que puedo hacer ahora.
3. Que puede esperar para despues.

La meta es que una persona no tecnica, incluyendo adultos mayores, pueda avanzar sin entender la arquitectura interna de hogares, mascotas, providers, bookings, Foster, slots, evidencia o estados tecnicos.

## Principios UX del modelo progresivo

### 1. Mostrar solo lo relevante para el estado actual

Una pantalla no debe mostrar todas las capacidades disponibles si el usuario aun no puede usarlas o no las necesita en ese momento.

Ejemplos:

- Sin hogar: mostrar creacion de hogar antes de mascotas, marketplace o reservas.
- Con hogar sin mascota: mostrar registro de primera mascota.
- Con mascota activa: mostrar cuidado, expediente, recordatorios y proxima accion.
- Con reserva activa: priorizar seguimiento de la reserva.
- Con familia protectora aprobada: mostrar gestion de acogida/adopcion.

### 2. Progresion antes que navegacion libre

La navegacion libre sigue existiendo, pero los flujos criticos deben sentirse como pasos.

Flujos candidatos:

- crear hogar y primera mascota.
- completar expediente de mascota.
- reservar servicio.
- operar reserva provider.
- publicar mascota en adopcion.
- revisar solicitud y transferir mascota.
- aprobar provider/familia/publicacion en admin.

### 3. Una accion principal por seccion

Cada card o bloque debe tener una accion dominante. Las acciones secundarias deben ser iconos, menu compacto o links secundarios.

### 4. Contexto funcional invisible, confirmacion visual minima

La app debe conservar internamente hogar, mascota activa, negocio activo o familia protectora activa, pero no debe explicar todo ese contexto en cada pantalla.

Patron recomendado:

- pastilla compacta: `Mascota activa: Ginger`.
- boton pequeno: `Cambiar`.
- solo mostrar hogar/familia cuando hay mas de un contexto relevante.

### 5. Lenguaje humano, no tecnico

Evitar copy como:

- `pending_approval`.
- `preview`.
- `contexto`.
- `slots`.
- `payment-ready`.
- `capacity`.
- `household`.
- `provider`.

Usar:

- `Pendiente de aprobacion`.
- `Resumen`.
- `Mascota seleccionada`.
- `Horario disponible`.
- `Sin cobro dentro de la app durante piloto`.
- `Hogar`.
- `Proveedor`.

### 6. Diseno para personas no tecnicas

Reglas minimas:

- botones tactiles grandes.
- textos cortos.
- jerarquia visual fuerte.
- menos chips simultaneos.
- evitar codigos y fechas tecnicas.
- confirmaciones claras.
- empty states con siguiente paso.
- no depender solo del color para comunicar estado.

## Diagnostico general de navegacion actual

La documentacion y capturas revisadas muestran que los modulos estan funcionalmente maduros, pero varios flujos crecieron por acumulacion de slices. Esto genera pantallas con mucho valor, pero tambien con varias capas de informacion visibles al mismo tiempo.

Fortalezas:

- existe mascota activa persistente.
- los flujos de booking tienen stepper y ticket/resumen.
- Foster ya esta separado conceptualmente de marketplace comercial.
- provider web/mobile tiene dashboard operativo y acciones por estado.
- admin tiene colas claras de aprobacion.
- los documentos y vacunas ya avanzan hacia patrones visuales reutilizables.

Problemas principales:

- algunas pantallas muestran setup, operacion, historial y acciones en una sola superficie.
- hay copy tecnico visible en estados o mensajes.
- algunos estados no guian al usuario hacia el siguiente paso.
- owner, foster y provider comparten patrones visuales, pero no siempre comparten una misma logica de progresion.
- una persona mayor podria no entender que hacer primero si ve demasiados bloques simultaneos.

## Estados progresivos por rol

### Owner nuevo

| Estado | Debe ver | Debe ocultarse o quedar secundario |
| --- | --- | --- |
| Sin sesion | Login, crear cuenta, recuperar acceso | Marketplace, reservas, contexto de hogar |
| Con sesion sin hogar | Crear hogar familiar | Mascotas, reservas, documentos, salud |
| Con hogar sin mascota | Registrar primera mascota | Marketplace transaccional, reservas |
| Con mascota incompleta | Completar datos basicos, foto, salud/documentos minimos | Funciones avanzadas |
| Con mascota lista | Inicio con mascota activa, cuidado, buscar servicios | Setup repetitivo |
| Con reserva activa | Proxima reserva y seguimiento | Historico completo salvo acceso secundario |
| Con alertas de salud/docs | Accion concreta para resolver vencimientos | Listas largas sin prioridad |

### Owner con varias mascotas

| Estado | Debe ver | Regla progresiva |
| --- | --- | --- |
| Varias mascotas activas | Mascota activa compacta y cambio rapido | Todas las secciones operan sobre mascota activa salvo seleccion explicita |
| Cambio de mascota | Selector simple con foto/nombre | No mostrar permisos ni metadatos internos |
| Mascota transferida/adoptada | Confirmacion y foco inmediato en la nueva mascota | No mantener contexto anterior |

### Owner adulto mayor o no tecnico

| Necesidad | Regla |
| --- | --- |
| Entender que hacer | Mostrar una accion principal y una explicacion breve |
| Evitar miedo a tocar | Confirmar acciones sensibles antes de ejecutar |
| Leer sin esfuerzo | Texto minimo 14-16, botones grandes, estados en lenguaje natural |
| No perderse | Breadcrumb o titulo claro de paso actual |

### Provider nuevo

| Estado | Debe ver | Debe ocultarse o quedar secundario |
| --- | --- | --- |
| Sin negocio | Crear negocio | Reservas, dashboard avanzado |
| Negocio creado sin perfil | Completar perfil publico | Operacion diaria |
| Sin servicios | Crear primer servicio | Metricas de reservas |
| Sin agenda/capacidad | Crear horarios/cupos | Indicadores economicos |
| Sin documentos | Subir documentos de aprobacion | Publicacion en marketplace |
| En revision | Estado de revision y pendientes concretos | Acciones no disponibles |
| Aprobado/publico | Operacion diaria | Setup completado salvo editar |

### Provider operativo

| Estado | Debe ver primero | Acciones secundarias |
| --- | --- | --- |
| Citas por aprobar | Aprobar/rechazar primera pendiente | Ver todas, filtrar |
| Citas de hoy | Operar check-in/check-out | Chat, evidencia |
| Evidencia pendiente | Subir evidencia | Completar reserva |
| Mensajes entrantes | Responder conversacion vinculada | Ver historial |
| Sin urgencias | Resumen del dia y salud de negocio | Configuracion |

### Familia protectora

| Estado | Debe ver | Debe ocultarse o quedar secundario |
| --- | --- | --- |
| Sin familia protectora | Crear familia protectora separada | Publicaciones, transferencias |
| En revision | Estado de aprobacion y que falta | Registro masivo de mascotas |
| Aprobada sin mascotas | Registrar mascota bajo acogida | Solicitudes |
| Mascota en acogida sin publicacion | Preparar publicacion | Solicitudes/transferencias |
| Publicacion en revision | Estado y edicion controlada | CTA de adoptar |
| Publicada | Solicitudes y galeria | Setup ya resuelto |
| Solicitud aprobada | Iniciar transferencia | Publicar otra mascota como accion secundaria |

### Adoptante

| Estado | Debe ver | Regla |
| --- | --- | --- |
| Explorando | Mascotas publicadas, historia, fotos, ciudad | No mostrar datos privados |
| Interesado | Solicitud estructurada | Explicar que no reserva ni transfiere |
| Solicitud enviada | Estado y proximo paso | Evitar repetir formulario |
| Aprobada | CTA hacia invitacion/transferencia | Explicar que aceptar mueve la mascota |
| Transferencia aceptada | Mascota en su hogar | Foco en expediente de la mascota |

### Admin operador

| Estado | Debe ver primero | Regla |
| --- | --- | --- |
| Proveedores pendientes | Checklist de readiness y documentos | Decision clara aprobar/rechazar |
| Familias protectoras pendientes | Perfil, ciudad, notas y riesgo | No mezclar con providers |
| Publicaciones pendientes | Contenido publico, fotos, privacidad | Moderacion por item |
| Soporte abierto | Casos por estado/urgencia | Historial y resolucion |
| Actividad critica | Alertas o auditoria | No convertir en dashboard pesado |

## Mapa de navegacion recomendado

### Owner mobile

Navegacion base:

- Inicio.
- Mascotas.
- Buscar.
- Reservas.
- Mensajes.
- Cuenta.

Reglas:

- Inicio es el asistente de siguiente accion.
- Mascotas es expediente y gestion de mascota activa.
- Buscar es solo servicios/proveedores.
- Adopciones no debe vivir dentro de Buscar; debe abrirse desde Inicio como experiencia separada.
- Reservas prioriza activas y detalle operativo.
- Cuenta contiene configuracion, roles, hogares e invitaciones.

### Provider mobile/web

Navegacion base:

- Panel.
- Negocios.
- Servicios.
- Agenda/Capacidad.
- Reservas.
- Mensajes.
- Publicacion/Estado.
- Documentos.

Reglas:

- Panel debe responder `Que debo atender hoy`.
- Negocios/Servicios/Agenda/Documentos son setup.
- Reservas/Mensajes/Evidencia son operacion diaria.
- Configuracion no debe competir con operacion urgente.

### Foster web/mobile

Navegacion base:

- Familia protectora.
- Mascotas bajo acogida.
- Publicaciones.
- Solicitudes.
- Transferencias.
- Perfil publico.

Reglas:

- No mezclar con hogar owner normal.
- No mezclar con provider comercial.
- No mostrar acciones de adopcion hasta que la familia este aprobada.
- Cada mascota en acogida debe tener un tren de proceso.

### Admin

Navegacion base:

- Pendientes.
- Providers.
- Familias protectoras.
- Publicaciones.
- Soporte.
- Auditoria.

Reglas:

- Admin opera colas, no explora modulos.
- Cada cola debe tener checklist y decision.

## Reglas de visibilidad progresiva

### Regla 1: si falta prerrequisito, mostrar solo el siguiente paso

Ejemplo:

- sin hogar: `Crea tu hogar`.
- sin mascota: `Registra tu primera mascota`.
- provider sin servicio: `Crea tu primer servicio`.
- foster sin aprobacion: `Espera aprobacion o corrige solicitud`.

### Regla 2: si hay una tarea urgente, debe dominar la pantalla

Ejemplos:

- reserva pendiente de aprobacion.
- QR/check-in pendiente.
- evidencia pendiente.
- documento vencido.
- solicitud de adopcion aprobada pendiente de transferencia.

### Regla 3: el historial nunca debe competir con la accion actual

Historial, listas completas y datos secundarios deben quedar colapsados, filtrados o bajo CTA.

### Regla 4: setup y operacion no deben mezclarse visualmente

Provider:

- setup: negocio, perfil, servicios, horarios, documentos.
- operacion: reservas, check-in, evidencia, mensajes.

Foster:

- setup: familia protectora, perfil publico.
- operacion: mascotas en acogida, publicaciones, solicitudes, transferencias.

### Regla 5: acciones sensibles requieren confirmacion

Ejemplos:

- marcar mascota en memoria.
- cancelar reserva.
- rechazar solicitud.
- iniciar transferencia.
- aceptar transferencia.
- eliminar negocio/servicio.

## Recomendaciones por pantalla

### Inicio owner

Debe verse como asistente de cuidado:

1. mascota activa.
2. siguiente accion recomendada.
3. proxima actividad.
4. acceso a mascotas/adopciones/servicios.

Debe evitar:

- estados tecnicos.
- multiples banners de contexto.
- emails largos como saludo.
- modulos no accionables.

### Mascotas

Debe funcionar como expediente por mascota activa:

1. resumen de mascota.
2. salud/documentos/recordatorios como tabs.
3. acciones principales segun estado.

Debe evitar:

- demasiados chips en la ficha principal.
- mostrar edicion y detalle al mismo tiempo sin separacion.
- fechas ISO o textos generados en ingles.

### Buscar

Debe funcionar como busqueda de servicios:

1. campo de busqueda.
2. categorias rapidas.
3. resultados.
4. proveedor.
5. servicio/horario.

Debe evitar:

- duplicar mascota activa.
- mezclar adopciones.
- explicar internamente el contexto.

### Reservas

Debe funcionar como seguimiento:

1. reservas activas.
2. detalle de reserva.
3. timeline operativo.
4. accion siguiente.

Debe evitar:

- historial completo por defecto.
- botones secundarios antes de la accion principal.
- QR ocupando todo el flujo despues de usarse.

### Cuenta

Debe funcionar como configuracion guiada:

1. datos personales.
2. hogares.
3. roles.
4. invitaciones.
5. preferencias.
6. metodos guardados.

Debe evitar:

- mezclar pagos reales con referencias de piloto.
- pasos de cuenta sin CTA.

### Provider dashboard

Debe funcionar como cola diaria:

1. citas por aprobar.
2. citas de hoy.
3. evidencia pendiente.
4. mensajes.
5. salud de publicacion.

Debe evitar:

- dashboard puramente informativo.
- indicadores economicos que parezcan pago real.
- setup ocupando la misma jerarquia que operacion urgente.

### Foster console

Debe funcionar como pipeline de adopcion:

1. familia aprobada.
2. mascotas bajo acogida.
3. publicacion.
4. solicitudes.
5. transferencia.
6. adoptada.

Debe evitar:

- parecer un owner normal.
- mezclar mascotas propias y mascotas en acogida.
- publicar sin galeria/historia minima.

### Admin

Debe funcionar como backoffice de decision:

1. cola.
2. detalle.
3. checklist.
4. decision.
5. auditoria.

Debe evitar:

- dashboards decorativos.
- informacion sin accion.

## Flujos que deben convertirse o mantenerse como stepper/wizard

| Flujo | Patron recomendado | Motivo |
| --- | --- | --- |
| Crear primer hogar/mascota | Wizard corto | Evita que el usuario nuevo vea toda la app vacia |
| Completar expediente mascota | Checklist progresivo | Permite avanzar por prioridad |
| Reserva owner | Stepper existente reforzado | Ya es transaccional y sensible |
| QR/check-in/check-out | Timeline operativo | Una accion siguiente por estado |
| Provider onboarding | Checklist de publicacion | Evita que no entienda por que no aparece |
| Publicar mascota en adopcion | Tren de proceso | Ya existe concepto y debe reforzarse |
| Solicitud/adopcion/transferencia | Pipeline + CTA contextual | Evita confundir aprobacion con transferencia |
| Admin aprobaciones | Checklist de revision | Mejora confianza y trazabilidad |

## Copy recomendado

### Empty states

- Sin hogar: `Crea tu hogar para empezar a registrar y cuidar tus mascotas.`
- Sin mascota: `Registra tu primera mascota para activar su expediente.`
- Sin documentos: `Aun no hay documentos. Puedes agregar carnet, seguro o identidad cuando los tengas.`
- Sin vacunas: `Aun no hay vacunas registradas. Agrega una vacuna para llevar su control.`
- Sin reservas: `No tienes reservas activas. Busca un servicio cuando lo necesites.`
- Provider sin servicio: `Crea tu primer servicio para que tu negocio pueda recibir reservas.`
- Foster sin familia: `Crea una Familia Protectora separada para gestionar mascotas en acogida.`
- Sin solicitudes: `Aun no hay solicitudes. Cuando una familia interesada aplique, aparecera aqui.`

### Estados

- `pending_approval` -> `Pendiente de aprobacion`.
- `confirmed` -> `Confirmada`.
- `completed` -> `Completada`.
- `cancelled` -> `Cancelada`.
- `in_review` -> `En revision`.
- `interview` -> `Entrevista`.
- `approved` -> `Aprobada`.
- `converted_to_transfer` -> `Transferencia iniciada`.

### Acciones

- `Generar preview` -> `Ver resumen`.
- `Slots` -> `Horarios disponibles`.
- `Payment-ready` -> `Sin cobro dentro de la app durante piloto`.
- `Contexto` -> no mostrar como titulo visible.

## Slices de implementacion sugeridos

### UX-PROG-0: canon de progresion

Alcance:

- documentar reglas de visibilidad en `SCREEN_SPECIFICATIONS.md`.
- no tocar UI todavia.

Criterio:

- cada rol tiene estados y pantalla inicial esperada.

### UX-PROG-1: Owner Home progresivo

Estado: implementado en mobile owner.

Alcance:

- Inicio owner decide el bloque principal segun estado:
  - sin mascota.
  - reserva activa.
  - recordatorio pendiente.
  - todo listo para buscar servicios.
- limpiar copy tecnico, emails largos y banners secundarios que competian con la siguiente accion.

Criterio:

- Inicio muestra una accion principal clara.

### UX-PROG-2: Mascotas como expediente guiado

Alcance:

- reducir chips visibles.
- separar atributos de acciones.
- normalizar documentos/vacunas/recordatorios.
- evitar fechas tecnicas y textos en ingles.

Criterio:

- una persona identifica rapidamente estado y siguiente accion de la mascota.

### UX-PROG-3: Buscar servicios limpio

Alcance:

- eliminar duplicados de mascota activa.
- asegurar que Buscar no mezcle adopcion.
- simplificar cards de proveedor y servicios.

Criterio:

- el usuario entiende que Buscar es para reservar servicios.

### UX-PROG-4: Reservas como seguimiento operativo

Alcance:

- priorizar reservas activas.
- timeline con siguiente accion.
- QR/evidencia/estado con lenguaje humano.

Criterio:

- el usuario sabe que hacer antes, durante y despues del servicio.

### UX-PROG-5: Provider diario vs setup

Alcance:

- Panel provider solo muestra tareas operativas.
- setup queda en secciones dedicadas.

Criterio:

- proveedor nuevo sabe que completar; proveedor operativo sabe que atender.

### UX-PROG-6: Foster pipeline progresivo

Alcance:

- separar familia protectora, mascotas en acogida, publicaciones, solicitudes y transferencia.
- reforzar tren de proceso.

Criterio:

- aprobar solicitud no se confunde con transferir mascota.

### UX-PROG-7: Admin decision queues

Alcance:

- revisar providers, familias, publicaciones y soporte con checklist.

Criterio:

- admin entiende por que aprueba/rechaza.

## Quick wins de bajo riesgo

1. Traducir estados tecnicos visibles.
2. Eliminar fechas ISO de UI.
3. Cambiar salud/recordatorios generados en ingles a espanol.
4. Evitar email largo como saludo.
5. Remover duplicados de mascota activa.
6. Compactar tabs que se parten en dos lineas.
7. Unificar chips de estado largos debajo del titulo, no al lado.
8. Cambiar copy `preview` por `resumen`.
9. Reemplazar metadatos internos por copy orientado a usuario.
10. Cerrar/colapsar formularios despues de guardar.

## Riesgos

- Sobre-simplificar y esconder acciones necesarias para usuarios avanzados.
- Mezclar mejoras de progresion con nuevas features.
- Romper continuidad de contexto si se cambia navegacion sin revisar shell owner.
- Confundir Foster con owner normal si la separacion visual no es fuerte.
- Confundir pagos referenciales con cobro real.
- Aumentar pasos innecesariamente si todos los flujos se convierten en wizard.

Mitigacion:

- cada slice debe preservar la funcionalidad existente.
- medir por tareas, no por cantidad de pantallas.
- probar con usuario nuevo y usuario experto.
- mantener accesos secundarios para usuarios avanzados.

## Orden recomendado

1. UX-PROG-1 Owner Home progresivo.
2. UX-PROG-2 Mascotas como expediente guiado.
3. UX-PROG-3 Buscar servicios limpio.
4. UX-PROG-4 Reservas como seguimiento operativo.
5. UX-PROG-6 Foster pipeline progresivo.
6. UX-PROG-5 Provider diario vs setup.
7. UX-PROG-7 Admin decision queues.

Motivo:

- Owner Inicio y Mascotas son la primera impresion y el nucleo emocional.
- Buscar y Reservas son el camino transaccional.
- Foster es complejo y debe estabilizarse con un modelo claro.
- Provider/Admin pueden evolucionar despues sin bloquear la comprension del owner.

## Criterios de aceptacion del modelo

- un owner nuevo sabe que debe crear hogar antes de mascota.
- un owner con varias mascotas siempre entiende que mascota esta gestionando.
- Buscar se entiende como servicios/proveedores, no adopcion.
- Adopciones se entienden como experiencia separada.
- una reserva muestra siempre la siguiente accion.
- provider distingue setup de operacion diaria.
- familia protectora no se confunde con hogar owner.
- admin opera colas con checklist y decision.
- no hay estados tecnicos visibles en pantallas finales.
- ninguna pantalla principal muestra mas de una accion primaria dominante.

## Prompt exacto para implementar el primer slice

```text
Quiero implementar UX-PROG-1: Owner Home progresivo para Pet Ecosystem.

Contexto:
- Ya existe el documento docs/ux/PROGRESSIVE_NAVIGATION_MODEL.md.
- El objetivo es que Inicio owner deje de ser un tablero de modulos y se comporte como asistente de siguiente accion.
- No quiero nuevas features, backend, Supabase, migraciones, RLS ni cambios de contratos API.

Alcance:
1. Revisar Owner mobile Inicio en apps/mobile.
2. Detectar estados disponibles con datos existentes:
   - sin hogar;
   - hogar sin mascota;
   - mascota activa;
   - reserva activa/proxima;
   - documentos o vacunas pendientes;
   - recordatorios pendientes;
   - transferencia/adopcion pendiente si existe.
3. Reorganizar visualmente Inicio para mostrar una accion principal segun prioridad.
4. Mantener accesos secundarios a mascotas, buscar servicios, reservas, mensajes y cuenta.
5. Eliminar copy tecnico visible como estados internos o emails largos.
6. Mantener la mascota activa compacta y accion Cambiar.

Restricciones:
- No tocar backend.
- No tocar Supabase.
- No crear migraciones.
- No cambiar reglas de negocio.
- No tocar provider/admin.
- No tocar Payments, booking logic, QR, evidencia ni Foster logic.
- Solo UI owner mobile y documentacion minima.

Validaciones:
- corepack pnpm --filter @pet/mobile lint
- corepack pnpm --filter @pet/mobile typecheck
- corepack pnpm --filter @pet/mobile build
- git diff --check

Entrega:
1. Diagnostico.
2. Archivos modificados.
3. Estados progresivos cubiertos.
4. Que se oculto o pospuso.
5. Que se preservo funcionalmente.
6. Validaciones ejecutadas.
7. Guia de prueba Android/iOS.
8. No hacer commit ni push hasta revision visual.
```
