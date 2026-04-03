# AGENTS.md

## Propósito de este archivo
Este archivo define cómo debe trabajar cualquier agente de código dentro de este repositorio.
La prioridad es mantener coherencia de producto, arquitectura, datos y releases.
No se debe improvisar alcance fuera de la documentación oficial del proyecto.

---

## Identidad del proyecto
Este repositorio implementa un ecosistema digital del negocio pet compuesto por tres productos coordinados:

1. Super app del dueño de mascota
2. Suite SaaS para proveedores por rol
3. Capa marketplace/orquestadora

La plataforma cubre:
- mascotas
- expediente y salud
- agenda y recordatorios
- marketplace de servicios
- clínicas
- tiendas
- farmacia
- gastos
- beneficios
- telecare
- administración de plataforma

---

## Fuente de verdad del proyecto
Antes de proponer o modificar código, leer siempre estos archivos:

### Documentos obligatorios
- `README.md`
- `docs/vision/PRODUCT_VISION.md`
- `docs/vision/BLUEPRINT_GENERAL.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/REPO_STRUCTURE.md`
- `docs/architecture/DEVELOPMENT_SETUP.md`
- `docs/architecture/MONOREPO_CONVENTIONS.md`
- `docs/architecture/ENVIRONMENT_VARIABLES.md`
- `docs/architecture/DOMAIN_MAP.md`
- `docs/architecture/TECH_STACK.md`
- `docs/product/BACKLOG_MASTER.md`
- `docs/product/EPICS_AND_STORIES.md`
- `docs/data/SUPABASE_SCHEMA.md`
- `docs/data/DATA_MODEL.md`
- `docs/data/RLS_RULES.md`
- `docs/api/API_CONTRACT.md`
- `docs/ux/SCREEN_SPECIFICATIONS.md`
- `docs/delivery/MVP_SCOPE.md`
- `docs/delivery/V2_SCOPE.md`
- `docs/delivery/V3_SCOPE.md`

### Documentos por módulo
Revisar además el archivo específico dentro de `docs/modules/` antes de tocar cualquier dominio.

Ejemplos:
- mascotas → `docs/modules/pets.md`
- marketplace → `docs/modules/marketplace.md`
- clínica → `docs/modules/clinic.md`
- tienda → `docs/modules/commerce.md`
- beneficios → `docs/modules/benefits.md`

---

## Regla de oro
No construir V2 o V3 si la funcionalidad pertenece a MVP y aún no está terminada o estabilizada.

No agregar features “porque serían útiles” si no están documentadas o si violan el release actual.

---

## Orden obligatorio de construcción
Construir en este orden:

1. Core platform
2. Hogar, roles y permisos
3. Mascotas, documentos y expediente base
4. Salud, agenda y recordatorios
5. Discovery y marketplace
6. Booking, checkout y pagos
7. Mensajería, reviews y soporte
8. Onboarding y operación base de proveedores
9. Ejecución de servicios
10. Clínica digital
11. Comercio, tienda y farmacia
12. Finanzas del dueño, beneficios, memberships y telecare

---

## Reglas de comportamiento del agente
Cuando recibas una tarea:

1. Identifica el módulo
2. Lee el documento del módulo correspondiente
3. Verifica la etapa: MVP, V2 o V3
4. Revisa el modelo de datos relacionado
5. Revisa el contrato de API relacionado
6. Revisa si existe tipo compartido en `packages/types`
7. Propón o implementa solo lo que pertenece a esa tarea
8. No mezcles cambios de módulos no relacionados
9. No cambies nombres de entidades sin actualizar la documentación
10. No dupliques lógica de negocio en múltiples capas

---

## Stack objetivo
### Frontend
- `apps/mobile`: React Native + Expo + TypeScript
- `apps/web`: Next.js + TypeScript
- `apps/admin`: Next.js + TypeScript

### Backend y plataforma
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime cuando aplique
- Supabase Edge Functions solo si la lógica no cabe bien en cliente/DB
- API tipada y centralizada

### Monorepo
- PNPM workspaces
- Turbo si es útil para build/lint/test

### Tipado compartido
- tipos compartidos en `packages/types`
- cliente API tipado en `packages/api-client`
- componentes UI reutilizables en `packages/ui`

---

## Convenciones de arquitectura
### Separación de capas
- UI no debe contener lógica de negocio pesada
- acceso a datos debe abstraerse
- validaciones compartidas deben centralizarse
- las mutaciones críticas deben quedar auditadas

### Dominios
- core
- households
- pets
- health
- reminders
- marketplace
- bookings
- messaging
- providers
- clinic
- commerce
- pharmacy
- finance
- benefits
- telecare
- admin

No mezclar dominios sin razón clara.

---

## Convenciones de base de datos
Toda tabla nueva debe:
- usar `uuid` como PK
- usar `created_at timestamptz default now()`
- usar `updated_at timestamptz` cuando aplique
- tener nombres en `snake_case`
- tener índices razonables
- considerar RLS desde el diseño inicial

Toda entidad sensible debe considerar:
- ownership
- household membership
- organization scoping
- auditabilidad

---

## Convenciones de TypeScript
- `strict: true`
- no usar `any` salvo caso muy justificado
- crear tipos DTO explícitos
- no duplicar interfaces ya existentes
- usar nombres consistentes con modelo de datos y contrato API

---

## Convenciones de frontend
- una pantalla por feature clara
- hooks reutilizables para acceso a datos
- separar:
  - screen
  - components
  - hooks
  - services
  - types
- evitar componentes gigantes
- mantener estados de carga, error y vacío

---

## Convenciones de backend
- un módulo de servicio por dominio
- validaciones de entrada claras
- respuestas consistentes
- errores expresivos
- trazabilidad de mutaciones
- no exponer datos fuera del scope autorizado

---

## Convenciones de documentación
Si cambias:
- una entidad
- un endpoint
- una pantalla
- un flujo crítico
- el alcance de un release

debes actualizar la documentación correspondiente en `/docs`.

No dejes código que contradiga documentación.

---

## Qué evitar
No hacer estas cosas:
- no inventar tablas fuera del modelo acordado
- no crear nombres alternativos para las mismas entidades
- no mezclar clínica y telecare en una sola lógica improvisada
- no meter V3 dentro del MVP
- no crear endpoints duplicados
- no duplicar tipos entre apps y packages
- no saltarte RLS en tablas sensibles
- no hardcodear reglas de negocio si ya están documentadas
- no construir features sin revisar `docs/delivery/MVP_SCOPE.md`

---

## Comportamiento esperado al responder
Cuando se te pida implementar algo:
1. identifica el módulo
2. indica brevemente qué archivos tocarás
3. mantén el alcance pequeño y controlado
4. implementa
5. deja comentarios mínimos pero útiles
6. sugiere siguiente paso pequeño

---

## Prioridad de releases
### MVP
Debe incluir solo:
- core auth/profile
- households
- pets
- documents básicos
- salud básica
- reminders
- marketplace básico
- booking básico
- pagos básicos
- chat
- reviews básicas
- soporte básico
- proveedor básico
- aprobación de proveedores

### V2
- ejecución de servicios
- clínica digital
- tienda
- pedidos
- gastos
- rewards
- provider ops ampliado
- disputas

### V3
- memberships
- telecare
- farmacia avanzada
- autoship
- presupuestos
- beneficios complejos

---

## Lista de verificación antes de cerrar una tarea
Antes de considerar una tarea terminada, verificar:
- compila
- lint pasa
- tests mínimos pasan
- tipos correctos
- nombres coherentes
- no se rompió el alcance del release
- documentación relevante actualizada si corresponde
