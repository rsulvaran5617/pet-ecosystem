# DigitalOcean App Platform deployment

## Objetivo

Preparar el despliegue web inicial de Pet Ecosystem en DigitalOcean App Platform usando:

- `petcosys.com` para la landing publica y experiencia web owner/provider.
- `admin.petcosys.com` para el backoffice admin.

Este documento es preparatorio. No cambia Supabase, no ejecuta migraciones, no abre pagos reales y no modifica reglas de negocio.

## Diagnostico del monorepo

- Repositorio: `pet-ecosystem`.
- Rama estable actual: `master`.
- Gestor: PNPM workspaces.
- Workspaces declarados en `pnpm-workspace.yaml`:
  - `apps/*`
  - `packages/*`
- Backend actual: Supabase.
- Mobile Android: distribucion por APK privada, fuera de este despliegue.

### Aplicaciones web

| Superficie | Workspace | Ruta local | Framework | Ruta publica objetivo |
| --- | --- | --- | --- | --- |
| Landing/web publica | `@pet/web` | `apps/web` | Next.js | `petcosys.com` |
| Admin web | `@pet/admin` | `apps/admin` | Next.js | `admin.petcosys.com` |

### Rutas actuales

`apps/web`:

- `/`: landing publica de identidad.
- `/app`: experiencia autenticada por rol owner/provider.

`apps/admin`:

- `/`: login/admin backoffice.

### Scripts actuales

`apps/web/package.json`:

- `build`: `next build`
- `start`: `next start --port 3000`
- `lint`: `eslint .`
- `typecheck`: `tsc --noEmit`

`apps/admin/package.json`:

- `build`: `next build`
- `start`: `next start --port 3001`
- `lint`: `eslint .`
- `typecheck`: `tsc --noEmit`

Conclusion: `apps/admin` ya tiene script de production start. No hace falta cambiar `package.json` para App Platform si se configura un `run_command` explicito que use el puerto inyectado por DigitalOcean.

## Recomendacion: App Platform vs Droplet

Recomendacion inicial: DigitalOcean App Platform.

Razones:

- El alcance inicial son dos apps Next.js sin servidor propio adicional.
- App Platform integra build desde GitHub, despliegue por rama, TLS y dominios administrados.
- Reduce carga operativa frente a Droplet: no hay que mantener Nginx, PM2/systemd, certificados ni parches del sistema.
- Encaja con Supabase como backend externo.

Usar Droplet solo si aparece una necesidad concreta de control de servidor: proxy avanzado, procesos persistentes custom, costos muy optimizados con administracion manual, o restricciones no soportadas por App Platform.

## Estrategia recomendada

Crear dos apps separadas en DigitalOcean App Platform, ambas desde el mismo repo y rama `master`:

1. `pet-ecosystem-web`
   - Dominio: `petcosys.com`.
   - Workspace: `@pet/web`.
   - Publica landing `/` y app autenticada `/app`.

2. `pet-ecosystem-admin`
   - Dominio: `admin.petcosys.com`.
   - Workspace: `@pet/admin`.
   - Publica backoffice admin.

Separarlas evita mezclar routing publico/admin dentro de una sola app y permite escalar, pausar o proteger admin de forma independiente.

## Configuracion exacta: petcosys.com

Tipo de componente: Web Service.

Repositorio:

- Provider: GitHub.
- Repo: `rsulvaran5617/pet-ecosystem`.
- Branch: `master`.
- Autodeploy: recomendado `true` despues de validar el primer deploy.

Build settings:

- Source directory: `/`
- Build command:

```sh
corepack enable && corepack pnpm --filter @pet/web build
```

- Run command:

```sh
corepack pnpm --filter @pet/web exec next start --hostname 0.0.0.0 --port $PORT
```

Notas:

- Usar source directory `/` es importante porque `@pet/web` depende de paquetes workspace en `packages/*`.
- No usar `apps/web` como source directory salvo que se cambie la estrategia de build, porque perderia contexto del monorepo.

Dominio:

- Agregar `petcosys.com` en Networking > Domains.
- Si DNS lo gestiona DigitalOcean, dejar que App Platform cree/verifique registros.
- Si DNS lo gestiona otro proveedor, usar el CNAME/A records que App Platform muestre para el dominio.

## Configuracion exacta: admin.petcosys.com

Tipo de componente: Web Service.

Repositorio:

- Provider: GitHub.
- Repo: `rsulvaran5617/pet-ecosystem`.
- Branch: `master`.
- Autodeploy: recomendado `true` despues de validar el primer deploy.

Build settings:

- Source directory: `/`
- Build command:

```sh
corepack enable && corepack pnpm --filter @pet/admin build
```

- Run command:

```sh
corepack pnpm --filter @pet/admin exec next start --hostname 0.0.0.0 --port $PORT
```

Dominio:

- Agregar `admin.petcosys.com` en Networking > Domains.
- Crear/verificar el DNS que App Platform indique.

## Variables de entorno requeridas

Configurar en App Platform para ambas apps:

| Variable | Requerida | Alcance | Nota |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Si | Build + runtime | URL publica del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si | Build + runtime | Anon key publica de Supabase. No usar service role. |
| `NEXT_TELEMETRY_DISABLED` | No | Build + runtime | Valor sugerido: `1`. |

No configurar ni exponer:

- Supabase service role key.
- Secrets de pagos.
- Credenciales de base de datos.
- Tokens personales de DigitalOcean dentro del repo.

## DNS esperado

La configuracion exacta depende de si el DNS de `petcosys.com` lo administra DigitalOcean o un proveedor externo.

### Si DigitalOcean administra DNS

1. Delegar nameservers del dominio a DigitalOcean.
2. En App Platform, agregar `petcosys.com` a la app web.
3. En App Platform, agregar `admin.petcosys.com` a la app admin.
4. Dejar que DigitalOcean cree los registros necesarios.
5. Esperar emision de certificado TLS y propagacion.

### Si el DNS lo administra un proveedor externo

1. Agregar el dominio en App Platform.
2. Copiar los registros que DigitalOcean muestre.
3. Para `admin.petcosys.com`, normalmente crear un `CNAME` hacia el alias `*.ondigitalocean.app` indicado por App Platform.
4. Para `petcosys.com` apex, usar CNAME flattening/ALIAS si el proveedor lo soporta; si no, usar los A records que App Platform entregue.
5. Esperar propagacion DNS. DigitalOcean indica que puede tardar hasta 72 horas.

## Checklist DNS

- [ ] Confirmar donde se administra DNS de `petcosys.com`.
- [ ] Crear app `pet-ecosystem-web` en App Platform.
- [ ] Asociar `petcosys.com` a la app web.
- [ ] Crear app `pet-ecosystem-admin` en App Platform.
- [ ] Asociar `admin.petcosys.com` a la app admin.
- [ ] Configurar registros DNS indicados por App Platform.
- [ ] Verificar certificados TLS activos.
- [ ] Verificar `https://petcosys.com`.
- [ ] Verificar `https://petcosys.com/app`.
- [ ] Verificar `https://admin.petcosys.com`.

## App spec YAML propuesto

Se incluye una propuesta no aplicada en:

- `docs/deployment/digitalocean-app-platform.proposed.yaml`

El archivo contiene dos documentos YAML separados:

- app `pet-ecosystem-web`
- app `pet-ecosystem-admin`

Antes de usarlo con `doctl`, revisar:

- `github.repo`
- region
- instance size
- variables de entorno
- dominios generados/verificados por App Platform

## Validaciones locales requeridas

Ejecutar antes de abrir PR/commit de deployment:

```powershell
corepack pnpm --filter @pet/admin build
corepack pnpm --filter @pet/admin typecheck
corepack pnpm --filter @pet/admin lint
corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/web typecheck
corepack pnpm --filter @pet/web lint
git diff --check
```

## Riesgos de deployment

| Riesgo | Severidad | Mitigacion |
| --- | --- | --- |
| Source directory incorrecto (`apps/web` o `apps/admin`) rompe imports workspace | Alta | Usar source directory `/` y comandos `pnpm --filter`. |
| Run command con puerto fijo no escucha `$PORT` de App Platform | Alta | Usar `next start --hostname 0.0.0.0 --port $PORT`. |
| Variables Supabase faltantes | Alta | Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en ambas apps. |
| DNS apex sin CNAME flattening | Media | Usar A records indicados por App Platform o mover DNS a DigitalOcean. |
| Admin expuesto publicamente | Media | Mantener control por Supabase Auth/rol admin; considerar allowlist/WAF en fase posterior si se requiere. |
| Autodeploy antes de validar | Media | Desactivar o validar manualmente el primer deploy; activar luego. |
| Diferencias entre local Windows y build Linux | Media | Confiar en build App Platform y mantener comandos POSIX simples. |

## Fuentes oficiales consultadas

- DigitalOcean App Spec Reference: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
- DigitalOcean Manage Build and Run Commands: https://docs.digitalocean.com/products/app-platform/how-to/build-run-commands/
- DigitalOcean Manage Domains in App Platform: https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/
