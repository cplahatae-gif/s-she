import assert from 'node:assert/strict';
import {
  STEPS, TARGETS, SAFETY_STEPS, createRun, inspect, getCurrentStep, getPendingOutcome,
  chooseOption, acknowledgeOutcome, judgeEntry, rewind, serializeRun, runFromPayload,
} from '../src/scenario.mjs';

let count = 0;
function test(name, check) { check(); count += 1; console.log(`PASS ${name}`); }
const correct = (index) => STEPS[index].options.find((choice) => choice.correct);
const finishTo = (run, index) => {
  while (run.stepIndex < index) {
    assert.equal(chooseOption(run, correct(run.stepIndex).id).kind, 'progress');
    acknowledgeOutcome(run);
  }
};
const clone = (value) => JSON.parse(JSON.stringify(value));

test('6단계는 고유한 네 보기와 정답 한 개이며 정답 위치가 달라진다', () => {
  assert.equal(STEPS.length, 6);
  assert.equal(SAFETY_STEPS.length, 6);
  assert.deepEqual(STEPS.map((step) => step.targetId), ['control', 'control', 'energy-isolator', 'energy-isolator', 'control', 'work-access']);
  assert.equal(new Set(STEPS.flatMap((step) => step.options.map((choice) => choice.id))).size, 24);
  assert.deepEqual(STEPS.map((step) => step.options.findIndex((choice) => choice.correct)), [2, 0, 3, 1, 2, 0]);
  for (const step of STEPS) {
    assert.equal(step.options.length, 4);
    assert.equal(step.options.filter((choice) => choice.correct).length, 1);
    assert.equal(new Set(step.options.map((choice) => choice.text)).size, 4);
    assert.ok(Object.isFrozen(step) && Object.isFrozen(step.options));
    for (const choice of step.options) {
      assert.ok(Object.isFrozen(choice));
      for (const field of ['text', 'title', 'explanation', 'actionCaption', 'animation', 'effect']) assert.ok(choice[field]);
    }
  }
});

test('조사는 상태를 완료하지 않고 새 실습의 기록은 독립적이다', () => {
  const run = createRun();
  const fresh = createRun();
  for (const target of TARGETS) inspect(run, target.id);
  inspect(run, 'control');
  assert.equal(run.observed.size, 3);
  assert.equal(fresh.observed.size, 0);
  assert.notEqual(run.safety, fresh.safety);
  assert.ok(Object.values(run.safety).every((value) => !value));
  assert.equal(run.stepIndex, 0);
  assert.equal(run.attempts, 0);
});

test('정답의 결과를 확인하기 전에는 다음 단계로 넘어가지 않는다', () => {
  const run = createRun();
  chooseOption(run, correct(0).id);
  assert.equal(run.safety.stopped, true);
  assert.equal(run.stepIndex, 0);
  assert.equal(run.attempts, 1);
  assert.equal(getPendingOutcome(run).optionId, correct(0).id);
  const before = serializeRun(run);
  assert.equal(chooseOption(run, correct(0).id).kind, 'blocked');
  assert.equal(chooseOption(run, correct(1).id).kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
  assert.equal(acknowledgeOutcome(run).kind, 'progress');
  assert.equal(run.stepIndex, 1);
  assert.equal(run.pending, null);
});

test('현재 단계보다 앞뒤의 선택은 횟수와 상태를 바꾸지 않는다', () => {
  const run = createRun();
  for (const step of STEPS.slice(1)) assert.equal(chooseOption(run, step.options[0].id).kind, 'blocked');
  assert.equal(run.attempts, 0);
  finishTo(run, 2);
  const before = serializeRun(run);
  assert.equal(chooseOption(run, correct(0).id).kind, 'blocked');
  assert.equal(chooseOption(run, correct(3).id).kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
});

test('알 수 없는 ID는 완료나 결과 대기 중에도 어떤 변경보다 먼저 거부한다', () => {
  for (const phase of [0, 1, 6]) {
    const run = createRun();
    if (phase === 1) chooseOption(run, correct(0).id);
    if (phase === 6) finishTo(run, 6);
    const before = serializeRun(run);
    for (const id of ['unknown', null, {}, 'toString', '__proto__']) {
      assert.throws(() => chooseOption(run, id), RangeError);
      assert.throws(() => inspect(run, id), RangeError);
    }
    assert.deepEqual(serializeRun(run), before);
  }
});

test('모든 18개 오답은 자기 결과와 설명을 갖고 체크포인트를 유지한다', () => {
  const explanations = new Set();
  const effects = new Set();
  let accidents = 0;
  for (let index = 0; index < STEPS.length; index += 1) {
    for (const choice of STEPS[index].options.filter((item) => !item.correct)) {
      const run = createRun(); finishTo(run, index);
      const before = serializeRun(run);
      const verdict = chooseOption(run, choice.id);
      assert.equal(verdict.kind, 'wrong');
      assert.equal(verdict.optionId, choice.id);
      assert.equal(verdict.explanation, choice.explanation);
      assert.equal(run.stepIndex, before.stepIndex);
      assert.deepEqual(run.safety, before.safety);
      assert.equal(run.attempts, before.attempts + 1);
      assert.equal(chooseOption(run, choice.id).kind, 'blocked');
      explanations.add(verdict.explanation); effects.add(verdict.effect);
      if (verdict.effect === 'accident') {
        accidents += 1;
        assert.equal(acknowledgeOutcome(run).kind, 'blocked'); rewind(run);
        assert.equal(run.rewinds, 1);
      } else {
        assert.equal(rewind(run).kind, 'blocked'); acknowledgeOutcome(run);
        assert.equal(run.rewinds, 0);
      }
      assert.equal(run.pending, null);
      assert.deepEqual(run.safety, before.safety);
      assert.equal(run.stepIndex, index);
      assert.deepEqual(runFromPayload(serializeRun(run)).safety, before.safety);
    }
  }
  assert.equal(explanations.size, 18);
  assert.ok(effects.size >= 5);
  assert.equal(accidents, 4);
});

test('표지 누락과 트라이아웃 실패는 진입 사고로 만들지 않는다', () => {
  for (const [index, optionId] of [[3, 'tag-skip'], [4, 'tryout-skip'], [4, 'tryout-failed']]) {
    const run = createRun(); finishTo(run, index);
    const verdict = chooseOption(run, optionId);
    assert.notEqual(verdict.effect, 'accident');
    assert.equal(run.completed, false);
    assert.equal(run.stepIndex, index);
  }
});

test('사고 되감기는 기존 기록과 안전조치를 유지하고 같은 단계에서 보완한다', () => {
  const run = createRun(); inspect(run, 'energy-isolator'); finishTo(run, 5);
  const before = serializeRun(run);
  chooseOption(run, 'cleanup-unlock');
  const attempts = run.attempts;
  rewind(run);
  assert.equal(run.attempts, attempts);
  assert.equal(run.rewinds, 1);
  assert.deepEqual(run.safety, before.safety);
  assert.deepEqual([...run.observed], before.observed);
  assert.equal(run.stepIndex, 5);
  assert.equal(chooseOption(run, correct(5).id).kind, 'progress');
  assert.equal(acknowledgeOutcome(run).kind, 'success');
  assert.equal(run.attempts, 7);
});

test('전체 여섯 단계 완료 후 성공하고 재선택을 차단한다', () => {
  const run = createRun(); finishTo(run, 6);
  assert.equal(run.completed, true);
  assert.equal(getCurrentStep(run), null);
  assert.equal(run.attempts, 6);
  assert.ok(Object.values(run.safety).every(Boolean));
  const before = serializeRun(run);
  for (const step of STEPS) for (const choice of step.options) assert.equal(chooseOption(run, choice.id).kind, 'blocked');
  assert.equal(acknowledgeOutcome(run).kind, 'blocked');
  assert.equal(rewind(run).kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
  const fresh = createRun();
  assert.deepEqual([fresh.stepIndex, fresh.attempts, fresh.rewinds, fresh.completed, fresh.pending, fresh.observed.size], [0, 0, 0, false, null, 0]);
  assert.ok(Object.values(fresh.safety).every((value) => !value));
  assert.equal(run.completed, true);
});

test('진입 판정은 미완료와 성공 모두 기록을 변경하지 않는다', () => {
  for (let index = 0; index <= 6; index += 1) {
    const run = createRun(); finishTo(run, index);
    const before = serializeRun(run);
    assert.equal(judgeEntry(run).kind, index === 6 ? 'success' : 'wrong');
    assert.deepEqual(serializeRun(run), before);
  }
  const completed = createRun(); finishTo(completed, 6); completed.completed = false;
  assert.equal(judgeEntry(completed).kind, 'success');
  assert.equal(completed.completed, false);
  assert.equal(completed.attempts, 6);
});

test('모든 단계와 대기 결과의 JSON 왕복은 독립 사본을 만든다', () => {
  for (let index = 0; index < 6; index += 1) {
    for (const choice of STEPS[index].options) {
      const run = createRun(); finishTo(run, index); inspect(run, STEPS[index].targetId); chooseOption(run, choice.id);
      const restored = runFromPayload(clone(serializeRun(run)));
      assert.deepEqual(serializeRun(restored), serializeRun(run));
      assert.notEqual(restored.observed, run.observed);
      assert.notEqual(restored.safety, run.safety);
      assert.notEqual(restored.pending, run.pending);
      assert.deepEqual(getPendingOutcome(restored), getPendingOutcome(run));
    }
  }
});

test('전송 객체의 필드·ID·타입·범위를 검증한다', () => {
  const valid = serializeRun(createRun());
  const malformed = [null, [], {}, { ...valid, extra: true }, { ...valid, safety: {} },
    { ...valid, safety: { ...valid.safety, extra: false } }, { ...valid, observed: new Set() },
    { ...valid, observed: new Array(1) },
    { ...valid, observed: ['worker'] }, { ...valid, observed: ['control', 'control'] },
    { ...valid, attempts: -1 }, { ...valid, attempts: 0.5 }, { ...valid, attempts: '1' },
    { ...valid, attempts: 1_000_001 }, { ...valid, rewinds: NaN }, { ...valid, rewinds: Infinity },
    { ...valid, completed: 1 }, { ...valid, stepIndex: -1 }, { ...valid, stepIndex: 7 },
    { ...valid, stepIndex: 0.5 }, { ...valid, stepIndex: '0' },
    { ...valid, safety: { ...valid.safety, stopped: 1 } }, { ...valid, pending: {} },
    { ...valid, pending: { stepId: 'stop', optionId: 'unknown', kind: 'wrong' } }];
  for (const payload of malformed) assert.throws(() => runFromPayload(payload), TypeError);
});

test('허위 단계·완료·횟수·정답대기 상태를 거부한다', () => {
  const initial = serializeRun(createRun());
  for (const key of Object.keys(initial.safety)) assert.throws(() => runFromPayload({ ...initial, safety: { ...initial.safety, [key]: true } }), TypeError);
  for (const patch of [{ stepIndex: 1 }, { completed: true }, { rewinds: 1 }, { pending: { stepId: 'stop', optionId: 'stop-correct', kind: 'wrong' } }]) assert.throws(() => runFromPayload({ ...initial, ...patch }), TypeError);
  const run = createRun(); chooseOption(run, correct(0).id); const pending = serializeRun(run);
  for (const patch of [{ attempts: 0 }, { rewinds: 1 }, { safety: initial.safety }, { completed: true }, { pending: { ...pending.pending, extra: true } }, { pending: { ...pending.pending, stepId: 'notify' } }, { pending: null }]) assert.throws(() => runFromPayload({ ...pending, ...patch }), TypeError);
  const wrong = createRun(); chooseOption(wrong, 'stop-enter-running');
  assert.throws(() => runFromPayload({ ...serializeRun(wrong), rewinds: 1 }), TypeError);
  const done = createRun(); finishTo(done, 6); const final = serializeRun(done);
  assert.throws(() => runFromPayload({ ...final, completed: false }), TypeError);
  assert.throws(() => runFromPayload({ ...final, pending: pending.pending }), TypeError);
});

test('기록 상한에서는 새 선택이 상태를 변경하지 않는다', () => {
  const run = createRun(); run.attempts = 1_000_000;
  const before = serializeRun(run);
  assert.equal(chooseOption(run, correct(0).id).kind, 'blocked');
  assert.deepEqual(serializeRun(run), before);
});
console.log(`${count} scenario tests passed.`);
