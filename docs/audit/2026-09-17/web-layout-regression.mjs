import fs from 'node:fs/promises';
import {startBrowser,pause} from './browser-session.mjs';
import {loadSmokeEnv} from '../../../packages/api-client/scripts/smoke/env.ts';
const baseline=process.argv.includes('--baseline');
const mode=baseline?'baseline':process.argv.includes('--production')?'production':'development';
const env=loadSmokeEnv(['owner','provider']);
const origin='http://localhost:3100';
const report={executedAt:new Date().toISOString(),mode,public:[],roles:[],limits:'Local web with QA login and read-only queries. No native runtime or deployed-site certification.'};
const metrics=async b=>b.evaluate(`(()=>{const width=document.documentElement.clientWidth;return {viewportWidth:innerWidth,width,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>width,offenders:[...document.querySelectorAll('main *,header *')].filter(e=>{const r=e.getBoundingClientRect();if(r.width<=0||(r.right<=width+1&&r.left>=-1))return false;for(let p=e.parentElement;p;p=p.parentElement){if(['auto','scroll'].includes(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth)return false;}return true;}).slice(0,8).map(e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'svg',right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left)}))};})()`);
const click=async(b,text)=>b.evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()===${JSON.stringify(text)});if(!el)throw Error('Missing button');el.click();})()`);
let browser,stage='public';
try{
 browser=await startBrowser();
 for(const route of ['/','/ayuda']){
  const start=browser.errors.length,consoleStart=browser.consoleErrors.length;
  await browser.navigate(origin+route);await pause(600);
  const publicStyle=await browser.evaluate(route==='/'?`({display:getComputedStyle(document.querySelector('.hero')).display,font:getComputedStyle(document.querySelector('.landing-skin')).fontFamily})`:`({display:getComputedStyle(document.querySelector('.help-nav')).display,shellWidth:Math.round(document.querySelector('.help-shell').getBoundingClientRect().width)})`);
  const hydrationErrors=browser.errors.slice(start).filter(e=>/hydrat|server-rendered|Text content/i.test(e)).map(e=>e.split('\n')[0]);
  const hydrationWarnings=browser.consoleErrors.slice(consoleStart).filter(e=>/hydrat|did not match|server-rendered/i.test(e)).length;
  const layouts=[];
  for(const width of [1440,360,390,414]){await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(150);layouts.push(await metrics(browser));}
  report.public.push({route,publicStyle,hydrationErrors,hydrationWarnings,layouts});
 }
 if(!baseline){
  report.withoutJavaScript=[];
  await browser.call('Emulation.setScriptExecutionDisabled',{value:true});
  for(const route of ['/','/ayuda']){
   await browser.navigate(origin+route);
   const styled=await browser.evaluate(route==='/'?`getComputedStyle(document.querySelector('.hero')).display==='grid' && getComputedStyle(document.querySelector('.landing-skin')).fontFamily.includes('Inter')`:`getComputedStyle(document.querySelector('.help-nav')).display==='flex'`);
   report.withoutJavaScript.push({route,styled,...await metrics(browser)});
  }
  await browser.call('Emulation.setScriptExecutionDisabled',{value:false});
 }
 await browser.close();browser=null;
 for(const role of ['provider','owner']){
  stage=role+' login form';browser=await startBrowser();await browser.navigate(origin+'/app');
  await browser.wait(`!!document.querySelector('input[type=password]') || [...document.querySelectorAll('button')].some(e=>/^(Entrar|Iniciar sesion|Iniciar sesión|Ingresar)$/.test(e.innerText.trim()))`);
  await browser.evaluate(`[...document.querySelectorAll('button')].find(e=>/^(Entrar|Iniciar sesion|Iniciar sesión|Ingresar)$/.test(e.innerText.trim())).click()`);
  await browser.wait(`!!document.querySelector('input[type=password]')`);
  for(const[type,value]of [['email',env.actors[role].email],['password',env.actors[role].password]])await browser.evaluate(`(()=>{const el=document.querySelector('input[type=${type}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await browser.evaluate(`document.querySelector('input[type=password]').closest('form').requestSubmit()`);
  stage=role+' authenticated response';
  await browser.wait(`!document.querySelector('input[type=password]') && document.body.innerText.includes('Cerrar sesion')`);
  stage=role+' workspace';await browser.wait(role==='provider'?`document.body.innerText.includes('Panel de gestion multi-negocio')`:`!!document.querySelector('.owner-web-main')`);await pause(1800);
  stage=role+' loaded data';
  if(role==='owner'){
   await browser.wait(`![...document.querySelectorAll('.owner-web-main span')].some(e=>e.textContent.trim().toLowerCase()==='cargando')`,150000);
   await browser.wait(`document.querySelector('.owner-web-main').innerText.toLowerCase().includes('datos al dia')`);
  }else{
   await browser.wait(`document.querySelector('.provider-web-topbar strong')?.textContent.trim()!=='Selecciona un negocio'`,150000);
   await browser.evaluate(`(()=>{const el=document.querySelector('select[aria-label="Seleccionar negocio activo"]');const id='716bfcd5-41f5-4a93-88b2-937980a54cf9';if(![...el.options].some(o=>o.value===id))throw Error('QA business missing');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,id);el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await browser.wait(`document.querySelector('.provider-web-topbar strong')?.textContent.includes('QA Auditor')`);
  }
  stage=role+' layout';const layouts=[];
  for(const width of [1440,360,390,414]){
   await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(250);layouts.push(await metrics(browser));
  }
  // Stress only the local DOM, without changing account or business data.
  const previous=await browser.evaluate(`(()=>{const header=document.querySelector('main > section > header');const pill=[...header.querySelectorAll('span')].find(e=>e.textContent.includes('@'));const title=header.querySelector('h1');const result={pill:pill?.textContent,title:title.textContent};if(pill)pill.textContent='cuenta.qa.'+'identificador'.repeat(8)+'@example.invalid';title.textContent='NombreDeNegocioSinEspacios'.repeat(6);return result;})()`);
  const longText=[];for(const width of [360,390,414]){await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(150);longText.push(await metrics(browser));}
  await browser.evaluate(`(()=>{const header=document.querySelector('main > section > header');const pill=[...header.querySelectorAll('span')].find(e=>e.textContent.includes('@'));if(pill)pill.textContent='CUENTA QA';header.querySelector('h1').textContent=${JSON.stringify(previous.title)};})()`);
  await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});await pause(150);
  let capacityScroll=null;let messageNotice=null;
  if(!baseline){
   messageNotice=await browser.evaluate(`(()=>{const button=document.querySelector('[aria-label="Cerrar aviso de mensaje"]');if(!button)return {observed:false};const toast=button.closest('[role=status]');const rect=toast.getBoundingClientRect();const result={observed:true,contained:rect.left>=0&&rect.right<=document.documentElement.clientWidth};button.click();return result;})()`);
   await pause(100);
   await browser.evaluate(`(()=>{const title=document.querySelector('.owner-web-main h2');if(title)title.textContent='Hola, cuenta QA';document.querySelector('.'+${JSON.stringify(role==='provider'?'provider-web-main':'owner-web-main')})?.scrollIntoView();})()`);
   if(role==='provider')capacityScroll=await browser.evaluate(`(()=>{const e=document.querySelector('[aria-label="Capacidad y ocupacion semanal"]');if(!e)return {reachable:false};e.scrollLeft=e.scrollWidth;const result={reachable:e.scrollWidth<=e.clientWidth||e.scrollLeft>0,keyboardAccessible:e.tabIndex===0};e.scrollLeft=0;return result;})()`);
   await browser.screenshot(new URL('evidence/web-'+mode+'-'+role+'-390.png',import.meta.url));
  }
  report.roles.push({role,dataLoaded:true,layouts,longText,capacityScroll,messageNotice,runtimeErrors:browser.errors.map(e=>e.split('\n')[0])});
  await click(browser,'Cerrar sesion');await browser.wait(`!!document.querySelector('input[type=password]')`);
  await browser.call('Storage.clearDataForOrigin',{origin,storageTypes:'all'});await browser.close();browser=null;
 }
}catch(e){report.failureStage=stage;report.error=e.message;if(browser)report.failureUi=await browser.evaluate(`({passwordField:!!document.querySelector('input[type=password]'),buttons:[...document.querySelectorAll('button')].slice(0,10).map(e=>e.innerText),title:document.querySelector('h1')?.textContent})`).catch(()=>null);process.exitCode=1;}
finally{
 if(browser){await browser.call('Storage.clearDataForOrigin',{origin,storageTypes:'all'}).catch(()=>{});await browser.close();}
 const complete=report.public.length===2&&report.roles.length===2;
 const contained=l=>!l.overflow&&l.offenders.length===0;
 report.passed=complete&&report.public.every(r=>r.hydrationErrors.length===0&&r.hydrationWarnings===0&&r.layouts.every(contained))&&report.roles.every(r=>r.layouts.every(contained)&&r.longText.every(contained)&&r.runtimeErrors.length===0&&(!r.messageNotice?.observed||r.messageNotice.contained)&&(r.role!=='provider'||baseline||r.capacityScroll?.reachable&&r.capacityScroll?.keyboardAccessible))&&(baseline||report.withoutJavaScript?.length===2&&report.withoutJavaScript.every(r=>r.styled&&contained(r)));
 if(!baseline&&!report.passed)process.exitCode=1;
 await fs.writeFile(new URL('evidence/web-layout-'+mode+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
