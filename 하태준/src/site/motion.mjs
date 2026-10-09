export function advanceMovement(x, velocity, direction, seconds, geometry) {
  let remaining = seconds;
  while (remaining > 1e-8) {
    const reversing = direction !== 0 && velocity * direction < 0;
    const target = reversing ? 0 : direction * geometry.walkingSpeed;
    const rate = reversing || direction === 0 ? geometry.braking : geometry.acceleration;
    const rampTime = Math.min(remaining, Math.abs(target - velocity) / rate);
    const acceleration = Math.sign(target - velocity) * rate;
    x += velocity * rampTime + acceleration * rampTime * rampTime / 2;
    velocity += acceleration * rampTime;
    remaining -= rampTime;
    if (Math.abs(velocity - target) < 1e-7) velocity = target;
    if (!reversing) { x += velocity * remaining; remaining = 0; }
  }
  const clamped = geometry.clampX(x);
  if (clamped !== x || clamped === geometry.minX || clamped === geometry.maxX) velocity = 0;
  return { x: clamped, velocity };
}

export function followCamera(cameraX, x, lookAhead, seconds, geometry, reducedMotion) {
  const clamp = value => Math.max(0, Math.min(geometry.worldWidth - geometry.width, value));
  if (reducedMotion) return clamp(x - geometry.width / 2);
  const target = clamp(x - geometry.width / 2 + lookAhead);
  const difference = target - cameraX;
  const deadzone = target === 0 || target === geometry.worldWidth - geometry.width ? 0 : geometry.cameraDeadzone;
  const overflow = Math.sign(difference) * Math.max(0, Math.abs(difference) - deadzone);
  return clamp(cameraX + overflow * (1 - Math.exp(-geometry.cameraFollowRate * seconds)));
}
