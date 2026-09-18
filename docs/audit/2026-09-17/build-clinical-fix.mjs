// One-time construction from the existing definitions; never rewrites old migrations.
import fs from 'node:fs/promises';
const root=new URL('../../../',import.meta.url);
const migration=new URL('supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql',root);
let output=await fs.readFile(migration,'utf8');
output=output.split('\n-- Replaced entry points')[0]+'\n-- Replaced entry points retain their signatures and grants.\n';
const source=async(file,name)=>{
 const sql=await fs.readFile(new URL('supabase/migrations/'+file,root),'utf8');
 const match=sql.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?\\$\\$;'));
 if(!match)throw new Error('Missing '+name);return match[0].replaceAll('\r\n','\n');
};
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw new Error('Replacement not unique: '+a);return s.replace(a,b);};
const encounters='20260901170000_clinical_access_append_only_encounters.sql',documents='20260901190000_clinical_access_documents_timeline.sql';
let fn=await source(encounters,'finalize_clinical_encounter');
fn=replace(fn,"  if not ('create_encounter' = any(authorization_row.approved_scopes))", "  perform public.assert_clinical_write_authorization(authorization_row.id, request_row.pet_id, 'create_encounter');\n  if not ('create_encounter' = any(authorization_row.approved_scopes))");
output+='\n'+fn+'\n';
fn=await source(documents,'prepare_clinical_document_upload');
fn=replace(fn,'where id = encounter_row.authorization_id for update;', 'where id = encounter_row.authorization_id;');
fn=replace(fn,"  if next_document_type not in", "  perform public.assert_clinical_write_authorization(authz.id, encounter_row.pet_id, 'upload_clinical_document');\n  if next_document_type not in");
output+='\n'+fn+'\n';
fn=await source(documents,'finalize_clinical_document_upload');
fn=replace(fn,'actual_mime text;','actual_mime text; encounter_row public.clinical_encounters;');
fn=replace(fn,'  select * into document_row from public.clinical_documents where id = target_document_id for update;', `  if current_user_id is null then raise exception 'Authenticated user required'; end if;
  select * into document_row from public.clinical_documents where id = target_document_id;
  if document_row.id is null or document_row.created_by_user_id is distinct from current_user_id then raise exception 'Clinical document is not available'; end if;
  select * into encounter_row from public.clinical_encounters where id = document_row.encounter_id;
  perform public.assert_clinical_write_authorization(encounter_row.authorization_id, encounter_row.pet_id, 'upload_clinical_document');
  -- Same lock order as preparation: authorization before document.
  select * into document_row from public.clinical_documents where id = target_document_id for update;`);
output+='\n'+fn+'\n';
fn=await source(documents,'create_clinical_entry_correction');
fn=replace(fn,"  if not (required_scope = any(authz.approved_scopes))", "  perform public.assert_clinical_write_authorization(authz.id, encounter_row.pet_id, required_scope);\n  if not (required_scope = any(authz.approved_scopes))");
output+='\n'+fn+'\n';
output+=`
create or replace function public.can_upload_clinical_document_object(
  target_bucket text, target_path text, target_user_id uuid default auth.uid()
)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare encounter_row public.clinical_encounters;
begin
  if target_bucket is distinct from 'clinical-documents' or target_user_id is null
    or target_user_id is distinct from auth.uid() then return false; end if;
  select encounter.* into encounter_row
  from public.clinical_documents document
  join public.clinical_encounters encounter on encounter.id = document.encounter_id
  where document.storage_bucket = target_bucket and document.storage_path = target_path
    and document.created_by_user_id = target_user_id and document.upload_status = 'pending';
  if encounter_row.id is null then return false; end if;
  perform public.assert_clinical_write_authorization(encounter_row.authorization_id, encounter_row.pet_id, 'upload_clinical_document');
  return exists (select 1 from public.clinical_documents where storage_bucket = target_bucket
    and storage_path = target_path and created_by_user_id = target_user_id and upload_status = 'pending');
exception when raise_exception then
  return false;
end;
$$;

revoke all on function public.can_upload_clinical_document_object(text, text, uuid) from public;
grant execute on function public.can_upload_clinical_document_object(text, text, uuid) to authenticated;
`;
await fs.writeFile(migration,output);
console.log('Migration generated: '+output.split('\n').length+' lines');
