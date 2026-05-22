# DigitalOcean Droplet deployment

## Objetivo

Publicar Pet Ecosystem en una gota de DigitalOcean usando Nginx como reverse proxy, PM2 como process manager y Certbot para HTTPS.

Este despliegue no toca Supabase, no ejecuta migraciones, no modifica reglas de negocio y no incluye pagos ni modulos nuevos.

## Estado validado

Fecha de validacion: 2026-05-22.

Servidor:

- Droplet: `143.198.165.191`
- Usuario SSH usado: `root`
- Ruta remota: `/var/www/pet-ecosystem`
- Rama desplegada: `master`

Dominios:

- Landing publica y web: `https://petecosyst.com`
- App web autenticada: `https://petecosyst.com/app`
- Admin web: `https://admin.petecosyst.com`

El despliegue quedo validado con respuestas `HTTP/1.1 200 OK` en los tres endpoints HTTPS.

## DNS requerido

Registros minimos:

| Tipo | Host | Valor |
| --- | --- | --- |
| `A` | `@` | `143.198.165.191` |
| `A` | `admin` | `143.198.165.191` |

Opcional:

| Tipo | Host | Valor |
| --- | --- | --- |
| `CNAME` | `www` | `petecosyst.com` |

Antes de emitir SSL, verificar:

```powershell
Resolve-DnsName petecosyst.com -Type A
Resolve-DnsName admin.petecosyst.com -Type A
```

Ambos deben resolver a `143.198.165.191`.

## Script de despliegue

El script versionado es:

- `scripts/deploy-droplet.ps1`

Uso normal:

```powershell
.\scripts\deploy-droplet.ps1 -SshTarget "root@143.198.165.191" -SetupSsl
```

Si se configura `www.petecosyst.com` en DNS:

```powershell
.\scripts\deploy-droplet.ps1 -SshTarget "root@143.198.165.191" -SetupSsl -IncludeWww
```

Si se quiere asociar email a Let's Encrypt:

```powershell
.\scripts\deploy-droplet.ps1 -SshTarget "root@143.198.165.191" -SetupSsl -CertbotEmail "admin@example.com"
```

No guardar tokens de DigitalOcean ni secretos de Supabase en el repositorio.

## Variables de entorno

El script lee localmente, sin imprimir valores:

- `.env.local`
- `apps/web/.env.local`
- `apps/admin/.env.local`

Variables requeridas para web/admin:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase |

En la gota el script escribe:

- `apps/web/.env.production`
- `apps/admin/.env.production`

Tambien define:

- `NEXT_TELEMETRY_DISABLED=1`

## Que instala/configura el script

En el servidor remoto:

- Actualiza paquetes base.
- Instala `git`, `curl`, `nginx`, `ufw`, `certbot` y `python3-certbot-nginx`.
- Instala Node.js 22 si no existe.
- Activa Corepack y `pnpm@9.0.0`.
- Instala PM2 global si no existe.
- Clona o actualiza el repo en `/var/www/pet-ecosystem`.
- Ejecuta `corepack pnpm install --config.frozen-lockfile=true`.
- Compila `@pet/web` y `@pet/admin`.
- Levanta procesos PM2:
  - `pet-ecosystem-web` en `127.0.0.1:3000`
  - `pet-ecosystem-admin` en `127.0.0.1:3001`
- Configura Nginx para:
  - `petecosyst.com` -> `127.0.0.1:3000`
  - `admin.petecosyst.com` -> `127.0.0.1:3001`
- Habilita firewall con OpenSSH y Nginx Full.
- Si se usa `-SetupSsl`, ejecuta Certbot para HTTPS.

## Comandos de verificacion

Desde Windows/local:

```powershell
curl.exe -I https://petecosyst.com
curl.exe -I https://petecosyst.com/app
curl.exe -I https://admin.petecosyst.com
```

En la gota:

```sh
pm2 list
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo certbot certificates
```

## Renovacion SSL

Certbot deja renovacion automatica programada en el servidor.

Verificacion manual:

```sh
sudo certbot renew --dry-run
```

## Troubleshooting

### Certbot falla con NXDOMAIN

El dominio no resuelve publicamente. Verificar registros `A` para `petecosyst.com` y `admin.petecosyst.com`.

### Nginx falla con `proxy_set_header`

Revisar que las variables de Nginx dentro del script esten escapadas para PowerShell, por ejemplo:

```nginx
proxy_set_header Host `$host;
```

### `next: not found`

Indica que faltan dependencias en la gota. Ejecutar de nuevo el script o revisar:

```sh
cd /var/www/pet-ecosystem
corepack pnpm install --config.frozen-lockfile=true
```

### PM2 muestra procesos online pero el sitio no responde

Revisar logs:

```sh
pm2 logs pet-ecosystem-web
pm2 logs pet-ecosystem-admin
```

Luego validar puertos internos:

```sh
curl -fsSI http://127.0.0.1:3000
curl -fsSI http://127.0.0.1:3001
```
