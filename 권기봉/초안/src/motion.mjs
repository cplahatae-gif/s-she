export const motionConfig = Object.freeze({ speed: 200, acceleration: 1200, braking: 2400, stride: 260, frames: 8 });

export function createMotion(x, facing = -1) {
  return { x, velocity: 0, facing, distance: 0, queue: 0, frame: -1 };
}

export function clearMotion(state) {
  state.velocity = 0;
  state.queue = 0;
  state.frame = -1;
}

export function queueTap(state, direction, distance = 60) {
  const amount = Math.sign(direction) * Math.min(120, Math.abs(distance));
  state.queue = Math.max(-180, Math.min(180, state.queue + amount));
}

const approach = (value, target, amount) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

// A reversal spends its first integration slice braking. Facing follows actual velocity.
// Short taps use a finite travel budget; frames are selected only from actual distance.
export function advanceMotion(state, input, seconds, bounds, config = motionConfig) {
  let remaining = Math.max(0, Math.min(0.05, seconds));
  let moved = 0;
  while (remaining > 0.000001) {
    const dt = Math.min(remaining, 1 / 240);
    remaining -= dt;
    const queued = !input && Math.abs(state.queue) > 0.001;
    const direction = input || (queued ? Math.sign(state.queue) : 0);
    const reversing = direction && state.velocity * direction < 0;
    const desired = reversing ? 0 : direction * config.speed;
    // Brake early enough to consume a queued tap without overshooting its endpoint.
    const targetSpeed = queued && !reversing ? direction * Math.min(config.speed, Math.sqrt(2 * config.braking * Math.abs(state.queue))) : desired;
    state.velocity = approach(state.velocity, targetSpeed, (reversing || !direction || Math.abs(targetSpeed) < Math.abs(state.velocity) ? config.braking : config.acceleration) * dt);
    let step = state.velocity * dt;
    if (queued && Math.sign(step) === Math.sign(state.queue)) step = Math.sign(step) * Math.min(Math.abs(step), Math.abs(state.queue));
    const nextX = Math.max(bounds.minX, Math.min(bounds.maxX, state.x + step));
    const actual = nextX - state.x;
    state.x = nextX;
    moved += Math.abs(actual);
    state.distance += Math.abs(actual);
    if (Math.abs(actual) > 0.000001) state.facing = Math.sign(actual);
    if (queued && Math.sign(actual) === Math.sign(state.queue)) {
      state.queue -= actual;
      if (Math.abs(state.queue) < 0.001) { state.queue = 0; state.velocity = 0; }
    }
    if (Math.abs(actual - step) > 0.000001 || (state.x === bounds.minX && direction < 0) || (state.x === bounds.maxX && direction > 0)) clearMotion(state);
  }
  state.frame = moved > 0.0001 ? Math.floor(state.distance / (config.stride / config.frames)) % config.frames : -1;
  return moved;
}

// Automatic interaction walks use a remaining-distance budget and gentler braking.
export function advanceTo(state, destination, seconds, bounds, config = motionConfig) {
  const target = Math.max(bounds.minX, Math.min(bounds.maxX, destination));
  state.queue = target - state.x;
  return advanceMotion(state, 0, seconds, bounds, { ...config, braking: 900 });
}

export function advanceCamera(cameraX, x, velocity, seconds, width, worldWidth) {
  const lead = Math.max(-64, Math.min(64, velocity * 0.32));
  const offset = x + lead - (cameraX + width * 0.5);
  const deadzone = 42;
  const target = Math.max(0, Math.min(worldWidth - width, Math.abs(offset) <= deadzone ? cameraX : cameraX + offset - Math.sign(offset) * deadzone));
  const next = cameraX + (target - cameraX) * (1 - Math.exp(-5.5 * Math.min(0.05, Math.max(0, seconds))));
  return Math.max(0, Math.min(worldWidth - width, next));
}
