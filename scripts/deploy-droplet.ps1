param(
  [Parameter(Mandatory = $true)]
  [string]$SshTarget,

  [string]$RepoUrl = "https://github.com/rsulvaran5617/pet-ecosystem.git",
  [string]$Branch = "master",
  [string]$RemotePath = "/var/www/pet-ecosystem",
  [string]$RootDomain = "petecosyst.com",
  [string]$AdminDomain = "admin.petecosyst.com",
  [string]$CertbotEmail = "",
  [switch]$IncludeWww,
  [switch]$SetupSsl
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)

  $values = @{}

  if (!(Test-Path -LiteralPath $Path)) {
    return $values
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()

    if (!$line -or $line.StartsWith("#") -or !$line.Contains("=")) {
      return
    }

    $key, $value = $line.Split("=", 2)
    $values[$key.Trim()] = $value.Trim().Trim('"').Trim("'")
  }

  return $values
}

function Resolve-EnvValue {
  param(
    [string]$Key,
    [hashtable[]]$Sources
  )

  foreach ($source in $Sources) {
    if ($source.ContainsKey($Key) -and $source[$Key]) {
      return $source[$Key]
    }
  }

  throw "Missing required environment variable: $Key"
}

if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw "ssh is not available in this shell."
}

function Invoke-RemoteScript {
  param(
    [string]$Script,
    [string]$Label
  )

  Write-Host "Running remote step: $Label"
  $Script | ssh $SshTarget "bash -s"

  if ($LASTEXITCODE -ne 0) {
    throw "Remote step failed: $Label"
  }
}

$rootEnv = Read-EnvFile ".env.local"
$webEnv = Read-EnvFile "apps/web/.env.local"
$adminEnv = Read-EnvFile "apps/admin/.env.local"

$supabaseUrl = Resolve-EnvValue "NEXT_PUBLIC_SUPABASE_URL" @($webEnv, $adminEnv, $rootEnv)
$supabaseAnonKey = Resolve-EnvValue "NEXT_PUBLIC_SUPABASE_ANON_KEY" @($webEnv, $adminEnv, $rootEnv)

$envProduction = @"
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnonKey
NEXT_TELEMETRY_DISABLED=1
"@

Write-Host "Deploying Pet Ecosystem to $SshTarget"
Write-Host "Remote path: $RemotePath"
Write-Host "Domains: $RootDomain, $AdminDomain"
Write-Host "Supabase env values loaded locally and will not be printed."

$remoteBootstrap = @"
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get install -y git curl nginx ufw certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo corepack enable || corepack enable
sudo corepack prepare pnpm@9.0.0 --activate || corepack prepare pnpm@9.0.0 --activate

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

sudo mkdir -p /var/www
sudo chown -R `$USER:`$USER /var/www

if [ ! -d "$RemotePath/.git" ]; then
  rm -rf "$RemotePath"
  git clone "$RepoUrl" "$RemotePath"
fi

cd "$RemotePath"
git fetch origin "$Branch"
git checkout "$Branch"
git reset --hard "origin/$Branch"

corepack pnpm install --config.frozen-lockfile=true
"@

Invoke-RemoteScript -Script $remoteBootstrap -Label "bootstrap server and install dependencies"

$envProduction | ssh $SshTarget "mkdir -p '$RemotePath/apps/web' '$RemotePath/apps/admin' && cat > '$RemotePath/apps/web/.env.production' && cp '$RemotePath/apps/web/.env.production' '$RemotePath/apps/admin/.env.production'"

if ($LASTEXITCODE -ne 0) {
  throw "Remote step failed: write production environment files"
}

$rootServerNames = if ($IncludeWww) { "$RootDomain www.$RootDomain" } else { $RootDomain }

$remoteDeploy = @"
set -euo pipefail

cd "$RemotePath"

corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/admin build

pm2 delete pet-ecosystem-web >/dev/null 2>&1 || true
pm2 delete pet-ecosystem-admin >/dev/null 2>&1 || true

pm2 start "corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port 3000" --name pet-ecosystem-web
pm2 start "corepack pnpm --filter @pet/admin exec next start --hostname 127.0.0.1 --port 3001" --name pet-ecosystem-admin
pm2 save

PM2_STARTUP_CMD=`$(pm2 startup systemd -u `$USER --hp `$HOME | tail -n 1 || true)
if echo "`$PM2_STARTUP_CMD" | grep -q '^sudo '; then
  eval "`$PM2_STARTUP_CMD"
fi

sudo tee /etc/nginx/sites-available/pet-ecosystem >/dev/null <<'NGINX'
server {
    listen 80;
    server_name $rootServerNames;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name $AdminDomain;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/pet-ecosystem /etc/nginx/sites-enabled/pet-ecosystem
sudo nginx -t
sudo systemctl reload nginx

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

if [ -f "/etc/letsencrypt/live/$RootDomain/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$RootDomain/privkey.pem" ]; then
  sudo certbot --nginx --non-interactive --keep-until-expiring -d "$RootDomain" -d "$AdminDomain" >/dev/null
fi

curl -fsSI --max-time 10 http://127.0.0.1:3000 >/dev/null
curl -fsSI --max-time 10 http://127.0.0.1:3001 >/dev/null

pm2 list || true
"@

Invoke-RemoteScript -Script $remoteDeploy -Label "build apps and configure nginx"

if ($SetupSsl) {
  if ($CertbotEmail) {
    $certbotContactArgs = "--non-interactive --agree-tos --email `"$CertbotEmail`""
  } else {
    $certbotContactArgs = "--non-interactive --agree-tos --register-unsafely-without-email"
  }

  $certbotDomainArgs = if ($IncludeWww) { "-d `"$RootDomain`" -d `"www.$RootDomain`" -d `"$AdminDomain`"" } else { "-d `"$RootDomain`" -d `"$AdminDomain`"" }

  $remoteSsl = @"
set -euo pipefail
sudo certbot --nginx $certbotContactArgs $certbotDomainArgs
"@

  Invoke-RemoteScript -Script $remoteSsl -Label "configure ssl certificates"
}

Write-Host "Deployment completed."
Write-Host "Verify:"
Write-Host "  http://$RootDomain"
Write-Host "  http://$RootDomain/app"
Write-Host "  http://$AdminDomain"
if ($SetupSsl) {
  Write-Host "  https://$RootDomain"
  Write-Host "  https://$RootDomain/app"
  Write-Host "  https://$AdminDomain"
  if ($IncludeWww) {
    Write-Host "  https://www.$RootDomain"
  }
}
