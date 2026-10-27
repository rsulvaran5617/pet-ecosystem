# Requires backend migration 20261027010000 (apply before deploying the renewal UI).
param(
  [string]$SshTarget = "root@143.198.165.191",
  [string]$IdentityFile = "$env:USERPROFILE/.ssh/pet_ecosystem_deploy",
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$script = @'
set -Eeuo pipefail
umask 077
REPO=/var/www/pet-ecosystem
COMMIT=71dc8b99db15d2af905dd4af08ed3d1b04af833a
RELEASE="/var/www/pet-releases/clinical-renewal-admin-${COMMIT:0:7}-$(date +%s)"
APP=pet-ecosystem-admin
CANDIDATE="clinical-renewal-admin-check-$$"

PREVIOUS=$(pm2 jlist | node -e '
let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{
 const p=JSON.parse(s).find(p=>p.name==="pet-ecosystem-admin");
 if(!p||p.pm2_env.status!=="online")process.exit(1);
 console.log(p.pm2_env.pm_cwd);
})')
case "$PREVIOUS" in /var/www/pet-ecosystem|/var/www/pet-releases/*) ;; *) echo "Unexpected active web path"; exit 1;; esac
test -f "$PREVIOUS/apps/admin/.next/BUILD_ID"
command -v rsync >/dev/null
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<13))throw Error("Node >=22.13 required")'
git -C "$REPO" fetch origin master
git -C "$REPO" cat-file -e "$COMMIT^{commit}"
mkdir "$RELEASE"
rsync -a --exclude=.git --exclude=node_modules --exclude=.next --exclude=dist \
  "$PREVIOUS/" "$RELEASE/"

# Overlay reviewed clinical UI and shared contracts, preserving active release/config.
for file in \
  apps/admin/src/features/clinical-access/components/AdminClinicalProfessionalsWorkspace.tsx \
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
for (const file of ['apps/admin/.env.production.local', 'apps/admin/.env.local', 'apps/admin/.env.production', 'apps/admin/.env']) {
  if (value || !fs.existsSync(file)) continue;
  const match = fs.readFileSync(file, 'utf8').match(/^\s*(?:export\s+)?NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*?)\s*$/m);
  if (match) value = match[1].replace(/^(['"])(.*)\1$/, '$2');
}
if (!value || new URL(value).hostname !== 'ivovbyxjwtvcavetewge.supabase.co') {
  throw new Error('Active admin points to a different Supabase project; deployment stopped.');
}
NODE
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @pet/admin build
printf '%s\n' "$COMMIT" > clinical-source-commit.txt
printf '%s\n' "$PREVIOUS" > previous-admin-release.txt



start_admin() {
  pm2 start "corepack pnpm --filter @pet/admin exec next start --hostname 127.0.0.1 --port $3" --name "$1" --cwd "$2"
}
healthy() {
  for attempt in $(seq 1 30); do
    if curl -fsS --max-time 5 "$1" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}
trap 'pm2 delete "$CANDIDATE" >/dev/null 2>&1 || true' EXIT
start_admin "$CANDIDATE" "$RELEASE" 3101
healthy http://127.0.0.1:3101

rollback() {
  trap - ERR
  pm2 delete "$APP" >/dev/null 2>&1 || true
  start_admin "$APP" "$PREVIOUS" 3001
  healthy http://127.0.0.1:3001
  pm2 delete "$CANDIDATE" >/dev/null 2>&1 || true
  pm2 save
  echo "Admin restored from: $PREVIOUS"
  exit 1
}
trap rollback ERR
pm2 delete "$APP"
start_admin "$APP" "$RELEASE" 3001
healthy http://127.0.0.1:3001
healthy https://admin.petecosyst.com
EXPECTED=$(cat apps/admin/.next/BUILD_ID)
curl -fsS --max-time 15 "https://admin.petecosyst.com/_next/static/$EXPECTED/_buildManifest.js" >/dev/null
ACTUAL=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).find(p=>p.name==="pet-ecosystem-admin").pm2_env.pm_cwd))')
test "$ACTUAL" = "$RELEASE"
pm2 delete "$CANDIDATE"
pm2 save
trap - ERR EXIT
echo "Admin updated: $COMMIT"
echo "Previous admin preserved: $PREVIOUS"
echo "Verify expired and pending professional review states with test accounts."
'@

$script = $script.Replace("`r`n", "`n") + "`n"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$bashCommand = if ($CheckOnly) { "bash -n" } else { "bash" }
ssh -i $IdentityFile -o IdentitiesOnly=yes $SshTarget "printf '%s' '$encoded' | base64 --decode | $bashCommand"
if ($LASTEXITCODE -ne 0) { throw "Admin update/check did not complete; inspect the error above." }
if ($CheckOnly) { Write-Host "Remote Bash syntax verified. No deployment performed." }
