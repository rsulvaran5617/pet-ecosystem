import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadSmokeEnv} from '../../../packages/api-client/scripts/smoke/env.ts';
const require=createRequire(new URL('../../../packages/api-client/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const env=loadSmokeEnv(['owner','provider','member']);
const client=()=>createClient(env.supabaseUrl,env.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const report={executedAt:new Date().toISOString(),scope:'SELECT only plus QA login/logout; no business mutations. Native/UI and create/update/delete not covered.',checks:[],fixtures:[]};
const actors=[];
const check=(name,passed)=>report.checks.push({name,passed:!!passed});
try{
 for(const role of ['owner','provider','member']){
  const db=client();actors.push({role,db});
  const {data,error}=await db.auth.signInWithPassword(env.actors[role]);
  if(error||!data.user)throw Error('QA login failed: '+role);
  actors.at(-1).id=data.user.id;
 }
 check('Three distinct QA users',new Set(actors.map(a=>a.id)).size===3);
 if(!report.checks.at(-1).passed)throw Error('Distinct accounts required');
 const anonymous=client();
 for(const [table,key,columns] of [
  ['profiles','id','id,marketing_opt_in,reminder_email_opt_in,reminder_push_opt_in'],
  ['user_addresses','user_id','id,user_id'],
  ['payment_methods','user_id','id,user_id']
 ]){
  for(const actor of actors){
   const own=await actor.db.from(table).select(columns).eq(key,actor.id);
   check(actor.role+' can query own '+table,!own.error);
   if(own.error)continue;
   report.fixtures.push({role:actor.role,table,ownRows:own.data.length});
   if(table==='profiles'){
    check(actor.role+' has one own profile',own.data.length===1);
    check(actor.role+' preference fields are booleans',own.data.length===1&&['marketing_opt_in','reminder_email_opt_in','reminder_push_opt_in'].every(k=>typeof own.data[0][k]==='boolean'));
   }
   if(!own.data.length)continue; // No isolation claim against missing fixtures.
   for(const observer of [...actors.filter(a=>a!==actor),{role:'anonymous',db:anonymous}]){
    const foreign=await observer.db.from(table).select('id').eq(key,actor.id);
    check(observer.role+' cannot read '+actor.role+' '+table,(!foreign.error&&foreign.data.length===0)||foreign.error?.code==='42501');
   }
  }
 }
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
 for(const actor of actors){const {error}=await actor.db.auth.signOut({scope:'local'});check(actor.role+' session closed',!error);}
 report.passed=!report.error&&report.checks.length>0&&report.checks.every(c=>c.passed);
 if(!report.passed)process.exitCode=1;
 await fs.writeFile(new URL('evidence/core-read-isolation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
