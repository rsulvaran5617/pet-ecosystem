import fs from 'node:fs/promises';
import {startBrowser,pause} from '../2026-09-17/browser-session.mjs';
import {loadSmokeEnv} from '../../../packages/api-client/scripts/smoke/env.ts';
const env=loadSmokeEnv(['owner','provider']);
const report={executedAt:new Date().toISOString(),checks:[],sampleCounts:[],scope:'Local production web, existing QA accounts; login, reads, filters, logout only. No mutations or screenshots of personal data. Filter counts may be zero; SQL/time regressions test transitions separately.'};
let browser,stage;
const check=(name,passed)=>{report.checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
const click=async(text)=>browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.innerText.trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));if(!b)return false;b.click();return true;})()`);
try{
 for(const role of ['provider','owner']){
  stage=role+' login';browser=await startBrowser();await browser.navigate('http://localhost:3100/app');
  await click('Iniciar sesion');await browser.wait(`!!document.querySelector('input[type=password]')`);
  for(const [type,value] of [['email',env.actors[role].email],['password',env.actors[role].password]])await browser.evaluate(`(()=>{const i=document.querySelector('input[type=${type}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await browser.evaluate(`document.querySelector('input[type=password]').closest('form').requestSubmit()`);
  await browser.wait(`!document.querySelector('input[type=password]')&&document.body.innerText.includes('Cerrar sesion')`);
  stage=role+' data';
  if(role==='provider'){
   await browser.wait(`document.querySelector('.provider-web-topbar strong')?.textContent.trim()!=='Selecciona un negocio'&&!!document.querySelector('select[aria-label="Seleccionar negocio activo"]')`,150000);
   await browser.evaluate(`(()=>{const s=document.querySelector('select[aria-label="Seleccionar negocio activo"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'716bfcd5-41f5-4a93-88b2-937980a54cf9');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await browser.wait(`document.querySelector('.provider-web-topbar strong')?.textContent.includes('QA Auditor')`);
  }else await browser.wait(`document.querySelector('.owner-web-main')?.textContent.toLowerCase().includes('datos al dia')`,150000);
  stage=role+' filters';check(role+' opens bookings',await click('Reservas'));await pause(2000);
  if(role==='owner')check('Owner opens booking history',await click('Ver historial'));
  for(const [value,label] of [['pending_closure','Pendientes de cierre'],['expired','Expiradas']]){
   if(role==='provider')check(role+' filter '+value,await click(label));
   else check(role+' filter '+value,await browser.evaluate(`(()=>{const s=document.querySelector('select[aria-label="Filtrar reservas por estado"]');if(!s||![...s.options].some(o=>o.value===${JSON.stringify(value)}))return false;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(value)});s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`));
   await pause(500);
   report.sampleCounts.push({role,filter:value,count:await browser.evaluate(role==='owner'?`(()=>{const s=document.querySelector('select[aria-label="Filtrar reservas por estado"]');return Number(s.selectedOptions[0].textContent.split('(').pop().split(')')[0]);})()`:`(()=>{const b=[...document.querySelectorAll('#provider-web-panel button')].find(e=>e.innerText.toLowerCase().includes(${JSON.stringify(label.toLowerCase())}));return Number(b?.querySelector('span')?.textContent??0);})()`)});
   for(const width of [1440,390]){
    await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(150);
    check(role+' '+value+' fits '+width,await browser.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'));
   }
   if(role==='provider'&&value==='expired')check('Expired filter has no Approve action',await browser.evaluate(`![...document.querySelectorAll('#provider-web-panel button')].some(b=>b.innerText.trim()==='Aprobar')`));
  }
  check(role+' no runtime exceptions',browser.errors.length===0);
  await click('Cerrar sesion');await browser.wait(`!!document.querySelector('input[type=password]')`);await browser.close();browser=null;
 }
}catch(e){report.stage=stage;report.error=e.message;process.exitCode=1;}
finally{
 if(browser){await browser.call('Storage.clearDataForOrigin',{origin:'http://localhost:3100',storageTypes:'all'}).catch(()=>{});await browser.close();}
 report.passed=!report.error&&report.checks.every(c=>c.passed);
 await fs.writeFile(new URL('web-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
