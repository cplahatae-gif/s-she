import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotion, clearMotion, queueTap, advanceMotion, advanceCamera, motionConfig } from '../src/motion.mjs';
const bounds = { minX: 0, maxX: 1000 };
const advance = (state, input, count) => { for (let i = 0; i < count; i++) advanceMotion(state, input, 1 / 60, bounds); };

test('held motion accelerates, releasing brakes promptly, and stopped frames stay idle', () => {
  const state = createMotion(400);
  advance(state, 1, 3);
  assert.ok(state.velocity > 0 && state.velocity < motionConfig.speed);
  advance(state, 1, 10);
  assert.equal(state.velocity, motionConfig.speed);
  const released = state.x;
  advance(state, 0, 6);
  assert.equal(state.velocity, 0);
  assert.ok(state.x - released < 10);
  advance(state, 0, 2);
  assert.equal(state.frame, -1);
});

test('reverse brakes before changing facing and then walks opposite', () => {
  const state = createMotion(400);
  advance(state, 1, 20);
  const before = state.x;
  advance(state, -1, 2);
  assert.equal(state.facing, 1);
  assert.ok(state.x > before && state.velocity > 0);
  advance(state, -1, 10);
  assert.equal(state.facing, -1);
  assert.ok(state.velocity < 0);
});

test('button tap travels 60 smoothly and tiny key tap visibly travels 12 without overshoot', () => {
  for (const distance of [60, 12]) {
    const state = createMotion(400);
    queueTap(state, 1, distance);
    advance(state, 0, 1);
    assert.ok(state.x > 400 && state.x < 400 + distance);
    advance(state, 0, 100);
    assert.ok(Math.abs(state.x - 400 - distance) < 0.001);
    assert.equal(state.velocity, 0);
    assert.equal(state.frame, -1);
  }
});

test('bounds discard remaining travel and clear/reset cannot retain held velocity or queued input', () => {
  const state = createMotion(998);
  queueTap(state, 1);
  advance(state, 0, 50);
  assert.equal(state.x, 1000);
  assert.equal(state.distance, 2);
  assert.equal(state.frame, -1);
  assert.equal(state.queue, 0);
  queueTap(state, -1);
  advance(state, -1, 5);
  const pausedX = state.x;
  clearMotion(state);
  advance(state, 0, 20);
  assert.equal(state.x, pausedX);
  assert.equal(state.velocity, 0);
});

test('walk phase reflects moved distance regardless of rendering frequency', () => {
  const a = createMotion(400), b = createMotion(400);
  advance(a, 1, 20);
  for (let i = 0; i < 40; i++) advanceMotion(b, 1, 1 / 120, bounds);
  assert.ok(Math.abs(a.x - b.x) < 0.001);
  assert.equal(a.frame, Math.floor(a.distance / (motionConfig.stride / 8)) % 8);
  assert.equal(a.frame, b.frame);
});

test('camera approaches smoothly, clamps bounds, and does not instantly jump on reversal', () => {
  const forward = advanceCamera(100, 1000, 200, 1 / 60, 1280, 3200);
  const reversed = advanceCamera(forward, 1000, -200, 1 / 60, 1280, 3200);
  assert.ok(Math.abs(reversed - forward) < 60);
  assert.ok(advanceCamera(0, 0, -200, 1, 1280, 3200) >= 0);
  assert.ok(advanceCamera(1920, 3200, 200, 1, 1280, 3200) <= 1920);
});
