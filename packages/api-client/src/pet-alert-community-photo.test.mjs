import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'node:module';
register('../scripts/smoke/resolve-ts-loader.mjs', import.meta.url);
const {createPetAlertApiClient} = await import('./pet-alert.ts');
const input = {reportId:'fixture-report',reportSlug:'fixture',fileName:'photo.png',mimeType:'image/png',displayOrder:0,fileBytes:new ArrayBuffer(10)};

test('Sanitized upload sends binary and report slot, never touches legacy storage',async()=>{
  let invocation;
  const client = createPetAlertApiClient({functions:{invoke:async(name,args)=>{invocation={name,args};return {data:{signedUrl:'https://fixture.invalid/photo'},error:null};}}},{sanitizedCommunityPhotos:true});
  assert.equal(await client.uploadPetAlertCommunityPhoto(input),'https://fixture.invalid/photo');
  assert.equal(invocation.name,'pet-alert-community-photo');
  assert.equal(invocation.args.body,input.fileBytes);
  assert.equal(invocation.args.headers['x-pet-photo-order'],'0');
  assert.equal(invocation.args.headers['x-pet-report-id'],input.reportId);
});
test('Endpoint errors and malformed replies fail closed without legacy fallback',async()=>{
  for (const result of [{error:{message:'internal'}},{data:{}},{data:{signedUrl:3}}]) {
    const client=createPetAlertApiClient({functions:{invoke:async()=>result}},{sanitizedCommunityPhotos:true});
    await assert.rejects(()=>client.uploadPetAlertCommunityPhoto(input),/No fue posible guardar la foto/);
  }
});
test('Invalid slot and oversized file never call endpoint',async()=>{
  const client=createPetAlertApiClient({},{sanitizedCommunityPhotos:true});
  await assert.rejects(()=>client.uploadPetAlertCommunityPhoto({...input,displayOrder:0.5}),/3 fotos/);
  await assert.rejects(()=>client.uploadPetAlertCommunityPhoto({...input,fileBytes:new ArrayBuffer(5242881)}),/5 MB/);
});
test('Default option preserves published legacy clients',async()=>{
  let uploaded=false;
  const client=createPetAlertApiClient({
    auth:{getUser:async()=>({data:{user:{id:'fixture'}},error:null})},
    storage:{from:()=>({upload:async()=>{uploaded=true;return {error:null};},createSignedUrl:async()=>({data:{signedUrl:'https://fixture.invalid/legacy'},error:null})})},
    from:()=>({insert:async()=>({error:null})})
  });
  assert.equal(await client.uploadPetAlertCommunityPhoto(input),'https://fixture.invalid/legacy');
  assert.equal(uploaded,true);
});
