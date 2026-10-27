# Requires backend migration 20261027010000 (apply before deploying the renewal UI).
param(
  [string]$SshTarget = "root@143.198.165.191",
  [string]$IdentityFile = "$env:USERPROFILE/.ssh/pet_ecosystem_deploy",
  [string]$AndroidBetaUrl = "",
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
if ($AndroidBetaUrl -and $AndroidBetaUrl -notmatch '^https://appdistribution\.firebase\.google\.com/testerapps/[A-Za-z0-9:/._%-]+$') {
  throw "AndroidBetaUrl must be a Firebase tester URL."
}
$androidUrlBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($AndroidBetaUrl))
$script = @'
set -Eeuo pipefail
umask 077
REPO=/var/www/pet-ecosystem
COMMIT=71dc8b99db15d2af905dd4af08ed3d1b04af833a
RELEASE="/var/www/pet-releases/clinical-renewal-${COMMIT:0:7}-$(date +%s)"
export ANDROID_BETA_URL=$(printf '%s' '__ANDROID_URL__' | base64 --decode)
APP=pet-ecosystem-web
CANDIDATE="clinical-renewal-check-$$"

PREVIOUS=$(pm2 jlist | node -e '
let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{
 const p=JSON.parse(s).find(p=>p.name==="pet-ecosystem-web");
 if(!p||p.pm2_env.status!=="online")process.exit(1);
 console.log(p.pm2_env.pm_cwd);
})')
case "$PREVIOUS" in /var/www/pet-ecosystem|/var/www/pet-releases/*) ;; *) echo "Unexpected active web path"; exit 1;; esac
test -f "$PREVIOUS/apps/web/.next/BUILD_ID"
command -v rsync >/dev/null
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<13))throw Error("Node >=22.13 required")'
git -C "$REPO" fetch origin master
git -C "$REPO" cat-file -e "$COMMIT^{commit}"
mkdir "$RELEASE"
rsync -a --exclude=.git --exclude=node_modules --exclude=.next --exclude=dist \
  "$PREVIOUS/" "$RELEASE/"

# Overlay reviewed clinical UI and shared contracts, preserving active release/config.
for file in \
  apps/web/src/features/core/screens/CoreExperienceScreen.tsx \
  apps/web/src/features/core/hooks/useClinicalAuthReturn.ts \
  apps/web/package.json \
  pnpm-lock.yaml \
  eslint.config.mjs \
  apps/web/scripts/copy-pdf-assets.mjs \
  apps/web/src/features/clinical-access/components/ReadOnlyPdfViewer.tsx \
  apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx \
  apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.tsx \
  apps/web/src/features/clinical-access/components/SharedClinicalDocuments.tsx \
  apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.module.css \
  packages/api-client/src/clinical-access.ts \
  packages/types/src/clinical-access.ts \
  packages/types/src/database.ts; do
  mkdir -p "$(dirname "$RELEASE/$file")"
  git -C "$REPO" show "$COMMIT:$file" > "$RELEASE/$file"
done
cd "$RELEASE"
node <<'NODE'
const fs = require('fs');
let value = process.env.NEXT_PUBLIC_SUPABASE_URL;
for (const file of ['apps/web/.env.production.local', 'apps/web/.env.local', 'apps/web/.env.production', 'apps/web/.env']) {
  if (value || !fs.existsSync(file)) continue;
  const match = fs.readFileSync(file, 'utf8').match(/^\s*(?:export\s+)?NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*?)\s*$/m);
  if (match) value = match[1].replace(/^(['"])(.*)\1$/, '$2');
}
if (!value || new URL(value).hostname !== 'ivovbyxjwtvcavetewge.supabase.co') {
  throw new Error('Active web points to a different Supabase project; deployment stopped.');
}
NODE
if [ -n "$ANDROID_BETA_URL" ]; then
  node <<'NODE'
const fs=require('fs');
const name='apps/web/.env.production.local';
const previous=fs.existsSync(name)?fs.readFileSync(name,'utf8'):'';
const lines=previous.split(/\r?\n/).filter(l=>!/^\s*(?:export\s+)?NEXT_PUBLIC_ANDROID_BETA_URL\s*=/.test(l));
lines.push('NEXT_PUBLIC_ANDROID_BETA_URL='+process.env.ANDROID_BETA_URL);
fs.writeFileSync(name,lines.join('\n')+'\n',{mode:0o600});
NODE
  export NEXT_PUBLIC_ANDROID_BETA_URL="$ANDROID_BETA_URL"
fi
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @pet/web build
printf '%s\n' "$COMMIT" > clinical-source-commit.txt
printf '%s\n' "$PREVIOUS" > previous-web-release.txt

PDF_VERSION=$(node -p 'require("./apps/web/node_modules/pdfjs-dist/package.json").version')
check_pdf_assets() {
  for asset in pdf.worker.min.mjs standard_fonts/FoxitDingbats.pfb; do
    local expected actual
    expected=$(sha256sum "apps/web/public/pdfjs/$PDF_VERSION/$asset" | cut -d ' ' -f 1)
    actual=$(curl -fsS --max-time 30 "$1/pdfjs/$PDF_VERSION/$asset" | sha256sum | cut -d ' ' -f 1) || return 1
    test "$expected" = "$actual" || return 1
  done
}

start_web() {
  pm2 start "corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port $3" --name "$1" --cwd "$2"
}
healthy() {
  for attempt in $(seq 1 30); do
    if curl -fsS --max-time 5 "$1" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}
trap 'pm2 delete "$CANDIDATE" >/dev/null 2>&1 || true' EXIT
start_web "$CANDIDATE" "$RELEASE" 3100
healthy http://127.0.0.1:3100
check_pdf_assets http://127.0.0.1:3100
curl -fsS --max-time 15 http://127.0.0.1:3100/clinical-access/release-check >/dev/null
curl -fsS --max-time 15 http://127.0.0.1:3100/app >/dev/null

rollback() {
  trap - ERR
  pm2 delete "$APP" >/dev/null 2>&1 || true
  start_web "$APP" "$PREVIOUS" 3000
  healthy http://127.0.0.1:3000
  pm2 delete "$CANDIDATE" >/dev/null 2>&1 || true
  pm2 save
  echo "Web restored from: $PREVIOUS"
  exit 1
}
trap rollback ERR
pm2 delete "$APP"
start_web "$APP" "$RELEASE" 3000
healthy http://127.0.0.1:3000
healthy https://petecosyst.com
check_pdf_assets https://petecosyst.com
healthy https://petecosyst.com/clinical-access/release-check
EXPECTED=$(cat apps/web/.next/BUILD_ID)
curl -fsS --max-time 15 "https://petecosyst.com/_next/static/$EXPECTED/_buildManifest.js" >/dev/null
ACTUAL=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).find(p=>p.name==="pet-ecosystem-web").pm2_env.pm_cwd))')
test "$ACTUAL" = "$RELEASE"
if [ -n "$ANDROID_BETA_URL" ]; then
  LOCATION=$(curl -sS --max-time 15 -o /dev/null -w '%{redirect_url}' https://petecosyst.com/beta/android)
  test "$LOCATION" = "$ANDROID_BETA_URL"
fi
pm2 delete "$CANDIDATE"
pm2 save
trap - ERR EXIT
echo "Web updated: $COMMIT"
echo "Previous web preserved: $PREVIOUS"
echo "Verify temporary image/PDF access, expiry and revocation with test accounts."
'@

$script = $script.Replace('__ANDROID_URL__', $androidUrlBase64).Replace("`r`n", "`n") + "`n"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$bashCommand = if ($CheckOnly) { "bash -n" } else { "bash" }
ssh -i $IdentityFile -o IdentitiesOnly=yes $SshTarget "printf '%s' '$encoded' | base64 --decode | $bashCommand"
if ($LASTEXITCODE -ne 0) { throw "Web update/check did not complete; inspect the error above." }
if ($CheckOnly) { Write-Host "Remote Bash syntax verified. No deployment performed." }
