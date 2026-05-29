# UX_AUDIT_NAVIGATION.md

## Alcance revisado

- Mobile shell: `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`.
- Web shell: `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`.
- Provider web: `apps/web/src/features/providers/components/ProvidersWorkspace.tsx`.
- UI tokens: `packages/ui/src/index.ts`.

## Hallazgos

ID: NAV-001
Modulo: Navegacion
Flujo: Shell mobile/web
Pantalla/Componente: `CoreHomeScreen`, `CoreExperienceScreen`, provider web console
Severidad: Alto
Tipo: Arquitectura
Problema detectado: Los shells y workspaces concentran muchos estados de rol, seccion activa, contexto de mascota/hogar, reserva activa, mensajes y refresh. Esto ha causado ya bugs de foco, pantalla en blanco o detalle desactualizado.
Impacto en el usuario: Navegacion impredecible cuando cruza Mascotas, Reservas, Mensajes y Provider.
Recomendacion: Antes de nuevos flujos grandes, definir una capa de estado de navegacion/contexto por rol con contrato pequeno: rol activo, hogar activo, mascota activa, reserva activa, origen de navegacion.
Criterio de aceptacion: Cada modulo recibe contexto desde una fuente unica y las pruebas de navegacion cruzada pasan sin duplicar hooks con seleccion interna conflictiva.
Complejidad estimada: Alta
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: NAV-002
Modulo: Navegacion
Flujo: Menus por rol
Pantalla/Componente: Bottom nav mobile, sidebar web
Severidad: Medio
Tipo: Visual
Problema detectado: Hay etiquetas equivalentes con nombres distintos entre superficies: `Cuenta`/`Perfil`, `Estado`/`Publicacion`, `Horarios`/`Agenda/Capacidad`.
Impacto en el usuario: Reduce transferibilidad entre mobile y web, especialmente para providers.
Recomendacion: Crear glosario de navegacion por rol y aplicar nombres consistentes por canal.
Criterio de aceptacion: Owner y provider ven los mismos conceptos con nombres consistentes. Las diferencias web/mobile se justifican por espacio, no por ambiguedad.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2

ID: NAV-003
Modulo: Navegacion
Flujo: Bottom nav mobile
Pantalla/Componente: `Pressable` de navegacion inferior
Severidad: Medio
Tipo: Accesibilidad
Problema detectado: La navegacion inferior usa iconos y etiquetas compactas. No todos los botones declaran labels/hints accesibles o hit slop explicito.
Impacto en el usuario: Dificultad con TalkBack o usuarios con baja precision tactil.
Recomendacion: Agregar `accessibilityRole="tab"`, `accessibilityState`, `accessibilityLabel` y area minima tactil.
Criterio de aceptacion: TalkBack anuncia "Reservas, pestana seleccionada" y cada tab tiene area tactil minima de 44x44.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: NAV-004
Modulo: Navegacion
Flujo: Actualizacion de estado
Pantalla/Componente: Reservas, Mensajes, Provider web
Severidad: Medio
Tipo: Funcional
Problema detectado: La app combina refresh manual, requery al entrar, polling y algunos eventos realtime. El usuario no siempre sabe si la pantalla esta al dia.
Impacto en el usuario: Dudas al aprobar reserva, recibir mensaje o ver cambio de estado.
Recomendacion: Estandarizar refresh por foco de pantalla y mostrar "Actualizado hace..." en listas criticas o indicador breve cuando se reconsulta.
Criterio de aceptacion: Tras aprobar una reserva desde otra superficie, la pantalla relacionada actualiza al volver o durante polling y muestra feedback no intrusivo.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: NAV-005
Modulo: Navegacion
Flujo: Sistema visual
Pantalla/Componente: Estilos inline, `packages/ui`
Severidad: Bajo
Tipo: Visual
Problema detectado: Aunque existen tokens en `packages/ui`, muchos componentes mantienen estilos inline y variantes locales de botones, fields y cards.
Impacto en el usuario: Inconsistencias pequenas de padding, radio, sombra, fuente y estados pressed.
Recomendacion: Extraer componentes base gradualmente: Button, Field, Notice, SectionCard, TabChip y EmptyState.
Criterio de aceptacion: Nuevos slices usan componentes base compartidos y no crean variantes visuales ad hoc salvo excepcion documentada.
Complejidad estimada: Media
Riesgo tecnico: Bajo
Prioridad sugerida: P3

ID: NAV-006
Modulo: Navegacion
Flujo: Usuarios duales
Pantalla/Componente: Cambio de rol mobile/web
Severidad: Medio
Tipo: Procedimental
Problema detectado: Usuarios con rol owner y provider necesitan confirmacion clara de contexto activo. Web provider ya oculta owner cuando provider esta activo, pero el cambio de rol todavia puede sentirse como cambio de vista mas que cambio de permisos.
Impacto en el usuario: Puede buscar reservas o mensajes en el rol equivocado.
Recomendacion: Mostrar contexto activo persistente y copy de cambio: "Estas gestionando como proveedor" / "Estas cuidando como propietario".
Criterio de aceptacion: En cualquier pantalla autenticada, el usuario identifica rol activo sin leer textos tecnicos y puede cambiar si tiene otro rol.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2
