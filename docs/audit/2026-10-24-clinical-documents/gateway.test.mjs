import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../../../supabase/functions/clinical-shared-document/handler.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {handleSharedDocument}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const token='a'.repeat(64),documentId='11111111-1111-1111-1111-111111111111';
const access={bucket:'pet-documents',path:'fixture',mimeType:'image/png'};
const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0])]);
function request(body={token,documentId},headers={}) {return new Request('https://example.test/',{method:'POST',headers:{authorization:'Bearer fixture',origin:'https://app.test',...headers},body:JSON.stringify(body)})}
function gateway(overrides={}) {return {authenticate:async()=>true,authorize:async()=>access,download:async()=>png,...overrides}}
const run=(req,g)=>handleSharedDocument(req,g,['https://app.test']);
test('authorized image delivered as private binary with detected safe MIME',async()=>{const r=await run(request(),gateway());assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('x-document-type'),'image/png');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),new Uint8Array(await png.arrayBuffer()))});
test('missing/invalid session, foreign origin, missing consent deny before Storage',async()=>{for(const [req,g,status] of [[request({}, {authorization:''}),gateway(),401],[request(),gateway({authenticate:async()=>false}),401],[request(undefined,{origin:'https://evil.test'}),gateway(),403],[request(),gateway({authorize:async()=>null}),403]]) {g.download=async()=>assert.fail('Storage must not be read');assert.equal((await run(req,g)).status,status)}});
test('malformed input and caller supplied storage locators denied',async()=>{for(const payload of [{token:'bad',documentId},{token,documentId,path:'other'},{token,documentId:'invalid'},{token,documentId,actor:'other'}, {token:'a'.repeat(2000),documentId}])assert.equal((await run(request(payload),gateway())).status,400)});
test('revocation or replacement during retrieval blocks delivery',async()=>{for(const second of [null,{...access,path:'replacement'},{...access,bucket:'other'}]){let calls=0;const r=await run(request(),gateway({authorize:async()=>++calls===1?access:second}));assert.equal(r.status,403);assert.equal(calls,2)}});
test('unsupported active formats never rendered as HTML/SVG',async()=>{const r=await run(request(),gateway({download:async()=>new Blob(['<svg onload="alert(1)"></svg>'],{type:'image/svg+xml'})}));assert.equal(r.status,200);assert.equal(r.headers.get('x-document-type'),'application/octet-stream');assert.equal(r.headers.get('x-content-type-options'),'nosniff')});
test('PDF detected; missing and oversized files denied; errors do not leak',async()=>{const r=await run(request(),gateway({download:async()=>new Blob(['%PDF-1.7\nfixture'])}));assert.equal(r.headers.get('x-document-type'),'application/pdf');for(const blob of [null,new Blob([]),new Blob([new Uint8Array(10485761)])])assert.equal((await run(request(),gateway({download:async()=>blob}))).status,404);const denied=await run(request(),gateway({authorize:async()=>{throw Error('secret storage path')}}));assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/secret/)});
