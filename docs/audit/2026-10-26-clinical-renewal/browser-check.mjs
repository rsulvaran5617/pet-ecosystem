import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import ts from 'typescript';
import { startBrowser } from '../2026-09-17/browser-session.mjs';
const root = new URL('../../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const compile = async path => ts.transpileModule(await read(path), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const panel = await compile('apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx');
const documents = await compile('apps/web/src/features/clinical-access/components/SharedClinicalDocuments.tsx');
const admin = await compile('apps/admin/src/features/clinical-access/components/AdminClinicalProfessionalsWorkspace.tsx');
const hook = await compile('apps/web/src/features/core/hooks/useClinicalAuthReturn.ts');
const react = await read('apps/web/node_modules/react/umd/react.development.js');
const dom = await read('apps/web/node_modules/react-dom/umd/react-dom.development.js');
const css = await read('apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.module.css');
const token = 'a'.repeat(64);
const html = `<!doctype html><meta name="viewport" content="width=device-width"><style>${css}</style><div id="root"></div><script>${react}</script><script>${dom}</script><script>
const {useEffect,useState,useRef,useCallback}=React;const styles=new Proxy({},{get:(_,key)=>key});
window.signedIn=true;window.qaStatus='expired';window.renewals=0;window.authCallback=()=>{};
const getBrowserCoreApiClient=()=>({getAuthState:async()=>({isAuthenticated:signedIn,userId:signedIn?'qa-user':null,email:signedIn?'doctor@example.test':null}),logout:async()=>{sessionStorage.removeItem('qa-auth');signedIn=false;authCallback('SIGNED_OUT',null)}});
const getBrowserSupabaseClient=()=>({auth:{onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}}}}});
const qaContext=()=>({profile:{id:'qa',professionalName:'Doctor QA',verificationStatus:qaStatus,verificationExpiresAt:'2026-10-25T04:59:59Z',professionalType:'veterinarian',licenseReference:'QA',jurisdiction:'Panama',countryCode:'PA'},organizationOptions:[]});
const getBrowserClinicalAccessApiClient=()=>({listSharedPetClinicalDocuments:async()=>{throw new Error("QA denied")},getAuthenticatedClinicalAccessContext:async()=>({}),getMyClinicalProfessionalContext:async()=>qaContext(),getMyClinicalWriteRequest:async()=>null,listMyProfessionalEncounters:async()=>[],submitMyClinicalProfessionalProfile:async()=>{renewals++;qaStatus='pending';return qaContext()}});
const getAdminClinicalAccessApiClient=()=>({listClinicalProfessionalsForAdmin:async()=>[qaContext().profile],listClinicalAuditEventsForAdmin:async()=>[],reviewClinicalProfessionalProfile:async(id,decision)=>{qaStatus=decision}});
${panel}
${documents}
function DoctorPage(){return React.createElement(React.Fragment,null,React.createElement(ProfessionalIdentityPanel,{token:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}),React.createElement(SharedClinicalDocuments,{token:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}))}
${hook}
${admin}
window.validateReturn=getClinicalAuthReturn;
function AuthHarness(){const [auth,setAuth]=useState(false);const [mode,setMode]=useState('');const dest=useClinicalAuthReturn(auth,false,setMode);window.finishAuth=()=>{sessionStorage.setItem('qa-auth','yes');setAuth(true)};return React.createElement('div',null,mode+' '+dest)}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(location.pathname==='/admin'?AdminClinicalProfessionalsWorkspace:DoctorPage,{token:'${token}'}));
</script>`;
const server = createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await startBrowser();const checks=[];
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true})};
const origin=`http://127.0.0.1:${server.address().port}`;
try {
 await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await browser.navigate(origin+'/clinical-access/'+token);
 await browser.wait("document.body?.innerText.includes('Solicitar renovacion profesional')");
 check('Expired signed-in professional has renewal action',true);
 await browser.wait("document.body.innerText.includes('Tu verificacion profesional vencio. Solicita su renovacion')");
 check('Documents explain renewal rather than asking signed-in user to log in',true);
 check('Expiry date visible',await browser.evaluate("document.body.innerText.includes('Ultima vigencia profesional')"));
 check('No owner request before verification',await browser.evaluate("!document.body.innerText.includes('Enviar solicitud al owner')"));
 await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Solicitar renovacion profesional').click()");
 await browser.wait("document.body?.innerText.includes('Renovacion enviada a administracion')");
 check('Renewal submits once and becomes pending',await browser.evaluate("renewals===1&&qaStatus==='pending'&&!document.body.innerText.includes('Solicitar renovacion profesional')"));
 await browser.evaluate("window.dispatchEvent(new Event('focus'))");
 await browser.wait("document.body.innerText.includes('Tu identidad profesional esta pendiente de revision por administracion')");
 check('Documents explain pending administrative review',true);
 await browser.evaluate("qaStatus='verified';window.dispatchEvent(new Event('focus'))");
 await browser.wait("document.body?.innerText.includes('Enviar solicitud al owner')");
 check('Administrative verification leads to a fresh owner request',true);
 await browser.navigate(origin+'/admin');
 await browser.wait("document.body?.innerText.includes('Vencida')");
 check('Admin sees effective expired state and Panama expiry',await browser.evaluate("document.body.innerText.includes('hora de Panama')&&document.body.innerText.includes('Vigencia registrada')"));
 check('Admin explains renewal instead of offering suspension',await browser.evaluate("document.body.innerText.includes('Solicitar renovacion profesional')&&!Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Suspender verificacion')"));
 await browser.evaluate("qaStatus='pending'");
 // Remount the real admin component with the pending response.
 await browser.evaluate("ReactDOM.createRoot(document.body.appendChild(document.createElement('div'))).render(React.createElement(AdminClinicalProfessionalsWorkspace))");
 await browser.wait("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Verificar identidad')");
 check('Pending renewal can be reviewed by admin',true);
 check('No uncaught browser errors',browser.errors.length===0);
 await writeFile(new URL('./browser-results.json',import.meta.url),JSON.stringify({checks,scope:'Real React professional/admin panels in Chrome with simulated API and identity; not production-session or physical-device coverage.'},null,2)+'\n');
 console.log(JSON.stringify(checks));
} finally {await browser.close();server.close();}
