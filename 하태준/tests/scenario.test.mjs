import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun, inspect, applyAction, rewind} from '../src/scenario/scenario.mjs';

const act = (run, ...actions) => actions.map(id => applyAction(run, id));
test('T1/T2: observing the control panel never isolates energy, and duplicate observations are retained once', () => {
  const run = createRun();
  inspect(run, 'control-panel'); inspect(run, 'control-panel');
  assert.equal(run.observed.size, 1);
  assert.equal(run.safety.isolated, false);
});
test('T5/T6: only actual isolation or locking failure causes accident; missing other steps remains incomplete', () => {
  const run = createRun();
  assert.equal(applyAction(run, 'enter-work').effect, 'accident');
  act(run, 'isolate-energy', 'attach-wrong-lock');
  assert.equal(applyAction(run, 'enter-work').effect, 'accident');
  act(run, 'attach-personal-lock');
  assert.equal(applyAction(run, 'enter-work').kind, 'incomplete');
  act(run, 'clear-residual-energy', 'verify-isolation');
  assert.equal(applyAction(run, 'enter-work').kind, 'incomplete');
  act(run, 'attach-tag');
  assert.equal(applyAction(run, 'enter-work').kind, 'success');
  assert.equal(run.attempts, 5);
  const previous = structuredClone(run);
  assert.equal(applyAction(run, 'enter-work').kind, 'blocked');
  assert.deepEqual(run, previous);
});
test('T7: rewind retains actions and observations; a new run starts empty', () => {
  const run = createRun(); inspect(run, 'work-access');
  act(run, 'isolate-energy', 'attach-wrong-lock', 'enter-work');
  const previous = structuredClone(run); rewind(run);
  assert.equal(run.rewinds, 1);
  assert.equal(run.attempts, previous.attempts);
  assert.deepEqual(run.safety, previous.safety);
  assert.deepEqual(run.observed, previous.observed);
  assert.equal(createRun().attempts, 0);
  assert.equal(createRun().safety.lockPresent, false);
});
test('Invalid action identifiers and types do not mutate state', () => {
  const run = createRun(); const previous = structuredClone(run);
  for (const value of ['not-an-action', null, {}, 42]) assert.throws(() => applyAction(run, value), RangeError);
  assert.deepEqual(run, previous);
});
test('Missing verification stays incomplete and prematurely locking cannot alter safety', () => {
  const run = createRun(); const initial = structuredClone(run);
  assert.equal(applyAction(run, 'attach-personal-lock').kind, 'blocked');
  assert.deepEqual(run, initial);
  act(run, 'isolate-energy', 'attach-personal-lock', 'attach-tag', 'clear-residual-energy');
  const result = applyAction(run, 'enter-work');
  assert.equal(result.kind, 'incomplete');
  assert.equal(result.effect, undefined);
  assert.equal(run.completed, false);
  assert.equal(run.attempts, 1);
});
test('T3/T4: changing a lock invalidates verification; failure is visible and correct actions repair it', () => {
  const run = createRun();
  act(run, 'isolate-energy', 'attach-wrong-lock', 'verify-isolation');
  assert.equal(run.safety.verification, 'failed');
  act(run, 'attach-personal-lock', 'clear-residual-energy', 'verify-isolation');
  assert.equal(run.safety.verification, 'passed');
  act(run, 'isolate-energy', 'attach-personal-lock', 'clear-residual-energy');
  assert.equal(run.safety.verified, true);
  act(run, 'attach-wrong-lock', 'attach-personal-lock');
  assert.equal(run.safety.verified, false);
});
