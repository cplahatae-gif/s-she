const targets = Object.freeze(Object.fromEntries([
  ['work-access', 420], ['control-panel', 1200],
  ['verification-point', 2000], ['energy-isolator', 2800],
].map(([id, standX]) => [id, Object.freeze({ standX })])));

export const layout = Object.freeze({
  width: 1280, height: 720, worldWidth: 3200, floorY: 620,
  minX: 76, maxX: 3124, startX: 600, interactionRadius: 140, targets,
});

function finiteX(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new TypeError('위치는 유한한 숫자여야 합니다.');
}

export function clampX(x) {
  finiteX(x);
  return Math.max(layout.minX, Math.min(layout.maxX, x));
}

export function distanceToTarget(x, id) {
  finiteX(x);
  if (typeof id !== 'string') throw new TypeError('대상 식별자는 문자열이어야 합니다.');
  if (!Object.hasOwn(targets, id)) throw new RangeError('알 수 없는 조사 대상입니다.');
  return Math.abs(x - targets[id].standX);
}

export function nearestTarget(x) {
  finiteX(x);
  const [id] = Object.keys(targets).sort((a, b) => distanceToTarget(x, a) - distanceToTarget(x, b));
  const distance = distanceToTarget(x, id);
  return { id, distance, inRange: distance <= layout.interactionRadius };
}
