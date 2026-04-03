# ENVIRONMENT_VARIABLES.md

## Objetivo
Centralizar las variables de entorno mínimas del bootstrap técnico.

## Variables compartidas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `PAYMENT_PROVIDER_PUBLIC_KEY`
- `PAYMENT_PROVIDER_SECRET_KEY`

## Ubicacion local recomendada
- `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- root `.env.local` o variables de shell: `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`

## Reglas
- no commitear secretos reales
- usar `.env.example` como plantilla
- mantener nombres consistentes entre apps y backend
- cualquier variable nueva debe documentarse aquí
