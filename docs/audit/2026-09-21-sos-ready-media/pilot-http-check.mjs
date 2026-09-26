import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
import console from 'node:console';
import { URL } from 'node:url';
const env = parseEnv(await fs.readFile('.env.local', 'utf8'));
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/`;
const origin = 'https://petecosyst.com';
const cases = [
  { id: 'owner-disabled', fn: 'pet-alert-owner-photo', method: 'POST', expected: 503 },
  { id: 'community-anonymous-denied', fn: 'pet-alert-community-photo', method: 'POST', expected: 401 },
  { id: 'external-foreign-origin-denied', fn: 'pet-alert-external-report', method: 'POST', origin: 'https://example.invalid', expected: 403 },
  { id: 'external-preflight', fn: 'pet-alert-external-report', method: 'OPTIONS', expected: 200 },
  { id: 'external-invalid-input', fn: 'pet-alert-external-report', method: 'POST', body: {}, expected: 400 },
  { id: 'external-missing-captcha', fn: 'pet-alert-external-report', method: 'POST', body: { email: 'probe@example.invalid', contactName: 'QA Probe', acceptedTerms: true, acceptedPrivacy: true, turnstileToken: '' }, expected: 400 },
  { id: 'gateway-invalid-path', fn: 'pet-alert-public-photo?path=nonexistent.jpg', method: 'GET', expected: 404 }
];
const results = [];
for (const test of cases) {
  const response = await globalThis.fetch(base + test.fn, {
    method: test.method,
    headers: { Origin: test.origin ?? origin, 'Content-Type': 'application/json' },
    ...(test.body ? { body: JSON.stringify(test.body) } : {}),
    signal: globalThis.AbortSignal.timeout(30000)
  });
  const cacheControl = response.headers.get('cache-control');
  const cors = response.headers.get('access-control-allow-origin');
  await response.arrayBuffer();
  results.push({ id: test.id, expected: test.expected, observed: response.status, passed: response.status === test.expected && !!cacheControl?.includes('no-store') && (test.id !== 'external-preflight' || cors === origin) });
}
const report = { checkedAt: new Date().toISOString(), results, allPassed: results.every(x => x.passed), emailSent: false, reportCreated: false, imageProcessingTested: false, realCaptchaTested: false };
await fs.writeFile(new URL('pilot-http-check.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
assert.ok(report.allPassed, 'Hosted boundary checks failed');
