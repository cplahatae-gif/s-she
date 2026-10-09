import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STEPS, createRun, chooseOption, acknowledgeOutcome, rewind, serializeRun, runFromPayload } from '../src/scenario.mjs';
import { CATALOG, MAX_LEARNING_EVENTS, buildLearningReport, learningAIChoices, mergeLearningAI, getLearningReport, exportLearningRecord } from '../src/learning.mjs';

function complete(wrongByStep = {}) {
  const run = createRun();
  const events = [];
  for (const step of STEPS) {
    for (const id of [...(wrongByStep[step.id] ?? []), step.options.find(({ correct }) => correct).id]) {
      const outcome = chooseOption(run, id);
      events.push({ optionId: id });
      if (outcome.effect === 'accident') rewind(run);
      else acknowledgeOutcome(run);
    }
  }
  return { run, events };
}

test('first-pass completion produces observed strengths and working local maintenance courses', () => {
  const { run, events } = complete();
  const before = serializeRun(run);
  const report = buildLearningReport(run, events);
  assert.deepEqual(report.metrics, { attempts: 6, rewinds: 0, firstPassCorrect: 6, correctedSteps: 0 });
  assert.equal(report.source, 'rules');
  assert.equal(report.strengths.length, 6);
  assert.deepEqual(report.weaknesses, []);
  assert.equal(report.recommendations.length, 6);
  assert.deepEqual(serializeRun(run), before);
  for (const recommendation of report.recommendations) {
    const course = CATALOG.find(({ courseId }) => courseId === recommendation.courseId);
    assert.ok(course.lesson.length >= 2);
    assert.equal(course.question.options.length, 4);
    assert.ok(course.question.correctIndex >= 0 && course.question.correctIndex < 4);
    assert.ok(course.question.explanation.length > 10);
  }
});

test('correcting an error preserves weakness evidence and prioritizes repeated errors', () => {
  const { run, events } = complete({ stop: ['stop-emergency-only'], tagout: ['tag-skip', 'tag-skip', 'tag-unreadable'] });
  const report = buildLearningReport(run, events);
  assert.deepEqual(report.metrics, { attempts: 10, rewinds: 0, firstPassCorrect: 4, correctedSteps: 2 });
  assert.equal(report.weaknesses[1].stepId, 'tagout');
  assert.deepEqual(report.weaknesses[1].wrongOptionIds, ['tag-skip', 'tag-skip', 'tag-unreadable']);
  assert.match(report.weaknesses[1].evidence, /3회.*수정/u);
  assert.equal(report.recommendations[0].courseId, 'tag-identification');
  assert.equal(report.coachingTips[0].stepId, 'tagout');
  assert.match(report.learningBehavior.evidence, /반복 선택 1회/u);
  assert.match(report.learningBehavior.limitation, /의지·성격·동기를 판단할 수 없습니다/u);
});

test('accident events replay as rewinds while ordinary wrong choices do not', () => {
  const { run, events } = complete({ stop: ['stop-enter-running', 'stop-slower'], notify: ['notify-enter'], cleanup: ['cleanup-unlock'] });
  assert.deepEqual(buildLearningReport(run, events).metrics, { attempts: 10, rewinds: 3, firstPassCorrect: 3, correctedSteps: 3 });
});

test('unknown, out-of-order, missing and forged counters cannot become learning evidence', () => {
  const { run, events } = complete({ stop: ['stop-enter-running'] });
  for (const invalid of [[], events.slice(1), [...events, { optionId: 'cleanup-correct' }], [{ optionId: 'unknown' }, ...events],
    events.map((event, index) => index === 0 ? { ...event, reason: 'invented' } : event),
    [events[1], events[0], ...events.slice(2)]]) {
    assert.throws(() => buildLearningReport(run, invalid), TypeError);
  }
  const state = serializeRun(run);
  assert.throws(() => buildLearningReport(runFromPayload({ ...state, rewinds: 0 }), events), TypeError);
  assert.throws(() => buildLearningReport(runFromPayload({ ...state, attempts: 8 }), events), TypeError);
  assert.throws(() => buildLearningReport(createRun(), []), TypeError);
});

test('history boundary keeps all 256 observations and rejects 257 rather than truncating', () => {
  const atLimit = complete({ stop: Array(MAX_LEARNING_EVENTS - 6).fill('stop-slower') });
  assert.equal(buildLearningReport(atLimit.run, atLimit.events).events.length, MAX_LEARNING_EVENTS);
  const overLimit = complete({ stop: Array(MAX_LEARNING_EVENTS - 5).fill('stop-slower') });
  assert.throws(() => buildLearningReport(overLimit.run, overLimit.events), TypeError);
});

test('approved AI coaching is grounded in actual weak steps and leaves canonical evidence immutable', () => {
  const { run, events } = complete({ stop: ['stop-slower'], tagout: ['tag-skip'] });
  const report = buildLearningReport(run, events);
  const choices = learningAIChoices(report);
  const ai = mergeLearningAI(report, { summary: choices.summaries[1], coachingTips: [choices.tips[1]] });
  assert.equal(ai.source, 'ai');
  assert.equal(ai.coachingTips[0].stepId, 'tagout');
  for (const key of ['metrics', 'strengths', 'weaknesses', 'learningBehavior', 'recommendations', 'events']) assert.deepEqual(ai[key], report[key]);
  for (const bad of [
    { summary: '학습 의지가 부족합니다.', coachingTips: choices.tips },
    { summary: choices.summaries[0], coachingTips: [{ stepId: 'notify', text: choices.tips[0].text }] },
    { summary: choices.summaries[0], coachingTips: [{ stepId: 'stop', text: choices.tips[1].text }] },
    { summary: choices.summaries[0], coachingTips: [choices.tips[0], choices.tips[0]] },
    { summary: choices.summaries[0], coachingTips: [] },
    { summary: choices.summaries[0], coachingTips: choices.tips, metrics: { attempts: 0 } },
  ]) assert.equal(mergeLearningAI(report, bad), report);
});

test('learning export carries anonymous observed data and resolvable course IDs', () => {
  const { run, events } = complete({ notify: ['notify-vague'] });
  const record = exportLearningRecord(buildLearningReport(run, events));
  assert.equal(record.schema, 'safeplay.learning-record');
  assert.deepEqual(record.courseIds, ['work-communication']);
  assert.deepEqual(record.events, events);
  assert.ok(!Object.hasOwn(record, 'name'));
  assert.ok(!Object.hasOwn(record, 'learnerId'));
  assert.ok(!Object.hasOwn(record, 'personality'));
});

test('client defaults to analysis endpoint and ignores tampered server metrics', async () => {
  const { run, events } = complete({ stop: ['stop-slower'] });
  const fixed = buildLearningReport(run, events);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (endpoint, init) => {
    assert.equal(endpoint, './api/learning');
    assert.deepEqual(JSON.parse(init.body), { run: serializeRun(run), events });
    const choices = learningAIChoices(fixed);
    return new Response(JSON.stringify({ source: 'ai', summary: choices.summaries[2], coachingTips: choices.tips, metrics: { attempts: 0 } }));
  };
  try {
    const report = await getLearningReport(run, events);
    assert.equal(report.source, 'ai');
    assert.deepEqual(report.metrics, fixed.metrics);
  } finally { globalThis.fetch = originalFetch; }
});

test('client offline, disabled, no-key, invalid AI and timeout failures return honest rule analysis', async () => {
  const { run, events } = complete();
  const fixed = buildLearningReport(run, events);
  assert.deepEqual(await getLearningReport(run, events, { enabled: false }), fixed);
  const originalFetch = globalThis.fetch;
  try {
    for (const transport of [
      async () => { throw new TypeError('offline'); },
      async () => { throw new DOMException('deadline', 'TimeoutError'); },
      async () => new Response('{}', { status: 404 }),
      async () => new Response(JSON.stringify(fixed)),
      async () => new Response(JSON.stringify({ source: 'ai', summary: '의지가 부족합니다.', coachingTips: [] })),
    ]) {
      globalThis.fetch = transport;
      assert.deepEqual(await getLearningReport(run, events), fixed);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('cancelled analysis cannot render a stale response even if transport resolves late', async () => {
  const { run, events } = complete();
  const controller = new AbortController();
  controller.abort(new DOMException('cancelled', 'AbortError'));
  await assert.rejects(getLearningReport(run, events, { signal: controller.signal }), { name: 'AbortError' });
  const originalFetch = globalThis.fetch;
  let deliver;
  globalThis.fetch = () => new Promise((accept) => { deliver = accept; });
  const liveController = new AbortController();
  try {
    const pending = getLearningReport(run, events, { signal: liveController.signal });
    liveController.abort(new DOMException('cancelled', 'AbortError'));
    deliver(new Response(JSON.stringify(buildLearningReport(run, events))));
    await assert.rejects(pending, { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});
