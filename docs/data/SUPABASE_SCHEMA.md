# SUPABASE_SCHEMA.md

## Objetivo
Definir el modelo de datos oficial del proyecto en Supabase/PostgreSQL.

## Principios
- PK `uuid`
- nombres en `snake_case`
- `created_at timestamptz default now()`
- `updated_at timestamptz` cuando aplique
- RLS desde el diseno inicial
- relaciones explicitas
- trazabilidad en mutaciones criticas

## Dominios principales
- profiles
- user_roles
- user_addresses
- payment_methods
- households
- household_members
- pets
- pet_profiles
- pet_documents
- pet_vaccines
- pet_allergies
- pet_conditions
- reminders
- calendar_events
- provider_organizations
- provider_public_profiles
- provider_services
- provider_availability
- bookings
- booking_pricing
- chat_threads
- chat_messages
- reviews
- support_cases
- payments

## Preparacion para releases posteriores
El modelo puede contemplar tablas futuras de clinica, commerce, farmacia, beneficios, finanzas y telecare, pero no deben implementarse en codigo de MVP si no estan dentro del release.

## Regla
No crear tablas fuera del modelo oficial sin actualizar esta documentacion.
