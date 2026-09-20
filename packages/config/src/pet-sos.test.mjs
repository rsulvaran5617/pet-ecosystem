import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import ts from 'typescript';

// Use the workspace compiler so the runner also works on supported Node 20.
const source = await readFile(new URL('./pet-sos.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
});
const { getPetSosDisplayState, resolvePetSosFeatureFlags } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('Missing configuration disables every SOS capability', () => {
  assert.deepEqual(resolvePetSosFeatureFlags(), {map:false,sightings:false,nearbyNotifications:false});
});

test('Only explicit true enables a capability', () => {
  for (const map of ['', 'false', 'TRUE', '1', ' true ', 'yes', undefined]) {
    assert.equal(resolvePetSosFeatureFlags({map}).map, false);
  }
});

test('Child flags cannot enable the SOS experience', () => {
  assert.deepEqual(resolvePetSosFeatureFlags({sightings:'true',nearbyNotifications:'true'}),
    {map:false,sightings:false,nearbyNotifications:false});
});

test('Capabilities require independent opt-in and cannot be mutated', () => {
  const flags = resolvePetSosFeatureFlags({map:'true',sightings:'true'});
  assert.deepEqual(flags, {map:true,sightings:true,nearbyNotifications:false});
  assert.throws(() => { flags.map = false; }, TypeError);
  assert.equal(resolvePetSosFeatureFlags({map:'true',nearbyNotifications:'true'}).nearbyNotifications,true);
});

test('A resguardada animal is not reunited and a verified claim is not recovery', () => {
  assert.equal(getPetSosDisplayState({eventType:'community_sighting',status:'sheltered_by_reporter'}),'sheltered');
  assert.equal(getPetSosDisplayState({eventType:'community_sighting',status:'owner_verified'}),'possible_match');
  assert.equal(getPetSosDisplayState({eventType:'community_sighting',status:'reunited'}),'reunited');
  assert.equal(getPetSosDisplayState({eventType:'lost_pet',status:'found'}),'reunited');
});

test('Sightings do not imply recovery and classification does not mutate records', () => {
  const event = Object.freeze({eventType:'lost_pet',status:'sighting_received'});
  assert.equal(getPetSosDisplayState(event),'lost');
  assert.equal(event.status,'sighting_received');
  assert.equal(getPetSosDisplayState({eventType:'community_sighting',status:'sighting_open'}),'seen');
});

test('Moderated and pending states cannot look like active SOS events', () => {
  for (const status of ['draft','pending_verification','pending_review','paused','rejected','flagged']) {
    assert.equal(getPetSosDisplayState({eventType:'lost_pet',status}),'unpublished');
  }
  assert.equal(getPetSosDisplayState({eventType:'community_sighting',status:'flagged'}),'unpublished');
});

test('Closed or expired events are not successful recoveries', () => {
  for (const eventType of ['lost_pet','community_sighting']) {
    for (const status of ['closed','expired']) assert.equal(getPetSosDisplayState({eventType,status}),'closed');
  }
  assert.equal(getPetSosDisplayState({eventType:'lost_pet',status:'withdrawn'}),'closed');
});
