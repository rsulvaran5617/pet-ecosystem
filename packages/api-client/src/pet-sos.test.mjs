import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {URL} from 'node:url';
import {Buffer} from 'node:buffer';
import ts from 'typescript';
const source=await readFile(new URL('./pet-sos.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {petSosMapRpcArgs,listPublicPetSosMapEvents}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const bounds={minLatitude:7,minLongitude:-81,maxLatitude:10,maxLongitude:-77};
const item=(slug)=>({event_type:'lost_pet',public_slug:slug,status:'active',title:'QA pet',species:'dog',city:'QA city',occurred_at:'2026-09-20T00:00:00Z',public_latitude:8,public_longitude:-80});

test('Required bounded area and finite coordinates',()=>{
  for(const filters of [undefined,{}, {bounds:{minLongitude:-81,maxLongitude:-77,maxLatitude:10}}, {bounds:{...bounds,minLatitude:NaN}}, {bounds:{...bounds,maxLongitude:Infinity}}, {bounds:{...bounds,maxLatitude:100}}, {bounds:{...bounds,maxLongitude:-20}}, {bounds:{...bounds,maxLatitude:bounds.minLatitude}}]) {
    assert.throws(()=>petSosMapRpcArgs(filters));
  }
});
test('Antimeridian split and boundary normalization',()=>{
  const result=petSosMapRpcArgs({bounds:{...bounds,minLongitude:179,maxLongitude:-179}});
  assert.equal(result.bounds_min_longitude,179);assert.equal(result.bounds_max_longitude,-179);
  assert.equal(petSosMapRpcArgs({bounds:{...bounds,minLongitude:180,maxLongitude:-179}}).bounds_min_longitude,-180);
});
test('Limits and filter validation',()=>{
  for(const limit of [0,201,NaN,Infinity,1.5])assert.throws(()=>petSosMapRpcArgs({bounds,limit}));
  for(const change of [{view:'unknown'},{species:'x'.repeat(81)},{occurredAfter:'yesterday'},{cursor:{occurredAt:'invalid',eventType:'lost_pet',publicSlug:'x'}}])assert.throws(()=>petSosMapRpcArgs({bounds,...change}));
  assert.equal(petSosMapRpcArgs({bounds}).result_limit,100);
});
test('Invalid input never reaches RPC',async()=>{
  let calls=0;
  await assert.rejects(()=>listPublicPetSosMapEvents({rpc:async()=>{calls++;}},{}));
  assert.equal(calls,0);
});
test('Lookahead produces cursor from last returned row and strips private fields',async()=>{
  let name,args;
  const supabase={rpc:async(n,a)=>{name=n;args=a;return {data:[{...item('a'),private_latitude:9,reporter_email:'private',photo_url:'private'},item('b')],error:null};}};
  const page=await listPublicPetSosMapEvents(supabase,{bounds,limit:1});
  assert.equal(name,'list_public_pet_sos_map_events');assert.equal(args.result_limit,1);
  assert.equal(page.items.length,1);assert.equal(page.hasMore,true);assert.equal(page.nextCursor.publicSlug,'a');
  assert.equal(page.items[0].photoUrl,null);
  assert.ok(!('private_latitude' in page.items[0]));assert.ok(!('reporter_email' in page.items[0]));
});
test('Final and empty pages do not claim further results',async()=>{
  for(const data of [[],[item('a')]]){
    const page=await listPublicPetSosMapEvents({rpc:async()=>({data,error:null})},{bounds,limit:1});
    assert.equal(page.hasMore,false);assert.equal(page.nextCursor,null);
  }
});
test('Malformed, private-state and oversized responses fail closed',async()=>{
  for(const data of [null,[{...item('x'),status:'flagged'}],[{...item('x'),event_type:'private'}],[{...item('x'),public_latitude:NaN}],[item('a'),item('b'),item('c')]]){
    await assert.rejects(()=>listPublicPetSosMapEvents({rpc:async()=>({data,error:null})},{bounds,limit:1}));
  }
});
test('Database errors do not leak SQL or private details',async()=>{
  await assert.rejects(()=>listPublicPetSosMapEvents({rpc:async()=>({error:{message:'internal private details'},data:null})},{bounds}),/No fue posible cargar esta zona/);
});
