# benefits.md

## Objetivo
Gestionar rewards, cupones, beneficios y memberships.

## V2
- wallet básica
- rewards simples
- cupones
- acumulación por compra o servicio

## V3
- memberships
- beneficios por plan
- cashback
- expiración avanzada

## Entidades
- rewards_wallets
- wallet_movements
- memberships

## Reglas
- un usuario tiene una wallet principal
- los movimientos deben ser trazables
- los beneficios deben respetar elegibilidad

## APIs
- `/wallet`
- `/wallet/movements`
- `/memberships/plans`
- `/memberships`