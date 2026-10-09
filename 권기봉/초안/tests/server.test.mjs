import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { test } from 'node:test';
import { makeServer } from '../server.mjs';
import { createRun, applyAction, serializeRun, judgeEntry } from '../src/scenario.mjs';
import { fixedExplanation, getExplanation, sentences } from '../src/feedback.mjs';

const prefix = '/권기봉/초안/';
const api = encodeURI(prefix + 'api/feedback');
const allSteps = ['isolate-energy', 'attach-personal-lock', 'attach-tag', 'clear-residual-energy', 'verify-isolation'];

function runWith(steps) {
  const run = createRun();
  for (const step of steps) applyAction(run, step);
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
    const response = await fetch(url + encodeURI(prefix + 'src/scenario.mjs'));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/javascript/u);
  });
});

test('explicit index link is served as HTML', async () => {
  await withServer(async (url) => {
    const response = await fetch(url + encodeURI(prefix + 'index.html'));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/u);
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

for (const [name, steps, kind] of [
  ['unsafe energy', [], 'wrong'],
  ['visible but ineffective lock', ['isolate-energy', 'attach-wrong-lock'], 'wrong'],
  ['missing tag', ['isolate-energy', 'attach-personal-lock', 'clear-residual-energy', 'verify-isolation'], 'incomplete'],
  ['complete safety measures', allSteps, 'success'],
]) {
  test(`server recalculates ${kind} from ${name} with no key`, async () => {
    const run = runWith(steps);
    const expected = fixedExplanation(judgeEntry(runWith(steps)));
    await withServer(async (url) => {
      const response = await post(url, serializeRun(run));
      assert.equal(response.status, 200);
      const explanation = await response.json();
      assert.deepEqual(explanation, expected);
      assert.equal(sentences(explanation.text).length, 3);
    }, { apiKey: '', providerFetch: () => { throw new Error('Provider must not be called without a key'); } });
  });
}

test('completed successful state is recalculated as success rather than client completion flag', async () => {
  const run = runWith(allSteps);
  const expected = fixedExplanation(judgeEntry(run));
  await withServer(async (url) => {
    assert.deepEqual(await (await post(url, serializeRun(run))).json(), expected);
  });
});

test('unknown fields, forged verdicts, ids, types and inconsistent states are rejected', async () => {
  const payload = serializeRun(createRun());
  const invalid = [
    { ...payload, kind: 'success' }, { ...payload, secret: 'unused' },
    { ...payload, observed: ['unknown'] }, { ...payload, observed: ['work-access', 'work-access'] },
    { ...payload, attempts: '1' }, { ...payload, completed: true },
    { ...payload, safety: { ...payload.safety, isolated: 1 } },
    { ...payload, safety: { ...payload.safety, verified: true } },
    { ...payload, safety: { ...payload.safety, extra: false } },
  ];
  await withServer(async (url) => {
    for (const body of invalid) assert.equal((await post(url, body)).status, 400);
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
    return new Response(JSON.stringify({ output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text }] }] }), { status: 200 });
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
  const run = runWith(allSteps);
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
