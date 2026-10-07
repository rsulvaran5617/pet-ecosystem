import fs from 'node:fs/promises';
import { startBrowser, pause } from '../2026-09-17/browser-session.mjs';

// Synthetic form values stay in browser memory. Never request email or submit.
const report = { checkedAt: new Date().toISOString(), emailSent: false, reportSubmitted: false };
const browser = await startBrowser();
try {
  await browser.navigate('https://petecosyst.com/pet-alert/reportar-mi-mascota');
  await browser.evaluate(`window.fillAuditField = (label, value) => {
    const node = [...document.querySelectorAll('label')].find(e => e.textContent.trim().startsWith(label)).querySelector('input,textarea');
    const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', {bubbles:true}));
    node.dispatchEvent(new Event('change', {bubbles:true}));
  }`);
  await browser.evaluate(`fillAuditField('Nombre','PRUEBA LOCAL NO ENVIADA'); fillAuditField('Especie','Perro');`);
  await browser.evaluate(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
    canvas.getContext('2d').fillRect(0,0,100,100);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const dt=new DataTransfer();dt.items.add(new File([blob],'fixture-local.png',{type:'image/png'}));
    const input=document.querySelector('input[type=file]');input.files=dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await pause(250);
  await browser.evaluate(`document.querySelector('button[type=submit]').click()`);
  await browser.wait(`document.body.innerText.includes('¿Dónde y cuándo se perdió?')`);
  await browser.evaluate(`fillAuditField('Fecha y hora','2026-10-01T12:00');fillAuditField('Ciudad','Ciudad de prueba');fillAuditField('Descripción pública','Verificacion local del formulario, sin envio.');`);
  await pause(250);
  await browser.evaluate(`document.querySelector('button[type=submit]').click()`);
  await browser.wait(`document.body.innerText.includes('Contacto privado') && !!document.querySelector('input[type=email]')`);
  await browser.evaluate(`fillAuditField('Nombre y apellido','QA local');fillAuditField('Correo','qa@example.invalid');document.querySelectorAll('input[type=checkbox]').forEach(e=>e.click());`);
  await pause(250);
  await browser.evaluate(`document.querySelector('button[type=submit]').click()`);
  await browser.wait(`document.body.innerText.includes('Revisa y verifica')`);
  await pause(6000);
  report.review = await browser.evaluate(`({
    missingConfiguration:document.body.innerText.includes('La validación de seguridad no está configurada.'),
    turnstileLoaded:typeof window.turnstile?.render==='function',
    widgetContainers:document.querySelectorAll('[id^="cf-chl-widget-"]').length,
    tokenFieldPresent:!!document.querySelector('input[name="cf-turnstile-response"]'),
    requestCodeEnabled:![...document.querySelectorAll('button')].find(e=>e.textContent.includes('Enviar código al correo')).disabled
  })`);
  const frames=await browser.call('Page.getFrameTree');
  report.challengeFramePresent=JSON.stringify(frames).includes('challenges.cloudflare.com');
  report.runtimeErrorCount=browser.errors.length;
  report.consoleErrorCount=browser.consoleErrors.length;
  await browser.screenshot(new URL('review.png',import.meta.url));
  report.passed=!report.review.missingConfiguration&&report.review.turnstileLoaded&&report.review.tokenFieldPresent;
  console.log(JSON.stringify(report,null,2));
} catch(error) { report.error=error.message;report.passed=false;console.error(error.message); }
finally {
  await browser.close();
  await fs.writeFile(new URL('browser-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
if(!report.passed)process.exitCode=1;
