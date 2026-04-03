# supabase

Base tecnica de datos e infraestructura local.

## Contenido
- `config.toml`: configuracion local de Supabase
- `migrations/`: migraciones SQL
- `seed/`: datos de arranque y seeds
- `functions/`: edge functions cuando sean necesarias
- `data/`: referencias locales hacia la documentacion canonica en `docs/data`

## Regla
Toda modificacion de esquema debe reflejarse en:
1. migracion SQL dentro de `supabase/migrations`
2. documentacion canonica dentro de `docs/data`

## Fuente de verdad del modelo
- `docs/data/SUPABASE_SCHEMA.md`
- `docs/data/DATA_MODEL.md`
- `docs/data/RLS_RULES.md`
