import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'node:module';
import {URL} from 'node:url';
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
test('Safe publication keeps photo choice and gates processing until cutover',async()=>{
  const calls=[];
  let enabled=false;
  const client=createPetAlertApiClient({
    functions:{invoke:async()=>{calls.push('prepare');return {data:{status:'ready'}};}},
    rpc:async(name,args)=>{calls.push(name);if(name==='pet_sos_ready_media_only')return {data:enabled};assert.equal(args.include_profile_photo,true);return {data:{id:'fixture'}};}
  });
  await assert.rejects(()=>client.publishPetAlertLostPetSafely('fixture',true),/borrador se conserva/);
  assert.deepEqual(calls,['pet_sos_ready_media_only']);
  calls.length=0;enabled=true;
  const {publishPetAlertLostPetSafely}=client;
  await publishPetAlertLostPetSafely('fixture',true);
  assert.deepEqual(calls,['pet_sos_ready_media_only','prepare','publish_pet_alert_lost_pet_safe']);
});
test('Public ready media uses the visibility gateway, never signs avatars',async()=>{
  let bucket='pet-alert-media';
  const client=createPetAlertApiClient({rpc:async(name)=>({data:name==='get_public_pet_alert_lost_pet_by_slug'?[{alert_slug:'fixture'}]:[{alert_slug:'fixture',storage_bucket:bucket,storage_path:'owner-sos-v1/test/display.jpg'}]})},{publicMediaGatewayUrl:'https://fixture.invalid/functions/v1/pet-alert-public-photo'});
  const alert=await client.getPetAlertLostPetBySlug('fixture');
  assert.equal(new URL(alert.photoUrl).searchParams.get('path'),'owner-sos-v1/test/display.jpg');
  bucket='pet-avatars';
  assert.equal((await client.getPetAlertLostPetBySlug('fixture')).photoUrl,null);
});

test('Published Owner choice prepares only on explicit inclusion and never republishes',async()=>{
  const calls=[];
  const client=createPetAlertApiClient({
    functions:{invoke:async()=>{calls.push('prepare');return {data:{status:'ready'}};}},
    rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='pet_sos_ready_media_only'?true:null};}
  });
  await client.setPetAlertOwnerPhotoChoice('fixture',false);
  assert.deepEqual(calls,[['pet_sos_ready_media_only',undefined],['set_pet_sos_owner_photo_choice',{target_alert:'fixture',include_photo:false}]]);
  calls.length=0;
  await client.setPetAlertOwnerPhotoChoice('fixture',true);
  assert.equal(calls[1],'prepare');
  assert.deepEqual(calls[2],['set_pet_sos_owner_photo_choice',{target_alert:'fixture',include_photo:true}]);
});
