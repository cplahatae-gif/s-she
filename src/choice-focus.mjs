// Presentation only: this function never advances the worker or safety state.
export function choiceView(position, geometry, elapsedMs, reducedMotion = false) {
  const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, elapsedMs / 340));
  const ease = progress * progress * (3 - 2 * progress);
  const targetZoom = reducedMotion ? 1 : 1.16;
  const zoom = position.cameraZoom + (targetZoom - position.cameraZoom) * ease;
  // Phaser zooms about the camera center, so compensate to place the feet at 28%.
  const targetX = Math.max(0, Math.min(geometry.worldWidth, position.x - geometry.width / 2 + geometry.width * .22 / targetZoom));
  const cameraX = position.cameraX + (targetX - position.cameraX) * ease;
  const breath = reducedMotion || elapsedMs < 340 ? 0 : Math.sin((elapsedMs - 340) / 3000 * Math.PI * 2) * .003;
  const bodyScale = 1 + .25 * ease + breath;
  return { cameraX, zoom, scrollY: (position.scrollY || 0) * (1 - ease), bodyScale, renderedHeight: geometry.workerHeight * bodyScale * zoom, waitingMotion: reducedMotion ? 'still' : 'breathing' };
}
