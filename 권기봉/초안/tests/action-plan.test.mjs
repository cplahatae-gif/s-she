import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS } from '../src/scenario.mjs';
import { buildActionPlan, safetyVisual, actorConsequence } from '../src/action-plan.mjs';

const option = (id) => STEPS.flatMap((step) => step.options).find((choice) => choice.id === id);
const plan = (id) => buildActionPlan({ optionId: id, effect: option(id).effect });
const states = (id, safety) => {
  const state = safetyVisual(safety);
  return plan(id).beats.map((beat) => ({ ...Object.assign(state, beat.changes) }));
};

test('all choices have playable physical actions with their original verdict', () => {
  for (const step of STEPS) for (const choice of step.options) {
    const action = plan(choice.id);
    assert.equal(action.accident, choice.effect === 'accident');
    assert.ok(action.beats.length >= 2);
    assert.ok(action.beats.every((beat) => beat.duration >= 700 && beat.message && ['radio', 'press', 'lock', 'tag', 'tryout', 'cleanup', 'unsafe', 'recoil', 'observe'].includes(beat.pose)));
  }
});
test('missing or invalid identification never restarts an isolated conveyor', () => {
  for (const id of ['tag-skip', 'tag-wrong-name', 'tag-unreadable']) {
    const sequence = states(id, { stopped: true, isolated: true, locked: true });
    assert.ok(sequence.every((state) => !state.beltRunning && state.isolated && state.lock === 'personal'));
  }
});
test('failed tryout shows motion then stops; no-return leaves selector at start', () => {
  const failed = states('tryout-failed', { stopped: true, isolated: true, locked: true, tagged: true });
  assert.ok(failed.some((state) => state.beltRunning));
  assert.equal(failed.at(-1).beltRunning, false);
  assert.equal(failed.at(-1).control, 'stop');
  for (const id of ['tryout-correct', 'tryout-failed', 'tryout-no-return']) assert.equal(plan(id).beats[0].control, 'start');
  for (const id of ['tryout-correct', 'tryout-failed']) assert.equal(plan(id).beats.at(-1).control, 'stop');
  assert.equal(plan('stop-slower').beats[0].control, 'speed');
  const noReturn = states('tryout-no-return', { stopped: true, isolated: true, locked: true, tagged: true });
  assert.ok(noReturn.every((state) => !state.beltRunning));
  assert.equal(noReturn.at(-1).control, 'start');
});
test('unsafe stopped entry and early unlock show distinct loss of protection', () => {
  const restart = states('notify-enter', { stopped: true });
  assert.equal(restart[0].beltRunning, false);
  assert.equal(restart.at(-1).radio, 'remote-start');
  assert.equal(restart.at(-1).beltRunning, true);
  const unlock = states('cleanup-unlock', { stopped: true, isolated: true, locked: true, tagged: true });
  assert.equal(unlock[0].lock, 'none');
  assert.equal(unlock[0].isolated, false);
  assert.equal(unlock[0].beltRunning, false);
  assert.equal(unlock.at(-1).beltRunning, true);
  assert.equal(plan('cleanup-unlock').target, 'energy-isolator');
  assert.equal(plan('cleanup-unlock').beats[1].target, 'work-access');
  assert.equal(plan('lock-wrong-then-enter').beats[1].target, 'work-access');
  assert.equal(plan('lock-other-equipment').equipment, 'other-circuit');
  assert.equal(plan('lock-wrong-then-enter').equipment, 'door-latch');
  assert.equal(plan('lock-correct').equipment, undefined);
  const rejected = states('cleanup-restart', { stopped: true, isolated: true, locked: true, tagged: true });
  assert.ok(rejected.every((state) => !state.beltRunning && state.lock === 'personal'));
  assert.equal(rejected.at(-1).radio, 'rejected');
});


test('a visible coworker can initiate only the three unprotected restart accident branches', () => {
  const restarts = new Set(['notify-enter', 'lock-wrong-then-enter', 'cleanup-unlock']);
  for (const choice of STEPS.flatMap((step) => step.options)) {
    const visual = plan(choice.id);
    const actors = visual.beats.filter((step) => step.actor === 'restart');
    if (restarts.has(choice.id)) {
      assert.equal(visual.initiator, 'coworker');
      assert.equal(actors.length, 1);
      assert.equal(actors[0].pose, 'unsafe');
      assert.equal(actors[0].actor, 'restart');
      assert.equal(actors[0].changes.beltRunning, false);
      assert.equal(visual.beats.at(-1).changes.beltRunning, true);
    } else {
      assert.equal(visual.initiator, undefined);
      assert.equal(actors.length, 0);
    }
  }
});


test('foreign lock owner removes only their own lock, leaving a stopped unprotected example', () => {
  const example = plan('lock-other-person');
  assert.equal(example.accident, false);
  assert.equal(example.riskExample, true);
  assert.equal(example.beats[0].pose, 'observe');
  const initial = { ...safetyVisual({ stopped: true }), ...example.beats[0].changes };
  assert.equal(initial.isolated, true);
  assert.equal(initial.lock, 'other-person');
  assert.ok(example.beats.some((step) => step.actor === 'owner-release'));
  const released = { ...initial, ...actorConsequence('owner-release', initial, example.id) };
  assert.equal(released.lock, 'none');
  assert.equal(released.isolated, false);
  assert.equal(released.beltRunning, false);
  assert.equal(released.ownerReleased, true);
  assert.throws(() => actorConsequence('owner-release', { ...initial, lock: 'personal' }, example.id), RangeError);
});

test('tag inspection and radio replies cannot unlock or restart equipment', () => {
  for (const [id, expected] of [['tag-skip', 'missing-tag'], ['tag-wrong-name', 'owner-mismatch'], ['tag-unreadable', 'unreadable-tag']]) {
    const visual = states(id, { stopped: true, isolated: true, locked: true }).at(-1);
    assert.ok(plan(id).beats.some((step) => step.actor === 'inspect-tag'));
    const result = { ...visual, ...actorConsequence('inspect-tag', visual, id) };
    assert.equal(result.inspectionStatus, expected);
    assert.equal(result.isolated, true); assert.equal(result.lock, 'personal'); assert.equal(result.beltRunning, false);
  }
  for (const [id, expected] of [['notify-skip', 'missing'], ['notify-vague', 'unidentified'], ['cleanup-restart', 'rejected']]) {
    const visual = safetyVisual({ stopped: true, isolated: true, locked: true, tagged: true });
    assert.ok(plan(id).beats.some((step) => step.actor === 'radio-reply'));
    const result = { ...visual, ...actorConsequence('radio-reply', visual, id) };
    assert.equal(result.radio, expected); assert.equal(result.beltRunning, false); assert.equal(result.lock, 'personal'); assert.equal(result.isolated, true);
  }
});
