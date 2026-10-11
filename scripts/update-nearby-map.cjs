// Run on the Droplet with: node update-nearby-map.cjs <full-commit> [--activate]
// Copies the active web release, then overlays only the three reviewed map files.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');
const { parseEnv } = require('node:util');
const repo = '/var/www/pet-ecosystem';
const name = 'pet-ecosystem-web';
const candidate = 'pet-nearby-map-candidate';
let files = [
  'apps/web/src/features/pet-alert/components/PublicPetAlertMap.tsx',
  'apps/web/src/features/pet-alert/components/PublicPetAlertMap.module.css',
  'apps/web/src/features/pet-alert/hooks/useNearbyMapLocation.ts'
];
const run = (cmd, args, options = {}) => cp.execFileSync(cmd, args, { encoding: 'utf8', ...options });
const pm = (...args) => run('pm2', args);
const processes = () => JSON.parse(pm('jlist'));
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalized = value => value.toString().replace(/\r\n/g, '\n');
async function page(base) {
  const response = await fetch(base + '/pet-alert', { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  return digest(await response.text());
}
async function healthy(base, expected) {
  for (let i = 0; i < 25; i++) {
    try { if (await page(base) === expected) return true; } catch { /* Wait for startup. */ }
    await sleep(1000);
  }
  return false;
}
function start(processName, cwd, port) {
  pm('start', '/usr/bin/bash', '--name', processName, '--cwd', cwd, '--', '-c',
    `corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port ${port}`);
}
async function main() {
  assert.equal(process.platform, 'linux', 'Run this script on the Droplet.');
  const commit = process.argv[2];
  assert.match(commit ?? '', /^[0-9a-f]{40}$/, 'Supply the exact full commit.');
  assert(process.argv.slice(3).every(arg => ['--activate', '--resume', '--tooltip'].includes(arg)), 'Unknown argument.');
  const tooltip = process.argv.includes('--tooltip');
  if (tooltip) files = files.slice(0, 2);
  const resume = process.argv.includes('--resume');
  assert.equal(run('git', ['-C', repo, 'rev-parse', `${commit}^{commit}`]).trim(), commit);
  const target = `/var/www/pet-releases/${tooltip ? 'map-tooltip' : 'nearby-map'}-${commit.slice(0, 12)}`;
  const current = processes();
  const active = current.find(p => p.name === name);
  const admin = current.find(p => p.name === 'pet-ecosystem-admin');
  assert.equal(active?.pm2_env.status, 'online');
  assert.equal(admin?.pm2_env.status, 'online');
  const previous = active.pm2_env.pm_cwd;
  assert(previous === repo || previous.startsWith('/var/www/pet-releases/'));
  assert.equal(active.pm2_env.pm_exec_path, '/usr/bin/bash');
  assert.deepEqual(active.pm2_env.args, ['-c', 'corepack pnpm --filter @pet/web exec next start --hostname 127.0.0.1 --port 3000']);
  if (previous === target) {
    await page('https://petecosyst.com');
    console.log(`Already active: ${target}`);
    return;
  }
  assert(!current.some(p => p.name === candidate), 'Candidate already exists; inspect before retrying.');
  assert(resume ? fs.existsSync(target) : !fs.existsSync(target), 'Inspect the existing release and use --resume to reuse its build.');
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(3076, '127.0.0.1', () => probe.close(resolve));
  });
  const replacements = files.map(file => run('git', ['-C', repo, 'show', `${commit}:${file}`]));
  // Refuse to overwrite unrelated edits in the two existing map components.
  for (const file of files.slice(0, 2)) {
    assert.equal(normalized(fs.readFileSync(path.join(previous, file))),
      normalized(run('git', ['-C', repo, 'show', `${commit}^:${file}`])), `Unexpected active source: ${file}`);
  }
  if (!tooltip) assert(!fs.existsSync(path.join(previous, files[2])), 'An existing location hook needs review.');
  const oldHash = await page('http://127.0.0.1:3000');
  if (resume) {
    const saved = JSON.parse(fs.readFileSync(path.join(target, 'nearby-map-release.json'), 'utf8'));
    assert.equal(saved.commit, commit);
    assert.equal(saved.previous, previous);
    assert.equal(saved.target, target);
    files.forEach((file, index) => assert.equal(normalized(fs.readFileSync(path.join(target, file))), normalized(replacements[index]), `Changed candidate: ${file}`));
    for (const file of fs.readdirSync(path.join(previous, 'apps/web')).filter(file => /^\.env(?:\.|$)/.test(file))) {
      assert.equal(digest(fs.readFileSync(path.join(previous, 'apps/web', file))), digest(fs.readFileSync(path.join(target, 'apps/web', file))), 'Candidate environment changed.');
    }
    assert(fs.existsSync(path.join(target, 'apps/web/.next/BUILD_ID')), 'Candidate build is incomplete.');
  } else {
  fs.mkdirSync(target, { mode: 0o700 });
  const excluded = new Set(['node_modules', '.next', '.git', '.turbo']);
  for (const directory of ['apps/web', 'packages']) {
    fs.cpSync(path.join(previous, directory), path.join(target, directory), {
      recursive: true, filter: source => !excluded.has(path.basename(source)) && !path.basename(source).startsWith('.env')
    });
  }
  for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'eslint.config.mjs', 'prettier.config.mjs', 'turbo.json']) {
    fs.copyFileSync(path.join(previous, file), path.join(target, file));
  }
  for (const file of fs.readdirSync(path.join(previous, 'apps/web')).filter(file => /^\.env(?:\.|$)/.test(file))) {
    fs.copyFileSync(path.join(previous, 'apps/web', file), path.join(target, 'apps/web', file));
    fs.chmodSync(path.join(target, 'apps/web', file), 0o600);
  }
  }
  const env = parseEnv(fs.readFileSync(path.join(target, 'apps/web/.env.production'), 'utf8'));
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL']) {
    assert(env[key], `Missing production setting: ${key}`);
  }
  if (!resume) files.forEach((file, index) => {
    fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
    fs.writeFileSync(path.join(target, file), replacements[index]);
  });
  const report = resume ? JSON.parse(fs.readFileSync(path.join(target, 'nearby-map-release.json'), 'utf8')) : { commit, target, previous, files, preparedAt: new Date().toISOString(), activated: false };
  fs.writeFileSync(path.join(target, 'nearby-map-release.json'), JSON.stringify(report, null, 2));
  if (!resume) {
  run('corepack', ['pnpm', 'install', '--frozen-lockfile'], { cwd: target, stdio: 'inherit' });
  run('corepack', ['pnpm', '--filter', '@pet/web', 'build'], { cwd: target, stdio: 'inherit' });
  }
  report.buildId = fs.readFileSync(path.join(target, 'apps/web/.next/BUILD_ID'), 'utf8').trim();
  let candidateStarted = false;
  try {
    start(candidate, target, 3076);
    candidateStarted = true;
    let expected;
    for (let i = 0; i < 25; i++) {
      try { expected = await page('http://127.0.0.1:3076'); break; } catch { await sleep(1000); }
    }
    assert(expected, 'Candidate did not start.');
    for (const route of ['/', '/app', '/beta', '/pet-alert/reportar-mi-mascota']) {
      const response = await fetch('http://127.0.0.1:3076' + route, { signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200, route);
      await response.arrayBuffer();
    }
    const chunks = fs.readdirSync(path.join(target, 'apps/web/.next/static/chunks'), { recursive: true })
      .filter(file => file.endsWith('.js')).map(file => fs.readFileSync(path.join(target, 'apps/web/.next/static/chunks', file), 'utf8'));
    for (const key of ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL']) {
      assert(chunks.some(chunk => chunk.includes(env[key])), `Missing compiled setting: ${key}`);
    }
    assert(chunks.some(chunk => /Usar mi ubicaci(?:ó|\\xf3|\\u00f3)n/i.test(chunk)), 'Nearby location button missing from compiled client.');
    if (tooltip) assert(chunks.some(chunk => chunk.includes('mascotas. Pulsa para ampliar el mapa.')), 'Map tooltip missing from compiled client.');
    if (process.argv.includes('--activate')) {
      assert.equal(processes().find(p => p.name === name)?.pid, active.pid, 'Active release changed during preparation.');
      try {
        pm('delete', name);
        start(name, target, 3000);
        assert(await healthy('http://127.0.0.1:3000', expected), 'Local verification failed.');
        assert(await healthy('https://www.petecosyst.com', expected), 'Public HTTPS verification failed.');
        assert.equal(processes().find(p => p.name === name)?.pm2_env.pm_cwd, target);
        assert.equal(processes().find(p => p.name === 'pet-ecosystem-admin')?.pid, admin.pid);
        report.activated = true;
      } catch (error) {
        if (processes().some(p => p.name === name)) pm('delete', name);
        start(name, previous, 3000);
        const restored = await healthy('http://127.0.0.1:3000', oldHash);
        pm('save');
        throw new Error(`${error.message}; rollback healthy=${restored}`);
      }
    }
    fs.writeFileSync(path.join(target, 'nearby-map-release.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (candidateStarted) pm('delete', candidate);
    pm('save');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
