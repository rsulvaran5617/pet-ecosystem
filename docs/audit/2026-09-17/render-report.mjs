import fs from 'node:fs/promises';
import {startBrowser,pause} from './browser-session.mjs';
const b=await startBrowser();
const result={};
try{
  await b.navigate(new URL('./INFORME_AUDITORIA.html',import.meta.url).href);
  result.initial=await b.evaluate(`({rows:document.querySelectorAll('#matrix tbody tr').length,overflow:document.documentElement.scrollWidth>innerWidth,headings:document.querySelectorAll('h3').length})`);
  if(result.initial.rows!==110||result.initial.overflow)throw new Error('HTML structure validation failed');
  await b.evaluate(`document.getElementById('search').value='H01';document.getElementById('search').dispatchEvent(new Event('input'))`);
  result.search=await b.evaluate(`({visible:[...document.querySelectorAll('#matrix tbody tr')].filter(r=>!r.hidden).length,label:document.getElementById('count').textContent})`);
  if(!result.search.visible)throw new Error('Search failed');
  await b.evaluate(`document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'))`);
  await b.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await pause(300);
  result.narrow=await b.evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth})`);
  if(result.narrow.overflow)throw new Error('Report overflow');
  await b.screenshot(new URL('./evidence/report-390.png',import.meta.url));
  await b.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await b.call('Emulation.setEmulatedMedia',{media:'print'});
  const pdf=await b.call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,generateTaggedPDF:true,generateDocumentOutline:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font:8px Arial;color:#526b7a;width:100%;text-align:center">Pet Ecosystem · Auditoría 17/09/2026 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
  const bytes=Buffer.from(pdf.data,'base64');
  result.pdf={bytes:bytes.length,pages:[...bytes.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length};
  if(!bytes.toString('ascii',0,5).startsWith('%PDF-')||result.pdf.pages<4)throw new Error('PDF invalid');
  await fs.writeFile(new URL('./INFORME_AUDITORIA.pdf',import.meta.url),bytes);
  result.errors=b.errors;
  if(b.errors.length)throw new Error('Report runtime errors');
  await fs.writeFile(new URL('./evidence/report-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
}finally{await b.close();}
console.log(JSON.stringify(result));
