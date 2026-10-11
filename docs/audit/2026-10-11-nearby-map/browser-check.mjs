import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startBrowser, pause } from '../2026-10-07-open-map/browser-session.mjs';

const browser = await startBrowser();
const results = [];
const base = process.argv[2] ?? 'http://localhost:3091';
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
try {
  for (const scenario of ['granted', 'prompt', 'denied', 'timeout', 'unsupported', 'late']) {
    const { identifier } = await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.geoCalls = 0; window.mapQueries = [];
      Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: '${scenario === 'granted' ? 'granted' : 'prompt'}' }) } });
      Object.defineProperty(navigator, 'geolocation', { value: ${scenario === 'unsupported' ? 'undefined' : `{
        getCurrentPosition(success, error) {
          window.geoCalls++;
          const finish = () => ${scenario === 'denied' || scenario === 'timeout' ? `error({code: ${scenario === 'denied' ? 1 : 3}})` : 'success({ coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 25 } })'};
          ${scenario === 'late' ? 'window.finishLocation = finish;' : 'setTimeout(finish, 30);'}
        }
      }`} });
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('openfreemap.org')) return new Response(JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e7f1ef'}}]}), {headers:{'Content-Type':'application/json'}});
        if (url.includes('/rest/v1/')) {
          if (url.includes('list_public_pet_alert_map_points')) window.mapQueries.push(JSON.parse(init.body));
          return new Response('[]', {headers:{'Content-Type':'application/json'}});
        }
        return realFetch(input, init);
      };
    ` });
    await browser.navigate(base + '/pet-alert');
    await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Mapa').click()`);
    await browser.wait(`!!document.querySelector('.maplibregl-canvas') && window.mapQueries.length > 0`);
    if (scenario !== 'granted') {
      assert.equal(await browser.evaluate('window.geoCalls'), 0, 'No automatic permission prompt');
      await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Usar mi ubicación').click()`);
    }
    if (scenario === 'granted' || scenario === 'prompt') {
      await browser.wait(`window.mapQueries.some(q => q.bounds_min_latitude > 40 && q.bounds_max_latitude < 41)`);
      const bounds = await browser.evaluate('window.mapQueries.at(-1)');
      assert(bounds.bounds_min_latitude < 40.4168 && bounds.bounds_max_latitude > 40.4168);
      assert(bounds.bounds_min_longitude < -3.7038 && bounds.bounds_max_longitude > -3.7038);
      assert((40.4168 - bounds.bounds_min_latitude) * 111_000 >= 4_900);
      assert((bounds.bounds_max_latitude - 40.4168) * 111_000 >= 4_900);
      assert(bounds.bounds_max_latitude - bounds.bounds_min_latitude < 0.3);
      assert.equal(await browser.evaluate('window.geoCalls'), 1);
    } else if (scenario === 'late') {
      await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lista').click(); window.finishLocation();`);
      await pause(300);
      assert.equal(await browser.evaluate(`!!document.querySelector('.maplibregl-canvas')`), false);
    } else {
      await browser.wait(`document.body.innerText.includes('${scenario === 'denied' ? 'No autorizaste' : scenario === 'unsupported' ? 'no ofrece ubicación' : 'No pudimos obtener'}')`);
      assert(await browser.evaluate(`!!document.querySelector('.maplibregl-canvas')`));
    }
    assert.equal(browser.errors.length, 0, browser.errors.join('\n'));
    results.push({ scenario, passed: true });
    await browser.call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
} finally {
  await browser.close();
  await fs.writeFile(new URL('browser-check.json', import.meta.url), JSON.stringify({ checks: results, simulatedLocationAndMapData: true, remoteMutations: false }, null, 2) + '\n');
}
console.log(JSON.stringify(results));
