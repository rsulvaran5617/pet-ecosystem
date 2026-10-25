const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const auth=require(path.join(root,'auth.js'));
const {AppDistributionClient}=require(path.join(root,'appdistribution/client.js'));
const destination=path.join(__dirname,'beta-firebase.json');
const save=value=>fs.writeFileSync(destination,JSON.stringify(value,null,2)+'\n');
(async()=>{
 const check=JSON.parse(fs.readFileSync(path.join(__dirname,'beta-android-artifact.json'),'utf8'));
 if(!check.passed||check.commit!=='302a3d9a8547b019e949d25ae4cfa003764f0a88')throw Error('Verified release APK required');
 const account=auth.getGlobalDefaultAccount();
 auth.setRefreshToken(account.tokens.refresh_token);
 const client=new AppDistributionClient();
 let state=fs.existsSync(destination)?JSON.parse(fs.readFileSync(destination,'utf8')):{};
 if(!state.operationName){
   const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
   const session=JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE,'.expo/state.json'),'utf8'));
   const response=await fetch('https://api.expo.dev/graphql',{method:'POST',headers:{'Content-Type':'application/json','expo-session':session.auth.sessionSecret},body:JSON.stringify({query:'query($id:ID!){builds{byId(buildId:$id){status gitCommitHash artifacts{applicationArchiveUrl buildUrl}}}}',variables:{id:check.buildId}})});
   const data=await response.json();if(data.errors)throw Error('Build lookup failed');
   const build=data.data.builds.byId;if(build.status!=='FINISHED'||build.gitCommitHash!==check.commit)throw Error('Build mismatch');
   // Temporary token and artifact location sent over SSH stdin, never disk or argv.
   const input={token:token.access_token,url:build.artifacts.applicationArchiveUrl||build.artifacts.buildUrl,sha256:check.sha256};
   const program=`const input=${JSON.stringify(input)};const crypto=require('node:crypto');(async()=>{
     const response=await fetch(input.url);if(!response.ok)throw Error('Download failed');
     const bytes=Buffer.from(await response.arrayBuffer());if(crypto.createHash('sha256').update(bytes).digest('hex')!==input.sha256)throw Error('Hash mismatch');
     const upload=await fetch('https://firebaseappdistribution.googleapis.com/upload/v1/projects/1040291363922/apps/1:1040291363922:android:f00d644d342e309b87f38b/releases:upload',{method:'POST',headers:{Authorization:'Bearer '+input.token,'X-Goog-Upload-File-Name':'pet-ecosystem-clinical-302a3d9.apk','X-Goog-Upload-Protocol':'raw','Content-Type':'application/octet-stream'},body:bytes});
     if(!upload.ok)throw Error('Upload HTTP '+upload.status);const result=await upload.json();console.log(JSON.stringify({operationName:result.name}));
   })().catch(()=>{console.error('Remote upload failed; inspect release state before retry');process.exitCode=1;});`;
   const child=spawn('ssh',['-i',path.join(process.env.USERPROFILE,'.ssh/pet_ecosystem_deploy'),'-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=20','root@143.198.165.191','node'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',()=>{});child.stdin.end(program);
   const code=await new Promise(resolve=>child.on('close',resolve));if(code!==0)throw Error('Remote upload failed or uncertain; inspect Firebase before retry');
   state=JSON.parse(output);if(!state.operationName)throw Error('Upload operation missing');save(state);
 }
 if(!state.releaseName){
   const result=await client.pollUploadStatus(state.operationName);
   state={...state,releaseName:result.release.name,testingUri:result.release.testingUri,displayVersion:result.release.displayVersion,buildVersion:result.release.buildVersion,commit:check.commit,sha256:check.sha256};save(state);
 }
 if(!state.distributedAt){
   await client.updateReleaseNotes(state.releaseName,'Beta 0.3.2 / 302a3d9. Historial de autorizaciones en acordeon cerrado por defecto. Validar Mostrar/Ocultar, solicitudes pendientes y cambio de mascota.');
   const testers=await client.listTesters('projects/1040291363922');
   const emails=testers.map(t=>t.name.split('/testers/')[1]);
   if(!emails.length||emails.some(e=>!e?.includes('@')))throw Error('Existing testers unavailable');
   await client.distribute(state.releaseName,emails);
   state.distributedAt=new Date().toISOString();state.testerCount=emails.length;save(state);
 }
 console.log(JSON.stringify(state,null,2));
})().catch(()=>{console.error('Firebase distribution incomplete; inspect saved operation/release before retrying.');process.exitCode=1;});
