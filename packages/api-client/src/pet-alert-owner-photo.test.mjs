import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'node:module';
register('../scripts/smoke/resolve-ts-loader.mjs',import.meta.url);
const {createPetAlertApiClient}=await import('./pet-alert.ts');
test('Owner preparation explicitly consents and never accepts source from caller',async()=>{
  let sent;
  const client=createPetAlertApiClient({functions:{invoke:async(name,args)=>{sent={name,args};return {data:{status:'ready',source_path:'private'}};}}});
  assert.deepEqual(await client.preparePetAlertOwnerPhoto({alertId:'fixture',photoConsent:true,source_path:'injected'}),{status:'ready'});
  assert.deepEqual(sent,{name:'pet-alert-owner-photo',args:{body:{alertId:'fixture',photoConsent:true}}});
});
test('Owner preparation rejects implicit consent and never falls back',async()=>{
  await assert.rejects(()=>createPetAlertApiClient({}).preparePetAlertOwnerPhoto({alertId:'fixture'}),/Autoriza/);
  for(const result of [{error:{message:'private error'}},{data:{status:'processing'}},{data:null}]) {
    await assert.rejects(()=>createPetAlertApiClient({functions:{invoke:async()=>result}}).preparePetAlertOwnerPhoto({alertId:'fixture',photoConsent:true}),/No fue posible preparar/);
  }
});
