import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const commit = '44262b4a5c6eab12e76604bb3e41bc23b27da5ac';
const version = '20261025010000';
const slug = 'clinical-shared-document';
const apply = process.argv.includes('--prepare');
const requireReady = process.argv.includes('--require-ready');
const source = (path) => execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8', windowsHide: true });
const normalize = (s) => s.replaceAll('\r\n', '\n').trim();
const sqlLiteral = (s) => `'${s.replaceAll("'", "''")}'`;
const values = {};
for (const path of ['.env.local', '.env', 'apps/web/.env.local', 'apps/mobile/.env']) {
  const content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in values)) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const env = (key) => process.env[key] || values[key];
const ref = (await readFile(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim();
if (ref !== 'ivovbyxjwtvcavetewge') throw new Error('El proyecto vinculado no corresponde al destino revisado.');
const url = env('NEXT_PUBLIC_SUPABASE_URL') || env('EXPO_PUBLIC_SUPABASE_URL');
if (!url || new URL(url).hostname !== `${ref}.supabase.co`) throw new Error('El proyecto vinculado difiere de la configuracion de la app.');
const token = env('SUPABASE_ACCESS_TOKEN');
if (!token) throw new Error('Falta SUPABASE_ACCESS_TOKEN en el entorno o .env.local. No lo incluyas en comandos compartidos.');
const migration = source(`supabase/migrations/${version}_clinical_shared_pet_documents.sql`);
async function management(path, method = 'GET', body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`, {
    method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000)
  });
  // Never print server SQL, private config or response bodies on failure.
  if (!response.ok) throw new Error(`Supabase ${path.split('?')[0]}: HTTP ${response.status}. Revisa el estado antes de reintentar.`);
  if (response.status === 204) return null;
  return response.json();
}
const query = (sql) => management('database/query', 'POST', { query: sql });
function functionForm() {
  const form = new FormData();
  form.append('metadata', JSON.stringify({ name: slug, entrypoint_path: 'index.ts', verify_jwt: false }));
  for (const file of ['index.ts', 'handler.ts']) {
    form.append('file', new Blob([source(`supabase/functions/${slug}/${file}`)], { type: 'application/typescript' }), file);
  }
  return form;
}
const baseline = await query("select prosrc from pg_proc where oid='public.assert_clinical_write_authorization(uuid,uuid,text)'::regprocedure");
const guardSource = source('supabase/migrations/20260918010000_clinical_write_authorization_revalidation.sql');
const expectedGuard = guardSource.match(/as \$\$([\s\S]*?)\$\$;/)?.[1];
if (!expectedGuard || normalize(baseline[0]?.prosrc ?? '') !== normalize(expectedGuard)) {
  throw new Error('El guard de autorizacion remoto difiere del baseline revisado. No se aplicaron cambios.');
}
let prior = await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);
if (prior.length && normalize(prior[0].statements.join('\n')) !== normalize(migration)) {
  throw new Error('La migracion registrada tiene otro contenido; requiere revision.');
}
if (!prior.length) {
  const collision = await query("select count(*)::int as count from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('assert_clinical_document_read_access','list_shared_pet_clinical_documents','get_shared_pet_clinical_document')");
  if (collision[0].count) throw new Error('Hay funciones sin la migracion registrada; inspecciona antes de continuar.');
}
const functions = await management('functions');
let deployed = functions.find((fn) => fn.slug === slug);
console.log(JSON.stringify({ projectMatches: true, sourceCommit: commit, migrationApplied: !!prior.length, functionStatus: deployed?.status ?? 'missing', mode: apply ? 'prepare' : 'check' }));
if (process.argv.includes('--validate-bundle')) {
  await management(`functions/deploy?slug=${slug}&bundleOnly=1`, 'POST', functionForm());
  const after = (await management('functions')).find((fn) => fn.slug === slug);
  if (after?.version !== deployed?.version) throw new Error('El estado de despliegue cambio durante la comprobacion. Inspecciona antes de continuar.');
  console.log('Bundle Edge validado por Supabase; version activa sin cambios.');
}
if (apply) {
  if (!prior.length) {
    await query(`begin; set local lock_timeout='5s'; set local statement_timeout='30s';
      select pg_advisory_xact_lock(hashtext('clinical-documents-deploy'));
      do $check$ begin if exists(select 1 from supabase_migrations.schema_migrations where version='${version}') then raise exception 'Migration changed concurrently'; end if; end $check$;
      ${migration}
      insert into supabase_migrations.schema_migrations(version,name,statements)
      values('${version}','clinical_shared_pet_documents',array[${sqlLiteral(migration)}]);
      notify pgrst, 'reload schema'; commit;`);
    prior = [{ statements: [migration] }];
    console.log('Migracion de documentos aplicada; otras migraciones no se modificaron.');
  }
  const origins = env('CLINICAL_DOCUMENT_ALLOWED_ORIGINS') || 'https://petecosyst.com,https://www.petecosyst.com';
  if (!origins.split(',').every((item) => /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(item.trim()))) throw new Error('Origenes CORS invalidos; usa origenes HTTPS sin rutas.');
  await management('secrets', 'POST', [{ name: 'CLINICAL_DOCUMENT_ALLOWED_ORIGINS', value: origins }]);
  deployed = await management(`functions/deploy?slug=${slug}`, 'POST', functionForm());
  if (deployed.status !== 'ACTIVE') throw new Error('La funcion no esta ACTIVE; la web no se actualizara.');
  console.log(`Funcion de documentos publicada: version ${deployed.version}.`);
}
if (apply || requireReady) {
  if (!prior.length || deployed?.status !== 'ACTIVE') throw new Error('Backend pendiente. Ejecuta el script de PowerShell con -PrepareBackend.');
  const permissions = await query("select not has_function_privilege('anon','public.get_shared_pet_clinical_document(text,uuid)','EXECUTE') and not has_function_privilege('anon','public.list_shared_pet_clinical_documents(text)','EXECUTE') and not has_function_privilege('authenticated','public.assert_clinical_document_read_access(text)','EXECUTE') as isolated");
  if (!permissions[0].isolated) throw new Error('Los permisos backend no coinciden con el contrato revisado.');
  const response = await fetch(`${url}/functions/v1/${slug}`, {
    method: 'POST', headers: { Origin: 'https://petecosyst.com', 'Content-Type': 'application/json' }, body: '{}',
    signal: AbortSignal.timeout(20000)
  });
  if (response.status !== 401 || response.headers.get('access-control-allow-origin') !== 'https://petecosyst.com') {
    throw new Error('Fallo la comprobacion publica de JWT/CORS; la web no se actualizara.');
  }
  console.log('Backend disponible; acceso sin sesion rechazado. Falta QA con Owner y veterinario reales.');
}
