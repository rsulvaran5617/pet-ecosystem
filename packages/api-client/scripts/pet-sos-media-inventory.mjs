import {createClient} from '@supabase/supabase-js';
import process from 'node:process';
import console from 'node:console';

if (process.argv.slice(2).some((arg)=>arg!=='--dry-run')) throw new Error('Only --dry-run is supported. This script never migrates, activates or deletes.');
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the execution environment.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:inventory,error}=await client.rpc('inspect_pet_sos_media_rollout');
if(error)throw new Error('Unable to read media inventory. Verify the reviewed migration and project.');
const {data:orphans,error:orphanError}=await client.rpc('list_pet_sos_orphan_media_candidates',{result_limit:100});
if(orphanError)throw new Error('Unable to inspect orphan candidates. No changes were made.');
console.log(JSON.stringify({dryRun:true,inventory,orphanCandidateCount:orphans.length,candidateLimit:100,possiblyTruncated:orphans.length===100},null,2));
