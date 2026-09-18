import fs from 'node:fs/promises';
const dir=new URL('../../../supabase/migrations/',import.meta.url);
const target=new URL('20260918020000_clinical_retry_and_residual_revocation.sql',dir);
const source=await fs.readFile(new URL('20260918010000_clinical_write_authorization_revalidation.sql',dir),'utf8');
let fn=source.match(/create or replace function public\.prepare_clinical_document_upload\([\s\S]*?\$\$;/)[0];
fn=fn.replace("  extension := case next_mime_type",`  if next_idempotency_key is null then raise exception 'Document idempotency key is required'; end if;
  select * into document_row from public.clinical_documents
  where created_by_user_id = current_user_id and idempotency_key = next_idempotency_key;
  if found then
    if document_row.encounter_id is distinct from encounter_row.id
      or document_row.title is distinct from trim(next_title)
      or document_row.document_type is distinct from next_document_type
      or document_row.mime_type is distinct from next_mime_type
      or document_row.file_size_bytes is distinct from next_file_size_bytes
      or document_row.checksum_sha256 is distinct from lower(next_checksum_sha256) then
      raise exception 'Idempotency payload mismatch';
    end if;
    return jsonb_build_object('documentId', document_row.id, 'bucket', document_row.storage_bucket, 'path', document_row.storage_path);
  end if;
  extension := case next_mime_type`);
fn=fn.replace('  on conflict (created_by_user_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key\n','');
let out=await fs.readFile(target,'utf8');
out=out.split('\n-- Document preparation retries')[0];
await fs.writeFile(target,out+'\n-- Document preparation retries bind the key to the original metadata.\n'+fn+'\n');
