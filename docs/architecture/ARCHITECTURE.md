# ARCHITECTURE.md

## Objetivo
Definir la arquitectura técnica general del ecosistema pet.

## Principio general
Arquitectura modular por dominios, con separación clara entre presentación, código compartido y datos.

## Capas

### 1. Presentación
- `apps/mobile`
- `apps/web`
- `apps/admin`

Responsabilidad:
- pantallas
- navegación
- estados visuales
- composición de experiencia
- consumo de packages compartidos

### 2. Shared packages
- `packages/types`
- `packages/ui`
- `packages/api-client`
- `packages/config`

Responsabilidad:
- tipado compartido
- tokens y utilidades UI
- acceso a datos y contratos
- configuración reutilizable

### 3. Datos e infraestructura
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Edge Functions cuando sea necesario

Responsabilidad:
- persistencia
- autorización
- storage
- eventos
- trazabilidad

## Dominios del sistema
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

## Principios arquitectónicos

### La mascota es la entidad central
La mayoría del modelo gira alrededor de `pet`, su hogar y sus interacciones transaccionales.

### MVP primero
La construcción sigue el orden oficial del release y evita introducir verticales V2 o V3 antes de estabilizar MVP.

### Monorepo sin duplicación
- los tipos viven en `packages/types`
- la UI compartida vive en `packages/ui`
- el acceso a datos vive en `packages/api-client`
- la configuración reutilizable vive en `packages/config`

### Seguridad desde el diseño
- ownership
- household access
- provider scoping
- admin scoping
- RLS para datos sensibles

### Trazabilidad obligatoria
Las mutaciones críticas de bookings, pagos, soporte y aprobaciones deben quedar auditadas.

## Organización del código

### Apps
- `apps/mobile`: dueño de mascota
- `apps/web`: base web del MVP para discovery y experiencia provider-facing inicial
- `apps/admin`: operación interna y aprobaciones

### Packages
Código compartido entre apps sin mezclar lógica específica de una superficie con otra.

### Supabase
Configuración local, migraciones, seeds y documentación del modelo de datos.

### Docs
Fuente de verdad documental del producto, arquitectura, datos, APIs y releases.

## Reglas
- no duplicar lógica de negocio entre apps
- no duplicar tipos
- no acoplar UI directamente a SQL
- no mezclar módulos sin necesidad
- no construir V2 o V3 antes de cerrar MVP
