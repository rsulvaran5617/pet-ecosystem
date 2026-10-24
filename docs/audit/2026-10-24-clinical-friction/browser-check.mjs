import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import ts from 'typescript';
import { startBrowser } from '../2026-09-17/browser-session.mjs';

// Real React components with deterministic API and React Native DOM adapters.
// This exercises interactions, not native-device layout or production permissions.
const root = new URL('../../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
async function component(path) {
  return ts.transpileModule(await read(path), { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022
  } }).outputText.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
}
const web = await component('apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx');
const card = await component('apps/mobile/src/features/health/components/ClinicalAccessCard.tsx');
const notices = await component('apps/mobile/src/features/health/components/ClinicalRequestNotifications.tsx');
const loader = await component('apps/mobile/src/features/health/services/pendingClinicalRequests.ts');
const react = await read('apps/web/node_modules/react/umd/react.development.js');
const dom = await read('apps/web/node_modules/react-dom/umd/react-dom.development.js');
const fixture = `
const {useState,useEffect,useRef,useMemo}=React;
window.ticks=[];window.setInterval=(fn)=>{ticks.push(fn);return fn};window.clearInterval=(fn)=>{ticks=ticks.filter(t=>t!==fn)};
window.tick=()=>ticks.forEach(fn=>fn());
const scopes=['create_encounter','record_diagnosis','record_vaccine','record_recommendation','record_treatment','upload_clinical_document'];
window.request=null;window.sent=null;window.saved=null;
window.profile={id:'professional',professionalName:'QA Doctor',professionalType:'veterinarian',verificationStatus:'verified',licenseReference:'QA',jurisdiction:'Panama',countryCode:'PA',providerOrganizationId:null};
const makeRequest=()=>({id:'request-1',professionalName:'QA Doctor',requestedScopes:scopes,requestedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),status:'requested'});
const api={
 getAuthenticatedClinicalAccessContext:async()=>({}),
 getMyClinicalProfessionalContext:async()=>({profile,organizationOptions:[]}),
 getMyClinicalWriteRequest:async()=>request,
 listMyProfessionalEncounters:async()=>[],
 requestClinicalWriteAccess:async(token,selected)=>{window.sent=selected;window.request={...makeRequest(),requestedScopes:selected}},
 saveMyClinicalProfessionalProfile:async(input)=>{window.saved=input;window.profile={...input,verificationStatus:'draft'};return {profile,organizationOptions:[]}},
 submitMyClinicalProfessionalProfile:async()=>{window.profile={...profile,verificationStatus:'pending'};return {profile,organizationOptions:[]}},
 listPetClinicalAccessGrants:async()=>[],
 listPetClinicalWriteRequests:async()=>request?[request]:[],
 reviewClinicalWriteRequest:async(id,decision,approved)=>{window.approved=approved;window.request={...request,status:decision}},
};
const getBrowserCoreApiClient=()=>({getAuthState:async()=>({isAuthenticated:true})});
const getBrowserClinicalAccessApiClient=()=>api;
const getMobileClinicalAccessApiClient=()=>api;
const getMobileHouseholdsApiClient=()=>({getHouseholdsSnapshot:async()=>({households:[{id:'house',householdType:'owner',myPermissions:['edit']}]})});
const getMobilePetsApiClient=()=>({listHouseholdPets:async()=>[{id:'pet',name:'Mascota QA'}]});
const styles={};
const submitClinicalEncounter=async()=>{throw Error('Not part of this check')};
window.resumeListeners=[];
const AppState={currentState:'active',addEventListener:(name,fn)=>{resumeListeners.push(fn);return {remove(){window.resumeListeners=resumeListeners.filter(f=>f!==fn)}}}};
window.background=()=>{AppState.currentState='background'};
window.resume=()=>{AppState.currentState='active';resumeListeners.forEach(fn=>fn('active'))};
const View=({children})=>React.createElement('div',null,children);
const SafeAreaView=View,ScrollView=View;
const Text=({children})=>React.createElement('p',null,children);
const Pressable=({children,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},children);
const Modal=({visible,children})=>visible?React.createElement('div',{'data-modal':'true'},children):null;
const ActivityIndicator=()=>React.createElement('span',null,'Cargando');
const QRCode=()=>null;const Share={share:async()=>{}};
`;
const server = createServer((req,res) => {
  res.setHeader('Content-Type','text/html; charset=utf-8');
  const owner=req.url==='/owner';
  const identity=req.url==='/identity';
  const setup=owner?'window.request=makeRequest();':identity?'window.profile=null;':'';
  const code=owner?`${loader}\n${card}\n${notices}`:web;
  res.end(`<div id="root"></div><script>${react}</script><script>${dom}</script><script>${fixture}\n${setup}\n${code}\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${owner?'ClinicalRequestNotifications':'ProfessionalIdentityPanel'}, {token:'fixture'}));</script>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const checks=[];
let browser;
const check=(name,result)=>{assert.ok(result,name);checks.push(name)};
try {
  browser=await startBrowser();
  const click=async(text)=>browser.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)return false;b.click();return true})()`);
  await browser.navigate(origin);
  await browser.wait("document.querySelectorAll('input[type=checkbox]').length===6");
  check('Existing professional opens panel with all six permissions selected',await browser.evaluate("[...document.querySelectorAll('input[type=checkbox]')].every(x=>x.checked)"));
  await browser.evaluate("document.querySelectorAll('input[type=checkbox]').forEach(x=>x.click())");
  await click('Enviar solicitud al owner');
  await browser.wait("document.body.innerText.includes('Selecciona al menos una accion')");
  check('No permissions selected prevents submission',await browser.evaluate('window.sent===null'));
  await browser.evaluate("document.querySelectorAll('input[type=checkbox]').forEach(x=>x.click())");
  await browser.evaluate("document.querySelectorAll('input[type=checkbox]')[1].click()");
  await click('Enviar solicitud al owner');
  await browser.wait('window.sent!==null');
  check('Deselected diagnosis is excluded from submitted permissions',await browser.evaluate("sent.length===5&&!sent.includes('record_diagnosis')"));
  await browser.wait("document.body.innerText.includes('En espera')");
  await browser.evaluate("window.request={...request,status:'approved'};window.tick()");
  await browser.wait("document.body.innerText.includes('Registrar atencion autorizada')");
  check('Approval opens form without reloading',true);
  await browser.evaluate("(()=>{const t=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'Borrador QA');t.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await browser.evaluate('window.tick()');
  check('Status refresh preserves encounter draft',await browser.evaluate("document.querySelector('textarea').value==='Borrador QA'"));

  await browser.navigate(origin+'/identity');
  await browser.wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Enviar a revision')");
  await click('Enviar a revision');
  await browser.wait("window.profile?.verificationStatus==='pending'");
  check('Submit identity saves current form before requesting review',await browser.evaluate('window.saved!==null'));

  await browser.navigate(origin+'/owner');
  await browser.wait("document.body.innerText.includes('Solicitud de acceso profesional')");
  check('Owner gets global popup with pet and professional',await browser.evaluate("document.body.innerText.includes('QA Doctor')&&document.body.innerText.includes('Mascota QA')"));
  await click('Ahora no');
  await browser.evaluate('window.tick()');
  await browser.wait("!document.querySelector('[data-modal]')");
  check('Dismissed popup is not repeated and pending CTA remains',await browser.evaluate("document.body.innerText.includes('pendiente(s). Revisar')"));
  await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('pendiente(s). Revisar')).click()");
  await browser.wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Aprobar')");
  check('Review presents requested permissions before explicit approval',await browser.evaluate("document.body.innerText.includes('Diagnostico')&&document.body.innerText.includes('Documento clinico')&&window.approved===undefined"));
  await click('Aprobar');
  await browser.wait("window.request.status==='approved'");
  check('Owner approval uses exactly the requested permissions',await browser.evaluate('approved.length===6'));
  await click('Cerrar');await browser.evaluate('window.tick()');
  await browser.wait("!document.body.innerText.includes('pendiente(s). Revisar')");
  check('Approved request leaves the pending queue',true);
  await browser.evaluate("window.background();window.request={...makeRequest(),id:'request-2'};window.tick()");
  check('Background app does not open a new popup',await browser.evaluate("!document.querySelector('[data-modal]')"));
  await browser.evaluate('window.resume()');
  await browser.wait("document.body.innerText.includes('Solicitud de acceso profesional')");
  check('Resuming app discovers a new pending request',true);
  await click('Revisar solicitud');
  await browser.wait("[...document.querySelectorAll('button')].some(b=>b.textContent==='Rechazar')");
  await click('Rechazar');
  await browser.wait("window.request.status==='rejected'");
  check('Owner can explicitly reject instead of approve',true);
  check('No uncaught browser exceptions',browser.errors.length===0);
  await writeFile(new URL('./browser-result.json',import.meta.url),JSON.stringify({passed:true,checks,scope:'Real React components; fake APIs and React Native DOM adapters. No production mutations; does not certify native UI or push.'},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks},null,2));
} finally {if(browser)await browser.close();server.close();}
