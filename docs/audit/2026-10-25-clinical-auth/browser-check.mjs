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
window.signedIn=sessionStorage.getItem('qa-auth')==='yes';window.authCallback=()=>{};
const getBrowserCoreApiClient=()=>({getAuthState:async()=>({isAuthenticated:signedIn,userId:signedIn?'qa-user':null,email:signedIn?'doctor@example.test':null}),logout:async()=>{sessionStorage.removeItem('qa-auth');signedIn=false;authCallback('SIGNED_OUT',null)}});
const getBrowserSupabaseClient=()=>({auth:{onAuthStateChange:fn=>{authCallback=fn;return {data:{subscription:{unsubscribe(){}}}}}}});
const getBrowserClinicalAccessApiClient=()=>({getAuthenticatedClinicalAccessContext:async()=>({}),getMyClinicalProfessionalContext:async()=>({profile:{professionalName:'Doctor QA',verificationStatus:'verified',professionalType:'veterinarian',licenseReference:'QA',jurisdiction:'Panama',countryCode:'PA'},organizationOptions:[]}),getMyClinicalWriteRequest:async()=>null,listMyProfessionalEncounters:async()=>[]});
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
  await browser.navigate(`${origin}/clinical-access/${token}`);
  await browser.wait("document.body?.innerText.includes('Crear cuenta')");
  check('Anonymous sees both entry actions immediately',await browser.evaluate("Array.from(document.querySelectorAll('a')).some(a=>a.textContent==='Iniciar sesion')&&!document.body?.innerText.includes('Identificarme como profesional')"));
  check('Clinical panel is a visible anchor for blocked documents',await browser.evaluate("!!document.getElementById('professional-access')"));
  check('Narrow viewport has no horizontal overflow',await browser.evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
  await browser.evaluate("Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Crear cuenta').click()");
  await browser.wait("location.pathname==='/app'&&document.body?.innerText.startsWith('register')");
  check('Registration preserves the exact QR',await browser.evaluate(`document.body?.innerText.includes('/clinical-access/${token}')`));
  check('Pending registration does not prematurely return',await browser.evaluate("location.pathname==='/app'"));
  await browser.evaluate('finishAuth()');
  await browser.wait(`location.pathname==='/clinical-access/${token}'&&document.body?.innerText.includes('Doctor QA')`);
  check('Completing registration returns to the QR with authenticated identity',true);
  check('Authenticated identity still requires owner permission',await browser.evaluate("document.body?.innerText.includes('Enviar solicitud al owner')&&!document.body?.innerText.includes('Confirmar e incorporar')"));
  check('Shows the current account',await browser.evaluate("document.body?.innerText.includes('doctor@example.test')"));
  await browser.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Cerrar sesion y usar otra cuenta').click()");
  await browser.wait("document.body?.innerText.includes('Iniciar sesion')&&!document.body?.innerText.includes('Doctor QA')");
  check('Logout clears identity and restores sign-in actions',true);
  await browser.evaluate("Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Iniciar sesion').click()");
  await browser.wait("location.pathname==='/app'&&document.body?.innerText.startsWith('login')");
  check('Existing account opens login mode',true);
  check('Reject arbitrary redirect destinations',await browser.evaluate("[ '?clinicalReturn=https://evil.example', '?clinicalReturn=//evil.example', '?clinicalReturn=abc', '?clinicalReturn='+ 'a'.repeat(63)].every(s=>validateReturn(s)===null)"));
  await browser.evaluate('finishAuth()');await browser.wait("document.body?.innerText.includes('Doctor QA')");
  check('Login also returns to original record',await browser.evaluate(`location.pathname==='/clinical-access/${token}'`));
  check('No uncaught browser errors',browser.errors.length===0);
  await writeFile(new URL('./browser-results.json',import.meta.url),JSON.stringify({checks,scope:'Real React panel and return hook in Chrome, narrow viewport; simulated auth and clinical APIs. Existing Core registration/login forms reused, no live signup or native-device test.'},null,2)+'\n');
  console.log(JSON.stringify(checks,null,2));
} finally {await browser.close();server.close();}
