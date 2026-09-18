import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startBrowser,pause} from './browser-session.mjs';

const report={executedAt:new Date().toISOString(),targetCommit:'a7b89d3',deployedCommitVerified:false,scope:'Public read-only browser checks; no account mutations or deployment.',pages:[]};
let browser;
try {
 browser=await startBrowser();
 for(const route of ['/','/ayuda','/beta','/account-deletion','/app','/foster','/pet-alert']) {
  const url='https://petecosyst.com'+route;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  const html=await response.text();
  const errorStart=browser.errors.length,consoleStart=browser.consoleErrors.length;
  await browser.navigate(url);await pause(1500);
  const page={route,status:response.status,htmlSha256:createHash('sha256').update(html).digest('hex'),layouts:[]};
  for(const width of [1440,390]){
   await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await pause(250);
   page.layouts.push(await browser.evaluate(`({viewport:innerWidth,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`));
  }
  page.runtimeErrors=browser.errors.slice(errorStart).map(e=>e.split('\n')[0]);
  page.consoleErrorCount=browser.consoleErrors.length-consoleStart;
  page.staticStyleInline=route==='/'?html.includes('.landing-skin {'):route==='/ayuda'?html.includes('.help-shell {'):null;
  page.title=await browser.evaluate('document.title');
  report.pages.push(page);
  console.log(JSON.stringify(page));
 }
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
 if(browser)await browser.close();
 report.passed=report.pages.length===7&&report.pages.every(p=>p.status===200&&p.runtimeErrors.length===0&&p.layouts.every(l=>!l.overflow));
 await fs.writeFile(new URL('evidence/deployed-public-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 if(!report.passed)process.exitCode=1;
}
