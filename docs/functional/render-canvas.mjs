// Exporta PDF y captura evidencia visual con un perfil temporal de Chromium.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const stem = 'PET_ECOSYSTEM_CANVAS_FUNCIONAL';
const candidates = [process.env.CANVAS_CHROMIUM_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executable;
for (const candidate of candidates) { try { await access(candidate); executable=candidate; break; } catch {} }
if (!executable) throw new Error('Define CANVAS_CHROMIUM_PATH con un navegador Chromium disponible.');
const profile = await mkdtemp(path.join(os.tmpdir(),'pet-canvas-'));
const browser = spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause = (ms) => new Promise((resolve)=>setTimeout(resolve,ms));
let socket;
try {
  let port;
  for(let attempt=0;attempt<100;attempt++) { try {port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(200);} }
  if(!port) throw new Error('No se inició el navegador de exportación.');
  const page=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let nextId=0;
  const pending=new Map();
  const errors=[];
  socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);if(message.id){const entry=pending.get(message.id);if(entry){clearTimeout(entry.timer);pending.delete(message.id);message.error?entry.reject(new Error(JSON.stringify(message.error))):entry.resolve(message.result);}}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Tiempo agotado: ${method}`));},60000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  await call('Page.enable');await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:pathToFileURL(path.join(dir,`${stem}.html`)).href});
  await pause(800);
  await call('Runtime.evaluate',{expression:'document.fonts.ready',awaitPromise:true});
  const evaluate=async(expression)=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
  const structure=await evaluate(`({title:document.title,features:document.querySelectorAll('.feature').length,chapters:document.querySelectorAll('.chapter').length,brokenLinks:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(id=>!document.getElementById(id)),overflow:document.documentElement.scrollWidth>innerWidth})`);
  if(structure.brokenLinks.length||structure.overflow)throw new Error(JSON.stringify(structure));
  await evaluate(`document.getElementById('search').value='QR';document.getElementById('search').dispatchEvent(new Event('input'));`);
  const search=await evaluate(`({status:document.getElementById('search-status').textContent,links:document.querySelectorAll('#search-results a').length})`);
  if(!search.links)throw new Error('La búsqueda no devuelve funciones.');
  await evaluate(`document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'));`);
  await writeFile(path.join(dir,'canvas-cover-preview.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`document.getElementById('02-canvas-general-del-ecosistema').scrollIntoView({behavior:'instant'});`);await pause(350);
  await writeFile(path.join(dir,'canvas-roles-preview.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('window.scrollTo(0,0)');await pause(250);
  const mobile=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth})`);
  if(mobile.overflow)throw new Error('Desbordamiento horizontal Mobile: '+JSON.stringify(mobile));
  await writeFile(path.join(dir,'canvas-mobile-preview.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await call('Emulation.setEmulatedMedia',{media:'print'});
  const result=await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,generateTaggedPDF:true,generateDocumentOutline:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font:8px Arial;color:#526779;padding:0 15mm;display:flex;justify-content:space-between"><span>Pet Ecosystem · Canvas funcional · 16/09/2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'});
  const pdf=Buffer.from(result.data,'base64');
  await writeFile(path.join(dir,`${stem}.pdf`),pdf);
  const raw=pdf.toString('latin1');
  const pages=[...raw.matchAll(/\/Type\s*\/Page\b/g)].length;
  const mediaBoxes=[...new Set([...raw.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map(m=>m[1]))];
  if(!raw.startsWith('%PDF-')||pages<15||errors.length)throw new Error('Validación PDF/browser falló: '+JSON.stringify({pages,errors}));
  const validation=JSON.parse(await readFile(path.join(dir,'canvas-validation.json'),'utf8'));
  Object.assign(validation,{browser:{structure,search,mobile,errors},pdf:{bytes:pdf.length,pages,mediaBoxes,tagged:raw.includes('/StructTreeRoot'),outline:raw.includes('/Outlines')}});
  await writeFile(path.join(dir,'canvas-validation.json'),JSON.stringify(validation,null,2)+'\n');
  console.log(JSON.stringify(validation));
  await call('Browser.close');
}finally{socket?.close();if(browser.exitCode===null)browser.kill();}
