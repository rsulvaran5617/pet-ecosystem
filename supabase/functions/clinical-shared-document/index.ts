import { createClient } from "npm:@supabase/supabase-js@2";
import { handleSharedDocument, type DocumentAccess } from "./handler.ts";

Deno.serve(async (request: Request) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(url, key, options);
  return handleSharedDocument(request, {
    async authenticate(jwt) {
      const { data, error } = await service.auth.getUser(jwt);
      return !error && !!data.user;
    },
    async authorize(jwt, token, documentId) {
      // The RPC executes as the authenticated caller, never as service_role.
      const caller = createClient(url, anonKey, { ...options, global: { headers: { Authorization: `Bearer ${jwt}` } } });
      const { data, error } = await caller.rpc("get_shared_pet_clinical_document", { raw_token: token, target_document_id: documentId });
      return error ? null : data as DocumentAccess | null;
    },
    async download(access) {
      const { data, error } = await service.storage.from(access.bucket).download(access.path);
      return error ? null : data;
    },
  }, (Deno.env.get("CLINICAL_DOCUMENT_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean));
});
