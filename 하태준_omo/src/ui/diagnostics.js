export function mountDiagnostics(root) {
  if (new URLSearchParams(location.search).get('diagnostics') !== '1') return { update() {}, destroy() {} };
  const element = document.createElement('output');
  element.className = 'diagnostics';
  element.dataset.testid = 'diagnostics';
  element.setAttribute('aria-hidden', 'true');
  root.append(element);
  return {
    update({ screen, run, snapshot, accidentElapsedMs = 0 }) {
      const s = snapshot || {};
      const data = { screen, workerX: s.x ?? 600, velocity: s.velocity ?? 0, paused: s.paused ?? true,
        nearestTarget: s.nearestTargetId || '', distance: s.distance ?? '', cameraX: s.cameraX ?? 0,
        frameId: s.frameId ?? 0, floorY: s.floorY ?? 620, sampleTime: performance.now(),
        leftSoleX: s.leftSole?.x ?? '', leftSoleY: s.leftSole?.y ?? '', rightSoleX: s.rightSole?.x ?? '', rightSoleY: s.rightSole?.y ?? '',
        attempts: run.attempts, rewinds: run.rewinds, accidentElapsedMs };
      for (const [key,value] of Object.entries(data)) element.dataset[key] = String(value);
      element.textContent = `${screen}  x:${Number(data.workerX).toFixed(1)}  v:${Number(data.velocity).toFixed(1)}  camera:${Number(data.cameraX).toFixed(1)}`;
    },
    destroy() { element.remove(); },
  };
}
