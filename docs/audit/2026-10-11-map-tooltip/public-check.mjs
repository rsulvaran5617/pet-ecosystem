import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {startBrowser} from '../2026-10-07-open-map/browser-session.mjs';
const browser=await startBrowser();
const report={checkedAt:new Date().toISOString(),readOnly:true};
try{
  await browser.navigate('https://petecosyst.com/pet-alert');
  await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Mapa').click()`);
  await browser.wait(`!!document.querySelector('[class*="pointList"] button')`);
  await browser.evaluate(`document.querySelector('[class*="pointList"] button').click()`);
  await browser.wait(`!!document.querySelector('.maplibregl-popup a')`);
  report.popup=await browser.evaluate(`({title:document.querySelector('.maplibregl-popup strong')?.textContent,summary:document.querySelector('.maplibregl-popup span')?.textContent,path:document.querySelector('.maplibregl-popup a')?.getAttribute('href')})`);
  assert(report.popup.title);
  assert.match(report.popup.path,/^\/pet-alert\//);
  await browser.evaluate(`document.querySelector('.maplibregl-popup a').click()`);
  await browser.wait(`location.pathname === ${JSON.stringify(report.popup.path)} && document.readyState==='complete'`);
  assert.equal(browser.errors.length,0,browser.errors.join('\n'));
  report.detailOpened=true;
  report.passed=true;
}finally{
  await browser.close();
  await fs.writeFile(new URL('public-check.json',import.meta.url),JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report));
