import { buildLayout } from './layout.mjs';
import { advanceMovement, followCamera } from './motion.mjs';

const assetUrl = (file) => new URL(`../../assets/${file}`, import.meta.url).href;
const names = { 'control-panel': '조작반', 'verification-point': '차단 확인 지점', 'work-access': '점검구', 'energy-isolator': '에너지 차단·잠금 지점' };

export async function mountStage(root, { onInspect, onPosition = () => {}, reducedMotion = false }) {
  const response = await fetch(assetUrl('assets.json'), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('현장 이미지 정보를 읽을 수 없습니다.');
  const assets = await response.json();
  const geometry = buildLayout(assets);
  const Phaser = window.Phaser;
  if (!Phaser) throw new Error('Phaser 현장 엔진을 불러오지 못했습니다.');
  const shell = document.createElement('div');
  shell.className = 'draft-stage';
  shell.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#242b2c';
  const canvasHost = document.createElement('div');
  canvasHost.className = 'stage-canvas';
  canvasHost.style.cssText = 'position:absolute;inset:0';
  const controls = document.createElement('div');
  controls.className = 'stage-controls';
  controls.style.cssText = 'position:absolute;display:flex;align-items:end;gap:12px;pointer-events:none;z-index:2';
  const button = (label, className, text) => {
    const element = document.createElement('button');
    element.type = 'button'; element.className = className;
    element.setAttribute('aria-label', label); element.textContent = text;
    element.style.cssText = 'pointer-events:auto;min-width:54px;min-height:48px;touch-action:none';
    return element;
  };
  const left = button('왼쪽 이동', 'stage-move-left', '←');
  const inspect = button('가까운 대상 조사', 'stage-interact', '가까운 대상 조사 [E]');
  const right = button('오른쪽 이동', 'stage-move-right', '→');
  controls.append(left, inspect, right); shell.append(canvasHost, controls); root.append(shell);
  const accidentLayer = document.createElement('div');
  accidentLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0';
  accidentLayer.setAttribute('aria-hidden', 'true'); shell.append(accidentLayer);
  let scene, character, shadow, markers, lockLabel, game, destroyed = false, paused = false, accident = false, loadFailed = false;
  let x = geometry.startX, facing = 'left', distanceWalked = 0, safety = {}, accidentResolve;
  let velocity = 0, lastUpdateTime = null, tapDirection = 0, tapRemaining = 0, lookAhead = 0;
  let cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, x - geometry.width / 2));
  let lastPosition = '', readyResolve, readyReject, accidentPromise;
  const keys = new Set(), pointers = new Map(), pointerStarts = new Map(), disposers = [], timers = new Set();
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    disposers.push(() => target.removeEventListener(event, handler));
  };
  const clearInput = () => {
    keys.clear(); pointers.clear(); pointerStarts.clear();
    velocity = 0; tapRemaining = 0; lastUpdateTime = null;
  };
  const available = () => !destroyed && !paused && !accident && !document.hidden;
  const nearest = () => Object.entries(geometry.targets).map(([id, point]) => ({ id, distance: Math.abs(point.x - x) }))
    .sort((a, b) => a.distance - b.distance)[0];
  const publish = (force = false) => {
    if (destroyed) return;
    const target = nearest();
    inspect.disabled = !available() || target.distance > geometry.interactionRadius;
    inspect.textContent = target.distance <= geometry.interactionRadius ? `${names[target.id]} 조사 [E]` : '대상 가까이 이동하세요';
    left.disabled = right.disabled = !available();
    const next = `${Math.round(x)}:${target.id}:${Math.round(target.distance)}`;
    if (force || next !== lastPosition) {
      lastPosition = next; onPosition({ x, nearestTargetId: target.id, distance: target.distance, inRange: target.distance <= geometry.interactionRadius });
    }
  };
  const inspectNearest = () => {
    const target = nearest();
    if (available() && target.distance <= geometry.interactionRadius) { clearInput(); onInspect(target.id); }
  };
  const scoped = () => root.contains(document.activeElement);
  listen(window, 'keydown', (event) => {
    if (!available() || !scoped() || event.target.matches('input,textarea,select,[contenteditable]')) return;
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); inspectNearest(); }
  });
  listen(window, 'keyup', (event) => keys.delete(event.code));
  listen(window, 'blur', clearInput);
  listen(document, 'visibilitychange', clearInput);
  listen(shell, 'focusout', (event) => { if (!shell.contains(event.relatedTarget)) clearInput(); });
  listen(inspect, 'click', inspectNearest);
  for (const [element, direction] of [[left, -1], [right, 1]]) {
    const step = () => {
      if (!available()) return;
      clearInput(); tapDirection = direction; tapRemaining = .24;
    };
    listen(element, 'pointerdown', (event) => {
      if (!available()) return;
      event.preventDefault(); element.setPointerCapture(event.pointerId); pointers.set(event.pointerId, direction);
      pointerStarts.set(event.pointerId, x);
      game.canvas.focus({ preventScroll: true });
    });
    listen(element, 'pointerup', (event) => {
      const startX = pointerStarts.get(event.pointerId);
      pointers.delete(event.pointerId); pointerStarts.delete(event.pointerId);
      if (startX !== undefined && Math.abs(x - startX) < 1) step();
    });
    for (const event of ['pointercancel', 'lostpointercapture']) listen(element, event, (e) => {
      pointers.delete(e.pointerId); pointerStarts.delete(e.pointerId);
    });
    listen(element, 'click', (event) => { if (event.detail === 0) step(); });
  }
  const paintCharacter = (moving = false) => {
    if (!character) return;
    if (!moving) distanceWalked = 0;
    // shortcut: these five poses lack continuous planted-foot transitions; replace the sheet before certifying foot slip.
    const walkingFrames = [1, 2, 3, 4, 5];
    const frameIndex = moving ? walkingFrames[Math.floor(distanceWalked / (geometry.strideLength / walkingFrames.length)) % walkingFrames.length] : 0;
    const frame = assets.worker.frames[frameIndex];
    const flipped = facing !== (assets.worker.facing || 'right');
    character.setFrame(String(frameIndex)).setFlipX(flipped)
      .setScale(geometry.workerHeight / frame.bbox.height)
      .setOrigin((flipped ? frame.width - frame.footX : frame.footX) / frame.width, frame.footY / frame.height)
      .setPosition(x, geometry.floorY);
    shadow.setPosition(x, geometry.floorY + 2);
  };
  const paintCamera = (seconds = 0) => {
    if (!scene) return;
    if (Math.abs(velocity) > .1) lookAhead += (Math.sign(velocity) * geometry.cameraLookAhead - lookAhead) * (1 - Math.exp(-6 * seconds));
    cameraX = followCamera(cameraX, x, lookAhead, seconds, geometry, reducedMotion);
    scene.cameras.main.setScroll(cameraX, 0);
  };
  const paintSafety = () => {
    if (!markers) return;
    markers.clear();
    const point = geometry.targets['energy-isolator'];
    const misplaced = safety.lockPresent && !safety.locked;
    const lockPoint = misplaced ? { x: point.x + 80, y: point.y + 70 } : point;
    lockLabel.setPosition(lockPoint.x, lockPoint.y + 42).setVisible(Boolean(misplaced));
    if (safety.lockPresent || safety.locked) {
      markers.lineStyle(4, 0xeec7bb).strokeRoundedRect(lockPoint.x - 10, lockPoint.y - 10, 18, 19, 7);
      markers.fillStyle(0xb92822).fillRoundedRect(lockPoint.x - 15, lockPoint.y + 2, 28, 28, 4);
      if (safety.locked) markers.fillStyle(0x252a2c).fillCircle(lockPoint.x - 1, lockPoint.y + 13, 3);
    }
    if (safety.tagged) {
      markers.lineStyle(2, 0xe7d59b).lineBetween(point.x + 10, point.y, point.x + 26, point.y + 9);
      markers.fillStyle(0xf5ce59).fillRoundedRect(point.x + 18, point.y + 8, 27, 40, 3);
      markers.lineStyle(2, 0x69541e).lineBetween(point.x + 24, point.y + 24, point.x + 38, point.y + 24);
    }
  };
  const schedule = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, delay); timers.add(timer);
  };
  const clearAccident = () => {
    for (const timer of timers) clearTimeout(timer); timers.clear();
    accidentLayer.style.transition = 'none'; accidentLayer.style.opacity = '0';
    scene?.cameras.main.resetFX(); accident = false;
    accidentResolve?.(); accidentResolve = undefined; accidentPromise = undefined; clearInput(); publish();
  };
  const controller = {
    setPaused(value) { paused = Boolean(value); clearInput(); paintCharacter(); publish(); },
    setReducedMotion(value) { reducedMotion = Boolean(value); if (reducedMotion) scene?.cameras.main.resetFX(); paintCharacter(); },
    snapshot: () => ({ x, facing, cameraX, lookAhead }),
    restore(position) {
      clearInput(); x = geometry.clampX(Number.isFinite(position.x) ? position.x : geometry.startX);
      facing = position.facing === 'right' ? 'right' : 'left'; distanceWalked = 0;
      lookAhead = Number.isFinite(position.lookAhead) ? position.lookAhead : 0;
      cameraX = Number.isFinite(position.cameraX) ? Math.max(0, Math.min(geometry.worldWidth - geometry.width, position.cameraX)) : Math.max(0, Math.min(geometry.worldWidth - geometry.width, x - geometry.width / 2));
      paintCharacter(); paintCamera(); publish(true);
    },
    reset() {
      clearAccident(); paused = false; safety = {}; distanceWalked = 0; x = geometry.startX; facing = 'left'; lookAhead = 0;
      cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, x - geometry.width / 2));
      paintSafety(); paintCharacter(); paintCamera(); publish(true);
    },
    updateSafety(value) { safety = { ...value }; paintSafety(); },
    playAccident() {
      if (destroyed) return Promise.resolve();
      if (accidentPromise) return accidentPromise;
      accident = true; clearInput(); paintCharacter(); publish();
      accidentPromise = new Promise((resolve) => { accidentResolve = resolve; });
      accidentLayer.style.background = '#b72e16'; accidentLayer.style.opacity = reducedMotion ? '.55' : '.4';
      if (!reducedMotion) {
        scene.cameras.main.shake(600, 0.008);
        schedule(() => { if (!reducedMotion) accidentLayer.style.opacity = '.08'; }, 180);
        schedule(() => { if (!reducedMotion) accidentLayer.style.opacity = '.45'; }, 350);
      }
      schedule(() => {
        accidentLayer.style.background = '#070809'; accidentLayer.style.transition = 'opacity 420ms linear'; accidentLayer.style.opacity = '1';
        schedule(() => { accidentResolve?.(); accidentResolve = undefined; }, 460);
      }, 650);
      return accidentPromise;
    },
    clearAccident,
    destroy() {
      if (destroyed) return;
      destroyed = true; clearAccident(); clearInput(); disposers.forEach((dispose) => dispose());
      game.destroy(true); shell.remove();
    },
  };
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const loadingTimeout = setTimeout(() => readyReject(new Error('현장 로딩 시간이 초과됐습니다. 다시 불러오세요.')), 15000);
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: canvasHost, width: geometry.width, height: geometry.height,
    backgroundColor: '#242b2c', audio: { noAudio: true }, input: { keyboard: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: {
      preload() {
        this.load.image('site-background', assetUrl(assets.background.file));
        this.load.image('site-worker', assetUrl(assets.worker.file));
        this.load.once('loaderror', () => { loadFailed = true; readyReject(new Error('현장 이미지 파일을 불러오지 못했습니다.')); });
      },
      create() {
        if (loadFailed || destroyed) return;
        scene = this;
        this.add.image(0, geometry.backgroundY, 'site-background').setOrigin(0).setScale(geometry.backgroundScale);
        const texture = this.textures.get('site-worker');
        assets.worker.frames.forEach((frame, index) => texture.add(String(index), 0, frame.x, frame.y, frame.width, frame.height));
        shadow = this.add.ellipse(x, geometry.floorY + 2, 100, 15, 0x141918, 0.28);
        character = this.add.image(x, geometry.floorY, 'site-worker', '0').setScale(geometry.workerHeight / assets.worker.standingHeight);
        for (const [id, point] of Object.entries(geometry.targets)) {
          if (id === 'control-panel' || id === 'verification-point') {
            const box = this.add.graphics();
            box.fillStyle(0x3a4244).fillRoundedRect(point.x - 44, point.y - 25, 88, 100, 5);
            box.lineStyle(3, 0xc4b77f).strokeRoundedRect(point.x - 44, point.y - 25, 88, 100, 5);
            box.fillStyle(id === 'control-panel' ? 0xe3c04f : 0xc1cebf).fillCircle(point.x, point.y + 15, 10);
          }
          this.add.text(point.x, point.y - 70, names[id], { fontFamily: 'sans-serif', fontSize: '18px', color: '#fff9e7', backgroundColor: '#242b2ce0', padding: { x: 10, y: 6 } }).setOrigin(0.5, 1);
        }
        markers = this.add.graphics();
        lockLabel = this.add.text(0, 0, '잘못된 체결', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffc6bb', backgroundColor: '#432c29e8', padding: { x: 7, y: 4 } }).setOrigin(0.5, 0).setVisible(false);
        this.cameras.main.setBounds(0, 0, geometry.worldWidth, geometry.height);
        game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', '컨베이어 현장. 방향키 또는 A D로 이동, E로 가까운 대상 조사');
        listen(game.canvas, 'pointerdown', () => game.canvas.focus({ preventScroll: true }));
        paintSafety(); paintCharacter(); paintCamera(); publish(true); readyResolve(controller);
      },
      update(time, delta) {
        if (!available()) { lastUpdateTime = null; return; }
        const seconds = Math.min(lastUpdateTime === null ? delta : time - lastUpdateTime, 100) / 1000;
        lastUpdateTime = time;
        const leftHeld = keys.has('ArrowLeft') || keys.has('KeyA') || [...pointers.values()].includes(-1);
        const rightHeld = keys.has('ArrowRight') || keys.has('KeyD') || [...pointers.values()].includes(1);
        if (leftHeld || rightHeld) tapRemaining = 0;
        const direction = Number(rightHeld) - Number(leftHeld) || (tapRemaining > 0 ? tapDirection : 0);
        tapRemaining = Math.max(0, tapRemaining - seconds);
        const next = advanceMovement(x, velocity, direction, seconds, geometry);
        const moved = Math.abs(next.x - x);
        if (Math.abs(next.velocity) > .1) facing = next.velocity > 0 ? 'right' : 'left';
        x = next.x; velocity = next.velocity; distanceWalked += moved;
        paintCharacter(moved > .01); paintCamera(seconds); publish();
      },
    },
  });
  try { return await ready; } catch (error) { controller.destroy(); throw error; }
  finally { clearTimeout(loadingTimeout); }
}
