# MONOREPO_CONVENTIONS.md

## Objetivo
Definir reglas del monorepo para mantener consistencia.

## Principios
- una sola fuente de verdad por responsabilidad
- no duplicación de tipos o lógica
- organización por dominio
- apps desacopladas entre sí
- bootstrap primero, negocio después

## Packages
### `packages/types`
Tipos del dominio

### `packages/ui`
Tokens y utilidades UI compartidas

### `packages/api-client`
Acceso a datos y servicios

### `packages/config`
Configuración compartida

## Apps
### `apps/mobile`
App principal del usuario

### `apps/web`
Base web del MVP y experiencia provider-facing inicial

### `apps/admin`
Backoffice admin

## Reglas
- apps consumen packages
- apps no deben depender unas de otras
- no duplicar clientes de Supabase
- no duplicar tipos del dominio
- no colocar lógica de negocio pesada en componentes
- no crear paquetes nuevos sin un caso compartido real
- los nuevos módulos deben documentarse en `docs/modules/`

## Imports
Preferir imports desde packages compartidos.

Ejemplo:
```ts
import { Pet } from "@pet/types";
```

## Convención de ownership
- `apps/*` contiene experiencia por canal
- `packages/*` contiene contratos reutilizables
- `supabase/*` contiene persistencia e infraestructura
- `docs/*` contiene la fuente de verdad documental

## Convención de releases
- MVP define el mínimo operable
- V2 y V3 no deben entrar en la base inicial si no están explícitamente documentados
