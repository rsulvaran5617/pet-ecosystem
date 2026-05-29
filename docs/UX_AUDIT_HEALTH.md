# UX_AUDIT_HEALTH.md

## Alcance revisado

- Mobile: `apps/mobile/src/features/health/components/HealthWorkspace.tsx`.
- Web: `apps/web/src/features/health/components/HealthWorkspace.tsx`.
- Documentacion: `docs/modules/health.md`.

## Hallazgos

ID: HEALTH-001
Modulo: Salud
Flujo: Salud por mascota
Pantalla/Componente: Tabs Vacunas / Alergias / Condiciones
Severidad: Medio
Tipo: Procedimental
Problema detectado: La UI usa secciones compactas donde solo se ve el detalle de la seccion activa. Es eficiente, pero puede esconder informacion importante si el usuario no nota el selector.
Impacto en el usuario: Puede creer que solo existen vacunas o que las alergias/condiciones no se registraron.
Recomendacion: Reforzar estado activo con conteos visibles, icono y descripcion breve. Incluir texto "Toca una categoria para ver su detalle".
Criterio de aceptacion: Vacunas, alergias y condiciones muestran conteos y la seccion activa queda visualmente evidente. Cambiar categoria reemplaza el detalle sin perder datos.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: HEALTH-002
Modulo: Salud
Flujo: Vacunas y recordatorios
Pantalla/Componente: Formulario vacuna / resumen de recordatorios
Severidad: Medio
Tipo: Funcional
Problema detectado: La documentacion indica recordatorios automaticos por vacunas, pero la relacion no queda suficientemente visible al registrar o editar una vacuna con proxima fecha.
Impacto en el usuario: Puede registrar una vacuna y no entender si se creo recordatorio o donde verlo.
Recomendacion: Mostrar confirmacion especifica: "Se actualizo la vacuna y se programo recordatorio para X" cuando aplique.
Criterio de aceptacion: Al guardar una vacuna con `nextDueOn`, el usuario ve un mensaje claro y el recordatorio aparece en Recordatorios de la misma mascota.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: HEALTH-003
Modulo: Salud
Flujo: Fechas de salud
Pantalla/Componente: `DatePickerField`
Severidad: Medio
Tipo: Accesibilidad
Problema detectado: El campo de fecha usa un `+` como affordance de calendario. Visualmente compacto, pero poco descriptivo para accesibilidad y comprension.
Impacto en el usuario: Puede no saber que el campo abre un calendario.
Recomendacion: Usar icono calendario o texto "Elegir fecha", con `accessibilityLabel` explicito.
Criterio de aceptacion: El selector de fecha comunica visual y accesiblemente que abre un calendario.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2

ID: HEALTH-004
Modulo: Salud
Flujo: Lenguaje de salud base
Pantalla/Componente: Vacunas, alergias, condiciones
Severidad: Bajo
Tipo: Texto/UX Writing
Problema detectado: Algunos terminos pueden sentirse clinicos o internos para un owner no experto.
Impacto en el usuario: Menor confianza para llenar datos sensibles de salud.
Recomendacion: Agregar microcopy humano y simple: "Alergias conocidas", "Condiciones importantes", "Vacunas registradas".
Criterio de aceptacion: Los formularios de salud se entienden sin conocimiento veterinario y evitan prometer diagnostico clinico.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P3
