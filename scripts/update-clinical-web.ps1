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
set -euo pipefail
umask 077
REPO=/var/www/pet-ecosystem
COMMIT=d9d28ee9e3905cafed090ff58a0a42d5efe9c561
RELEASE="/var/www/pet-releases/clinical-web-${COMMIT:0:7}-$(date +%s)"
APP=pet-ecosystem-web
CANDIDATE="clinical-web-check-$$"
export ANDROID_BETA_URL=$(printf '%s' '__ANDROID_URL__' | base64 --decode)

PREVIOUS=$(pm2 jlist | node -e '
let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{
 const p=JSON.parse(s).find(p=>p.name==="pet-ecosystem-web");
 if(!p||p.pm2_env.status!=="online")process.exit(1);
 console.log(p.pm2_env.pm_cwd);
})')
case "$PREVIOUS" in /var/www/pet-ecosystem|/var/www/pet-releases/*) ;; *) echo "Unexpected active web path"; exit 1;; esac
test -f "$PREVIOUS/apps/web/.next/BUILD_ID"
command -v rsync >/dev/null
git -C "$REPO" fetch origin master
git -C "$REPO" cat-file -e "$COMMIT^{commit}"
mkdir "$RELEASE"
rsync -a --exclude=.git --exclude=node_modules --exclude=.next --exclude=dist \
  "$PREVIOUS/" "$RELEASE/"

# Overlay only the reviewed web components, preserving the active release/config.
for file in \
  apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx \
  apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.tsx; do
  git -C "$REPO" show "$COMMIT:$file" > "$RELEASE/$file"
done
cd "$RELEASE"
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
echo "Verify the professional request and owner approval with test accounts."
'@

$script = $script.Replace('__ANDROID_URL__', $androidUrlBase64).Replace("`r`n", "`n") + "`n"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$bashCommand = if ($CheckOnly) { "bash -n" } else { "bash" }
ssh -i $IdentityFile -o IdentitiesOnly=yes $SshTarget "printf '%s' '$encoded' | base64 --decode | $bashCommand"
if ($LASTEXITCODE -ne 0) { throw "Web update/check did not complete; inspect the error above." }
if ($CheckOnly) { Write-Host "Remote Bash syntax verified. No deployment performed." }
