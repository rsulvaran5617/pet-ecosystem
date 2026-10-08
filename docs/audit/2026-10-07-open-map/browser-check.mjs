import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startBrowser,pause} from './browser-session.mjs';
const base=process.argv[2] || 'https://petecosyst.com';
const label=process.argv[3] || 'public';
const browser=await startBrowser();
const report={checkedAt:new Date().toISOString(),base,readOnly:true};
try {
  await browser.navigate(base+'/pet-alert');
  await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Mapa').click()`);
  await browser.wait(`!!document.querySelector('.maplibregl-canvas')`);
  await browser.wait(`document.body.innerText.includes('Ginger') && document.body.innerText.includes('OpenStreetMap')`);
  await pause(8000);
  report.map=await browser.evaluate(`({canvas:!!document.querySelector('.maplibregl-canvas'),attribution:document.querySelector('.maplibregl-ctrl-attrib')?.textContent,errors:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent),resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('openfreemap.org')).map(x=>({path:new URL(x.name).pathname,duration:x.duration}))})`);
  assert(report.map.canvas);assert(report.map.attribution.includes('OpenStreetMap'));assert.equal(report.map.errors.length,0);
  await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Ginger')).click()`);
  await browser.wait(`[...document.querySelectorAll('a')].some(x=>x.textContent==='Ver boletin')`);
  report.detailPath=await browser.evaluate(`[...document.querySelectorAll('a')].find(x=>x.textContent==='Ver boletin').getAttribute('href')`);
  await browser.screenshot(new URL(label+'-map.png',import.meta.url));
  await browser.navigate(base+report.detailPath);
  report.detailOpened=await browser.evaluate(`document.body.innerText.includes('Ginger')`);
  assert(report.detailOpened);
  report.runtimeErrors=browser.errors;
  report.consoleErrors=browser.consoleErrors;
  assert.equal(browser.errors.length,0);
  report.passed=true;
} catch(e){report.passed=false;report.error=e.message;await browser.screenshot(new URL(label+'-failure.png',import.meta.url));}
finally{await browser.close();await fs.writeFile(new URL(label+'-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
