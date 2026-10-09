import test from 'node:test';
import assert from 'node:assert/strict';
import { layout, clampX, distanceToTarget, nearestTarget } from '../src/site/layout.mjs';

test('L01 start is inside world and outside access interaction radius', () => {
  assert.ok(layout.startX > layout.minX && layout.startX < layout.maxX);
  assert.ok(distanceToTarget(layout.startX, 'work-access') > layout.interactionRadius);
});
test('L02 all standpoints are inside world; boundaries clamp movement', () => {
  for (const point of Object.values(layout.targets)) assert.ok(point.standX > layout.minX && point.standX < layout.maxX);
  assert.equal(clampX(-500), layout.minX);
  assert.equal(clampX(9000), layout.maxX);
});
test('L03 target interaction regions never overlap', () => {
  const positions = Object.values(layout.targets).map(t => t.standX).sort((a,b) => a-b);
  for (let i=1;i<positions.length;i++) assert.ok(positions[i]-positions[i-1]>layout.interactionRadius*2);
});
test('L04 exact interaction boundary is allowed; one pixel outside is denied', () => {
  assert.equal(nearestTarget(420 + 140).inRange, true);
  assert.equal(nearestTarget(420 + 141).inRange, false);
  assert.equal(nearestTarget(2800).id, 'energy-isolator');
});
test('L05 malformed coordinates and unknown IDs are rejected without changing layout', () => {
  const before = structuredClone(layout);
  for (const x of [NaN, Infinity, -Infinity, null, '420', {}, undefined]) {
    assert.throws(() => distanceToTarget(x, 'work-access'), TypeError);
    assert.throws(() => clampX(x), TypeError);
  }
  for (const id of [null, {}, 2, undefined]) assert.throws(() => distanceToTarget(420,id),TypeError);
  for (const id of ['', 'constructor', '__proto__', '<img>']) assert.throws(() => distanceToTarget(420,id),RangeError);
  assert.deepEqual(layout,before);
});
test('L06 logical geometry stays immutable independently of display resizing', () => {
  assert.equal(layout.width,1280);
  assert.equal(layout.height,720);
  assert.throws(() => { layout.width=1024; },TypeError);
  assert.throws(() => { layout.targets['work-access'].standX=0; },TypeError);
  assert.equal(distanceToTarget(600,'work-access'),180);
});
