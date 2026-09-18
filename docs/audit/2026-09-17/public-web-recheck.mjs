import fs from 'node:fs/promises';
import {startBrowser,pause} from './browser-session.mjs';
const b=await startBrowser();const result={executedAt:new Date().toISOString(),routes:[]};
try{for(const route of ['/','/ayuda','/pet-alert']){
  const offset=b.errors.length,consoleOffset=b.consoleErrors.length;
  await b.navigate('http://localhost:3100'+route);await pause(1500);
  result.routes.push({route,errors:b.errors.slice(offset).map(e=>e.split('\n')[0]),console:b.consoleErrors.slice(consoleOffset)});
  if(route==='/pet-alert'){
    await b.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    for(const label of ['Mascotas vistas','Encontradas','Extraviadas','Mapa','Lista']){
      const clicked=await b.evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().startsWith(${JSON.stringify(label)}));button?.click();return !!button;})()`);await pause(1200);
      result.routes.push({route,action:label,clicked,...await b.evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,state:[...document.querySelectorAll('[role=alert],[role=status],.state')].map(e=>e.textContent)})`)});
    }
    await b.screenshot(new URL('./evidence/pet-alert-390.png',import.meta.url));
  }
}}finally{await fs.writeFile(new URL('./evidence/public-web-recheck.json',import.meta.url),JSON.stringify(result,null,2)+'\n');await b.close();}
console.log(JSON.stringify({routes:result.routes.map(r=>({route:r.route,action:r.action,errors:r.errors?.length,console:r.console?.map(s=>s.slice(0,600)),state:r.state,width:r.width,scrollWidth:r.scrollWidth}))},null,2));
