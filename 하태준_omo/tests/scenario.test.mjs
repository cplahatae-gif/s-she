import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, ACTIONS, SAFETY_STEPS, TEXT, createRun, inspect, applyAction, judgeEntry, rewind } from '../src/scenario/scenario.mjs';

const act = (run, ...ids) => ids.forEach(id => applyAction(run, id));
const locked = () => { const run = createRun(); act(run, 'isolate-energy', 'attach-personal-lock'); return run; };
const ready = () => { const run = locked(); act(run, 'clear-residual-energy', 'verify-isolation', 'attach-tag'); return run; };
const failed = { kind: 'blocked', effect: 'verification-failed', reason: TEXT.verificationFailed };
const unchanged = (run, fn) => { const before = structuredClone(run); const result = fn(); assert.deepEqual(run, before); return result; };

test('S01 investigations are immutable and repeat observations have no safety effect', () => {
  const run = createRun();
  for (const list of [TARGETS, ACTIONS, SAFETY_STEPS]) { assert.ok(Object.isFrozen(list)); list.forEach(item => assert.ok(Object.isFrozen(item))); }
  assert.ok(Object.isFrozen(TEXT));
  for (const target of TARGETS) {
    assert.equal(inspect(run, target.id), target);
    assert.throws(() => { target.text = 'changed'; }, TypeError);
    unchanged(run, () => inspect(run, target.id));
  }
  assert.deepEqual(run, { ...createRun(), observed: new Set(TARGETS.map(t => t.id)) });
});

for (const [name, fn] of [['S02', inspect], ['S03', applyAction]]) {
  test(`${name} malformed identifiers reject without mutation, including after completion`, () => {
    for (const run of [createRun(), ready()]) {
      if (run.safety.tagged) judgeEntry(run);
      for (const id of [undefined, null, 0, false, {}, [], new String('enter-work')]) {
        unchanged(run, () => assert.throws(() => fn(run, id), TypeError));
      }
      for (const id of ['', 'unknown', '__proto__', '<img src=x onerror=alert(1)>']) {
        unchanged(run, () => assert.throws(() => fn(run, id), RangeError));
      }
      assert.equal(run.attempts, run.completed ? 1 : 0); assert.equal(run.rewinds, 0);
    }
  });
}

test('S04 unavailable prerequisites block without mutation', () => {
  for (const setup of [[], ['isolate-energy'], ['isolate-energy', 'attach-wrong-lock']]) {
    const run = createRun(); act(run, ...setup);
    const ids = setup.length ? ['attach-tag', 'clear-residual-energy'] : ['attach-personal-lock', 'attach-wrong-lock', 'attach-tag', 'clear-residual-energy'];
    for (const id of ids) {
      const result = unchanged(run, () => applyAction(run, id));
      assert.deepEqual(Object.keys(result).sort(), ['kind', 'reason']); assert.equal(result.kind, 'blocked');
    }
  }
});

test('S05 real safety changes invalidate verification; repeated values preserve it', () => {
  const run = createRun();
  for (const id of ['isolate-energy', 'attach-personal-lock', 'clear-residual-energy']) {
    applyAction(run, 'verify-isolation');
    applyAction(run, id); assert.equal(run.safety.verification, 'unperformed');
    applyAction(run, 'verify-isolation');
    unchanged(run, () => applyAction(run, id));
  }
  act(run, 'attach-tag', 'attach-wrong-lock');
  assert.equal(run.safety.verification, 'unperformed');
  assert.equal(run.safety.tagged, true); assert.equal(run.safety.residualCleared, true);
  applyAction(run, 'verify-isolation');
  unchanged(run, () => applyAction(run, 'attach-wrong-lock'));
  applyAction(run, 'attach-personal-lock'); assert.equal(run.safety.verification, 'unperformed');
  assert.equal(judgeEntry(run).kind, 'incomplete');
});

test('S06 tags preserve passed and failed verification', () => {
  for (const pass of [false, true]) {
    const run = locked(); if (pass) applyAction(run, 'clear-residual-energy');
    applyAction(run, 'verify-isolation'); const verification = run.safety.verification;
    applyAction(run, 'attach-tag'); assert.equal(run.safety.verification, verification);
    unchanged(run, () => applyAction(run, 'attach-tag'));
  }
});

test('S07 verification checks every prerequisite, not tags, and never adds attempts', () => {
  for (const isolated of [false, true]) for (const lockState of ['none', 'wrong', 'valid']) for (const residualCleared of [false, true]) {
    const run = createRun(); Object.assign(run.safety, { isolated, lockState, residualCleared });
    const pass = isolated && lockState === 'valid' && residualCleared;
    const result = applyAction(run, 'verify-isolation');
    assert.equal(run.safety.verification, pass ? 'passed' : 'failed');
    if (pass) { assert.equal(result.kind, 'progress'); assert.equal('effect' in result, false); } else assert.deepEqual(result, failed);
    assert.equal(run.attempts, 0); assert.equal(run.rewinds, 0);
  }
  const run = createRun(); applyAction(run, 'verify-isolation');
  act(run, 'isolate-energy', 'attach-personal-lock', 'clear-residual-energy', 'verify-isolation');
  assert.equal(run.safety.verification, 'passed');
});

test('S08 missing isolation outranks failed verification and increments once per entry', () => {
  const run = createRun(); applyAction(run, 'verify-isolation');
  assert.deepEqual(applyAction(run, 'enter-work'), { kind: 'wrong', effect: 'accident', reason: TEXT.isolationMissing });
  assert.equal(run.attempts, 1);
  judgeEntry(run); assert.equal(run.attempts, 2);
});

test('S09 absent and wrong locks outrank failed verification', () => {
  for (const wrong of [false, true]) {
    const run = createRun(); applyAction(run, 'isolate-energy');
    if (wrong) applyAction(run, 'attach-wrong-lock');
    applyAction(run, 'verify-isolation');
    assert.deepEqual(judgeEntry(run), { kind: 'wrong', effect: 'accident', reason: TEXT.lockInvalid });
    assert.equal(run.attempts, 1);
  }
});

test('S10 recorded verification failure outranks missing tag and residual energy', () => {
  const run = locked();
  assert.deepEqual(applyAction(run, 'verify-isolation'), failed); assert.equal(run.attempts, 0);
  assert.equal(run.safety.tagged, false);
  assert.deepEqual(applyAction(run, 'enter-work'), failed); assert.equal(run.attempts, 1);
  assert.equal(run.completed, false);
});

test('S11 each remaining omission is incomplete without accident effects', () => {
  for (const omission of ['tagged', 'residualCleared', 'verification']) {
    const run = ready(); run.safety[omission] = omission === 'verification' ? 'unperformed' : false;
    assert.deepEqual(judgeEntry(run), { kind: 'incomplete', reason: TEXT.incomplete }); assert.equal(run.attempts, 1);
  }
});

test('S12 success completes once; every completed operation blocks unchanged', () => {
  const run = ready(); assert.equal(run.attempts, 0);
  assert.deepEqual(applyAction(run, 'enter-work'), { kind: 'success', reason: TEXT.resultDescription });
  assert.equal(run.completed, true); assert.equal(run.attempts, 1);
  const requests = [() => judgeEntry(run), () => rewind(run), ...TARGETS.map(t => () => inspect(run, t.id)), ...ACTIONS.map(a => () => applyAction(run, a.id))];
  for (const request of requests) assert.deepEqual(unchanged(run, request), { kind: 'blocked', reason: TEXT.completed });
});

test('S13 rewind changes only its counter and observation preserves verification', () => {
  const run = locked(); inspect(run, 'control-panel'); applyAction(run, 'verify-isolation'); judgeEntry(run);
  const before = structuredClone(run);
  assert.equal(rewind(run), run); assert.deepEqual(run, { ...before, rewinds: 1 });
  inspect(run, 'work-access'); assert.equal(run.safety.verification, 'failed');
});

test('S14 new runs have independent references and exact initial fields', () => {
  const run = createRun(); const other = createRun();
  assert.deepEqual(run, { observed: new Set(), attempts: 0, rewinds: 0, completed: false, safety: { isolated: false, lockState: 'none', tagged: false, residualCleared: false, verification: 'unperformed' } });
  assert.notEqual(run, other); assert.notEqual(run.observed, other.observed); assert.notEqual(run.safety, other.safety);
  inspect(other, 'work-access'); applyAction(other, 'isolate-energy'); assert.deepEqual(run, createRun());
});
