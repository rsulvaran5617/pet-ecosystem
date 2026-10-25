/* global fetch */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import {spawn} from 'node:child_process';
import {URL} from 'node:url';
const commits={android:'302a3d9a8547b019e949d25ae4cfa003764f0a88',ios:'302a3d9a8547b019e949d25ae4cfa003764f0a88'};
const [platform,id]=process.argv.slice(2);
if(!['android','ios'].includes(platform)||!/^[\da-f-]{36}$/.test(id??''))throw Error('Expected platform and build ID');
const session=JSON.parse(await fs.readFile(path.join(process.env.USERPROFILE,'.expo/state.json'),'utf8'));
const response=await fetch('https://api.expo.dev/graphql',{
 method:'POST',headers:{'Content-Type':'application/json','expo-session':session.auth.sessionSecret},
 body:JSON.stringify({query:'query($id:ID!){builds{byId(buildId:$id){id status createdAt updatedAt completedAt queuePosition estimatedWaitTimeLeftSeconds appVersion appBuildVersion gitCommitHash logFiles artifacts{applicationArchiveUrl buildUrl}}}}',variables:{id}})
});
const result=await response.json();if(!response.ok||result.errors)throw Error('Build lookup failed');
const {artifacts,logFiles,...build}=result.data.builds.byId;
if(process.argv.includes('--phase')&&logFiles?.length){
 const log=await fetch(logFiles[0]);
 if(log.ok){
  const phases=(await log.text()).split('\n').flatMap(line=>{try{const entry=JSON.parse(line);return typeof entry.phase==='string'&&/^[A-Z_]+$/.test(entry.phase)?[entry.phase]:[];}catch{return [];}});
  build.lastPhase=phases.at(-1)??null;
 }
}
if(build.gitCommitHash!==commits[platform])throw Error('Unexpected commit');
if(process.argv.includes('--download')&&build.status==='FINISHED'){
 const file=path.resolve('dist/pilot',platform,`pet-ecosystem-clinical-${build.gitCommitHash.slice(0,7)}${platform==='ios'?'-build'+build.appBuildVersion:''}.${platform==='ios'?'ipa':'apk'}`);
 await fs.mkdir(path.dirname(file),{recursive:true});
 if(!(await fs.stat(file).catch(()=>null))){
  const curl=spawn('curl.exe',['--fail','--location','--silent','--show-error','--connect-timeout','30','--max-time','300','--config','-','--output',file+'.partial'],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  curl.stderr.on('data',()=>{});
  curl.stdin.end('url = '+JSON.stringify(artifacts.applicationArchiveUrl||artifacts.buildUrl)+'\n');
  const code=await new Promise(resolve=>curl.on('close',resolve));
  if(code!==0)throw Error('Artifact download failed (curl '+code+')');
  await fs.rename(file+'.partial',file);
 }
 build.artifact=path.relative(process.cwd(),file);
}
await fs.writeFile(new URL(`beta-${platform}.json`,import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),platform,...build},null,2)+'\n');
console.log(JSON.stringify(build,null,2));
