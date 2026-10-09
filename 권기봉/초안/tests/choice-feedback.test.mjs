import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STEPS, createRun, chooseOption, serializeRun } from '../src/scenario.mjs';
import { getWrongChoiceFeedback } from '../src/choice-feedback.mjs';

const wrong = STEPS.flatMap(step => step.options.filter(option => !option.correct));
test('all eighteen canonical wrong choices have concise distinct actionable feedback', () => {
  assert.equal(wrong.length, 18);
  const summaries = new Set();
  for (const option of wrong) {
    const copy = getWrongChoiceFeedback(option.id);
    assert.equal(copy.optionId, option.id);
    assert.ok(Object.isFrozen(copy));
    assert.ok(copy.title.length >= 8 && copy.title.length <= 28, option.id);
    for (const field of ['mistake', 'risk', 'next']) {
      assert.ok(copy[field].length >= 18 && copy[field].length <= 42, `${option.id} ${field}`);
    }
    summaries.add([copy.mistake, copy.risk, copy.next].join(' '));
  }
  assert.equal(summaries.size, 18);
});
test('feedback rejects unknown and correct choice IDs without changing the game', () => {
  const run = createRun();
  chooseOption(run, 'stop-enter-running');
  const before = serializeRun(run);
  getWrongChoiceFeedback(run.pending.optionId);
  assert.deepEqual(serializeRun(run), before);
  for (const id of [...STEPS.flatMap(step => step.options.filter(option => option.correct).map(option => option.id)), 'unknown', '__proto__', null]) {
    assert.throws(() => getWrongChoiceFeedback(id), RangeError);
  }
});
test('nonaccident guidance distinguishes identification, missing personal protection and failed verification', () => {
  assert.match(getWrongChoiceFeedback('lock-other-person').risk, /풀면.*수 있습니다/u);
  assert.match(getWrongChoiceFeedback('tag-skip').risk, /작업자.*작업 상태/u);
  assert.doesNotMatch(getWrongChoiceFeedback('tag-skip').risk, /기동|움직|끼임/u);
  assert.match(getWrongChoiceFeedback('tryout-failed').next, /진입을 보류/u);
  assert.match(getWrongChoiceFeedback('stop-emergency-only').next, /차단·본인 잠금/u);
});
