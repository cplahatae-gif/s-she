import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMovement, followCamera } from '../src/site/motion.mjs';
import { layout } from '../src/site/layout.mjs';

const geometry = { ...layout, minX: 76, maxX: 3124, worldWidth: 3200, clampX: x => Math.max(76, Math.min(3124, x)) };
const replay = fps => {
  let state = { x: 704, velocity: 0 };
  for (const [direction, duration] of [[1, 1.2], [-1, .6], [0, .5]]) {
    for (let i = 0; i < Math.round(fps * duration); i++) state = advanceMovement(state.x, state.velocity, direction, 1 / fps, geometry);
  }
  return state;
};

test('movement covers the same distance at 30, 60 and 120 updates per second', () => {
  const reference = replay(60);
  for (const fps of [30, 120]) assert.ok(Math.abs(replay(fps).x - reference.x) < .001);
  assert.equal(reference.velocity, 0);
});

test('starts promptly, brakes before reversal and settles within 100ms', () => {
  const start = advanceMovement(704, 0, 1, .016, geometry);
  assert.ok(start.x > 704 && start.velocity < layout.walkingSpeed);
  const braking = advanceMovement(704, 270, -1, .016, geometry);
  assert.ok(braking.x > 704 && braking.velocity > 0 && braking.velocity < 270);
  assert.ok(advanceMovement(704, 270, -1, .1, geometry).velocity < 0);
  const stopped = advanceMovement(704, 270, 0, .1, geometry);
  assert.equal(stopped.velocity, 0);
  assert.ok(stopped.x - 704 < 10);
});

test('both edges stop movement even while input remains held', () => {
  for (const [x, direction] of [[76, -1], [3124, 1]]) {
    assert.deepEqual(advanceMovement(x, direction * 270, direction, .1, geometry), { x, velocity: 0 });
  }
});

test('camera follows gradually, ignores tiny shifts and stays in world bounds', () => {
  const right = followCamera(64, 704, 64, .016, geometry, false);
  assert.ok(right > 64 && right < 128);
  const reversed = followCamera(right, 704, -64, .016, geometry, false);
  assert.ok(Math.abs(reversed - right) < 20);
  assert.equal(followCamera(100, 694, 64, .016, geometry, false), 100);
  for (const x of [76, 3124]) {
    const camera = followCamera(100, x, 64, 1, geometry, false);
    assert.ok(camera >= 0 && camera <= 1920);
  }
  assert.equal(followCamera(100, 800, 64, .016, geometry, true), 160);
  let edge = 1800;
  for (let i = 0; i < 100; i++) edge = followCamera(edge, 3124, 64, .016, geometry, false);
  assert.ok(1920 - edge < .01);
});
