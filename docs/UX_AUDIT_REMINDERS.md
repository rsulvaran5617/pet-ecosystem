# UX_AUDIT_REMINDERS.md

## Alcance revisado

- Mobile: `apps/mobile/src/features/reminders/components/RemindersWorkspace.tsx`.
- Web: `apps/web/src/features/reminders/components/RemindersWorkspace.tsx`.
- Documentacion: `docs/modules/reminders.md`.

## Hallazgos

ID: REM-001
Modulo: Recordatorios
Flujo: Resumen en Home / Mascotas / Recordatorios
Pantalla/Componente: Owner Home, ficha mascota, `RemindersWorkspace`
Severidad: Alto
Tipo: Funcional
Problema detectado: Los recordatorios deben verse de forma consistente en el resumen de inicio, ficha de mascota y modulo dedicado. Ya hubo evidencia de confusion cuando un recordatorio de mascota no aparecia en el resumen esperado.
Impacto en el usuario: Puede perder una tarea importante de cuidado o desconfiar del resumen.
Recomendacion: Alinear todos los resumenes para consumir la misma fuente filtrada por hogar/mascota activa, con empty state especifico si no hay pendientes.
Criterio de aceptacion: Crear un recordatorio para una mascota y confirmar que aparece en Recordatorios, ficha de mascota y resumen correspondiente de Inicio sin salir de la sesion.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P0

ID: REM-002
Modulo: Recordatorios
Flujo: Mascota En memoria
Pantalla/Componente: Formulario de recordatorio / contexto mascota
Severidad: Medio
Tipo: Procedimental
Problema detectado: El modulo conserva recordatorios historicos para mascotas `in_memory`, pero la politica de crear nuevos recordatorios debe ser visible y sensible.
Impacto en el usuario: Riesgo emocional y funcional al generar tareas activas para una mascota en memoria.
Recomendacion: En modo En memoria, mostrar historial y permitir gestion controlada solo si se confirma explicitamente.
Criterio de aceptacion: El usuario no puede crear accidentalmente un recordatorio operativo para una mascota En memoria; si se permite, debe haber confirmacion sensible.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: REM-003
Modulo: Recordatorios
Flujo: Fechas y posponer
Pantalla/Componente: `toIsoDate`, `DatePickerField`, posponer
Severidad: Medio
Tipo: Funcional
Problema detectado: Las fechas se normalizan a una hora fija en UTC para crear recordatorios. La visualizacion usa zona del producto, pero el usuario no ve esta regla.
Impacto en el usuario: Puede percibir diferencias de dia/hora si se compara con correo, DB o zona del dispositivo.
Recomendacion: Mantener visualizacion local consistente y evitar mostrar horas tecnicas cuando el recordatorio es de dia completo.
Criterio de aceptacion: Un recordatorio creado para una fecha aparece en el mismo dia en Home, Recordatorios y calendario, sin desfase visible.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P2

ID: REM-004
Modulo: Recordatorios
Flujo: Expectativa de notificaciones
Pantalla/Componente: Recordatorios / preferencias
Severidad: Medio
Tipo: Texto/UX Writing
Problema detectado: El usuario puede asumir que un recordatorio genera push/email aunque el MVP solo tenga capacidades limitadas o dependientes de preferencias.
Impacto en el usuario: Expectativas incorrectas y fallos percibidos.
Recomendacion: Explicar en una linea si el recordatorio vive dentro de la app, por email o push cuando esa capacidad este activa.
Criterio de aceptacion: Cada recordatorio indica claramente donde sera visible y si requiere abrir la app.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2
