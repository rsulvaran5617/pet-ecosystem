import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startBrowser, pause } from '../2026-09-17/browser-session.mjs';

// Local-only browser regression. All CAPTCHA and Edge requests are fulfilled
// with fixtures through CDP; no emails, reports or remote mutations.
const report = { checkedAt: new Date().toISOString(), checks: [], remoteMutations: false };
const browser = await startBrowser();
let socket;
let sends = 0;
let submissions = 0;
try {
  const port = (await fs.readFile(browser.profile + '/DevToolsActivePort', 'utf8')).split('\n')[0];
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(tabs.find(t => t.type === 'page' && t.url === 'about:blank').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const fakeCaptcha = `window.turnstile={
    render(element,options){const button=document.createElement('button');button.type='button';button.textContent='CAPTCHA fixture';button.onclick=()=>options.callback('fixture-token');element.append(button);window.fixtureOptions=options;window.fixtureElement=element;return 'fixture-widget';},
    reset(){window.fixtureOptions['expired-callback']();},
    remove(){window.fixtureElement.replaceChildren();}
  };`;
  socket.onmessage = async ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
    }
    if (m.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = m.params;
    const captcha = request.url.includes('challenges.cloudflare.com');
    let body = fakeCaptcha;
    let responseCode = 200;
    if (!captcha && request.method === 'OPTIONS') {
      body = '{}';
     } else if (!captcha && Object.entries(request.headers).some(([k,v]) => k.toLowerCase()==='content-type' && v.includes('multipart/form-data'))) {
      submissions++;
      responseCode = submissions === 1 ? 400 : 201;
      body = JSON.stringify(submissions === 1 ? {ok:false,message:'El codigo no es valido o ya vencio.'} : {ok:true,status:'pending_review',reference:'fixture-reference',managementToken:'fixture-private-token'});
    } else if (!captcha) {
      assert.equal(request.method, 'POST');
      assert.equal(JSON.parse(request.postData).turnstileToken, 'fixture-token');
      sends++;
      body = JSON.stringify(sends === 3
        ? { ok: true, message: 'Si los datos son validos, recibiras un codigo.' }
        : { ok: true, challengeId: `fixture-${sends}`, expiresAt: new Date(Date.now() + (sends === 1 ? 2500 : 600000)).toISOString() });
    }
    await call('Fetch.fulfillRequest', { requestId, responseCode,
      responseHeaders: [{ name: 'Content-Type', value: captcha ? 'application/javascript' : 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'content-type' }], body: Buffer.from(body).toString('base64') });
  };
  await call('Fetch.enable', { patterns: [
    { urlPattern: '*challenges.cloudflare.com/*' },
    { urlPattern: '*/functions/v1/pet-alert-external-report*' }
  ] });
  const click = label => browser.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(label)}).click()`);
  const disabled = label => browser.evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(label)}).disabled`);
  await browser.navigate('http://127.0.0.1:3090/pet-alert/reportar-mi-mascota');
  await browser.wait(`!!document.querySelector('input[type=file]')`);
  await browser.evaluate(`window.fill=(label,value)=>{const el=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(label)).querySelector('input,textarea');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};fill('Nombre','QA fixture');fill('Especie','Perro');`);
  await browser.evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;const blob=await new Promise(r=>canvas.toBlob(r));const dt=new DataTransfer();dt.items.add(new File([blob],'fixture.png',{type:'image/png'}));const el=document.querySelector('input[type=file]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(100); await click('Continuar');
  await browser.wait(`!!document.querySelector('input[type=datetime-local]')`);
  await browser.evaluate(`fill('Fecha y hora','2026-10-01T12:00');fill('Ciudad','QA city');fill('Descripción pública','Fixture local no enviada');`);
  await pause(100); await click('Continuar');
  await browser.wait(`!!document.querySelector('input[type=email]')`);
  await browser.evaluate(`fill('Nombre y apellido','QA local');fill('Correo','qa@example.invalid');document.querySelectorAll('input[type=checkbox]').forEach(e=>e.click());`);
  await pause(100); await click('Continuar');
  await browser.wait(`document.body.innerText.includes('CAPTCHA fixture')`);
  assert(await disabled('Enviar código al correo')); report.checks.push('Initial send requires CAPTCHA');
  await click('CAPTCHA fixture'); await pause(100); await click('Enviar código al correo');
  await browser.wait(`document.body.innerText.includes('Solicitar otro código')`);
  assert(await disabled('Solicitar otro código')); report.checks.push('Used CAPTCHA reset after send');
  await browser.wait(`document.body.innerText.includes('El código venció.')`);
  assert(await disabled('Enviar reporte a revisión')); report.checks.push('Server expiry disables report submission');
  await click('CAPTCHA fixture'); await pause(100); await click('Solicitar otro código');
  await browser.wait(`!document.body.innerText.includes('El código venció.')`);
  assert.equal(sends, 2);
  assert(await browser.evaluate(`document.body.innerText.includes('QA fixture')&&document.body.innerText.includes('1 archivo(s)')`));
  report.checks.push('Resend renews challenge and preserves form/photo');
  await browser.evaluate(`fill('Código de 6 dígitos','123456')`);
  await click('CAPTCHA fixture'); await pause(100); await click('Solicitar otro código');
  await browser.wait(`document.body.innerText.includes('No se emitió un código nuevo.')`);
  assert(await disabled('Solicitar otro código')); report.checks.push('Rate-limit response shows actionable message and resets CAPTCHA');
  await click('CAPTCHA fixture'); await pause(100); await click('Solicitar otro código');
  await browser.wait(`!document.body.innerText.includes('No se emitió un código nuevo.')`);
  assert.equal(await browser.evaluate(`[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith('Código de 6')).querySelector('input').value`), '');
  report.checks.push('Successful resend clears previous OTP');
  await click('Atrás'); await pause(100); await click('Continuar');
  await browser.wait(`document.body.innerText.includes('CAPTCHA fixture')`);
  assert(await disabled('Solicitar otro código')); report.checks.push('Back/forward remounts CAPTCHA with fresh verification');
  await click('Atrás'); await pause(100);
  await browser.evaluate(`fill('Correo','different@example.invalid')`);
  await pause(100); await click('Continuar');
  await browser.wait(`document.body.innerText.includes('Enviar código al correo')`);
  report.checks.push('Email change clears old challenge');
  await click('CAPTCHA fixture'); await pause(100); await click('Enviar código al correo');
  await browser.wait(`document.body.innerText.includes('Solicitar otro código')`);
  await browser.evaluate(`fill('Código de 6 dígitos','123456')`);
  await click('CAPTCHA fixture'); await pause(100); await click('Enviar reporte a revisión');
  await browser.wait(`document.body.innerText.includes('ya fue utilizado')`);
  assert(await browser.evaluate(`document.activeElement.getAttribute('role')==='alert'&&!!document.querySelector('form [role=alert]')`));
  assert.equal(submissions,1);report.checks.push('Consumed code error visible and focused in review, no automatic retry');
  await click('CAPTCHA fixture'); await pause(100); await click('Solicitar otro código');
  await browser.wait(`!document.body.innerText.includes('ya fue utilizado')`);
  await browser.wait(`[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith('Código de 6')).querySelector('input').value==='' && !document.body.innerText.includes('Enviando...')`);
  await browser.evaluate(`fill('Código de 6 dígitos','654321')`);
  await click('CAPTCHA fixture'); await pause(100); await click('Enviar reporte a revisión');
  await browser.wait(`document.body.innerText.includes('Reporte recibido')`);
  assert(await browser.evaluate(`document.body.innerText.includes('fixture-reference')&&document.body.innerText.includes('todavía no es pública')`));
  assert.equal(submissions,2);report.checks.push('Successful submission reaches receipt with reference and pending review');
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) { report.passed = false; report.error = error.message; console.error(error.message); }
finally {
  if (socket) socket.close();
  await browser.close();
  await fs.writeFile(new URL('browser-regression.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
if (!report.passed) process.exitCode = 1;
