import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeEntry, runFromPayload } from './src/scenario.mjs';
import { fixedExplanation, sentences, validSupplement } from './src/feedback.mjs';

const draftRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(draftRoot, '../..');
const prefix = '/권기봉/초안/';
const publicFiles = new Map([
  [prefix, 'index.html'],
  [prefix + 'index.html', 'index.html'],
  ...['src/styles.css', 'src/app.js', 'src/stage.js', 'src/overview.js', 'src/scenario.mjs', 'src/feedback.mjs', 'src/layout.mjs']
    .map((name) => [prefix + name, name]),
  ['/vendor/phaser.min.js', '../../vendor/phaser.min.js'],
  ['/vendor/PHASER-LICENSE.txt', '../../vendor/PHASER-LICENSE.txt'],
  ['/assets/images/overview/factory-overview.png', '../../assets/images/overview/factory-overview.png'],
  ['/assets/images/scenario-scenes/05-safe-cleanup.png', '../../assets/images/scenario-scenes/05-safe-cleanup.png'],
]);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

class RequestError extends Error {
  constructor(status) { super('요청을 처리할 수 없습니다.'); this.status = status; }
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((accept, reject) => {
    let size = 0;
    let settled = false;
    const chunks = [];
    request.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > 8192) {
        settled = true;
        chunks.length = 0;
        reject(new RequestError(413));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (!settled) accept(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', () => { if (!settled) reject(new RequestError(400)); });
    request.on('aborted', () => { if (!settled) reject(new RequestError(400)); });
  });
}

async function supplement(run, config, signal) {
  run.completed = false;
  const result = judgeEntry(run);
  const fixed = fixedExplanation(result);
  if (!config.apiKey) return fixed;
  const first = sentences(fixed.text)[0];
  const timeout = AbortSignal.timeout(8000);
  try {
    const response = await config.providerFetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.any([signal, timeout]),
      body: JSON.stringify({
        model: config.model,
        store: false,
        max_output_tokens: 320,
        instructions: '한국어 안전교육 보충 설명을 정확히 세 문장으로 작성합니다. 코드의 판정은 변경할 수 없습니다. 첫 문장은 입력의 고정 첫 문장을 그대로 사용하고, 마지막 문장은 입력의 고정 마지막 문장을 그대로 사용합니다. 둘째 문장에서 정지와 에너지 차단의 차이, 개인 잠금·표지, 잔류 에너지 처리 또는 차단 확인의 원칙 하나를 설명합니다. 판정, 성공, 실패, 작업 허가, 현장 인증, 조치 생략을 주장하지 않습니다. 입력 밖의 현장 절차나 통계를 만들지 않습니다.',
        input: JSON.stringify({ kind: result.kind, safety: run.safety, firstSentence: first, lastSentence: sentences(fixed.text)[2] }),
      }),
    });
    if (!response.ok) return fixed;
    const data = await response.json();
    const text = (Array.isArray(data.output) ? data.output : [])
      .filter((item) => item.type === 'message' && Array.isArray(item.content))
      .flatMap((item) => item.content)
      .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => item.text).join(' ').trim().replace(/\s+/gu, ' ');
    return validSupplement(text, fixed) ? { source: 'ai', text } : fixed;
  } catch {
    return fixed;
  }
}

async function serveFile(pathname, response) {
  let filename = publicFiles.get(pathname);
  const isDraftAsset = pathname.startsWith(prefix + 'assets/');
  if (isDraftAsset && /^assets\/(?:[\p{L}\p{N}_-]+\/)*[\p{L}\p{N}_.-]+\.(?:png|jpe?g|webp|json)$/u.test(pathname.slice(prefix.length))) {
    filename = pathname.slice(prefix.length);
  }
  if (!filename) throw new RequestError(404);
  let canonical;
  let allowedRoot;
  try {
    [canonical, allowedRoot] = await Promise.all([
      realpath(resolve(draftRoot, filename)), realpath(pathname.startsWith(prefix) ? draftRoot : projectRoot),
    ]);
  } catch { throw new RequestError(404); }
  const localPath = relative(allowedRoot, canonical);
  if (localPath === '..' || localPath.startsWith('..' + sep) || resolve(allowedRoot, localPath) !== canonical) throw new RequestError(404);
  const mappedPath = pathname.startsWith(prefix) ? filename : relative(projectRoot, resolve(draftRoot, filename));
  if (canonical !== resolve(allowedRoot, mappedPath)) throw new RequestError(404);
  const body = await readFile(canonical);
  response.writeHead(200, { 'Content-Type': mime[extname(canonical)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
  response.end(body);
}

export function makeServer({ apiKey = process.env.OPENAI_API_KEY ?? '', model = process.env.OPENAI_MODEL || 'gpt-4.1-mini', providerFetch = globalThis.fetch } = {}) {
  const config = { apiKey, model, providerFetch };
  return createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent((request.url ?? '').split('?')[0]);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some((part) => part === '.' || part === '..')) throw new RequestError(400);
      if (pathname === '/' && request.method === 'GET') {
        response.writeHead(302, { Location: encodeURI(prefix) + '?ai=on' });
        response.end();
      } else if (pathname === prefix + 'api/feedback') {
        if (request.method !== 'POST') throw new RequestError(405);
        if (!/^application\/json(?:\s*;|$)/iu.test(request.headers['content-type'] ?? '')) throw new RequestError(415);
        if (Number(request.headers['content-length']) > 8192) { request.resume(); throw new RequestError(413); }
        let run;
        try { run = runFromPayload(JSON.parse(await readBody(request))); }
        catch (error) { throw error instanceof RequestError ? error : new RequestError(400); }
        const controller = new AbortController();
        response.once('close', () => { if (!response.writableEnded) controller.abort(); });
        const explanation = await supplement(run, config, controller.signal);
        if (!response.destroyed) json(response, 200, explanation);
      } else {
        if (request.method !== 'GET') throw new RequestError(405);
        await serveFile(pathname, response);
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : error instanceof URIError ? 400 : 500;
      if (!response.headersSent && !response.destroyed) json(response, status, { error: '요청을 처리할 수 없습니다.' });
      else if (!response.destroyed) response.end();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8780);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 정수여야 합니다.');
  makeServer().listen(port, '127.0.0.1', () => {
    console.log(`SAFEPLAY 초안: http://127.0.0.1:${port}${encodeURI(prefix)}?ai=on`);
  });
}
