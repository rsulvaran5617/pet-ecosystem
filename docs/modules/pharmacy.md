# pharmacy.md

## Objetivo
Gestionar recetas, refill y órdenes farmacéuticas.

## V2
- recetas activas
- refill básico

## V3
- checkout farmacéutico
- validación regulatoria
- fulfillment

## Entidades
- prescriptions
- pharmacy_orders

## Reglas
- la receta debe ser válida para ciertos productos
- el acceso debe respetar permisos del hogar y de la clínica

## APIs
- `/pharmacy/prescriptions`
- `/pharmacy/refill-requests`
- `/pharmacy/orders`
# pharmacy.md

## Objetivo del módulo
Gestionar capacidades farmacéuticas reguladas cuando entren en alcance.

## Release
V3.

## Fuera de MVP
- checkout farmacéutico regulado
- validación avanzada de receta
- fulfillment farmacéutico

## Regla
No mezclar farmacia avanzada con comercio MVP.
