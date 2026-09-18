import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const pause = ms => new Promise(r => setTimeout(r, ms));
export async function startBrowser() {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'pet-audit-browser-'));
  const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let port;
  for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
  if(!port){child.kill();throw new Error('Browser did not start');}
  const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  const socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map();const errors=[];const consoleErrors=[];
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))consoleErrors.push(m.params.args.map(a=>a.value??a.description).join(' '));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error(`Timeout ${method}`));},45000);pending.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  const wait=async(expression,timeout=40000)=>{const until=Date.now()+timeout;while(Date.now()<until){if(await evaluate(expression))return;await pause(250);}throw new Error('UI wait timed out');};
  await call('Page.enable');await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  return {call,evaluate,wait,errors,consoleErrors,profile,
    async navigate(url){await call('Page.navigate',{url});await wait("document.readyState === 'complete'");await pause(1300);},
    async screenshot(file){await writeFile(file,Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));},
    async close(){try{await call('Browser.close');}catch{}socket.close();if(child.exitCode===null)child.kill();}
  };
}
