# UX_AUDIT_PETS.md

## Alcance revisado

- Mobile: `apps/mobile/src/features/pets/components/PetsWorkspace.tsx`, `usePetsWorkspace`.
- Documentos: `docs/modules/pets.md`, `docs/data/DATA_MODEL.md`, `docs/ux/SCREEN_SPECIFICATIONS.md`.
- Storage/tipos: `pet-avatars`, `pet_documents`, `packages/types/src/pets.ts`.

## Hallazgos

ID: PET-001
Modulo: Mascotas
Flujo: Seleccion y contexto activo
Pantalla/Componente: `PetsWorkspace`, shell owner, Home owner
Severidad: Alto
Tipo: Funcional
Problema detectado: La seleccion de mascota se conserva mediante coordinacion entre shell y workspaces. Es funcional, pero fragil porque Salud y Recordatorios tambien mantienen seleccion interna.
Impacto en el usuario: Al navegar por el menu inferior puede perder foco, ver otra mascota o encontrar estados de carga prolongados.
Recomendacion: Consolidar un contexto owner de hogar/mascota activo a nivel shell y pasarlo como fuente unica a Mascotas, Salud, Documentos, Recordatorios y Reservas.
Criterio de aceptacion: Seleccionar mascota en Home o Mascotas y navegar a Salud/Recordatorios/Reservas conserva la mascota activa sin pantalla vacia. Smoke manual cubre al menos 5 saltos de menu.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P0

ID: PET-002
Modulo: Mascotas
Flujo: Hub de mascotas
Pantalla/Componente: Carrusel y ficha compacta
Severidad: Medio
Tipo: Visual
Problema detectado: El refinamiento visual redujo fuentes, circulos y tarjetas. Esto mejora densidad, pero puede comprometer lectura y tactilidad en Android pequenos.
Impacto en el usuario: Nombres largos, edad, raza y badges pueden truncarse o requerir esfuerzo visual.
Recomendacion: Definir minimos: texto principal >= 12 px, acciones tactiles >= 44 px, truncado con tooltip/linea secundaria cuando sea necesario.
Criterio de aceptacion: En Xiaomi de prueba, tres mascotas con nombres largos se leen sin superposicion y las acciones son tocables sin error.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2

ID: PET-003
Modulo: Mascotas
Flujo: Estado En memoria
Pantalla/Componente: Ficha mascota / confirmacion En memoria
Severidad: Alto
Tipo: Procedimental
Problema detectado: El estado `in_memory` conserva historial y bloquea reservas nuevas, pero la UI deberia reforzar que salud/documentos/recordatorios quedan en modo memoria o gestion controlada.
Impacto en el usuario: Puede intentar crear recordatorios operativos para una mascota que ya no debe entrar en flujos activos.
Recomendacion: Mostrar banner persistente y deshabilitar acciones operativas no recomendadas, dejando consulta de historial y documentos.
Criterio de aceptacion: Una mascota En memoria no aparece como candidata a reserva, y en su ficha se ve el modo memoria con acciones permitidas claramente separadas.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: PET-004
Modulo: Mascotas
Flujo: Documentos de mascota
Pantalla/Componente: Panel Documentos / `DocumentPicker`
Severidad: Medio
Tipo: Funcional
Problema detectado: La carga documental existe, pero la experiencia necesita progreso, reintento y apertura/descarga consistente para validar que el archivo quedo disponible.
Impacto en el usuario: Puede pensar que subio un documento sin poder verificarlo facilmente.
Recomendacion: Agregar estado de subida, error recuperable, vista de documento con URL firmada temporal y accion "Abrir documento".
Criterio de aceptacion: Despues de subir un documento, aparece en la categoria correcta, muestra tamano/tipo, permite abrirlo y permite reintentar si falla.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P1

ID: PET-005
Modulo: Mascotas
Flujo: Ficha mascota
Pantalla/Componente: Badge `Verificado`
Severidad: Medio
Tipo: Texto/UX Writing
Problema detectado: La ficha muestra estados como `Verificado`; si no provienen de una validacion real, pueden prometer calidad documental inexistente.
Impacto en el usuario: Puede interpretar que la plataforma valido identidad/salud/documentos de la mascota.
Recomendacion: Cambiar a copy neutral si no hay dato real: "Perfil completo" o "Datos basicos listos".
Criterio de aceptacion: Todo badge de validacion se deriva de un dato verificable o usa texto neutral sin promesa de auditoria.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P2
