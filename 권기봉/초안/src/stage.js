import { buildLayout } from './layout.mjs';
import { createMotion, clearMotion, queueTap, advanceMotion, advanceCamera } from './motion.mjs';

const assetUrl = (file) => new URL(`../assets/${file}`, import.meta.url).href;
const names = { control: '조작반 · 오퍼레이터 연락', 'work-access': '컨베이어 이물질 제거', 'energy-isolator': 'MCC 판넬 · 개인잠금' };

export async function mountStage(root, { onInspect, onPosition = () => {}, reducedMotion = false }) {
  const response = await fetch(assetUrl('assets.json'));
  if (!response.ok) throw new Error('현장 이미지 정보를 읽을 수 없습니다.');
  const assets = await response.json();
  const geometry = buildLayout(assets);
  const walk = assets.worker.walk || assets.worker;
  const idle = assets.worker.idle || { file: assets.worker.file, frame: assets.worker.frames[0] };
  const walkFrames = walk.frames.filter((frame) => frame.pose !== 'idle');
  if (!walkFrames.length) throw new Error('걷기 자세 이미지가 없습니다.');
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
  let scene, character, shadow, markers, objectiveMarker, actionGraphics, actionText, stateText, lockLabel, game;
  let destroyed = false, paused = false, accident = false, loadFailed = false;
  const motion = createMotion(geometry.startX, -1);
  let cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, motion.x - geometry.width / 2));
  let safety = {}, objective = 'control', action, actionGeneration = 0, accidentResolve, accidentPromise;
  let lastPosition = '', readyResolve, readyReject;
  const keys = new Map(), pointers = new Map(), disposers = [], timers = new Set();
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    disposers.push(() => target.removeEventListener(event, handler));
  };
  const clearInput = () => { keys.clear(); pointers.clear(); clearMotion(motion); };
  const available = () => !destroyed && !paused && !accident && !action && !document.hidden;
  const nearest = () => Object.entries(geometry.targets).map(([id, point]) => ({ id, distance: Math.abs(point.x - motion.x) })).sort((a, b) => a.distance - b.distance)[0];
  const publish = (force = false) => {
    if (destroyed) return;
    const target = nearest();
    inspect.disabled = !available() || target.distance > geometry.interactionRadius;
    inspect.textContent = target.distance <= geometry.interactionRadius ? `${names[target.id]} 조사 [E]` : '대상 가까이 이동하세요';
    left.disabled = right.disabled = !available();
    const next = `${Math.round(motion.x)}:${target.id}:${Math.round(target.distance)}:${Math.round(motion.velocity)}:${motion.facing}:${motion.frame}:${Math.round(cameraX)}`;
    if (force || next !== lastPosition) {
      lastPosition = next;
      onPosition({ x: motion.x, nearestTargetId: target.id, distance: target.distance, inRange: target.distance <= geometry.interactionRadius, velocity: motion.velocity, facing: motion.facing > 0 ? 'right' : 'left', frame: motion.frame < 0 ? 'idle' : motion.frame, cameraX, floorY: geometry.floorY });
    }
  };
  const inspectNearest = () => {
    const target = nearest();
    if (available() && target.distance <= geometry.interactionRadius) { clearInput(); paintCharacter(); onInspect(target.id); }
  };
  const scoped = () => root.contains(document.activeElement);
  const keyDirection = (code) => ['ArrowLeft', 'KeyA'].includes(code) ? -1 : ['ArrowRight', 'KeyD'].includes(code) ? 1 : 0;
  listen(window, 'keydown', (event) => {
    if (!available() || !scoped() || event.target.matches('input,textarea,select,[contenteditable]')) return;
    if (keyDirection(event.code)) {
      event.preventDefault();
      if (!keys.has(event.code)) { motion.queue = 0; keys.set(event.code, { direction: keyDirection(event.code), x: motion.x, time: performance.now() }); }
    }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); inspectNearest(); }
  });
  listen(window, 'keyup', (event) => {
    const press = keys.get(event.code); keys.delete(event.code);
    if (press && available() && performance.now() - press.time < 90 && Math.abs(motion.x - press.x) < 3) queueTap(motion, press.direction, 12);
  });
  const stopInput = () => { clearInput(); paintCharacter(); publish(true); };
  listen(window, 'blur', stopInput);
  listen(document, 'visibilitychange', stopInput);
  listen(shell, 'focusout', (event) => { if (!shell.contains(event.relatedTarget)) stopInput(); });
  listen(inspect, 'click', inspectNearest);
  for (const [element, direction] of [[left, -1], [right, 1]]) {
    listen(element, 'pointerdown', (event) => {
      if (!available()) return;
      event.preventDefault(); element.setPointerCapture(event.pointerId); motion.queue = 0;
      pointers.set(event.pointerId, { direction, x: motion.x, time: performance.now() });
      game.canvas.focus({ preventScroll: true });
    });
    listen(element, 'pointerup', (event) => {
      const press = pointers.get(event.pointerId); pointers.delete(event.pointerId);
      if (press && available() && Math.abs(motion.x - press.x) < 3 && performance.now() - press.time < 180) queueTap(motion, direction);
    });
    for (const event of ['pointercancel', 'lostpointercapture']) listen(element, event, (e) => {
      if (pointers.has(e.pointerId)) { pointers.delete(e.pointerId); clearMotion(motion); }
    });
    listen(element, 'click', (event) => { if (event.detail === 0 && available()) queueTap(motion, direction); });
  }
  const paintCharacter = () => {
    if (!character) return;
    const moving = motion.frame >= 0;
    const frame = moving ? walkFrames[motion.frame] : idle.frame;
    const flipped = (motion.facing > 0 ? 'right' : 'left') !== (walk.facing || 'right');
    const bodyX = frame.anchorX ?? frame.bodyX ?? (frame.bbox ? frame.bbox.x + frame.bbox.width / 2 : frame.width / 2);
    const groundY = frame.footY ?? frame.groundY;
    const bodyHeight = frame.bodyHeight ?? frame.bbox?.height ?? walk.standingHeight;
    character.setTexture(moving ? 'site-worker-walk' : 'site-worker-idle', moving ? String(motion.frame) : 'idle').setFlipX(flipped)
      .setScale(geometry.workerHeight / bodyHeight)
      .setOrigin((flipped ? frame.width - bodyX : bodyX) / frame.width, groundY / frame.height)
      .setPosition(motion.x, geometry.floorY);
    shadow.setPosition(motion.x, geometry.floorY + 2);
    scene.cameras.main.setScroll(cameraX, 0);
  };
  const paintObjective = () => {
    if (!objectiveMarker) return;
    objectiveMarker.clear();
    const point = geometry.targets[objective];
    if (!point) return;
    objectiveMarker.lineStyle(3, 0xf2d278, 0.95).strokeCircle(point.x, point.y, 40);
    objectiveMarker.fillStyle(0xf2d278).fillTriangle(point.x - 8, point.y - 60, point.x + 8, point.y - 60, point.x, point.y - 48);
  };
  const paintSafety = () => {
    if (!markers) return;
    markers.clear();
    const point = geometry.targets['energy-isolator'], control = geometry.targets.control, access = geometry.targets['work-access'];
    markers.fillStyle(0x303a3b).fillRoundedRect(control.x - 25, control.y - 30, 50, 64, 5);
    markers.lineStyle(2, 0xafbab3).strokeRoundedRect(control.x - 25, control.y - 30, 50, 64, 5);
    markers.fillStyle(safety.stopped || safety.stopConfirmed ? 0x628c67 : 0xc94c37).fillCircle(control.x, control.y + 8, 10);
    markers.fillStyle(safety.stopped || safety.stopConfirmed ? 0xa3d496 : 0xe3b65e).fillCircle(control.x + 12, control.y - 17, 4);
    const misplaced = safety.lockPresent && !safety.locked;
    const lockPoint = misplaced ? { x: point.x + 110, y: point.y + 60 } : point;
    lockLabel.setPosition(lockPoint.x, lockPoint.y + 42).setVisible(Boolean(misplaced));
    if (safety.isolated || safety.locked) markers.lineStyle(4, 0x98b4a1).lineBetween(point.x - 8, point.y - 27, point.x + 12, point.y - 12);
    if (safety.lockPresent || safety.locked) {
      markers.lineStyle(4, 0xeec7bb).strokeRoundedRect(lockPoint.x - 10, lockPoint.y - 10, 18, 19, 7);
      markers.fillStyle(0xb92822).fillRoundedRect(lockPoint.x - 15, lockPoint.y + 2, 28, 28, 4);
      if (safety.locked) markers.fillStyle(0x252a2c).fillCircle(lockPoint.x - 1, lockPoint.y + 13, 3);
    }
    if (safety.tagged) {
      markers.lineStyle(2, 0xe7d59b).lineBetween(point.x + 10, point.y, point.x + 26, point.y + 9);
      markers.fillStyle(0xf5ce59).fillRoundedRect(point.x + 18, point.y + 8, 27, 40, 3);
      markers.lineStyle(2, 0x69541e).lineBetween(point.x + 24, point.y + 22, point.x + 38, point.y + 22).lineBetween(point.x + 24, point.y + 31, point.x + 38, point.y + 31);
    }
    if (!safety.cleaned && !safety.cleanupComplete) {
      markers.fillStyle(0x847455).fillRoundedRect(access.x - 28, access.y + 7, 23, 13, 3).fillRoundedRect(access.x + 3, access.y + 14, 18, 9, 2);
      markers.lineStyle(3, 0xb0a48a).lineBetween(access.x - 8, access.y + 2, access.x + 18, access.y - 3);
    }
    const messages = [];
    if (safety.stopped || safety.stopConfirmed) messages.push('조작반: 정지');
    if (safety.notified) messages.push('작업 전달');
    if (safety.isolated) messages.push('전원 차단');
    if (safety.locked) messages.push('개인잠금');
    if (safety.tagged) messages.push('이름 표지');
    if (safety.residualCleared) messages.push('잔류 에너지 조치');
    if (safety.verified || safety.tryoutVerified) messages.push('무기동 확인');
    if (safety.cleaned || safety.cleanupComplete) messages.push('제거 완료');
    stateText.setText(messages.join(' · '));
  };
  const finishAction = () => {
    if (!action) return;
    const pending = action; action = undefined; clearTimeout(pending.timer);
    actionGraphics?.clear(); actionText?.setVisible(false); clearInput(); paintCharacter(); paintSafety(); publish(true); pending.resolve();
  };
  const paintAction = () => {
    if (!actionGraphics || !action) return;
    actionGraphics.clear();
    const id = action.outcome.animation;
    const point = id === 'clear-debris' || id === 'reach-danger' || id === 'unlock-entry' ? geometry.targets['work-access']
      : ['isolate-panel', 'apply-lock', 'apply-tag', 'wrong-lock', 'wrong-tag'].includes(id) ? geometry.targets['energy-isolator'] : geometry.targets.control;
    const caption = action.outcome.actionCaption || action.outcome.title || '현장 조치';
    actionText.setText(caption).setPosition(point.x, point.y - 105).setVisible(true);
    const progress = reducedMotion ? 1 : Math.min(1, action.elapsed / action.duration);
    if (!['stop-control', 'tryout-control', 'radio-contact', 'wrong-lock', 'wrong-tag', 'clear-debris', 'isolate-panel', 'apply-lock', 'apply-tag', 'reach-danger', 'unlock-entry'].includes(id)) {
      actionText.setPosition(motion.x, geometry.floorY - geometry.workerHeight - 34); return;
    }
    const wrong = action.outcome.kind === 'wrong';
    actionGraphics.lineStyle(4, action.outcome.effect === 'accident' ? 0xc64b38 : wrong ? 0xe1a75d : 0xa7c9aa).strokeCircle(point.x, point.y, 24 + (reducedMotion ? 0 : 5 * Math.sin(progress * Math.PI)));
    if (id === 'reach-danger' || id === 'unlock-entry') {
      actionText.setPosition(motion.x, geometry.floorY - geometry.workerHeight - 34).setText(`${caption}
점검구 진입 선택 · 사고 상황`);
      actionGraphics.lineStyle(4, 0xc64b38).lineBetween(motion.x - 25, geometry.floorY - geometry.workerHeight * 0.48, motion.x - 90, geometry.floorY - geometry.workerHeight * 0.42);
    } else if (id === 'stop-control' || id === 'tryout-control') {
      actionGraphics.fillStyle(id === 'stop-control' ? 0xd26345 : 0xd6bf73).fillCircle(point.x, point.y + 8, 8);
      actionGraphics.lineStyle(3, 0xe6d9b4).lineBetween(point.x - 42, point.y + 20, point.x - 4, point.y + 10);
      if (id === 'tryout-control' && action.outcome.kind === 'progress') actionText.setText([caption, '컨베이어: 움직임 없음'].join(String.fromCharCode(10)));
      else if (id === 'tryout-control' && action.outcome.optionId === 'tryout-failed') actionText.setText([caption, '이상 움직임 감지 · 작업 보류'].join(String.fromCharCode(10)));
    } else if (id === 'radio-contact') {
      actionText.setPosition(motion.x, geometry.floorY - geometry.workerHeight - 34);
      actionGraphics.fillStyle(0x303c40).fillRoundedRect(motion.x + 48, geometry.floorY - geometry.workerHeight * 0.66, 13, 30, 3);
      actionGraphics.lineStyle(2, 0xdbd6bd).lineBetween(motion.x + 53, geometry.floorY - geometry.workerHeight * 0.66 - 8, motion.x + 53, geometry.floorY - geometry.workerHeight * 0.66);
    } else if (id === 'wrong-lock') {
      const locationMismatch = action.outcome.optionId !== 'lock-other-person';
      if (locationMismatch) actionGraphics.lineStyle(3, 0xe1a75d).strokeCircle(point.x + 110, point.y + 60, 22);
      actionText.setText([caption, locationMismatch ? '대상과 다른 체결 위치' : '본인 잠금 체결 필요'].join(String.fromCharCode(10)));
    } else if (id === 'wrong-tag') {
      actionText.setText([caption, '표지 식별 정보 확인 필요'].join(String.fromCharCode(10)));
      actionGraphics.lineStyle(2, 0xdab975).strokeRoundedRect(point.x + 18, point.y + 8, 27, 40, 3);
    } else if (id === 'clear-debris') {
      if (progress < 0.65) actionGraphics.fillStyle(0x847455, 1 - progress).fillRoundedRect(point.x - 28, point.y + 7, 23, 13, 3).fillRoundedRect(point.x + 3, point.y + 14, 18, 9, 2);
      actionGraphics.lineStyle(4, 0xd7b97b).lineBetween(point.x - 48, point.y - 25, point.x + progress * 35, point.y + 15);
      if (progress > 0.65) actionGraphics.fillStyle(0x94bc9c).fillCircle(point.x, point.y, 10);
    } else if (id === 'isolate-panel' || id === 'apply-lock' || id === 'apply-tag') {
      actionGraphics.lineStyle(3, 0xe6d9b4).lineBetween(point.x - 43, point.y + 18, point.x - 6, point.y);
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
    setPaused(value) { paused = Boolean(value); clearInput(); paintCharacter(); publish(true); },
    setReducedMotion(value) { reducedMotion = Boolean(value); if (reducedMotion) scene?.cameras.main.resetFX(); paintCharacter(); paintAction(); },
    setObjective(targetId) { objective = targetId; paintObjective(); },
    snapshot: () => ({ x: motion.x, facing: motion.facing > 0 ? 'right' : 'left', cameraX }),
    restore(position) {
      clearInput(); motion.x = geometry.clampX(Number.isFinite(position.x) ? position.x : geometry.startX);
      motion.facing = position.facing === 'right' ? 1 : -1; motion.distance = 0;
      if (Number.isFinite(position.cameraX)) cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, position.cameraX));
      paintCharacter(); publish(true);
    },
    reset() {
      actionGeneration++; finishAction(); clearAccident(); paused = false; safety = {}; objective = 'control';
      motion.distance = 0; motion.x = geometry.startX; motion.facing = -1;
      cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, motion.x - geometry.width / 2));
      paintSafety(); paintObjective(); paintCharacter(); publish(true);
    },
    updateSafety(value) { safety = { ...value }; paintSafety(); },
    playAction(outcome) {
      if (destroyed) return Promise.resolve();
      finishAction(); clearInput(); const generation = ++actionGeneration;
      const promise = new Promise((resolve) => {
        const duration = reducedMotion ? 500 : 760;
        action = { outcome: { ...outcome }, elapsed: 0, duration, started: performance.now(), generation, resolve,
          timer: setTimeout(() => { if (!destroyed && action?.generation === generation) finishAction(); }, duration) };
      });
      paintCharacter(); paintAction(); publish(true); return promise;
    },
    playAccident() {
      if (destroyed) return Promise.resolve();
      if (accidentPromise) return accidentPromise;
      finishAction(); accident = true; clearInput(); paintCharacter(); publish(true);
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
      destroyed = true; actionGeneration++; finishAction(); clearAccident(); clearInput(); disposers.forEach((dispose) => dispose());
      game.destroy(true); shell.remove();
    },
  };
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: canvasHost, width: geometry.width, height: geometry.height,
    backgroundColor: '#242b2c', audio: { noAudio: true }, input: { keyboard: false },
    // Phaser's timer clock keeps this desktop scene responsive when the visible canvas is occluded.
    fps: { forceSetTimeOut: true, target: 60 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: {
      preload() {
        this.load.image('site-background', assetUrl(assets.background.file));
        this.load.image('site-worker-walk', assetUrl(walk.file));
        this.load.image('site-worker-idle', assetUrl(idle.file));
        this.load.once('loaderror', () => { loadFailed = true; readyReject(new Error('현장 이미지 파일을 불러오지 못했습니다.')); });
      },
      create() {
        if (loadFailed || destroyed) return;
        scene = this;
        this.add.image(0, geometry.backgroundY, 'site-background').setOrigin(0).setScale(geometry.backgroundScale);
        const walkTexture = this.textures.get('site-worker-walk'), idleTexture = this.textures.get('site-worker-idle');
        walkFrames.forEach((frame, index) => walkTexture.add(String(index), 0, frame.x, frame.y, frame.width, frame.height));
        const idleFrame = idle.frame; idleTexture.add('idle', 0, idleFrame.x, idleFrame.y, idleFrame.width, idleFrame.height);
        shadow = this.add.ellipse(motion.x, geometry.floorY + 2, 100, 15, 0x141918, 0.28);
        character = this.add.image(motion.x, geometry.floorY, 'site-worker-idle', 'idle');
        for (const [id, point] of Object.entries(geometry.targets)) this.add.text(point.x, point.y - 70, names[id], { fontFamily: 'sans-serif', fontSize: '18px', color: '#fff9e7', backgroundColor: '#242b2ce0', padding: { x: 10, y: 6 } }).setOrigin(0.5, 1);
        markers = this.add.graphics(); objectiveMarker = this.add.graphics(); actionGraphics = this.add.graphics();
        lockLabel = this.add.text(0, 0, '잘못된 체결', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffdaad', backgroundColor: '#432c29e8', padding: { x: 7, y: 4 } }).setOrigin(0.5, 0).setVisible(false);
        stateText = this.add.text(18, 18, '', { fontFamily: 'sans-serif', fontSize: '17px', color: '#e9efdb', backgroundColor: '#263831de', padding: { x: 9, y: 5 } }).setScrollFactor(0);
        actionText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '21px', align: 'center', wordWrap: { width: 760, useAdvancedWrap: true }, color: '#f8eed6', backgroundColor: '#263831ef', padding: { x: 14, y: 10 } }).setOrigin(0.5, 1).setVisible(false);
        this.cameras.main.setBounds(0, 0, geometry.worldWidth, geometry.height);
        game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', '컨베이어 현장. 방향키 또는 A D로 이동, E로 가까운 대상 조사');
        listen(game.canvas, 'pointerdown', () => game.canvas.focus({ preventScroll: true }));
        paintSafety(); paintObjective(); paintCharacter(); publish(true); readyResolve(controller);
      },
      update(_time, delta) {
        if (destroyed) return;
        const seconds = Math.min(delta, 50) / 1000;
        if (action && !document.hidden) {
          action.elapsed = Math.min(action.duration, performance.now() - action.started); paintAction();
          if (action.generation === actionGeneration && action.elapsed >= action.duration) finishAction();
        }
        if (!available()) return;
        const held = [...keys.values(), ...pointers.values()];
        const direction = Number(held.some((press) => press.direction > 0)) - Number(held.some((press) => press.direction < 0));
        advanceMotion(motion, direction, seconds, geometry, { speed: geometry.walkingSpeed, acceleration: 1800, braking: 2400, stride: walk.strideLength || geometry.strideLength, frames: walkFrames.length });
        cameraX = advanceCamera(cameraX, motion.x, motion.velocity, seconds, geometry.width, geometry.worldWidth);
        paintCharacter(); publish();
      },
    },
  });
  try { return await ready; } catch (error) { controller.destroy(); throw error; }
}
