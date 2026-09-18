import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadSmokeEnv} from '../../../packages/api-client/scripts/smoke/env.ts';
import {createFosterApiClient,createHouseholdsApiClient,createPetsApiClient} from '../../../packages/api-client/src/index.ts';
const require=createRequire(new URL('../../../packages/api-client/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const env=loadSmokeEnv(['owner','member','admin']);
const clients=Object.fromEntries(['owner','member','admin'].map(role=>{const raw=createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}});return[role,{raw,foster:createFosterApiClient(raw),households:createHouseholdsApiClient(raw),pets:createPetsApiClient(raw)}];}));
const {owner,member,admin}=clients;
const result={executedAt:new Date().toISOString(),checks:[],fixtures:{},cleanup:[]};
const check=(id,passed,details)=>result.checks.push({id,passed,details});
const deny=async(id,fn,expected)=>{try{await fn();check(id,false,'Operación aceptada');}catch(e){check(id,expected.test(e.message),e.message);}};
let source,transfer,approved=false;
try{
  for(const[role,c]of Object.entries(clients)){const{error}=await c.raw.auth.signInWithPassword(env.actors[role]);if(error)throw error;}
  source=await owner.households.createHousehold({name:'QA Protectora Auditoría',householdType:'protective'});
  const target=await member.households.createHousehold({name:'QA Adopción Auditoría',householdType:'owner'});
  const pet=await owner.pets.createPet({householdId:source.id,name:'QA Mascota transferencia sintética',species:'dog',sex:'unknown',notes:'Solo auditoría; mascota ficticia'});
  result.fixtures={sourceHouseholdId:source.id,targetHouseholdId:target.id,petId:pet.id};
  const input={petId:pet.id,fromHouseholdId:source.id,recipientEmail:env.actors.member.email,transferNotes:'QA registro interno sin mascota real'};
  await deny('FOSTER-UNAPPROVED-BLOCK',()=>owner.foster.createPetTransferInvitation(input),/aprob|approved/i);
  await owner.foster.upsertProtectiveHouseholdProfile({householdId:source.id,displayName:'QA Protectora — NO REAL',organizationType:'other',city:'Panama City',countryCode:'PA',contactNotes:'QA interna',publicNotes:'No es una organización real'});
  await owner.foster.submitProtectiveHouseholdProfile(source.id);
  await deny('FOSTER-NO-SELF-APPROVAL',()=>owner.foster.reviewProtectiveHouseholdProfile(source.id,{decision:'approved',notes:'QA'}),/admin/i);
  const profile=await admin.foster.reviewProtectiveHouseholdProfile(source.id,{decision:'approved',notes:'Fixture QA temporal'});approved=true;
  check('FOSTER-ADMIN-APPROVAL',profile.status==='approved');
  transfer=await owner.foster.createPetTransferInvitation(input);result.fixtures.transferId=transfer.id;
  check('TRANSFER-PENDING',transfer.status==='pending');
  await deny('TRANSFER-WRONG-RECIPIENT',()=>owner.foster.acceptPetTransfer(transfer.id,source.id),/otro usuario|otro correo|recipient/i);
  await deny('TRANSFER-WRONG-HOUSEHOLD',()=>member.foster.acceptPetTransfer(transfer.id,source.id),/administrador|admin/i);
  check('TRANSFER-VISIBLE-TO-RECIPIENT',(await member.foster.listIncomingPetTransfers()).some(t=>t.id===transfer.id));
  const accepted=await member.foster.acceptPetTransfer(transfer.id,target.id);check('TRANSFER-ACCEPT',accepted.status==='accepted');
  check('TRANSFER-TARGET-OWNS',(await member.pets.getPetDetail(pet.id)).pet.householdId===target.id);
  const before=await owner.pets.listHouseholdPets(source.id);check('TRANSFER-SOURCE-LIST-REMOVED',!before.some(p=>p.id===pet.id));
  await deny('TRANSFER-SOURCE-PRIVATE-ACCESS-REMOVED',()=>owner.pets.getPetDetail(pet.id),/not found|not accessible|Cannot coerce|JSON object|0 rows/i);
  await deny('TRANSFER-NO-DOUBLE-ACCEPT',()=>member.foster.acceptPetTransfer(transfer.id,target.id),/pendiente|pending/i);
}catch(e){result.error=e.message;process.exitCode=1;}
finally{
  if(transfer){try{const rows=await owner.foster.listOutgoingPetTransfers(source.id);if(rows.find(t=>t.id===transfer.id)?.status==='pending')await owner.foster.cancelPetTransfer(transfer.id);}catch(e){result.cleanup.push({name:'Cancel pending QA transfer',ok:false,error:e.message});}}
  if(approved){try{await admin.foster.reviewProtectiveHouseholdProfile(source.id,{decision:'suspended',notes:'Fin de prueba QA'});result.cleanup.push({name:'Suspend QA protective profile',ok:true});}catch(e){result.cleanup.push({name:'Suspend QA protective profile',ok:false,error:e.message});}}
  await fs.writeFile(new URL('./evidence/foster-transfer.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  await Promise.allSettled(Object.values(clients).map(c=>c.raw.auth.signOut()));
}
console.log(JSON.stringify(result,null,2));
