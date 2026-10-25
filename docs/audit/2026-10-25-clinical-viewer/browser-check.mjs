import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import ts from 'typescript';
import { startBrowser } from '../2026-09-17/browser-session.mjs';
const root=new URL('../../../',import.meta.url);
const read=(p)=>readFile(new URL(p,root),'utf8');
const compile=async(p)=>ts.transpileModule(await read(p),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'').replace('import("pdfjs-dist/legacy/build/pdf.mjs")','import("/pdf-engine.mjs")');
const viewer=await compile('apps/web/src/features/clinical-access/components/ReadOnlyPdfViewer.tsx');
const component=await compile('apps/web/src/features/clinical-access/components/SharedClinicalDocuments.tsx');
const react=await read('apps/web/node_modules/react/umd/react.development.js');
const dom=await read('apps/web/node_modules/react-dom/umd/react-dom.development.js');
const css=await read('apps/web/src/features/clinical-access/components/PublicClinicalAccessPage.module.css');
// Valid synthetic two-page PDF; no user data, viewer plugins or external services.
const objects=[
'<< /Type /Catalog /Pages 2 0 R >>',
'<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
...['Clinical QA first page','Clinical QA second page'].map(text=>{const stream=`BT /F1 24 Tf 40 400 Td (${text}) Tj ET`;return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`})];
let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const setup=`const {useState,useEffect,useRef,useCallback}=React;const styles=new Proxy({},{get:(_,key)=>key});
window.allowed=false;window.mime='image/png';window.expiry=Date.now()+3600000;window.revoked=[];window.hold=false;window.corrupt=false;
const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{revoked.push(u);revoke(u)};
window.ticks=[];window.setInterval=fn=>{ticks.push(fn);return fn};window.clearInterval=fn=>{ticks=ticks.filter(t=>t!==fn)};window.tick=()=>ticks.forEach(fn=>fn());
const api={listSharedPetClinicalDocuments:async()=>{if(!allowed)throw Error('denied');return {expiresAt:new Date(expiry).toISOString(),documents:[{id:'doc',title:'Cartilla QA',documentType:'vaccination_record'}]}},downloadSharedPetClinicalDocument:async()=>{if(hold)await new Promise(r=>window.release=r);if(!allowed)throw Error('denied');return new Blob([mime==='application/pdf'?(corrupt?'%PDF-broken':${JSON.stringify(pdf)}):Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVioAAAAASUVORK5CYII='),c=>c.charCodeAt(0))],{type:mime})}};
const getBrowserClinicalAccessApiClient=()=>api;
const getBrowserSupabaseClient=()=>({auth:{onAuthStateChange:fn=>{window.authEvent=fn;return {data:{subscription:{unsubscribe(){}}}}}}});`;
const requests=[];
const server=createServer(async(req,res)=>{try{
requests.push(req.url);
if(req.url==='/pdf-engine.mjs'){res.setHeader('content-type','text/javascript');return res.end(await read('apps/web/node_modules/pdfjs-dist/legacy/build/pdf.mjs'))}
if(req.url.startsWith('/pdfjs/')&&!req.url.includes('..')){const content=await readFile(new URL('apps/web/public'+req.url,root));res.setHeader('content-type',req.url.endsWith('.mjs')?'text/javascript':req.url.endsWith('.wasm')?'application/wasm':'application/octet-stream');return res.end(content)}
res.setHeader('content-type','text/html; charset=utf-8');res.end('<style>'+css+'</style><div id="root"></div><script>'+react+'</script><script>'+dom+'</script><script>'+setup+viewer+component+"ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(SharedClinicalDocuments,{token:'fixture'}));</script>");
}catch{res.statusCode=404;res.end('Not found')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[];
const check=(name,value)=>{assert(value,name);checks.push({name,passed:true})};
try{browser=await startBrowser();await browser.navigate('http://127.0.0.1:'+server.address().port);
const click=label=>browser.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)}).click()`);
const ready=()=>browser.wait("!!document.querySelector('canvas:not([hidden])')&&!!document.querySelector('details')");
await browser.wait("document.body.innerText.includes('aprobacion del responsable')");check('Unauthorized view has no file buttons',await browser.evaluate("!document.body.innerText.includes('Ver documento / foto')"));
await browser.evaluate('allowed=true;tick()');await browser.wait("document.body.innerText.includes('Cartilla QA')");
check('Read-only language and unambiguous refresh',await browser.evaluate("document.body.innerText.includes('Solo lectura')&&document.body.innerText.includes('Volver a consultar')&&!document.body.innerText.includes('Actualizar documentos')"));
await click('Ver documento / foto');await browser.wait("document.querySelector('img')?.naturalWidth===1");check('Image preview decodes without download UI',await browser.evaluate("!document.querySelector('a[download]')"));
await click('Cerrar archivo');await browser.wait("!document.querySelector('img')");check('Closing image releases URL',await browser.evaluate('revoked.length===1'));
await browser.evaluate("mime='application/pdf'");await click('Ver documento / foto');await ready();
check('PDF renders through real PDF.js without browser plugin',await browser.evaluate("document.body.innerText.includes('Pagina 1 de 2')&&document.querySelector('details').textContent.includes('Clinical QA first page')&&!document.querySelector('object,iframe,a[download]')"));
check('PDF has visible rendered pixels',await browser.evaluate("(()=>{const c=document.querySelector('canvas');const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<80&&a[i+1]<80&&a[i+2]<80&&a[i+3]>200)n++;return n>100})()"));
await click('Pagina siguiente');await ready();await browser.wait("document.querySelector('details').textContent.includes('Clinical QA second page')");check('Multiple pages navigate correctly',true);
await browser.evaluate("const z=document.querySelector('select');z.value='1.5';z.dispatchEvent(new Event('change',{bubbles:true}))");await ready();check('Zoom renders without controls for saving or editing',await browser.evaluate("document.querySelector('select').value==='1.5'&&!document.body.innerText.match(/Descargar|Imprimir|Guardar|Editar/)&&!document.querySelector('input,textarea,[contenteditable=true]')"));
await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});check('Canvas can scroll on narrow screens',await browser.evaluate("getComputedStyle(document.querySelector('.pdfCanvasViewport')).overflow==='auto'"));
await browser.evaluate('allowed=false;tick()');await browser.wait("!document.querySelector('canvas')");check('Revocation removes PDF and private file list',await browser.evaluate("!document.body.innerText.includes('Ver documento / foto')"));
await browser.evaluate('allowed=true;expiry=Date.now()+2500;tick()');await browser.wait("document.body.innerText.includes('Cartilla QA')");await click('Ver documento / foto');await ready();await browser.wait("document.body.innerText.includes('permiso temporal vencio')");check('Expiry tears down PDF viewer',await browser.evaluate("!document.querySelector('canvas')"));
await browser.evaluate('expiry=Date.now()+3600000;tick()');await browser.wait("document.body.innerText.includes('Cartilla QA')");await click('Ver documento / foto');await ready();await browser.evaluate("allowed=false;authEvent('SIGNED_OUT')");await browser.wait("!document.querySelector('canvas')");check('Logout clears PDF',true);
await browser.evaluate("allowed=true;corrupt=true;authEvent('SIGNED_IN')");await browser.wait("document.body.innerText.includes('Cartilla QA')");await click('Ver documento / foto');await browser.wait("document.body.innerText.includes('No fue posible mostrar este PDF')");check('Invalid PDF offers retry without download fallback',await browser.evaluate("document.body.innerText.includes('Reintentar vista')&&!document.querySelector('a[download]')"));
await click('Cerrar archivo');await browser.evaluate('corrupt=false;hold=true');await click('Ver documento / foto');await browser.wait("typeof release==='function'");await browser.evaluate("authEvent('SIGNED_OUT');release()");await browser.wait("!document.body.innerText.includes('Abriendo...')");check('Late response cannot reopen after logout',await browser.evaluate("!document.querySelector('canvas')"));
check('Worker and fonts served locally',requests.some(p=>p.endsWith('pdf.worker.min.mjs'))&&requests.some(p=>p.includes('/standard_fonts/')));
check('No uncaught browser exceptions',browser.errors.length===0);
await writeFile(new URL('./browser-results.json',import.meta.url),JSON.stringify({checks,scope:'Real React, real PDF.js worker and valid two-page synthetic PDF in Chrome; mocked clinical APIs. No live authorization or native-device certification.'},null,2)+'\n');console.log(JSON.stringify(checks,null,2));
}finally{if(browser)await browser.close();server.close()}
