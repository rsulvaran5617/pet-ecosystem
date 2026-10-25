import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import ts from 'typescript';
import { startBrowser } from '../2026-09-17/browser-session.mjs';
const root = new URL('../../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const compile = async path => ts.transpileModule(await read(path), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const panel = await compile('apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx');
const hook = await compile('apps/web/src/features/core/hooks/useClinicalAuthReturn.ts');
const react = await read('apps/web/node_modules/react/umd/react.development.js');
const dom = await read('apps/web/node_modules/react-dom/umd/react-dom.development.js');
const css = await read('apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.module.css');
const token = 'a'.repeat(64);
const html = `<!doctype html><meta name="viewport" content="width=device-width"><style>${css}</style><div id="root"></div><script>${react}</script><script>${dom}</script><script>
const {useEffect,useState,useRef}=React;const styles=new Proxy({},{get:(_,key)=>key});
window.signedIn=true;window.qaRequest={id:'qa-old',status:'completed',requestedScopes:['create_encounter'],expiresAt:new Date(Date.now()+3600000).toISOString()};window.qaCalls=0;window.authCallback=()=>{};
const getBrowserCoreApiClient=()=>({getAuthState:async()=>({isAuthenticated:signedIn,userId:signedIn?'qa-user':null,email:signedIn?'doctor@example.test':null}),logout:async()=>{sessionStorage.removeItem('qa-auth');signedIn=false;authCallback('SIGNED_OUT',null)}});
const getBrowserSupabaseClient=()=>({auth:{onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}}}}});
const getBrowserClinicalAccessApiClient=()=>({getAuthenticatedClinicalAccessContext:async()=>({}),getMyClinicalProfessionalContext:async()=>({profile:{professionalName:'Doctor QA',verificationStatus:'verified',professionalType:'veterinarian',licenseReference:'QA',jurisdiction:'Panama',countryCode:'PA'},organizationOptions:[]}),getMyClinicalWriteRequest:async()=>qaRequest,requestClinicalWriteAccess:async()=>{qaCalls++;qaRequest={...qaRequest,id:"qa-new",status:"requested"};return "qa-new"},listMyProfessionalEncounters:async()=>[]});
${panel}
${hook}
window.validateReturn=getClinicalAuthReturn;
function AuthHarness(){const [auth,setAuth]=useState(false);const [mode,setMode]=useState('');const dest=useClinicalAuthReturn(auth,false,setMode);window.finishAuth=()=>{sessionStorage.setItem('qa-auth','yes');setAuth(true)};return React.createElement('div',null,mode+' '+dest)}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(location.pathname==='/app'?AuthHarness:ProfessionalIdentityPanel,{token:'${token}'}));
</script>`;
const server = createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await startBrowser();const checks=[];
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true})};
const origin=`http://127.0.0.1:${server.address().port}`;
try {
 await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await browser.navigate(origin+'/clinical-access/'+token);
 await browser.wait("document.body?.innerText.includes('Solicitar una nueva autorizacion')");
 check('Completed circuit offers a new request',true);
 await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Solicitar una nueva autorizacion').click()");
 await browser.wait("document.body?.innerText.includes('Al enviar, se cerraran')");
 check('Opening form does not submit or close permissions',await browser.evaluate('qaCalls===0&&qaRequest.id==="qa-old"'));
 check('All scopes start selected',await browser.evaluate('document.querySelectorAll("input[type=checkbox]:checked").length===6'));
 await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Cancelar').click()");
 await browser.wait("document.body?.innerText.includes('Solicitar una nueva autorizacion')");
 check('Cancel preserves circuit',await browser.evaluate('qaCalls===0'));
 await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Solicitar una nueva autorizacion').click()");
 await browser.wait("document.body?.innerText.includes('Enviar solicitud al owner')");
 await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Enviar solicitud al owner').click()");
 await browser.wait("document.body?.innerText.includes('En espera')");
 check('Submission shows new pending request',await browser.evaluate('qaCalls===1&&qaRequest.id==="qa-new"'));
 check('No write form before new approval',await browser.evaluate("!document.body?.innerText.includes('Registrar atencion autorizada')"));
 check('No browser exceptions',browser.errors.length===0);
 await writeFile(new URL('./browser-results.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),checks,scope:'Local real React panel in headless Chrome; simulated authenticated identity and clinical APIs. No native or full live-session test.'},null,2)+'\n');
 console.log(JSON.stringify(checks));
} finally {await browser.close();server.close();}
