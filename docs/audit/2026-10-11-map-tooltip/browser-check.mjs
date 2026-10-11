import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startBrowser, pause } from '../2026-10-07-open-map/browser-session.mjs';
const browser = await startBrowser();
const checks = [];
try {
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:'prompt'})}});
    window.clusterFixture=false;
    const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=typeof input==='string'?input:input.url;
      if(url.includes('openfreemap.org'))return new Response(JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e7f1ef'}}]}),{headers:{'Content-Type':'application/json'}});
      if(url.includes('/rest/v1/')){
        const point={event_type:'lost_pet_alert',public_slug:'fixture',public_path:'/pet-alert/mascota-perdida/fixture',status:'active',status_group:'lost',title:'Luna <img src=x onerror=alert(1)>',species:'Perro',city:'Panama',occurred_at:new Date().toISOString(),public_latitude:8.65,public_longitude:-80.15};
        const rows=url.includes('list_public_pet_alert_map_points')?[point]:[];
        if(rows.length&&window.clusterFixture)rows.push({...point,public_slug:'second'});
        return new Response(JSON.stringify(rows),{headers:{'Content-Type':'application/json'}});
      }
      return original(input,init);
    };
  `});
  await browser.navigate('http://localhost:3091/pet-alert');
  await browser.evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Mapa').click()`);
  await browser.wait(`[...document.querySelectorAll('button[aria-pressed]')].some(x=>x.textContent.includes('Luna'))`);
  await pause(800);
  await browser.evaluate(`document.querySelector('.maplibregl-canvas').scrollIntoView({block:'center'})`);
  const pos=await browser.evaluate(`(()=>{const r=document.querySelector('.maplibregl-canvas').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',...pos});
  await browser.wait(`!!document.querySelector('.maplibregl-popup')`);
  assert((await browser.evaluate(`document.querySelector('.maplibregl-popup').textContent`)).includes('Luna <img'));
  assert.equal(await browser.evaluate(`!!document.querySelector('.maplibregl-popup img')`),false);
  assert.equal(await browser.evaluate(`document.querySelector('.maplibregl-popup a').getAttribute('href')`),'/pet-alert/mascota-perdida/fixture');
  checks.push('hover, safe text and bulletin link');
  await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.wait(`!document.querySelector('.maplibregl-popup')`);
  checks.push('Escape closes');
  await browser.call('Emulation.setTouchEmulationEnabled',{enabled:true});
  await browser.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pos]});
  await browser.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await browser.wait(`!!document.querySelector('.maplibregl-popup')`);
  checks.push('touch opens');
  await browser.evaluate(`document.querySelector('.maplibregl-popup-close-button').click()`);
  await browser.evaluate(`[...document.querySelectorAll('button[aria-pressed]')].find(x=>x.textContent.includes('Luna')).click()`);
  await browser.wait(`!!document.querySelector('.maplibregl-popup')`);
  checks.push('accessible list opens');
  await browser.evaluate(`window.clusterFixture=true;[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Mascotas vistas')).click()`);
  await browser.wait(`!document.querySelector('.maplibregl-popup')`);
  await pause(900);
  await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x+80,y:pos.y});
  await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',...pos});
  await browser.wait(`document.querySelector('.maplibregl-popup')?.textContent.includes('2 mascotas')`);
  checks.push('filter clears popup and cluster shows count');
  assert.equal(browser.errors.length,0,browser.errors.join('\n'));
} finally {
  await browser.close();
  await fs.writeFile(new URL('browser-check.json',import.meta.url),JSON.stringify({checks,fixtureData:true,remoteMutations:false},null,2));
}
console.log(checks);
