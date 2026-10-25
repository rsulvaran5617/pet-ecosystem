import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function appleRequest(route, options = {}) {
  const session = JSON.parse(await fs.readFile(path.join(process.env.USERPROFILE, '.expo/state.json'), 'utf8'));
  async function expo(query) {
    const response = await fetch('https://api.expo.dev/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'expo-session': session.auth.sessionSecret },
      body: JSON.stringify({ query })
    });
    const result = await response.json();
    if (!response.ok || result.errors) throw Error('Expo credential lookup failed');
    return result.data;
  }
  const app = await expo('query { app { byFullName(fullName:"@rsulvaran/pet-ecosystem") { iosAppCredentials { appStoreConnectApiKeyForSubmissions { id } } } } }');
  const id = app.app.byFullName.iosAppCredentials[0].appStoreConnectApiKeyForSubmissions.id;
  const data = await expo(`query { appStoreConnectApiKey { byId(id:"${id}") { issuerIdentifier keyIdentifier keyP8 } } }`);
  const key = data.appStoreConnectApiKey.byId;
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encode({ alg: 'ES256', kid: key.keyIdentifier, typ: 'JWT' }) + '.' + encode({ iss: key.issuerIdentifier, iat: now, exp: now + 300, aud: 'appstoreconnect-v1' });
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: key.keyP8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  const response = await fetch('https://api.appstoreconnect.apple.com/v1/' + route, {
    ...options, headers: { Authorization: `Bearer ${unsigned}.${signature}`, 'Content-Type': 'application/json' }
  });
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw Error(`Apple API ${response.status}: ${result.errors?.map(e => e.code).join(',')}`);
  return result;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/apple-status.mjs')) {
  const builds = await appleRequest('builds?filter[app]=6776460841&sort=-uploadedDate&limit=5&include=buildBetaDetail');
  const groups = await appleRequest('apps/6776460841/betaGroups');
  console.log(JSON.stringify({
    builds: builds.data.map(b => ({ id: b.id, ...b.attributes })),
    betaDetails: builds.included,
    groups: groups.data.map(g => ({ id: g.id, ...g.attributes }))
  }, null, 2));
}
