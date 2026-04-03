# apps/web

Base web del MVP.

## Responsabilidad
- discovery web
- experiencia provider-facing inicial
- páginas públicas o flows complementarios del release vigente

## Estado actual
Este workspace funciona como shell técnico inicial con Next.js + TypeScript.

## Reglas
- no duplicar lógica del admin
- no duplicar lógica móvil si puede compartirse
- usar `packages/types`, `packages/api-client`, `packages/ui` y `packages/config`
