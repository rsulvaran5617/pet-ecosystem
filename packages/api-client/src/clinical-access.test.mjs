import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import ts from 'typescript';

const source = await readFile(new URL('./clinical-access.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
});
const { createClinicalAccessApiClient } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('Admin audit RPC rows support date rendering and professional filtering', async () => {
  const api = createClinicalAccessApiClient({ rpc: async (name) => {
    assert.equal(name, 'list_clinical_audit_events_for_admin');
    return { error: null, data: [{ id: 'audit-1', event: 'clinical_encounter_finalized',
      occurred_at: '2026-10-24T13:00:00Z', professional_name: 'Profesional QA',
      organization_name: null, pet_reference: 'P - 12345678', authorization_status: 'approved' }] };
  } });
  const [event] = await api.listClinicalAuditEventsForAdmin();
  assert.doesNotThrow(() => new Intl.DateTimeFormat('es-PA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.occurredAt)));
  assert.equal(event.professionalName.toLowerCase().includes('qa'), true);
  assert.equal(event.organizationName, null);
  assert.equal(event.petReference, 'P - 12345678');
  assert.equal(event.authorizationStatus, 'approved');
  assert.equal(event.event, 'clinical_encounter_finalized');
  assert.equal(event.id, 'audit-1');
});

test('Admin audit handles empty results and propagates access errors', async () => {
  for (const data of [null, []]) {
    const api = createClinicalAccessApiClient({ rpc: async () => ({ data, error: null }) });
    assert.deepEqual(await api.listClinicalAuditEventsForAdmin(), []);
  }
  const api = createClinicalAccessApiClient({ rpc: async () => ({ data: null, error: { message: 'Administrative access required' } }) });
  await assert.rejects(api.listClinicalAuditEventsForAdmin(), /Administrative access required/);
});
