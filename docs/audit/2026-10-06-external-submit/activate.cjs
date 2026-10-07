// Run on the Droplet. Default is read-only preflight; --activate changes only web.
const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { parseEnv } = require('node:util');
const target = '/var/www/pet-releases/external-submit-20261007';
const previous = '/var/www/pet-releases/otp-resend-20261007';
const candidateName = 'pet-external-submit-candidate';
const route = '/pet-alert/reportar-mi-mascota';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const pm = (...args) => cp.execFileSync('pm2', args, { encoding: 'utf8', timeout: 30000 });
const processes = () => JSON.parse(pm('jlist'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function page(base) {
  const response = await fetch(base + route, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  assert.equal(response.status, 200);
  return hash(await response.text());
}
async function healthy(base, expected) {
  for (let i = 0; i < 20; i++) {
    try { if (await page(base) === expected) return true; } catch { /* startup */ }
    await sleep(1000);
  }
  return false;
}
function start(cwd) {
  pm('start', '/usr/bin/bash', '--name', 'pet-ecosystem-web', '--cwd', cwd,
    '--', '-c', 'corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port 3000');
}
async function main() {
  assert.equal(process.platform, 'linux');
  const active = processes().find(p => p.name === 'pet-ecosystem-web');
  const admin = processes().find(p => p.name === 'pet-ecosystem-admin');
  const candidate = processes().find(p => p.name === candidateName);
  assert.equal(active?.pm2_env.pm_cwd, previous);
  assert.equal(active.pm2_env.status, 'online');
  assert.equal(admin?.pm2_env.status, 'online');
  assert.equal(candidate?.pm2_env.pm_cwd, target);
  assert.equal(candidate.pm2_env.status, 'online');
  const before = parseEnv(fs.readFileSync(previous + '/apps/web/.env.production', 'utf8'));
  const after = parseEnv(fs.readFileSync(target + '/apps/web/.env.production', 'utf8'));
  assert(after.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const key = after.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  assert.deepEqual(after, before, 'Unexpected environment change');
  assert.equal(hash(fs.readFileSync(target + '/apps/web/src/features/pet-alert/components/PublicExternalLostPetReportForm.tsx')), '06bba0c048ff0cb5bc9a32aca5d5046aec38a2524364fff3311b3f9b55c14e48', 'Unexpected form source');
  const buildId = fs.readFileSync(target + '/apps/web/.next/BUILD_ID', 'utf8').trim();
  const chunks = [];
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) chunks.push(fs.readFileSync(p, 'utf8'));
  } }
  walk(target + '/apps/web/.next/static');
  assert(chunks.some(c => c.includes(key)), 'Public key missing from compiled client');
  const routes = ['/', '/app', '/foster', '/ayuda', '/beta', '/pet-alert', route];
  const checks = [];
  for (const r of routes) {
    const res = await fetch('http://127.0.0.1:3075' + r, { signal: AbortSignal.timeout(15000) });
    checks.push({ route: r, status: res.status });
    await res.arrayBuffer();
    assert.equal(res.status, 200, r);
  }
  const expected = await page('http://127.0.0.1:3075');
  const oldHash = await page('http://127.0.0.1:3000');
  const report = { checkedAt: new Date().toISOString(), buildId, target, rollback: previous,
    publicKeyInClient: true, environmentUnchanged: true, checks, activated: false };
  fs.writeFileSync(target + '/preflight.json', JSON.stringify(report, null, 2));
  if (!process.argv.includes('--activate')) { console.log(JSON.stringify(report)); return; }
  try {
    assert.equal(processes().find(p => p.name === 'pet-ecosystem-web')?.pid, active.pid);
    pm('delete', 'pet-ecosystem-web');
    start(target);
    assert(await healthy('http://127.0.0.1:3000', expected), 'Local verification failed');
    assert(await healthy('https://petecosyst.com', expected), 'HTTPS verification failed');
    const currentAdmin = processes().find(p => p.name === 'pet-ecosystem-admin');
    assert.equal(currentAdmin?.pid, admin.pid);
    assert.equal(currentAdmin.pm2_env.pm_cwd, admin.pm2_env.pm_cwd);
    pm('save');
  } catch (error) {
    if (processes().some(p => p.name === 'pet-ecosystem-web')) pm('delete', 'pet-ecosystem-web');
    start(previous);
    const restored = await healthy('http://127.0.0.1:3000', oldHash);
    pm('save');
    throw new Error(`${error.message}; rollback healthy=${restored}`);
  }
  report.activated = true;
  report.activatedAt = new Date().toISOString();
  report.httpsMatchesCandidate = true;
  report.adminUnchanged = true;
  fs.writeFileSync(target + '/activation.json', JSON.stringify(report, null, 2));
  pm('delete', candidateName);
  pm('save');
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
