import assert from 'node:assert/strict';
import { ACTION_SCENES, ACCIDENT_IDS } from '../src/action-scenes.mjs';
import { STEPS } from '../src/scenario.mjs';
import { mountActions } from '../src/actions.js';

const options = STEPS.flatMap((step) => step.options);
assert.equal(options.length, 24);
assert.deepEqual(Object.keys(ACTION_SCENES).sort(), options.map(({ id }) => id).sort());
assert.deepEqual([...ACCIDENT_IDS].sort(), options.filter(({ effect }) => effect === 'accident').map(({ id }) => id).sort());
for (const option of options) {
  const scene = ACTION_SCENES[option.id];
  assert.ok(['control', 'isolator', 'access', 'radio'].includes(scene.view));
  assert.ok(scene.operation && scene.narration);
  for (const shots of [scene.shots, ...(scene.accidentShots ? [scene.accidentShots] : [])]) {
    assert.ok(shots.length > 0);
    assert.equal(shots[0].at, 0);
    shots.forEach((shot, index) => {
      assert.ok(shot.file && shot.at >= 0 && shot.at <= 1);
      if (index) assert.ok(shot.at > shots[index - 1].at);
    });
  }
}
assert.notEqual(ACTION_SCENES['notify-skip'].operation, ACTION_SCENES['notify-vague'].operation);
assert.notEqual(ACTION_SCENES['lock-other-equipment'].operation, ACTION_SCENES['lock-other-person'].operation);
assert.notEqual(ACTION_SCENES['tag-wrong-name'].operation, ACTION_SCENES['tag-unreadable'].operation);
assert.notEqual(ACTION_SCENES['tryout-failed'].operation, ACTION_SCENES['tryout-no-return'].operation);

const frames = new Map(), listeners = new Map(), requested = [], decodes = [], stalled = [], decodeWaiters = [];
let frameId = 0, now = 0, failImage = false, failDecode = false, stallImage = false, stallDecode = false;
globalThis.performance = { now: () => now };
globalThis.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
globalThis.addEventListener = (name, callback) => listeners.set(name, callback);
globalThis.removeEventListener = (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); };
globalThis.devicePixelRatio = 2;
const element = () => {
  const children = new Map(), classes = new Set(), styles = new Map();
  return {
    hidden: false, children: [], dataset: {}, removed: false,
    style: { setProperty: (name, value) => styles.set(name, value), getPropertyValue: (name) => styles.get(name) },
    classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name),
    },
    set className(value) { classes.clear(); value.split(' ').filter(Boolean).forEach((name) => classes.add(name)); },
    setAttribute() {}, append(child) { this.children.push(child); }, remove() { this.removed = true; },
    querySelector(name) { if (!children.has(name)) children.set(name, element()); return children.get(name); },
  };
};
globalThis.document = { createElement: element };
globalThis.Image = class {
  naturalWidth = 1536;
  naturalHeight = 1024;
  set src(value) {
    this.url = value; requested.push(value);
    if (stallImage) stalled.push(this);
    else queueMicrotask(() => failImage ? this.onerror() : this.onload());
  }
  get src() { return this.url; }
  decode() {
    decodes.push(this.url);
    if (failDecode) return Promise.reject(new Error('decode failed'));
    if (stallDecode) return new Promise((resolve) => decodeWaiters.push(resolve));
    return Promise.resolve();
  }
};
const waitFrames = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const advance = (value) => {
  now = value;
  const callbacks = [...frames.values()];
  frames.clear(); callbacks.forEach((callback) => callback(now));
};
const states = [], shell = element();
const actions = mountActions(shell, { onState: (state) => states.push(state) });
const layer = shell.children[0], photo = layer.querySelector('.action-photo');
const phase = layer.querySelector('.action-phase'), narration = layer.querySelector('.action-copy');
const url = (file) => new URL(`../assets/actions/${file}.png`, import.meta.url).href;
await assert.rejects(actions.play({ optionId: 'unknown' }), RangeError);
await assert.rejects(actions.play({ optionId: 'stop-correct' }, {}, true), RangeError);
const decision = { optionId: 'lock-correct' }, definition = ACTION_SCENES[decision.optionId];
const before = { locked: false }, after = { locked: true };
stallDecode = true;
const running = actions.play(decision, { beforeSafety: before, afterSafety: after });
await waitFrames();
assert.equal(layer.hidden, true);
assert.equal(frames.size, 0);
assert.deepEqual(requested, [...new Set(definition.shots.map(({ file }) => url(file)))]);
assert.deepEqual(decodes, requested);
stallDecode = false; decodeWaiters.splice(0).forEach((resolve) => resolve());
await waitFrames();
assert.equal(layer.hidden, false);
assert.ok(shell.classList.contains('playing-action'));
assert.deepEqual(states, [before]);
assert.equal(photo.src, url(definition.shots[0].file));
assert.equal(narration.textContent, definition.narration);
assert.equal(photo.style.getPropertyValue('--photo-width'), '1536px');
assert.equal(photo.style.getPropertyValue('--photo-height'), '1024px');
actions.setReducedMotion(true);
assert.ok(layer.classList.contains('reduced-motion'));
const stateAt = definition.stateAt ?? .55;
const times = [...new Set([stateAt - .001, stateAt, ...definition.shots.slice(1).flatMap(({ at }) => [at - .001, at]), 1])].sort((a, b) => a - b);
for (const progress of times) {
  advance(3200 * progress);
  const expected = definition.shots.filter(({ at }) => at <= progress).at(-1);
  assert.equal(photo.src, url(expected.file));
  assert.equal(phase.textContent, expected.label ?? '');
  assert.equal(phase.hidden, !expected.label);
  assert.deepEqual(states, progress >= stateAt ? [before, after] : [before]);
}
await running;
assert.equal(layer.hidden, true);
assert.equal(shell.classList.contains('playing-action'), false);

failImage = true;
await assert.rejects(actions.play(decision), /다시 시도/);
assert.equal(layer.hidden, true);
failImage = false; failDecode = true;
await assert.rejects(actions.play(decision), /다시 시도/);
failDecode = false;
const retry = actions.play(decision);
await waitFrames();
assert.equal(layer.hidden, false);
actions.cancel(); await retry;
assert.equal(frames.size, 0);

stallImage = true;
const loading = actions.play(decision);
actions.cancel(); await loading;
assert.equal(layer.hidden, true);
stallImage = false;
const replacement = actions.play({ optionId: 'notify-correct' });
await waitFrames();
const replacementSrc = photo.src;
assert.equal(narration.textContent, ACTION_SCENES['notify-correct'].narration);
stalled.splice(0).forEach((img) => img.onload());
await waitFrames();
assert.equal(photo.src, replacementSrc);
actions.cancel(); await replacement;
stallDecode = true;
const decoding = actions.play(decision);
await waitFrames(); actions.cancel(); await decoding;
stallDecode = false; decodeWaiters.splice(0).forEach((resolve) => resolve());
await waitFrames();
assert.equal(layer.hidden, true);
assert.equal(frames.size, 0);

for (const optionId of ACCIDENT_IDS) {
  states.length = 0; requested.length = 0;
  const scene = ACTION_SCENES[optionId], shots = scene.accidentShots ?? scene.shots;
  const start = now;
  const accident = actions.play({ optionId }, { beforeSafety: before, afterSafety: after }, true);
  await waitFrames();
  assert.deepEqual(requested, [...new Set(shots.map(({ file }) => url(file)))]);
  assert.equal(photo.src, url(shots[0].file));
  assert.equal(narration.textContent, scene.accidentNarration ?? '설비가 움직이고 손이 회전부에 가까워집니다. 위험 발생 순간 실습을 멈춥니다.');
  advance(start + 2600 * .83);
  assert.equal(layer.classList.contains('blackout'), false);
  advance(start + 2600 * .84);
  assert.equal(layer.classList.contains('blackout'), true);
  advance(start + 2600);
  await accident;
  assert.deepEqual(states, [before]);
  assert.equal(layer.hidden, false);
  assert.equal(photo.src, url(shots.at(-1).file));
  actions.cancel();
}
const interrupted = actions.play(decision);
await waitFrames(); actions.destroy(); await interrupted;
assert.equal(frames.size, 0);
assert.equal(listeners.size, 0);
assert.equal(layer.removed, true);
await actions.play(decision);
assert.equal(frames.size, 0);
console.log('24 photo sequences, selected loading and decode, discrete timing, state timing, pixel caps, accidents, retry and cancellation passed.');

for (const id of ['stop-enter-running', 'notify-enter']) {
  assert.ok(ACTION_SCENES[id].shots.every(shot => shot.file !== 'v2/access-risk'), `${id}: danger must occur only in the accident phase`);
}
assert.equal(ACTION_SCENES['stop-enter-running'].accidentShots[0].file, 'v2/access-motion');
for (const id of ['tag-wrong-name', 'tag-unreadable']) {
  assert.ok(ACTION_SCENES[id].shots.every(shot => shot.file !== 'v2/isolator-tag-contact'), `${id}: must not attach the SELF tag`);
}
