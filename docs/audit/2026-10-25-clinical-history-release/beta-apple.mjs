import fs from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import {URL} from 'node:url';
import {appleRequest} from './apple-status.mjs';
const version=process.argv[2];
if(!/^\d+$/.test(version??''))throw Error('Expected build number');
const builds=await appleRequest(`builds?filter[app]=6776460841&filter[version]=${version}&include=buildBetaDetail`);
const groups=await appleRequest('apps/6776460841/betaGroups');
const group=groups.data.find(g=>g.attributes.name==='BetaTester');
if(!group)throw Error('Existing BetaTester group missing');
const build=builds.data.find(b=>b.attributes.version===version);
let review=null;
if(build&&process.argv.includes('--distribute')){
 if(build.attributes.processingState!=='VALID')throw Error('Apple processing not finished');
 const localizations=await appleRequest(`builds/${build.id}/betaBuildLocalizations`);
 const localization=localizations.data.find(item=>item.attributes.locale==='en-US');
 const whatsNew='Version 0.3.2: historial de autorizaciones oculto por defecto. Pulsa Mostrar para consultar el historial y Ocultar para cerrarlo. Solicitudes pendientes y permisos activos siguen visibles. Lectura basica por QR vigente; escritura y archivos requieren aprobacion.';
 if(localization){
  await appleRequest(`betaBuildLocalizations/${localization.id}`,{method:'PATCH',body:JSON.stringify({data:{type:'betaBuildLocalizations',id:localization.id,attributes:{whatsNew}}})});
 }else{
  await appleRequest('betaBuildLocalizations',{method:'POST',body:JSON.stringify({data:{type:'betaBuildLocalizations',attributes:{locale:'en-US',whatsNew},relationships:{build:{data:{type:'builds',id:build.id}}}}})});
 }
 const included=await appleRequest(`betaGroups/${group.id}/builds`);
 if(!included.data.some(b=>b.id===build.id))await appleRequest(`betaGroups/${group.id}/relationships/builds`,{method:'POST',body:JSON.stringify({data:[{type:'builds',id:build.id}]})});
 const details=await appleRequest(`builds/${build.id}/buildBetaDetail`);
 const state=details.data.attributes.externalBuildState;
 if(state==='READY_FOR_BETA_SUBMISSION'){
   review=await appleRequest('betaAppReviewSubmissions',{method:'POST',body:JSON.stringify({data:{type:'betaAppReviewSubmissions',relationships:{build:{data:{type:'builds',id:build.id}}}}})});
 }
}
const detail=build?await appleRequest(`builds/${build.id}/buildBetaDetail`):null;
const included=await appleRequest(`betaGroups/${group.id}/builds`);
const report={checkedAt:new Date().toISOString(),build:build?{id:build.id,version:build.attributes.version,processingState:build.attributes.processingState}:null,
 betaDetail:detail?.data.attributes??null,group:{id:group.id,name:group.attributes.name,publicLink:group.attributes.publicLink},inGroup:!!build&&included.data.some(b=>b.id===build.id),reviewSubmitted:!!review};
await fs.writeFile(new URL('beta-apple.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
