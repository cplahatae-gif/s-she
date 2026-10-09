import assert from 'node:assert/strict';
import {
  ACTIONS, SAFETY_STEPS, createRun, inspect, applyAction, judgeEntry,
  rewind, serializeRun, runFromPayload,
} from '../src/scenario.mjs';

let count = 0;
function test(name, check) {
  check();
  count += 1;
  console.log(`PASS ${name}`);
}
const finishHazardSteps = (run) => ['isolate-energy', 'attach-personal-lock', 'clear-residual-energy']
  .forEach((id) => assert.equal(applyAction(run, id).kind, 'progress'));
const finishSteps = (run) => {
  finishHazardSteps(run);
  applyAction(run, 'attach-tag');
  applyAction(run, 'verify-isolation');
};

test('새 한 판의 Set과 안전조치 객체가 서로 독립적이다', () => {
  const first = createRun();
  const second = createRun();
  assert.notEqual(first.observed, second.observed);
  assert.notEqual(first.safety, second.safety);
  inspect(first, 'work-access');
  applyAction(first, 'isolate-energy');
  assert.equal(second.observed.size, 0);
  assert.ok(Object.values(second.safety).every((value) => value === false));
  assert.deepEqual([second.attempts, second.rewinds, second.completed], [0, 0, false]);
});
test('설명 조사는 안전조치 또는 판단을 대신하지 않는다', () => {
  const run = createRun();
  const before = { ...run.safety };
  inspect(run, 'work-access');
  inspect(run, 'energy-isolator');
  inspect(run, 'energy-isolator');
  assert.equal(run.observed.size, 2);
  assert.deepEqual(run.safety, before);
  assert.equal(run.attempts, 0);
  assert.equal(applyAction(run, 'enter-work').effect, 'accident');
});
test('미조치 진입은 실제 위험 상태에 의한 사고이며 1회 판단이다', () => {
  const run = createRun();
  const verdict = applyAction(run, 'enter-work');
  assert.equal(verdict.kind, 'wrong');
  assert.equal(verdict.effect, 'accident');
  assert.equal(run.attempts, 1);
  assert.equal(run.completed, false);
});
test('모든 필수 안전조치 후 진입은 성공한다', () => {
  const run = createRun();
  finishSteps(run);
  assert.ok(SAFETY_STEPS.every(({ key }) => run.safety[key]));
  assert.equal(run.attempts, 0);
  assert.equal(applyAction(run, 'enter-work').kind, 'success');
  assert.equal(run.completed, true);
  assert.equal(run.attempts, 1);
});
test('위험 에너지가 해소됐을 때 표지 또는 확인 누락은 사고가 아닌 미완료다', () => {
  for (const missing of ['tagged', 'verified', 'both']) {
    const run = createRun();
    finishHazardSteps(run);
    if (missing === 'tagged') applyAction(run, 'verify-isolation');
    if (missing === 'verified') applyAction(run, 'attach-tag');
    const verdict = applyAction(run, 'enter-work');
    assert.equal(verdict.kind, 'incomplete');
    assert.equal(verdict.effect, undefined);
    assert.equal(run.completed, false);
  }
});
test('눈에 보이는 잘못된 자물쇠는 올바른 잠금으로 인정하지 않는다', () => {
  const run = createRun();
  applyAction(run, 'isolate-energy');
  applyAction(run, 'attach-wrong-lock');
  assert.equal(run.safety.lockPresent, true);
  assert.equal(run.safety.locked, false);
  assert.equal(applyAction(run, 'enter-work').effect, 'accident');
  applyAction(run, 'attach-personal-lock');
  applyAction(run, 'attach-tag');
  applyAction(run, 'clear-residual-energy');
  applyAction(run, 'verify-isolation');
  assert.equal(applyAction(run, 'enter-work').kind, 'success');
});
test('잘못된 잠금으로 바꾸면 기존 종속 안전조치는 무효화된다', () => {
  const run = createRun();
  finishSteps(run);
  applyAction(run, 'attach-wrong-lock');
  assert.deepEqual(run.safety, {
    isolated: true, lockPresent: true, locked: false, tagged: false, residualCleared: false, verified: false,
  });
  assert.deepEqual(runFromPayload(serializeRun(run)).safety, run.safety);
});
test('잔류 에너지 미조치는 위험 상태이며 확인 행동은 차단된다', () => {
  const run = createRun();
  applyAction(run, 'isolate-energy');
  applyAction(run, 'attach-personal-lock');
  applyAction(run, 'attach-tag');
  const before = serializeRun(run);
  assert.equal(applyAction(run, 'verify-isolation').kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
  assert.equal(applyAction(run, 'enter-work').effect, 'accident');
});
test('선행 조치 없이 수행하는 조작은 상태를 바꾸지 않는다', () => {
  for (const actionId of ['attach-personal-lock', 'attach-wrong-lock', 'attach-tag', 'clear-residual-energy', 'verify-isolation']) {
    const run = createRun();
    const before = serializeRun(run);
    assert.equal(applyAction(run, actionId).kind, 'blocked');
    assert.deepEqual(serializeRun(run), before);
  }
});
test('잘못된 대상과 행동 ID는 어떤 변경보다 먼저 거부된다', () => {
  const run = createRun();
  finishSteps(run);
  applyAction(run, 'enter-work');
  const before = serializeRun(run);
  for (const id of ['worker', 'lock', 'control', 'unknown', null, {}]) assert.throws(() => inspect(run, id), RangeError);
  for (const id of ['remove', 'notify', 'hold', 'start', null, {}]) assert.throws(() => applyAction(run, id), RangeError);
  assert.deepEqual(serializeRun(run), before);
});
test('반복 조작은 판단 횟수를 증가시키지 않으며 상태가 동일하다', () => {
  const run = createRun();
  finishSteps(run);
  const before = serializeRun(run);
  for (const { id } of ACTIONS.filter(({ id }) => id !== 'enter-work' && id !== 'attach-wrong-lock')) {
    applyAction(run, id);
  }
  assert.deepEqual(serializeRun(run), before);
});
test('되감기는 관찰·판단·안전조치를 유지하고 횟수만 증가한다', () => {
  const run = createRun();
  inspect(run, 'work-access');
  applyAction(run, 'isolate-energy');
  applyAction(run, 'attach-wrong-lock');
  applyAction(run, 'enter-work');
  const before = serializeRun(run);
  rewind(run);
  assert.deepEqual(serializeRun(run), { ...before, rewinds: 1 });
  assert.equal(run.safety.locked, false);
});
test('완료한 한 판은 추가 조작과 재판정을 차단한다', () => {
  const run = createRun();
  finishSteps(run);
  applyAction(run, 'enter-work');
  const before = serializeRun(run);
  for (const { id } of ACTIONS) assert.equal(applyAction(run, id).kind, 'blocked');
  assert.equal(judgeEntry(run).kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
});
test('JSON 왕복은 독립된 Set과 안전조치 사본을 만든다', () => {
  const run = createRun();
  inspect(run, 'energy-isolator');
  finishSteps(run);
  applyAction(run, 'enter-work');
  const restored = runFromPayload(JSON.parse(JSON.stringify(serializeRun(run))));
  assert.deepEqual(serializeRun(restored), serializeRun(run));
  assert.notEqual(restored.observed, run.observed);
  assert.notEqual(restored.safety, run.safety);
  restored.completed = false;
  assert.equal(judgeEntry(restored).kind, 'success');
  assert.equal(run.attempts, 1);
});
test('전송 객체의 알 수 없는 필드·ID·타입·횟수를 거부한다', () => {
  const valid = serializeRun(createRun());
  const malformed = [
    null, [], {}, { ...valid, extra: true }, { ...valid, safety: { ...valid.safety, extra: false } },
    { ...valid, safety: {} }, { ...valid, observed: new Set() }, { ...valid, observed: ['worker'] },
    { ...valid, observed: ['work-access', 'work-access'] }, { ...valid, attempts: -1 },
    { ...valid, attempts: 0.5 }, { ...valid, attempts: '1' }, { ...valid, attempts: 1_000_001 },
    { ...valid, rewinds: NaN }, { ...valid, rewinds: Infinity }, { ...valid, completed: 1 },
    { ...valid, safety: { ...valid.safety, isolated: 1 } },
  ];
  for (const payload of malformed) assert.throws(() => runFromPayload(payload), TypeError);
});
test('불가능한 안전조치 종속 관계와 허위 완료 상태를 거부한다', () => {
  const valid = serializeRun(createRun());
  for (const key of ['lockPresent', 'locked', 'tagged', 'residualCleared', 'verified']) {
    assert.throws(() => runFromPayload({ ...valid, safety: { ...valid.safety, [key]: true } }), TypeError);
  }
  assert.throws(() => runFromPayload({ ...valid, completed: true }), TypeError);
  const ready = createRun();
  finishSteps(ready);
  assert.throws(() => runFromPayload({ ...serializeRun(ready), completed: true }), TypeError);
});
console.log(`${count} scenario tests passed.`);
