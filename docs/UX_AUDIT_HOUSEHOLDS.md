# UX_AUDIT_HOUSEHOLDS.md

## Alcance revisado

- Mobile: `apps/mobile/src/features/households/components/HouseholdsWorkspace.tsx`.
- Hooks/API: `useHouseholdsWorkspace`, `packages/api-client/src/households.ts`.
- Documentacion: `MVP_SCOPE.md`, `SCREEN_SPECIFICATIONS.md`, `DATA_MODEL.md`.

## Hallazgos

ID: HH-001
Modulo: Hogares
Flujo: Primer uso owner
Pantalla/Componente: Compuerta de hogar / `HouseholdsWorkspace`
Severidad: Alto
Tipo: Procedimental
Problema detectado: La regla de producto es correcta: no registrar mascota antes de hogar. Sin embargo, el copy de creacion de hogar todavia contiene lenguaje interno como "Este alcance del MVP..." y no explica en terminos de familia.
Impacto en el usuario: Un owner nuevo puede no entender por que la app exige hogar antes de mascota.
Recomendacion: Reescribir la compuerta como onboarding calido: "Primero crea tu hogar para organizar mascotas, permisos y reservas familiares."
Criterio de aceptacion: Si un owner nuevo no tiene hogar, solo ve una accion principal para crear hogar, con texto no tecnico y explicacion de beneficio.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P0

ID: HH-002
Modulo: Hogares
Flujo: Invitaciones y permisos
Pantalla/Componente: `PermissionRow`, invitaciones
Severidad: Medio
Tipo: Texto/UX Writing
Problema detectado: Permisos como `view`, `edit`, `book`, `pay`, `admin` se muestran como lista o switches, pero no siempre explican consecuencias reales.
Impacto en el usuario: Un administrador del hogar puede otorgar permisos sin entender impacto sobre reservas, pagos referenciales o edicion de mascotas.
Recomendacion: Mostrar nombres humanos y helper corto por permiso.
Criterio de aceptacion: Cada permiso indica accion permitida: "Ver informacion", "Editar mascotas", "Crear reservas", "Usar metodo guardado", "Administrar hogar".
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: HH-003
Modulo: Hogares
Flujo: Gestion de miembros
Pantalla/Componente: Switches de permisos
Severidad: Medio
Tipo: Accesibilidad
Problema detectado: Los switches de permisos no exponen contexto suficiente para lector de pantalla y pueden ser dificiles de accionar en una lista larga.
Impacto en el usuario: Baja seguridad percibida al administrar miembros.
Recomendacion: Etiquetar cada switch con miembro + permiso + estado; confirmar guardado por miembro.
Criterio de aceptacion: TalkBack lee "Permitir a Sandra editar mascotas, activado/desactivado". Al guardar, el usuario recibe confirmacion clara.
Complejidad estimada: Media
Riesgo tecnico: Bajo
Prioridad sugerida: P2

ID: HH-004
Modulo: Hogares
Flujo: Contexto de hogar
Pantalla/Componente: Shell owner, Mascotas, Salud, Recordatorios, Reservas
Severidad: Medio
Tipo: Funcional
Problema detectado: El hogar activo se usa como condicion de contexto en varios modulos, pero no siempre se muestra como contexto global persistente.
Impacto en el usuario: En hogares multiples, puede crear mascota, recordatorio o reserva en el hogar equivocado.
Recomendacion: Mostrar un selector/etiqueta de hogar activo consistente en secciones owner que dependan del hogar.
Criterio de aceptacion: En Mascotas, Salud, Recordatorios, Buscar y Reservas se ve el hogar activo o una accion clara para cambiarlo. La seleccion se conserva al navegar.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1
