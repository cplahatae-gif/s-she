import { layout, clampX, nearestTarget } from './layout.mjs';
import { TARGETS } from '../scenario/scenario.mjs';

export async function mountStage(root, { onInspect, onFrame = () => {}, reducedMotion = false }) {
  if (!globalThis.Phaser) throw new Error('현장 엔진을 불러오지 못했습니다. 다시 시도하세요.');
  const host = document.createElement('div');
  host.className = 'stage-canvas-host';
  const controls = document.createElement('div');
  controls.className = 'field-controls';
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.testid = 'interaction-button';
  button.disabled = true;
  controls.append(button);
  const overlay = document.createElement('div');
  overlay.className = 'accident-layer';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '3', display: 'none' });
  root.append(host, controls, overlay);

  let game, scene, worker, belt, safetyGraphics, canvas;
  let x = layout.startX, velocity = 0, facing = 1, paused = true, cameraX = 0;
  let destroyed = false, safety = {}, accident = null, beltOffset = 0;
  let loadTimer;
  const keys = new Set();
  const clampCamera = value => Math.max(0, Math.min(layout.worldWidth - layout.width, value));
  const available = () => !destroyed && !paused && !document.hidden && root.contains(document.activeElement);
  function clearInput() { keys.clear(); velocity = 0; }
  function snapshot() {
    const nearest = nearestTarget(x);
    return { x, velocity, facing, paused, nearestTargetId: nearest.id, distance: nearest.distance,
      inRange: nearest.inRange, cameraX, frameId: 0, leftSole: null, rightSole: null, floorY: layout.floorY };
  }
  function refreshButton() {
    const nearest = nearestTarget(x);
    const label = `${TARGETS.find(target => target.id === nearest.id).title} 조사 [E]`;
    if (button.textContent !== label) button.textContent = label;
    button.disabled = destroyed || paused || document.hidden || !nearest.inRange;
  }
  function inspect() {
    const nearest = nearestTarget(x);
    if (available() && nearest.inRange) { clearInput(); onInspect(nearest.id); }
  }
  function keyDown(event) {
    if (!available() || (event.target !== canvas && event.target !== button)) return;
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    } else if (event.code === 'KeyE') {
      event.preventDefault();
      if (!event.repeat) inspect();
    }
  }
  function keyUp(event) { keys.delete(event.code); }
  function focusOut() { clearInput(); }
  function visibility() { clearInput(); refreshButton(); }

  function drawWorker() {
    worker.clear();
    worker.fillStyle(0x0b1215, 0.4).fillEllipse(x, layout.floorY + 3, 54, 14);
    worker.fillStyle(0xe0ae48).fillRoundedRect(x - 17, layout.floorY - 76, 34, 55, 5);
    worker.fillStyle(0xe8ddd0).fillCircle(x, layout.floorY - 91, 15);
    worker.fillStyle(0xf4c963).fillRoundedRect(x - 20, layout.floorY - 110, 40, 14, 4);
    worker.fillStyle(0x202b31).fillRect(x - 15, layout.floorY - 21, 12, 21).fillRect(x + 3, layout.floorY - 21, 12, 21);
    worker.fillStyle(0xfff0b5).fillTriangle(x + facing * 25, layout.floorY - 58, x + facing * 35, layout.floorY - 52, x + facing * 25, layout.floorY - 46);
  }
  function drawBelt() {
    belt.clear().fillStyle(0x1a2429).fillRect(160, 400, 770, 65);
    belt.lineStyle(3, 0x657278);
    for (let i = 0; i < 14; i++) {
      const bx = 170 + ((i * 55 + beltOffset) % 750);
      belt.lineBetween(bx, 414, bx + 25, 451);
    }
  }
  function drawSafety() {
    if (!safetyGraphics) return;
    const g = safetyGraphics.clear();
    const sx = layout.targets['energy-isolator'].standX;
    g.fillStyle(safety.isolated ? 0x8cccb0 : 0xd9a451).fillCircle(sx, 410, 12);
    if (safety.lockState === 'valid' || safety.lockState === 'wrong') {
      const lx = sx + (safety.lockState === 'valid' ? 12 : 95);
      const color = safety.lockState === 'valid' ? 0x8cccb0 : 0xe88671;
      g.lineStyle(5, color).strokeRoundedRect(lx - 9, 448, 18, 22, 7);
      g.fillStyle(color).fillRoundedRect(lx - 15, 463, 30, 25, 3);
      if (safety.lockState === 'wrong') g.lineStyle(3, 0x231d1b).lineBetween(lx - 7, 468, lx + 7, 482).lineBetween(lx + 7, 468, lx - 7, 482);
    }
    if (safety.tagged) g.fillStyle(0xf2e6c3).fillRect(sx + 37, 465, 23, 36);
  }
  function clearAccident() {
    if (accident) {
      accident.timers.forEach(clearTimeout);
      accident.resolve(false);
      accident = null;
    }
    overlay.style.display = 'none';
    scene?.cameras.main.resetFX();
    beltOffset = 0;
    if (belt && !destroyed) drawBelt();
  }
  function destroy() {
    if (destroyed) return;
    clearInput();
    clearAccident();
    destroyed = true;
    clearTimeout(loadTimer);
    root.removeEventListener('keydown', keyDown);
    root.removeEventListener('focusout', focusOut);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibility);
    button.removeEventListener('click', inspect);
    game?.destroy(true);
    host.remove(); controls.remove(); overlay.remove();
  }
  const controller = {
    snapshot,
    setPaused(value) { paused = Boolean(value); clearInput(); refreshButton(); },
    setPosition(position) {
      const nextX = clampX(position.x);
      if (position.facing !== undefined && position.facing !== -1 && position.facing !== 1) throw new TypeError('방향은 -1 또는 1이어야 합니다.');
      if (position.cameraX !== undefined && !Number.isFinite(position.cameraX)) throw new TypeError('카메라 위치는 유한한 숫자여야 합니다.');
      clearInput();
      x = nextX;
      facing = position.facing ?? facing;
      cameraX = clampCamera(position.cameraX ?? x - layout.width / 2);
      scene.cameras.main.scrollX = cameraX;
      drawWorker(); refreshButton();
    },
    reset() { clearAccident(); paused = true; safety = {}; controller.setPosition({ x: layout.startX, facing: 1, cameraX: 0 }); drawSafety(); },
    destroy,
    setReducedMotion(value) { reducedMotion = Boolean(value); if (reducedMotion) scene.cameras.main.resetFX(); },
    updateSafety(value) { safety = { ...value }; drawSafety(); },
    focus() { if (!destroyed) canvas.focus({ preventScroll: true }); },
    clearAccident,
    playAccident() {
      if (destroyed) return Promise.resolve(false);
      if (accident) return accident.promise;
      controller.setPaused(true);
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      const pending = { promise, resolve, timers: [] };
      accident = pending;
      overlay.style.display = 'block';
      overlay.style.background = 'rgba(132, 25, 19, 0.4)';
      if (!reducedMotion) scene.cameras.main.shake(350, 0.006);
      pending.timers.push(setTimeout(() => {
        if (!destroyed && accident === pending) overlay.style.background = 'rgba(6, 10, 12, 0.96)';
      }, reducedMotion ? 500 : 900));
      pending.timers.push(setTimeout(() => {
        if (destroyed || accident !== pending) return;
        pending.timers.forEach(clearTimeout);
        pending.resolve(true);
      }, reducedMotion ? 750 : 1100));
      return promise;
    },
  };

  try {
    await new Promise((resolve, reject) => {
      loadTimer = setTimeout(() => reject(new Error('현장 로딩 시간이 초과되었습니다. 다시 시도하세요.')), 15000);
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: host, width: layout.width, height: layout.height,
        backgroundColor: '#202b31', banner: false, audio: { noAudio: true },
        input: { keyboard: false },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: {
          create() {
            if (destroyed) return;
            scene = this;
            canvas = game.canvas;
            canvas.dataset.testid = 'stage-canvas';
            canvas.tabIndex = 0;
            canvas.setAttribute('aria-label', '현장 이동: 방향키 또는 A, D. 가까운 대상 조사: E');
            this.cameras.main.setBounds(0, 0, layout.worldWidth, layout.height);
            const g = this.add.graphics();
            g.fillStyle(0x28373e).fillRect(0, 115, layout.worldWidth, 470);
            g.fillStyle(0x35444a).fillRect(0, layout.floorY, layout.worldWidth, 100);
            for (let px = 80; px < layout.worldWidth; px += 320) {
              g.fillStyle(0x172328).fillRect(px, 110, 22, 480);
              g.lineStyle(2, 0x405058).lineBetween(px, 125, px + 280, 300);
            }
            g.fillStyle(0x465257).fillRect(0, 310, layout.worldWidth, 14);
            g.lineStyle(6, 0xb58b3e).lineBetween(0, 565, layout.worldWidth, 565);
            for (let px = 100; px < layout.worldWidth; px += 160) g.lineBetween(px, 565, px, 615);
            belt = this.add.graphics();
            drawBelt();
            for (const target of TARGETS) {
              const tx = layout.targets[target.id].standX;
              g.fillStyle(0x3f515a).fillRoundedRect(tx - 53, 380, 106, 155, 5);
              g.lineStyle(2, 0x9caeb3).strokeRect(tx - 40, 393, 80, 105);
              g.fillStyle(0xebc36a).fillRect(tx - 3, 589, 6, 23);
              this.add.text(tx, 345, target.title, { fontFamily: 'sans-serif', fontSize: '20px', color: '#e8ede9', backgroundColor: '#202b31', padding: { x: 12, y: 8 } }).setOrigin(0.5);
            }
            safetyGraphics = this.add.graphics();
            drawSafety();
            worker = this.add.graphics();
            drawWorker();
            this.add.text(28, 26, '현장 임시 도형 · 이동용 이미지 준비 중', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c7d1d3' }).setScrollFactor(0);
            root.addEventListener('keydown', keyDown);
            root.addEventListener('focusout', focusOut);
            window.addEventListener('keyup', keyUp);
            window.addEventListener('blur', clearInput);
            document.addEventListener('visibilitychange', visibility);
            button.addEventListener('click', inspect);
            refreshButton();
            clearTimeout(loadTimer);
            resolve();
          },
          update(time, delta) {
            if (destroyed || !worker) return;
            if (!available()) clearInput();
            const direction = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
            velocity = direction * 270;
            if (direction) facing = direction;
            const nextX = clampX(x + velocity * Math.min(delta, 50) / 1000);
            if (nextX === x) velocity = 0;
            x = nextX;
            if (velocity) cameraX = clampCamera(x - layout.width / 2);
            this.cameras.main.scrollX = cameraX;
            if (accident && !reducedMotion) { beltOffset = (beltOffset + delta * 0.18) % 750; drawBelt(); }
            drawWorker(); refreshButton(); onFrame(snapshot());
          },
        },
      });
    });
    return controller;
  } catch (error) { destroy(); throw error; }
}
