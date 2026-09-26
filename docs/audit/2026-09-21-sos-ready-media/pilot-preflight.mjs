import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import path from 'node:path';
import assert from 'node:assert/strict';
import { query } from '../2026-09-17/clinical-migration-remote.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder, '../../..');
const env = parseEnv(await fs.readFile(path.join(root, '.env.local'), 'utf8'));
const ref = (await fs.readFile(path.join(root, 'supabase/.temp/project-ref'), 'utf8')).trim();
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname, `${ref}.supabase.co`);
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
assert.ok(token, 'Management credential missing');
async function inspect(endpoint) {
  const response = await globalThis.fetch(`https://api.supabase.com/v1/projects/${ref}/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: globalThis.AbortSignal.timeout(30000)
  });
  assert.ok(response.ok, `Inspection failed: ${endpoint}, HTTP ${response.status}`);
  return response.json();
}
const functions = await inspect('functions');
const secrets = await inspect('secrets');
const backups = await inspect('database/backups');
const report = {
  checkedAt: new Date().toISOString(), projectMatchesApp: true,
  functions: functions.map(({ slug, version, status, verify_jwt }) => ({ slug, version, status, verify_jwt })),
  configuredSecretNames: secrets.map(({ name }) => name),
  managedBackupCount: backups.backups?.length ?? 0,
  pitrEnabled: backups.pitr_enabled ?? false,
  database: await query(`select public.pet_sos_ready_media_only() ready_only,
    (select count(*) from public.pet_alert_lost_pets) alerts,
    (select count(*) from public.pet_alert_community_sightings) community_reports,
    (select count(*) from storage.objects where bucket_id in ('pet-alert-media','pet-avatars')) photo_objects`),
  gateway: []
};
for (const method of ['GET', 'POST']) {
  const response = await globalThis.fetch(`https://${ref}.supabase.co/functions/v1/pet-alert-public-photo?path=nonexistent.jpg`, {
    method, signal: globalThis.AbortSignal.timeout(30000)
  });
  report.gateway.push({ method, status: response.status, cacheControl: response.headers.get('cache-control'), bodyBytes: (await response.arrayBuffer()).byteLength });
}
await fs.writeFile(path.join(folder, 'pilot-preflight.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
