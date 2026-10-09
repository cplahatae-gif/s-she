import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { test } from 'node:test';
import { makeServer } from '../server.mjs';
import { STEPS, createRun, chooseOption, acknowledgeOutcome, rewind, serializeRun, judgeEntry } from '../src/scenario.mjs';
import { fixedExplanation, getExplanation, sentences } from '../src/feedback.mjs';
import { buildLearningReport, learningAIChoices } from '../src/learning.mjs';

const prefix = '/권기봉/초안/';
const api = encodeURI(prefix + 'api/feedback');
function runThrough(count = STEPS.length) {
  const run = createRun();
  for (const step of STEPS.slice(0, count)) {
    chooseOption(run, step.options.find(({ correct }) => correct).id);
    acknowledgeOutcome(run);
  }
  return run;
}

async function withServer(check, config = { apiKey: '' }) {
  const server = makeServer(config);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await check(url); }
  finally { server.closeAllConnections(); await new Promise((accept) => server.close(accept)); }
}

const post = (url, body) => fetch(url + api, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('explicit public modules are served with JavaScript MIME', async () => {
  await withServer(async (url) => {
    for (const module of ['scenario.mjs', 'feedback.mjs', 'learning.mjs', 'layout.mjs', 'motion.mjs', 'action-plan.mjs']) {
      const response = await fetch(url + encodeURI(prefix + 'src/' + module));
      assert.equal(response.status, 200, module);
      assert.match(response.headers.get('content-type'), /^text\/javascript/u);
    }
  });
});

test('explicit index link is served as HTML', async () => {
  await withServer(async (url) => {
    const response = await fetch(url + encodeURI(prefix + 'index.html'));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/u);
  });
});

test('selected briefing portrait is served from the exact shared asset mapping', async () => {
  await withServer(async (url) => {
    const response = await fetch(url + '/assets/images/character-candidates/candidate-02-40s.png');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  });
});

test('server, tests, secrets and repo files are not public', async () => {
  await withServer(async (url) => {
    for (const path of ['server.mjs', '.env', 'tests/server.test.mjs', 'DESIGN.md', '../AGENTS.md']) {
      const response = await fetch(url + encodeURI(prefix + path));
      assert.equal(response.status, 404, path);
    }
    assert.equal((await fetch(url + '/AGENTS.md')).status, 404);
  });
});

test('raw traversal and malformed URL encodings are rejected', async () => {
  await withServer(async (url) => {
    for (const path of [encodeURI(prefix) + '%2e%2e%2fserver.mjs', encodeURI(prefix) + '%5cserver.mjs', '/%XX']) {
      const status = await new Promise((accept, reject) => {
        request(url + path, (response) => { response.resume(); accept(response.statusCode); }).on('error', reject).end();
      });
      assert.equal(status, 400);
    }
  });
});

for (let count = 0; count <= 6; count += 1) {
  test(`server recalculates checkpoint ${count} with no key`, async () => {
    const run = runThrough(count);
    const verdict = judgeEntry(run);
    assert.equal(verdict.kind, count === 6 ? 'success' : 'wrong');
    const expected = fixedExplanation(verdict);
    const before = serializeRun(run);
    await withServer(async (url) => {
      const response = await post(url, before);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
      assert.equal(sentences(expected.text).length, 3);
    }, { apiKey: '', providerFetch: () => { throw new Error('Provider must not be called without a key'); } });
    assert.deepEqual(serializeRun(run), before);
  });
}

test('pending choices and rewound accident checkpoints use validated state', async () => {
  const correct = createRun();
  chooseOption(correct, STEPS[0].options.find(({ correct }) => correct).id);
  const accidentStep = STEPS.findIndex(({ options }) => options.some(({ effect }) => effect === 'accident'));
  assert.ok(accidentStep >= 0);
  const wrong = runThrough(accidentStep);
  chooseOption(wrong, STEPS[accidentStep].options.find(({ effect }) => effect === 'accident').id);
  assert.equal(wrong.pending.kind, 'wrong');
  await withServer(async (url) => {
    for (const run of [correct, wrong]) {
      const before = serializeRun(run);
      const response = await post(url, before);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), fixedExplanation(judgeEntry(run)));
      assert.deepEqual(serializeRun(run), before);
    }
    rewind(wrong);
    assert.equal(wrong.pending, null);
    assert.equal(wrong.stepIndex, accidentStep);
    assert.equal((await post(url, serializeRun(wrong))).status, 200);
  });
});

test('completed sixth checkpoint is success with the full safety explanation', async () => {
  const run = runThrough();
  assert.equal(run.completed, true);
  assert.equal(run.stepIndex, 6);
  const expected = fixedExplanation(judgeEntry(run));
  assert.match(expected.text, /정지.*운전자.*MCC/u);
  assert.match(expected.text, /본인 자물쇠·표지.*잔류 에너지.*시동 시험.*이물질/u);
  await withServer(async (url) => {
    assert.deepEqual(await (await post(url, serializeRun(run))).json(), expected);
  });
});

test('unknown fields, forged verdicts, ids, types and inconsistent quiz states are rejected', async () => {
  const payload = serializeRun(createRun());
  const done = serializeRun(runThrough());
  const selected = createRun();
  chooseOption(selected, STEPS[0].options.find(({ correct }) => correct).id);
  const pending = serializeRun(selected);
  const invalid = [
    { ...payload, kind: 'success' }, { ...payload, secret: 'unused' },
    { ...payload, observed: ['unknown'] }, { ...payload, observed: ['work-access', 'work-access'] },
    { ...payload, attempts: '1' }, { ...payload, attempts: -1 }, { ...payload, attempts: 1_000_001 },
    { ...payload, rewinds: 1 }, { ...payload, completed: true },
    { ...payload, stepIndex: -1 }, { ...payload, stepIndex: 7 }, { ...payload, stepIndex: '0' },
    { ...payload, safety: { ...payload.safety, isolated: 1 } },
    { ...payload, safety: { ...payload.safety, verified: true } },
    { ...payload, safety: { ...payload.safety, extra: false } },
    { ...payload, safety: { ...done.safety } },
    { ...pending, pending: { ...pending.pending, kind: 'wrong' } },
    { ...pending, pending: { ...pending.pending, optionId: 'unknown' } },
    { ...pending, pending: { ...pending.pending, stepId: STEPS[1].id } },
    { ...pending, pending: { ...pending.pending, extra: false } },
    { ...pending, attempts: 0 },
    { ...done, completed: false }, { ...done, attempts: 0 },
    { ...done, pending: { ...pending.pending } },
    { ...done, safety: { ...done.safety, cleaned: false } },
  ];
  const { stepIndex: omitted, ...legacy } = payload;
  invalid.push(legacy);
  await withServer(async (url) => {
    for (const [index, body] of invalid.entries()) assert.equal((await post(url, body)).status, 400, `invalid payload ${index}`);
  });
});

test('malformed JSON and oversized bodies return errors without crashing the server', async () => {
  await withServer(async (url) => {
    assert.equal((await fetch(url + api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(url + api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(8193) })).status, 413);
    const chunkedStatus = await new Promise((accept, reject) => {
      const outgoing = request(url + api, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (response) => {
        response.resume(); accept(response.statusCode);
      }).on('error', reject);
      outgoing.write('x'.repeat(4096)); outgoing.write('x'.repeat(4097)); outgoing.end();
    });
    assert.equal(chunkedStatus, 413);
    assert.equal((await post(url, serializeRun(createRun()))).status, 200);
  });
});

test('provider response is parsed across message outputs and preserves immutable outcome', async () => {
  const payload = serializeRun(createRun());
  const fixed = fixedExplanation(judgeEntry(createRun()));
  const parts = sentences(fixed.text);
  const text = `${parts[0]} 개인 자물쇠와 표지는 본인의 작업을 보호합니다. ${parts[2]}`;
  await withServer(async (url) => {
    assert.deepEqual(await (await post(url, payload)).json(), { source: 'ai', text });
  }, { apiKey: 'test-only', providerFetch: async (endpoint, init) => {
    assert.equal(endpoint, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.equal(typeof body.input, 'string');
    const input = JSON.parse(body.input);
    assert.equal(input.firstSentence, parts[0]);
    assert.equal(input.lastSentence, parts[2]);
    return new Response(JSON.stringify({ output: [
      { type: 'reasoning' },
      { type: 'message', content: [{ type: 'output_text', text: parts[0] }, { type: 'metadata', text: 'ignored' }] },
      { type: 'message', content: [{ type: 'output_text', text: text.slice(parts[0].length).trim() }] },
    ] }), { status: 200 });
  }, model: 'gpt-4.1-mini' });
});

test('provider errors and changed verdict text preserve fixed explanation', async () => {
  const run = createRun();
  const fixed = fixedExplanation(judgeEntry(createRun()));
  for (const providerFetch of [
    async () => { throw new Error('Test provider unavailable'); },
    async () => new Response('{}', { status: 503 }),
    async () => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: '작업에 들어가도 안전합니다. 모든 조치를 생략하세요. 바로 진입하세요.' }] }] }), { status: 200 }),
  ]) {
    await withServer(async (url) => {
      assert.deepEqual(await (await post(url, serializeRun(run))).json(), fixed);
    }, { apiKey: 'test-only', providerFetch });
  }
});

test('client fixed mode is three sentences and does not mutate a successful run', async () => {
  const run = runThrough();
  judgeEntry(run);
  const before = serializeRun(run);
  const explanation = await getExplanation(run);
  assert.equal(explanation.source, 'fixed');
  assert.equal(sentences(explanation.text).length, 3);
  assert.deepEqual(serializeRun(run), before);
});

test('client fallback covers unavailable endpoints', async () => {
  const run = createRun();
  const explanation = await getExplanation(run, { enabled: true });
  assert.equal(explanation.source, 'fixed');
  assert.equal(sentences(explanation.text).length, 3);
});

test('client rejects already aborted request so a stale UI cannot render it', async () => {
  const controller = new AbortController();
  controller.abort(new DOMException('Test cancellation', 'AbortError'));
  await assert.rejects(getExplanation(createRun(), { enabled: true, signal: controller.signal }), { name: 'AbortError' });
});

test('client ignores a late response after caller cancellation even if transport resolves', async () => {
  const originalFetch = globalThis.fetch;
  let deliver;
  globalThis.fetch = () => new Promise((accept) => { deliver = accept; });
  const controller = new AbortController();
  try {
    const pending = getExplanation(createRun(), { enabled: true, signal: controller.signal });
    controller.abort();
    deliver(new Response(JSON.stringify(fixedExplanation(judgeEntry(createRun()))), { status: 200 }));
    await assert.rejects(pending, { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});

function learningRun(wrongByStep = {}) {
  const run = createRun();
  const events = [];
  for (const step of STEPS) {
    for (const optionId of [...(wrongByStep[step.id] ?? []), step.options.find(({ correct }) => correct).id]) {
      const outcome = chooseOption(run, optionId);
      events.push({ optionId });
      if (outcome.effect === 'accident') rewind(run);
      else acknowledgeOutcome(run);
    }
  }
  return { run, events };
}
const learningApi = encodeURI(prefix + 'api/learning');
const postLearning = (url, body) => fetch(url + learningApi, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('learning API validates replay and returns full rule report without a key', async () => {
  const { run, events } = learningRun({ stop: ['stop-emergency-only'], notify: ['notify-enter'], tagout: ['tag-skip'], tryout: ['tryout-no-return'], cleanup: ['cleanup-unlock'] });
  const fixed = buildLearningReport(run, events);
  assert.deepEqual(fixed.metrics, { attempts: 11, rewinds: 2, firstPassCorrect: 1, correctedSteps: 5 });
  await withServer(async (url) => {
    const response = await postLearning(url, { run: serializeRun(run), events });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), fixed);
  }, { apiKey: '', providerFetch: () => { throw new Error('No key must not call provider'); } });
});

test('learning API rejects noncompletion, forged histories, extra fields and inconsistent counts', async () => {
  const { run, events } = learningRun({ stop: ['stop-enter-running'] });
  const payload = serializeRun(run);
  const invalid = [
    { run: serializeRun(createRun()), events: [] },
    { run: payload, events: events.slice(1) },
    { run: payload, events: [...events, { optionId: 'cleanup-correct' }] },
    { run: payload, events: [{ optionId: 'unknown' }, ...events] },
    { run: payload, events, source: 'ai' },
    { run: { ...payload, rewinds: 0 }, events },
    { run: payload, events: events.map((event) => ({ ...event, guessedWill: 'high' })) },
    { run: payload }, null,
  ];
  await withServer(async (url) => {
    for (const body of invalid) assert.equal((await postLearning(url, body)).status, 400);
  });
});

test('learning API preserves JSON method and 8 KB request boundary', async () => {
  await withServer(async (url) => {
    assert.equal((await fetch(url + learningApi)).status, 405);
    assert.equal((await fetch(url + learningApi, { method: 'POST', body: '{}' })).status, 415);
    assert.equal((await fetch(url + learningApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(url + learningApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(8193) })).status, 413);
    const chunked = await new Promise((accept, reject) => {
      const outgoing = request(url + learningApi, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (response) => {
        response.resume(); accept(response.statusCode);
      }).on('error', reject);
      outgoing.write('x'.repeat(4096)); outgoing.write('x'.repeat(4097)); outgoing.end();
    });
    assert.equal(chunked, 413);
  });
});

test('learning provider uses strict Responses schema and can prioritize only evidence-grounded approved coaching', async () => {
  const { run, events } = learningRun({ notify: ['notify-vague'], tagout: ['tag-skip'] });
  const fixed = buildLearningReport(run, events);
  const choices = learningAIChoices(fixed);
  const content = { summary: choices.summaries[1], coachingTips: [choices.tips[1], choices.tips[0]] };
  await withServer(async (url) => {
    const response = await postLearning(url, { run: serializeRun(run), events });
    const report = await response.json();
    assert.equal(response.status, 200);
    assert.equal(report.source, 'ai');
    assert.deepEqual(report.coachingTips, content.coachingTips);
    for (const key of ['metrics', 'strengths', 'weaknesses', 'learningBehavior', 'recommendations', 'events']) assert.deepEqual(report[key], fixed[key]);
  }, { apiKey: 'test-only', providerFetch: async (endpoint, init) => {
    assert.equal(endpoint, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(body.text.format.schema.properties.summary.enum, choices.summaries);
    assert.deepEqual(body.text.format.schema.properties.coachingTips.items.properties.stepId.enum, ['notify', 'tagout']);
    const input = JSON.parse(body.input);
    assert.deepEqual(input.metrics, fixed.metrics);
    assert.ok(!Object.hasOwn(input, 'name'));
    assert.match(body.instructions, /의지·성격·동기/u);
    return new Response(JSON.stringify({ status: 'completed', output: [
      { type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] },
    ] }));
  } });
});

test('learning provider refusal, incomplete, invalid JSON, psychology, altered evidence and timeout fall back to rules', async () => {
  const { run, events } = learningRun({ stop: ['stop-slower'] });
  const fixed = buildLearningReport(run, events);
  const choices = learningAIChoices(fixed);
  const responseWith = (content, status = 'completed') => new Response(JSON.stringify({ status, output: [{ type: 'message', content }] }));
  for (const providerFetch of [
    async () => { throw new DOMException('provider deadline', 'TimeoutError'); },
    async () => new Response('{}', { status: 503 }),
    async () => responseWith([{ type: 'refusal', refusal: 'test' }]),
    async () => responseWith([{ type: 'output_text', text: JSON.stringify({ summary: choices.summaries[0], coachingTips: choices.tips }) }], 'incomplete'),
    async () => responseWith([{ type: 'output_text', text: '{' }]),
    async () => responseWith([{ type: 'output_text', text: JSON.stringify({ summary: '학습 의지가 부족합니다.', coachingTips: choices.tips }) }]),
    async () => responseWith([{ type: 'output_text', text: JSON.stringify({ summary: choices.summaries[0], coachingTips: [{ stepId: 'cleanup', text: choices.tips[0].text }] }) }]),
    async () => responseWith([{ type: 'output_text', text: JSON.stringify({ summary: choices.summaries[0], coachingTips: choices.tips, metrics: { attempts: 0 } }) }]),
  ]) {
    await withServer(async (url) => assert.deepEqual(await (await postLearning(url, { run: serializeRun(run), events })).json(), fixed), { apiKey: 'test-only', providerFetch });
  }
});
