import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readManagementResponse } from './management-response.mjs';

test('secret updates accept successful empty 200/201/204 responses', async () => {
  for (const status of [200, 201, 204]) {
    assert.equal(await readManagementResponse(new Response(null, { status }), { allowEmpty: true }), null);
  }
  assert.equal(await readManagementResponse(new Response('  \n'), { allowEmpty: true }), null);
});

test('query and deploy endpoints still require valid JSON', async () => {
  assert.deepEqual(await readManagementResponse(new Response('[{"status":"ACTIVE"}]')), [{ status: 'ACTIVE' }]);
  await assert.rejects(readManagementResponse(new Response(null)), /respuesta vacia/);
  await assert.rejects(readManagementResponse(new Response('private configuration')), (error) =>
    error.message.includes('JSON invalida') && !error.message.includes('private configuration'));
});
