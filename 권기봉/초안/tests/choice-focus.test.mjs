import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceView } from '../src/choice-focus.mjs';
const geometry = Object.freeze({ width: 1280, height: 720, worldWidth: 3200, workerHeight: 370 });

test('choice presentation leaves world position, facing, gait and safety untouched', () => {
  const safety = Object.freeze({ stopped: true, isolated: true, locked: true });
  const position = Object.freeze({ x: 2736, facing: -1, distance: 526, safety, cameraX: 1920, cameraZoom: 1, scrollY: 0 });
  const expected = { ...position };
  for (const ms of [0, 100, 340, 1500, 4000]) choiceView(position, geometry, ms);
  assert.deepEqual(position, expected);
  const view = choiceView(position, geometry, 340);
  const screenX = (position.x - view.cameraX - geometry.width / 2) * view.zoom + geometry.width / 2;
  assert.ok(Math.abs(screenX - geometry.width * .28) < .001);
  assert.ok(view.renderedHeight > 530 && view.renderedHeight < 540);
});

test('focus eases from the previous camera and remains bounded near world edges', () => {
  const position = { x: 1344, cameraX: 704, cameraZoom: 1.18, scrollY: 110 };
  const start = choiceView(position, geometry, 0);
  assert.equal(start.cameraX, 704); assert.equal(start.zoom, 1.18); assert.equal(start.scrollY, 110);
  const middle = choiceView(position, geometry, 170), end = choiceView(position, geometry, 340);
  assert.ok(middle.cameraX > start.cameraX && middle.cameraX < end.cameraX);
  for (const x of [76, 3124]) for (const ms of [0, 340, 10000]) {
    const view = choiceView({ ...position, x }, geometry, ms);
    assert.ok(view.cameraX >= 0 && view.cameraX <= geometry.worldWidth);
  }
});

test('reduced motion keeps front presentation stable without zoom or breathing', () => {
  const position = { x: 512, cameraX: 0, cameraZoom: 1, scrollY: 0 };
  const still = choiceView(position, geometry, 0, true);
  assert.equal(still.zoom, 1); assert.equal(still.bodyScale, 1.25); assert.equal(still.waitingMotion, 'still');
  for (const ms of [340, 1000, 5000]) assert.deepEqual(choiceView(position, geometry, ms, true), still);
});
