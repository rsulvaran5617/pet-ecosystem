import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';

// One-time activation of the already built candidate; never rebuild or alter data.
const target = '/var/www/pet-releases/sos-services-d646476';
const previous = '/var/www/pet-releases/sync-7c9fabb';
const commit = 'd64647675a4751194dc3005e6d9e57ddbfac163c';
const buildId = 'nOz0xh6TKi0JVHOZnHY03';
const expectedHash = '999f6ef9c8a8c0016abd8f31e615fd3bf83768ae48fcb5f0475f9ff62a658bfd';
const page = '/pet-alert/reportar-mi-mascota';
const pm = (...args) => execFileSync('pm2', args, { encoding: 'utf8', timeout: 30000 });
const processes = () => JSON.parse(pm('jlist'));
const hash = text => createHash('sha256').update(text).digest('hex');
async function check(base, expected, attempts = 1) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await globalThis.fetch(base + page, {
        signal: globalThis.AbortSignal.timeout(5000), cache: 'no-store'
      });
      const body = await response.text();
      if (response.status === 200 && hash(body) === expected) return true;
    } catch { /* Startup can briefly refuse connections. */ }
    if (i + 1 < attempts) await delay(1000);
  }
  return false;
}
function start(cwd) {
  pm('start', '/usr/bin/bash', '--name', 'pet-ecosystem-web', '--cwd', cwd,
    '--', '-c', 'corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port 3000');
}
async function main() {
  assert.equal(process.platform, 'linux', 'Run on the Droplet, not Windows');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: target, encoding: 'utf8' }).trim(), commit);
  assert.equal(fs.readFileSync(`${target}/apps/web/.next/BUILD_ID`, 'utf8').trim(), buildId);
  const list = processes();
  const live = list.find(p => p.name === 'pet-ecosystem-web');
  const admin = list.find(p => p.name === 'pet-ecosystem-admin');
  assert.equal(admin?.pm2_env.status, 'online', 'Admin not healthy; stop');
  assert.equal(live?.pm2_env.status, 'online', 'Web not online; inspect manually');
  const cwd = live.pm2_env.pm_cwd;
  assert.ok([previous, target].includes(cwd), 'Unexpected release; stop');
  if (cwd === previous) {
    const candidate = list.find(p => p.name === 'pet-sos-web-candidate');
    assert.equal(candidate?.pm2_env.pm_cwd, target);
    assert.equal(candidate?.pm2_env.status, 'online');
    assert.ok(await check('http://127.0.0.1:3074', expectedHash), 'Candidate mismatch');
    const old = await globalThis.fetch(`http://127.0.0.1:3000${page}`, {
      signal: globalThis.AbortSignal.timeout(5000)
    });
    assert.equal(old.status, 200);
    const oldHash = hash(await old.text());
    try {
      pm('delete', 'pet-ecosystem-web');
      start(target);
      assert.ok(await check('http://127.0.0.1:3000', expectedHash, 30), 'Local check failed');
      assert.ok(await check('https://petecosyst.com', expectedHash, 3), 'HTTPS check failed');
    } catch (error) {
      if (processes().some(p => p.name === 'pet-ecosystem-web')) pm('delete', 'pet-ecosystem-web');
      start(previous);
      const restored = await check('http://127.0.0.1:3000', oldHash, 30);
      pm('save');
      throw new Error(`Activation failed: ${error.message}. Previous web restored/healthy: ${restored}`);
    }
  } else {
    assert.ok(await check('http://127.0.0.1:3000', expectedHash), 'Active build mismatch');
    assert.ok(await check('https://petecosyst.com', expectedHash), 'Public build mismatch');
  }
  const currentAdmin = processes().find(p => p.name === 'pet-ecosystem-admin');
  assert.equal(currentAdmin?.pid, admin.pid, 'Admin changed externally; inspect');
  assert.equal(currentAdmin?.pm2_env.pm_cwd, admin.pm2_env.pm_cwd);
  if (processes().some(p => p.name === 'pet-sos-web-candidate')) pm('delete', 'pet-sos-web-candidate');
  pm('save');
  const report = { activatedAt: new Date().toISOString(), commit, cwd: target,
    rollback: previous, buildId, liveMatchesCandidate: true, httpsVerified: true,
    pm2Saved: true, adminUnchanged: true, photoFlags: false };
  fs.writeFileSync(`${target}/activation.json`, JSON.stringify(report, null, 2) + '\n');
  console.log('Web activated and HTTPS verified. Admin, data and flags unchanged.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
