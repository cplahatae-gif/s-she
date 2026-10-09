export const layout = Object.freeze({
  width: 1280,
  height: 720,
  minimumWorldWidth: 3200,
  floorRatio: 0.86,
  walkingSpeed: 200,
  strideLength: 260,
  interactionRadius: 220,
  workerHeightRatio: 0.347,
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
  const targetPoints = { ...background.targets, control: { u: 0.42, v: 0.60 }, 'energy-isolator': { u: 0.855, v: 0.57 }, 'work-access': { u: 0.16, v: 0.65 } };
  const targets = Object.fromEntries(Object.entries(targetPoints).map(([id, point]) => [id, {
    x: point.u * worldWidth,
    y: backgroundY + point.v * backgroundHeight,
  }]));
  const minX = layout.edgeMargin;
  const maxX = worldWidth - layout.edgeMargin;
  const clampX = (x) => Math.max(minX, Math.min(maxX, x));
  const startX = clampX(targets.control.x);
  const workerHeight = backgroundHeight * layout.workerHeightRatio;
  return { ...layout, worldWidth, backgroundScale, backgroundY, floorY, workerHeight, targets, minX, maxX, startX, clampX };
}
