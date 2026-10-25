import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { startBrowser } from '../2026-09-17/browser-session.mjs';

const browser = await startBrowser();
const token = 'a'.repeat(64);
const checks = [];
const check = (name, result) => { assert.ok(result, name); checks.push({ name, passed: true }); };
try {
  // Synthetic record injected in this clean browser only; no real pet or grant is accessed.
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    const originalFetch=window.fetch;
    window.fetch=(input,init)=>{
      const url=typeof input==='string'?input:input.url;
      if(url?.includes('/rpc/get_public_pet_clinical_access'))return Promise.resolve(new Response(JSON.stringify({grant:{scope:'read_only',expiresAt:new Date(Date.now()+3600000).toISOString()},pet:{name:'QA synthetic',species:'cat',breed:null,sex:'female',birthDate:null},vaccines:[],allergies:[],conditions:[],documents:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
      if(url?.includes('/rpc/list_shared_pet_clinical_documents'))return Promise.resolve(new Response(JSON.stringify({message:'QA anonymous denial'}),{status:403,headers:{'Content-Type':'application/json'}}));
      return originalFetch(input,init);
    };` });
  await browser.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.navigate(`https://petecosyst.com/clinical-access/${token}`);
  await browser.wait("!!document.querySelector('#professional-access a')");
  check('Deployed QR page shows both auth actions', await browser.evaluate("['Iniciar sesion','Crear cuenta'].every(label=>Array.from(document.querySelectorAll('#professional-access a')).some(a=>a.textContent===label))"));
  check('Blocked documents link to professional access', await browser.evaluate("!!document.querySelector('a[href=\"#professional-access\"]')"));
  await browser.evaluate("Array.from(document.querySelectorAll('#professional-access a')).find(a=>a.textContent==='Iniciar sesion').click()");
  await browser.wait("location.pathname==='/app'&&!!document.querySelector('input[type=password]')&&document.body?.innerText.includes('Olvidaste tu contrasena?')");
  check('Real Core login displays credentials and retains QR', await browser.evaluate(`!!document.querySelector('input[type=email]')&&new URLSearchParams(location.search).get('clinicalReturn')==='${token}'`));
  await browser.navigate(`https://petecosyst.com/clinical-access/${token}`);
  await browser.wait("!!document.querySelector('#professional-access a')");
  await browser.evaluate("Array.from(document.querySelectorAll('#professional-access a')).find(a=>a.textContent==='Crear cuenta').click()");
  await browser.wait("location.pathname==='/app'&&document.body?.textContent.includes('Nombre')&&!!document.querySelector('input[type=password]')");
  check('Real Core registration retains QR and return notice', await browser.evaluate(`new URLSearchParams(location.search).get('clinicalReturn')==='${token}'&&document.body.innerText.includes('volveras al expediente del codigo QR')`));
  check('No uncaught browser exceptions', browser.errors.length === 0);
  await writeFile(new URL('./deployed-results.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), checks, scope: 'Live production assets and actual Core forms in a clean Chrome browser, narrow viewport. Synthetic clinical read responses injected locally; no account creation, credentials, live grant or authorization test.' }, null, 2)+'\n');
  console.log(JSON.stringify(checks, null, 2));
} catch(error) { console.log(JSON.stringify({checks,body:await browser.evaluate("document.body?.innerText"),errors:browser.errors})); throw error; } finally { await browser.close(); }
