import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {query} from './clinical-migration-remote.mjs';
const rows=await query(`select
 exists(select 1 from supabase_migrations.schema_migrations where version='20260918010000') as migration_registered,
 (select verification_status from clinical_professional_profiles where id='b4edf08b-f8bf-4e71-95c1-3f3dce21634b') as qa_professional_status,
 (select count(*)::int from pet_clinical_access_grants where pet_id='8905b844-09c7-4896-ae92-8fc0400b1f67' and status='active') as qa_active_grants`);
assert.equal(rows[0].migration_registered,true);
assert.equal(rows[0].qa_professional_status,'suspended');
assert.equal(rows[0].qa_active_grants,0);
await fs.writeFile(new URL('./evidence/clinical-post-deploy.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows));
