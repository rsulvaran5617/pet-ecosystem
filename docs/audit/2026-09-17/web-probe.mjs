import fs from 'node:fs/promises';
import { startBrowser, pause } from './browser-session.mjs';
import { loadSmokeEnv } from '../../../packages/api-client/scripts/smoke/env.ts';
const env=loadSmokeEnv(['provider','owner']);
const browser=await startBrowser();
const result={executedAt:new Date().toISOString(),origin:'http://localhost:3100',publicRoutes:[],authenticated:[],limitations:['Web local en modo desarrollo; viewport estrecho no equivale a app nativa.']};
const snapshot=()=>browser.evaluate(`({title:document.title,path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent).slice(0,12),buttons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>e.innerText).slice(0,28),emailFields:document.querySelectorAll('input[type=email]').length,passwordFields:document.querySelectorAll('input[type=password]').length,nextError:!!document.querySelector('nextjs-portal')&&document.body.innerText.includes('Unhandled Runtime Error')})`);
try{
  for(const route of ['/','/app','/foster','/pet-alert','/ayuda','/clinical-access/qa-invalid-token','/adoption-invite/qa-invalid-token']){
    const offset=browser.errors.length;
    await browser.navigate(result.origin+route);await pause(1200);result.publicRoutes.push({...await snapshot(),runtimeErrors:browser.errors.slice(offset).map(e=>e.split('\n')[0])});
  }
  await browser.navigate(result.origin+'/app');
  result.loginInitial=await snapshot();
  const loginButton=await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^(Entrar|Iniciar sesion|Iniciar sesión|Ingresar)$/.test(e.innerText.trim()));if(b){b.click();return true;}return false;})()`);
  await pause(600);
  result.loginOpened=await snapshot();
  if(await browser.evaluate(`!!document.querySelector('input[type=password]')`)){
    for(const [type,value] of [['email',env.actors.provider.email],['password',env.actors.provider.password]]){
      await browser.evaluate(`(()=>{const i=document.querySelector('input[type=${type}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    }
    await browser.evaluate(`document.querySelector('input[type=password]').closest('form').requestSubmit()`);
    await browser.wait(`!document.querySelector('input[type=password]')`,30000);
    await browser.wait(`document.body.innerText.includes('Panel de gestion multi-negocio')`);
    await pause(1500);result.authenticated.push({actor:'provider',...await snapshot()});
    result.providerSections=[];
    for(const label of ['Negocios','Servicios','Reservas','Agenda/Capacidad','Publicacion','Documentos','Panel']){
      const clicked=await browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.innerText.trim().startsWith(${JSON.stringify(label)}));if(b){b.click();return true;}return false;})()`);
      await pause(700);result.providerSections.push({label,clicked,...await snapshot()});
    }
    await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await pause(500);result.authenticated.push({actor:'provider',viewport:'390px',...await snapshot()});
    result.overflowElements=await browser.evaluate(`(()=>{return [...document.querySelectorAll('main *,header *,section *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).slice(0,12).map(e=>({tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}));})()`);
    await browser.evaluate(`(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.parentElement?.tagName!=='SCRIPT'&&/[^\\s@]+@[^\\s@]+\\.[^\\s@]+/.test(n.textContent))n.textContent=n.textContent.replace(/[^\\s@]+@[^\\s@]+\\.[^\\s@]+/g,'CUENTA QA');}})()`);
    await browser.screenshot(new URL('./evidence/provider-web-390.png',import.meta.url));
    await browser.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.innerText.trim()==='Cerrar sesion').click()`);
    await browser.wait(`!!document.querySelector('input[type=password]')`);
    await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.innerText.trim()==='Iniciar sesion').click()`);
    for(const [type,value] of [['email',env.actors.owner.email],['password',env.actors.owner.password]]) await browser.evaluate(`(()=>{const i=document.querySelector('input[type=${type}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await browser.evaluate(`document.querySelector('input[type=password]').closest('form').requestSubmit()`);
    await browser.wait(`!document.querySelector('input[type=password]')`);await pause(2500);
    result.authenticated.push({actor:'owner',...await snapshot()});
    await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await pause(500);
    result.authenticated.push({actor:'owner',viewport:'390px',...await snapshot()});
    await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(e=>e.innerText.trim()==='Cerrar sesion').click()`);
  }else result.loginNotExecuted='No se encontró formulario de inicio con la navegación elegida';
}catch(e){result.error=e.message;process.exitCode=1;}
finally{result.runtimeErrors=browser.errors;await fs.writeFile(new URL('./evidence/web.json',import.meta.url),JSON.stringify(result,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(result,null,2));
