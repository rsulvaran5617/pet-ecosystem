import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import ts from 'typescript';

const source = await readFile(new URL('./pendingClinicalRequests.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { loadPendingClinicalRequests } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const request = (id, status = 'requested', expiresAt = new Date(Date.now() + 60000).toISOString()) => ({ id, status, expiresAt, requestedAt: '2026-10-24T12:00:00Z' });

test('Finds pending requests across editable owner households, excluding read-only and protective scopes', async () => {
  const visited = [];
  const sources = {
    getHouseholdsSnapshot: async () => ({ households: [
      { id: 'owner-a', householdType: 'owner', myPermissions: ['edit'] },
      { id: 'owner-b', householdType: 'owner', myPermissions: ['admin'] },
      { id: 'read-only', householdType: 'owner', myPermissions: ['view'] },
      { id: 'protective', householdType: 'protective', myPermissions: ['admin'] }
    ] }),
    listHouseholdPets: async (id) => { visited.push(id); return [{ id: `pet-${id}`, name: id }]; },
    listPetClinicalWriteRequests: async (id) => [request(id), request('approved', 'approved'), request('expired', 'requested', '2020-01-01'), request('bad-date', 'requested', 'invalid')]
  };
  const result = await loadPendingClinicalRequests(sources);
  assert.deepEqual(visited.sort(), ['owner-a', 'owner-b']);
  assert.deepEqual(result.map((item) => item.petId).sort(), ['pet-owner-a', 'pet-owner-b']);
  assert.equal(result[0].petName, 'owner-a');
});

test('Empty scope does not fetch pets or requests', async () => {
  assert.deepEqual(await loadPendingClinicalRequests({
    getHouseholdsSnapshot: async () => ({ households: [] }),
    listHouseholdPets: async () => assert.fail('Unexpected pet query'),
    listPetClinicalWriteRequests: async () => assert.fail('Unexpected request query')
  }), []);
});

test('Access/network errors are not converted into successful empty results', async () => {
  await assert.rejects(loadPendingClinicalRequests({ getHouseholdsSnapshot: async () => { throw new Error('Access denied'); } }), /Access denied/);
});

test('Optional request timestamp does not break the pending queue', async () => {
  const result = await loadPendingClinicalRequests({
    getHouseholdsSnapshot: async () => ({ households: [{ id: 'owner', householdType: 'owner', myPermissions: ['edit'] }] }),
    listHouseholdPets: async () => [{ id: 'pet', name: 'QA' }],
    listPetClinicalWriteRequests: async () => [{ ...request('a'), requestedAt: undefined }, request('b')]
  });
  assert.equal(result.length, 2);
});
