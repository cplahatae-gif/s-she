export const layout = Object.freeze({
  width: 1280,
  height: 720,
  minimumWorldWidth: 3200,
  floorRatio: 0.86,
  walkingSpeed: 270,
  strideLength: 180,
  interactionRadius: 180,
  workerHeightRatio: 0.43,
  edgeMargin: 76,
  startOffset: 230,
});

export function buildLayout(assets) {
  const background = assets.background;
  const floorY = layout.height * layout.floorRatio;
  const walklineV = background.walklineV;
  const backgroundScale = Math.max(
    layout.minimumWorldWidth / background.width,
    floorY / (background.height * walklineV),
    (layout.height - floorY) / (background.height * (1 - walklineV)),
  );
  const worldWidth = background.width * backgroundScale;
  const backgroundHeight = background.height * backgroundScale;
  const backgroundY = floorY - walklineV * backgroundHeight;
  const targets = Object.fromEntries(Object.entries(background.targets).map(([id, point]) => [id, {
    x: point.u * worldWidth,
    y: backgroundY + point.v * backgroundHeight,
  }]));
  const minX = layout.edgeMargin;
  const maxX = worldWidth - layout.edgeMargin;
  const clampX = (x) => Math.max(minX, Math.min(maxX, x));
  const accessX = targets['work-access'].x;
  const startX = clampX(Number.isFinite(background.startU) ? background.startU * worldWidth : accessX + layout.startOffset);
  const workerHeight = backgroundHeight * layout.workerHeightRatio;
  return { ...layout, worldWidth, backgroundScale, backgroundY, floorY, workerHeight, targets, minX, maxX, startX, clampX };
}
