import { buildLayout } from './layout.mjs';
import { createMotion, clearMotion, queueTap, advanceMotion, advanceTo, advanceCamera } from './motion.mjs';
import { buildActionPlan, safetyVisual, actorConsequence } from './action-plan.mjs';

const assetUrl = (file) => new URL(`../assets/${file}`, import.meta.url).href;
const names = { control: '조작반 · 오퍼레이터 연락', 'work-access': '컨베이어 이물질 제거', 'energy-isolator': 'MCC 판넬 · 개인잠금' };

export async function mountStage(root, { onInspect, onPosition = () => {}, reducedMotion = false }) {
  const response = await fetch(assetUrl('assets.json'));
  if (!response.ok) throw new Error('현장 이미지 정보를 읽을 수 없습니다.');
  const assets = await response.json();
  const actionResponse = await fetch(assetUrl('action-assets.json'));
  if (!actionResponse.ok) throw new Error('행동 이미지 정보를 읽을 수 없습니다.');
  const actionAssets = await actionResponse.json();
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
  let scene, character, shadow, objectiveMarker, objectiveLabel, actionText, game, npc, npcShadow, npcLabel, beltMarks, beltRollers, controlProp, mccProp, otherMccProp, lockProp, tagProp, debris, cabinetText, otherCabinetText, controlText, tagText, radioText, isolatorGrip, sceneCues, riskBadge;
  let destroyed = false, paused = false, accident = false, loadFailed = false;
  const motion = createMotion(geometry.startX, -1);
  let cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, motion.x - geometry.width / 2));
  let safety = {}, objective = 'control', action, actionGeneration = 0, accidentResolve, accidentPromise;
  let visual = safetyVisual({}), visualPose = '', visualAction = '', visualMessage = '', actionPhase = '', cameraZoom = 1, beltPhase = 0, actionHand;
  const poseFrames = new Map(actionAssets.actions.frames.map((frame) => [frame.pose, frame]));
  const actorMotion = createMotion(geometry.targets.control.x + 300, -1);
  let actorPhase = 'hidden', actorAction = '', actorClock = 0, actorMode = '', actorOwner = '';
  let objectiveVisible = false, objectiveOutline = '', objectiveArrow = 'hidden';
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
    const objectivePoint = geometry.targets[objective];
    const objectiveOffset = objectivePoint ? objectivePoint.x - motion.x : 0;
    const objectiveDistance = Math.abs(objectiveOffset);
    const objectiveDirection = objectiveDistance <= geometry.interactionRadius ? 'here' : objectiveOffset > 0 ? 'right' : 'left';
    inspect.disabled = !available() || target.distance > geometry.interactionRadius;
    inspect.textContent = target.distance <= geometry.interactionRadius ? `${names[target.id]} 조사 [E]` : '대상 가까이 이동하세요';
    left.disabled = right.disabled = !available();
    const next = `${Math.round(motion.x)}:${target.id}:${Math.round(target.distance)}:${Math.round(motion.velocity)}:${motion.facing}:${motion.frame}:${Math.round(cameraX)}:${visualAction}:${visualPose}:${actionPhase}:${visual.beltRunning}:${visual.lock}:${visual.tag}:${cameraZoom.toFixed(2)}:${actorPhase}:${Math.round(actorMotion.x)}:${actorAction}:${objectiveVisible}:${objectiveOutline}:${objectiveArrow}:${actorMode}:${visual.ownerReleased}:${visual.inspectionStatus}:${visual.isolated}:${visual.scopeBlocked}`;
    if (force || next !== lastPosition) {
      lastPosition = next;
      onPosition({ x: motion.x, nearestTargetId: target.id, distance: target.distance, inRange: target.distance <= geometry.interactionRadius, objectiveDirection, objectiveDistance, velocity: motion.velocity, facing: motion.facing > 0 ? 'right' : 'left', frame: motion.frame < 0 ? 'idle' : motion.frame, cameraX, floorY: geometry.floorY, visualAction, pose: visualPose || (motion.frame < 0 ? 'idle' : 'walk'), beltRunning: visual.beltRunning, lockVisible: visual.lock, tagVisible: visual.tag, cameraZoom, actionPhase, visualMessage, actorPhase, actorX: actorMotion.x, actorAction, actorMode, actorOwner, ownerReleased: Boolean(visual.ownerReleased), inspectionStatus: visual.inspectionStatus || '', isolationOn: !visual.isolated, scopeBlocked: Boolean(visual.scopeBlocked), riskExample: Boolean(visual.riskExample), objectiveVisible, objectiveOutline, objectiveArrow });
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
  const actionScale = geometry.workerHeight / actionAssets.actions.standingHeight;
  const handOffset = (frame) => ({ x: (frame.handX - frame.anchorX) * actionScale, y: (frame.handY - frame.footY) * actionScale });
  const equipmentFrames = new Map(actionAssets.equipment.frames.map((frame) => [frame.id, frame]));
  const controlScale = 350 / equipmentFrames.get('control').bodyHeight;
  const mccScale = 460 / equipmentFrames.get('mcc').bodyHeight;
  const hardwarePoint = (id, scale, pointX, pointY) => {
    const frame = equipmentFrames.get(id), target = geometry.targets[id === 'mcc' ? 'energy-isolator' : 'control'];
    return { x: target.x + (frame[pointX] - frame.anchorX) * scale, y: geometry.floorY + (frame[pointY] - frame.footY) * scale };
  };
  const interactionHand = {
    control: hardwarePoint('control', controlScale, 'stopX', 'stopY'),
    'energy-isolator': hardwarePoint('mcc', mccScale, 'isolatorX', 'isolatorY'),
    'work-access': { x: geometry.targets['work-access'].x + 12, y: geometry.floorY - 56 },
  };
  const controlContacts = {
    stop: interactionHand.control,
    start: hardwarePoint('control', controlScale, 'startX', 'startY'),
    speed: { x: geometry.targets.control.x + (388 - equipmentFrames.get('control').anchorX) * controlScale, y: interactionHand.control.y },
  };
  const otherCircuitPoint = { ...interactionHand['energy-isolator'], x: interactionHand['energy-isolator'].x - 280 };
  const doorLatchPoint = hardwarePoint('mcc', mccScale, 'haspX', 'haspY');
  const planContact = (plan) => plan.equipment === 'other-circuit' ? otherCircuitPoint : plan.equipment === 'door-latch' ? doorLatchPoint : interactionHand[plan.target];
  const beatContact = (target, plan, control) => target === 'control' && control ? controlContacts[control] : target === 'energy-isolator' ? planContact(plan) : interactionHand[target];
  const paintCharacter = () => {
    if (!character) return;
    const displayPose = visualPose === 'tryout' ? 'press' : visualPose;
    const pose = poseFrames.get(displayPose), moving = motion.frame >= 0 && !pose;
    const frame = pose || (moving ? walkFrames[motion.frame] : idle.frame);
    const facing = pose ? (actionAssets.actions.facing || 'right') : (walk.facing || 'right');
    const flipped = (motion.facing > 0 ? 'right' : 'left') !== facing;
    const bodyX = frame.anchorX ?? frame.bodyX ?? frame.width / 2;
    const groundY = frame.footY ?? frame.groundY;
    // Crouching retains standing scale. The worker bends instead of being stretched.
    const scale = pose ? actionScale : geometry.workerHeight / (frame.bodyHeight ?? frame.bbox?.height ?? walk.standingHeight);
    character.setTexture(pose ? 'site-worker-actions' : moving ? 'site-worker-walk' : 'site-worker-idle', pose ? displayPose : moving ? String(motion.frame) : 'idle')
      .setFlipX(flipped).setScale(scale).setOrigin((flipped ? frame.width - bodyX : bodyX) / frame.width, groundY / frame.height)
      .setPosition(motion.x, geometry.floorY).setDepth(20);
    actionHand = pose ? { x: motion.x + handOffset(frame).x * (flipped ? -1 : 1), y: geometry.floorY + handOffset(frame).y } : undefined;
    shadow.setPosition(motion.x, geometry.floorY + 2);
    scene.cameras.main.setZoom(cameraZoom).setScroll(cameraX, Math.max(0, geometry.height - geometry.height / cameraZoom));
    // Scroll-factor-zero labels still inherit camera zoom; compensate around its center.
    for (const [label, y] of [[radioText, 114], [riskBadge, 155]]) {
      label?.setPosition(geometry.width / 2 + (24 - geometry.width / 2) / cameraZoom, geometry.height / 2 + (y - geometry.height / 2) / cameraZoom).setScale(1 / cameraZoom);
    }
    paintActor(); paintObjective();
  };
  // Silhouette bounds measured from equipment-v3.png alpha >= 128.
  const equipmentOutlines = { control: [308, 46, 498, 497], mcc: [241, 7, 495, 494] };
  const objectiveRect = () => {
    if (objective === 'work-access') {
      return { x: geometry.targets[objective].x - geometry.worldWidth * .0305, y: geometry.backgroundY + geometry.backgroundScale * 426, width: geometry.worldWidth * .061, height: geometry.backgroundScale * 96 };
    }
    const id = objective === 'control' ? 'control' : 'mcc';
    const item = objective === 'control' ? controlProp : mccProp;
    if (!item || !geometry.targets[objective]) return null;
    const frame = equipmentFrames.get(id), bounds = equipmentOutlines[id];
    return { x: item.x + (bounds[0] - frame.anchorX) * item.scaleX, y: item.y + (bounds[1] - frame.footY) * item.scaleY, width: (bounds[2] - bounds[0]) * item.scaleX, height: (bounds[3] - bounds[1]) * item.scaleY };
  };
  const paintObjective = () => {
    if (!objectiveMarker) return;
    objectiveMarker.clear(); objectiveLabel.setVisible(false);
    objectiveVisible = false; objectiveOutline = ''; objectiveArrow = 'hidden';
    const rect = objectiveRect();
    if (!rect || action || accident || paused || document.hidden) return;
    const view = scene.cameras.main.worldView, left = view.x, right = view.x + view.width;
    const centerX = rect.x + rect.width / 2;
    const label = { control: '다음 장소 · 조작반', 'energy-isolator': '다음 장소 · MCC B/C-01', 'work-access': '다음 장소 · 컨베이어 점검구' }[objective];
    objectiveVisible = true;
    if (centerX < left + 45 / cameraZoom || centerX > right - 45 / cameraZoom) {
      const direction = centerX < left ? -1 : 1;
      const x = direction < 0 ? left + 45 / cameraZoom : right - 45 / cameraZoom;
      const y = view.y + view.height * .46;
      objectiveArrow = direction < 0 ? 'left' : 'right';
      objectiveMarker.lineStyle(8 / cameraZoom, 0xffd45e).lineBetween(x - direction * 24 / cameraZoom, y, x + direction * 12 / cameraZoom, y);
      objectiveMarker.fillStyle(0xffd45e).fillTriangle(x + direction * 31 / cameraZoom, y, x + direction * 8 / cameraZoom, y - 22 / cameraZoom, x + direction * 8 / cameraZoom, y + 22 / cameraZoom);
      objectiveLabel.setText(label).setOrigin(direction < 0 ? 0 : 1, .5).setPosition(x + direction * 36 / cameraZoom, y + 46 / cameraZoom).setVisible(true);
      return;
    }
    objectiveOutline = objective; objectiveArrow = 'down';
    objectiveMarker.lineStyle(4, 0xffd45e, 1).strokeRoundedRect(rect.x - 6, rect.y - 6, rect.width + 12, rect.height + 12, 8);
    const top = Math.max(view.y + 108 / cameraZoom, rect.y - 70);
    objectiveMarker.fillStyle(0xffd45e).fillRect(centerX - 7, top, 14, 25).fillTriangle(centerX - 27, top + 23, centerX + 27, top + 23, centerX, top + 51);
    objectiveLabel.setText(label).setOrigin(.5, 1).setPosition(centerX, top - 8).setVisible(true);
  };

  const paintSafety = () => {
    if (!lockProp) return;
    isolatorGrip?.setAngle(visual.isolated ? -90 : 0);
    sceneCues?.clear();
    if (sceneCues && visual.control === 'start') { const point = controlContacts.start; sceneCues.fillStyle(0x7fff86, .65).fillCircle(point.x, point.y, 7).lineStyle(3, 0x94ef88, .85).strokeCircle(point.x, point.y, 12); }
    if (sceneCues && visual.verificationHold) { const point = controlContacts.start; sceneCues.lineStyle(3, 0xffd45e).strokeCircle(point.x, point.y, 18).lineBetween(point.x - 13, point.y - 13, point.x + 13, point.y + 13); }
    if (sceneCues && visual.scopeBlocked) {
      const x = geometry.targets['work-access'].x + 330, y = geometry.floorY;
      sceneCues.fillStyle(0x555d5a).fillRect(x - 62, y - 115, 8, 115).fillRect(x + 54, y - 115, 8, 115);
      sceneCues.fillStyle(0xffcc48).fillRect(x - 70, y - 108, 140, 16);
      for (let n = -65; n < 70; n += 25) sceneCues.fillStyle(0x202726).fillTriangle(x + n, y - 108, x + n + 12, y - 108, x + n + 22, y - 92);
    }
    riskBadge?.setVisible(Boolean(visual.riskExample));
    const hasp = visual.lock === 'wrong-circuit' ? otherCircuitPoint : visual.lock === 'wrong-hook' ? doorLatchPoint : interactionHand['energy-isolator'];
    const lockPoint = { x: hasp.x, y: hasp.y + 38 };
    lockProp.setPosition(lockPoint.x, lockPoint.y).setVisible(visual.lock !== 'none').setTint(0xffffff).setAlpha(1);
    tagProp.setPosition(lockPoint.x + 28, lockPoint.y + 16).setVisible(visual.tag !== 'none').setAlpha(visual.tag === 'unreadable' ? .48 : 1);
    tagText.setPosition(lockPoint.x + 28, lockPoint.y + 4).setText(visual.tag === 'wrong-name' ? '김\n작업자' : visual.tag === 'unreadable' ? '···' : '본인\nB/C-01').setVisible(visual.tag !== 'none');
    cabinetText.setText(visual.lock === 'wrong-hook' ? 'B/C-01 ON · 문 고리에 잠금' : visual.lock === 'other-person' ? 'B/C-01 · 김 작업자 잠금' : visual.isolated ? 'B/C-01 OFF' : 'B/C-01 ON');
    otherCabinetText.setText(visual.lock === 'wrong-circuit' ? 'B/C-02 OFF · 다른 설비 잠금' : 'B/C-02 ON · 다른 설비');
    controlText.setText(visual.control === 'start' ? '기동 지시 ON' : visual.control === 'emergency' ? '비상정지 · 전원 유지' : '정지 STOP').setColor(visual.control === 'start' ? '#e7b772' : '#d7e0d3');
    debris.setPosition(geometry.targets['work-access'].x + 12, geometry.floorY - 56).setVisible(!visual.cleaned);
    const relevantRadio = visualAction.startsWith('notify-') || visualAction === 'cleanup-restart' || visual.radio === 'remote-start';
    radioText.setVisible(relevantRadio && ['acknowledged', 'missing', 'unidentified', 'remote-start', 'rejected'].includes(visual.radio));
    radioText.setText({ acknowledged: '오퍼레이터 · 작업 확인', missing: '오퍼레이터 · 통보 기록 없음', unidentified: '오퍼레이터 · 대상 확인 요청', 'remote-start': '동료 작업자 기동 · 작업 통보 없음', rejected: '오퍼레이터 · 기동 요청 보류' }[visual.radio] || '');
  };
  const paintBelt = (seconds) => {
    if (!beltMarks) return;
    if (visual.beltRunning && !document.hidden) beltPhase = (beltPhase + seconds * 86 * visual.beltSpeed) % 96;
    beltMarks.clear(); beltRollers.clear(); const top = geometry.backgroundY + geometry.backgroundScale * 430;
    // Belt texture marks move on the photographed belt. Rollers rotate in place.
    beltMarks.lineStyle(2, 0xd7c6a6, .45);
    for (let x = -96 + beltPhase; x < geometry.worldWidth; x += 96) beltMarks.lineBetween(x, top + 6, x + 15, top + 10);
    for (let x = 72; x < geometry.worldWidth; x += 242) {
      const angle = beltPhase / 96 * Math.PI * 2;
      beltRollers.lineStyle(2, 0xb9b6a8, .75).lineBetween(x - Math.cos(angle) * 12, top + 61 - Math.sin(angle) * 12, x + Math.cos(angle) * 12, top + 61 + Math.sin(angle) * 12);
    }
  };
  const resetActor = () => {
    actorPhase = 'hidden'; actorAction = ''; actorMode = ''; actorOwner = ''; actorClock = 0;
    clearMotion(actorMotion); actorMotion.x = geometry.targets.control.x + 300; actorMotion.distance = 0;
    npc?.setVisible(false); npcShadow?.setVisible(false); npcLabel?.setVisible(false);
  };
  const actorPose = () => actorPhase === 'contact' ? ({ restart: 'press', 'owner-release': 'lock', 'inspect-tag': 'tryout', 'radio-reply': 'radio' }[actorMode]) : actorPhase === 'reply' ? 'radio' : '';
  const paintActor = () => {
    if (!npc) return;
    const visible = actorPhase !== 'hidden';
    npc.setVisible(visible); npcShadow.setVisible(visible); npcLabel.setVisible(visible);
    if (!visible) return;
    const pose = actorPose(), moving = actorMotion.frame >= 0 && !pose;
    const frame = pose ? poseFrames.get(pose) : moving ? walkFrames[actorMotion.frame] : idle.frame;
    const flipped = actorMotion.facing < 0;
    const scale = pose ? actionScale : geometry.workerHeight / frame.bodyHeight;
    const anchor = frame.anchorX ?? frame.bodyX ?? frame.width / 2;
    npc.setTexture(pose ? 'site-worker-actions' : moving ? 'site-worker-walk' : 'site-worker-idle', pose || (moving ? String(actorMotion.frame) : 'idle'))
      .setScale(scale).setOrigin((flipped ? frame.width - anchor : anchor) / frame.width, (frame.footY ?? frame.groundY) / frame.height)
      .setFlipX(flipped).setPosition(actorMotion.x, geometry.floorY).setTint(0xd3e1ec);
    npcShadow.setPosition(actorMotion.x, geometry.floorY + 2);
    const role = actorMode === 'owner-release' ? '김 작업자 · 잠금 주인' : actorMode === 'radio-reply' ? '오퍼레이터' : '동료 작업자';
    const detail = actorPhase === 'contact' ? ({ restart: '기동 버튼 조작', 'owner-release': '자기 잠금 해제', 'inspect-tag': '작업 표지 확인', 'radio-reply': '무전 응답' }[actorMode]) : actorPhase === 'reply' ? '작업자 확인 요청' : actorPhase === 'done' && actorMode === 'owner-release' ? '본인 잠금 회수' : '';
    npcLabel.setPosition(actorMotion.x, geometry.floorY - geometry.workerHeight - 16).setText(role + (detail ? ' · ' + detail : ''));
  };
  const advanceActor = (seconds) => {
    const mode = action.plan.beats[action.index].actor;
    const pose = { restart: 'press', 'owner-release': 'lock', 'inspect-tag': 'tryout', 'radio-reply': 'radio' }[mode];
    const point = mode === 'restart' ? controlContacts.start : mode === 'radio-reply' ? { x: geometry.targets.control.x + 100 } : mode === 'inspect-tag' ? { x: interactionHand['energy-isolator'].x + 28 } : interactionHand['energy-isolator'];
    const destination = geometry.clampX(point.x - handOffset(poseFrames.get(pose)).x);
    if (actorPhase === 'hidden') {
      if (action.elapsed < 700) return false;
      actorMode = mode; actorOwner = mode === 'owner-release' ? '김 작업자' : '';
      actorMotion.x = geometry.clampX(destination + 280); clearMotion(actorMotion);
      actorPhase = 'approach'; actorAction = 'walk';
      visualMessage = { restart: '동료가 작업 사실을 모르고 조작반으로 옵니다.', 'owner-release': '발생할 수 있는 상황 · 잠금 주인이 돌아옵니다.', 'inspect-tag': '동료가 작업자 식별 정보를 확인하러 옵니다.', 'radio-reply': '오퍼레이터가 무전으로 작업을 확인합니다.' }[mode];
      actionText.setText(visualMessage);
    }
    if (actorPhase === 'approach') {
      advanceTo(actorMotion, destination, seconds, geometry, { speed: 170, acceleration: 1200, braking: 2400, stride: geometry.strideLength, frames: walkFrames.length });
      if (Math.abs(destination - actorMotion.x) < .05) {
        actorMotion.x = destination; clearMotion(actorMotion); actorMotion.facing = 1;
        actorPhase = 'contact'; actorAction = { restart: 'press-start', 'owner-release': 'remove-own-lock', 'inspect-tag': 'inspect-tag', 'radio-reply': 'radio-reply' }[mode]; actorClock = 0;
        visualMessage = { restart: '동료가 초록 기동 버튼을 누릅니다.', 'owner-release': '김 작업자가 자기 자물쇠를 해제합니다.', 'inspect-tag': '동료가 표지의 이름과 작업 정보를 읽습니다.', 'radio-reply': action.plan.beats[action.index].message }[mode];
        actionText.setText(visualMessage);
      }
    } else if (actorPhase === 'contact') {
      actorClock += seconds * 1000;
      if (mode === 'owner-release') {
        const progress = Math.max(0, Math.min(1, (actorClock - 700) / 750));
        lockProp.setPosition(interactionHand['energy-isolator'].x + progress * 22, interactionHand['energy-isolator'].y + 38 - progress * 35).setAlpha(1 - progress);
      }
      if (actorClock >= (mode === 'restart' ? 1000 : 1600)) {
        Object.assign(visual, actorConsequence(mode, visual, visualAction));
        actorPhase = mode === 'inspect-tag' ? 'reply' : 'done'; actorAction = mode === 'inspect-tag' ? 'request-identification' : 'idle'; actorClock = 0;
        visualMessage = { restart: '동료의 기동 조작으로 벨트가 다시 움직입니다.', 'owner-release': '잠금 회수 · 차단장치 ON · 보호 없음', 'inspect-tag': { 'missing-tag': '표지가 없어 작업자를 확인할 수 없습니다.', 'owner-mismatch': '표지 이름과 실제 작업자가 다릅니다.', 'unreadable-tag': '글자가 지워져 작업자를 확인할 수 없습니다.' }[visual.inspectionStatus], 'radio-reply': visual.radio === 'missing' ? '작업 정보 없음 · 통보를 기다립니다.' : visual.radio === 'unidentified' ? '어느 설비입니까? · 확인 답변을 기다립니다.' : '잠금 유지 확인 · 기동 요청을 보류합니다.' }[mode];
        actionText.setText(visualMessage); paintSafety();
      }
    } else actorClock += seconds * 1000;
    paintActor();
    return ['done', 'reply'].includes(actorPhase) && actorClock >= 1700;
  };


  const focusActionCamera = (focusX, seconds) => {
    const goal = Math.max(0, Math.min(geometry.worldWidth - geometry.width / cameraZoom, focusX - geometry.width / cameraZoom * .4));
    if (reducedMotion) cameraX = goal;
    else {
      const change = (goal - cameraX) * (1 - Math.exp(-5 * seconds));
      cameraX += Math.sign(change) * Math.min(Math.abs(change), 650 * seconds);
    }
  };

  const clearVisual = () => {
    visual = safetyVisual(safety); visualPose = ''; visualAction = ''; visualMessage = ''; actionPhase = ''; cameraZoom = 1;
    cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, cameraX));
    resetActor(); actionText?.setVisible(false); paintSafety(); paintCharacter(); paintObjective();
  };
  const cancelAction = () => {
    if (!action) return;
    const pending = action; action = undefined; clearTimeout(pending.timer); clearInput(); resetActor(); pending.resolve();
  };
  const finishAction = () => {
    if (!action) return;
    const pending = action; action = undefined; clearTimeout(pending.timer); clearInput(); actionPhase = 'result';
    if (!pending.plan.accident || ['lock', 'tag'].includes(visualPose)) visualPose = '';
    // The physical consequence stays visible while its explanation is read.
    paintCharacter(); paintSafety(); paintObjective(); publish(true); pending.resolve();
  };
  const beginBeat = () => {
    const current = action?.plan.beats[action.index];
    if (!current) { finishAction(); return; }
    const observerX = current.actor === 'inspect-tag' ? interactionHand['energy-isolator'].x - 320 : undefined;
    if ((current.target && current.target !== action.currentTarget) || (current.control && current.control !== action.currentControl) || (observerX !== undefined && Math.abs(motion.x - observerX) > 2)) {
      const nextTarget = current.target || action.currentTarget;
      const nextControl = current.control || action.currentControl;
      const contact = beatContact(nextTarget, action.plan, nextControl), frame = poseFrames.get(current.pose);
      action.destinationX = geometry.clampX(observerX ?? (contact.x - (frame ? handOffset(frame).x : 250)));
      action.pendingIndex = action.index; action.approachTarget = nextTarget; action.approachControl = nextControl;
      actionPhase = 'approach'; visualPose = ''; clearInput();
      visualMessage = observerX !== undefined ? '동료의 표지 확인을 기다립니다.' : nextTarget === 'control' ? '조작반 정지 버튼으로 이동하여 정지 상태로 복귀합니다.' : '차단·잠금 지점에서 컨베이어 점검구로 이동합니다.';
      actionText.setText(visualMessage).setVisible(true);
      paintCharacter(); publish(true); return;
    }
    if (current.actor) resetActor();
    visualPose = current.pose; visualMessage = current.message; Object.assign(visual, current.changes);
    actionPhase = 'beat-' + (action.index + 1); action.elapsed = 0;
    paintCharacter(); paintSafety(); paintObjective();
    action.attachmentTarget = visualPose === 'lock' ? { x: lockProp.x, y: lockProp.y } : visualPose === 'tag' ? { x: tagProp.x, y: tagProp.y } : undefined;
    actionText.setText(current.message).setVisible(true); publish(true);
  };
  const advanceAction = (seconds) => {
    if (!action || document.hidden) return;
    if (actionPhase === 'approach') {
      const remaining = action.destinationX - motion.x;
      if (Math.abs(remaining) > 0.05) {
        advanceTo(motion, action.destinationX, seconds, geometry, { speed: geometry.walkingSpeed, acceleration: 1200, braking: 2400, stride: geometry.strideLength, frames: walkFrames.length });
        cameraX = advanceCamera(cameraX, motion.x, motion.velocity, seconds, geometry.width, geometry.worldWidth);
        cameraZoom += (1 - cameraZoom) * (1 - Math.exp(-5 * seconds));
        visualPose = ''; paintCharacter(); publish(); return;
      }
      motion.x = action.destinationX; clearInput(); motion.facing = 1;
      action.index = action.pendingIndex; action.currentTarget = action.approachTarget; action.currentControl = action.approachControl; beginBeat();
    }
    if (!action) return;
    action.elapsed += seconds * 1000; const beat = action.plan.beats[action.index];
    cameraZoom = reducedMotion ? 1 : cameraZoom + (1.18 - cameraZoom) * (1 - Math.exp(-5 * seconds));
    const actorReady = beat.actor ? advanceActor(seconds) : true;
    const actorFocus = beat.actor && actorPhase !== 'hidden' ? (actorPhase === 'approach' && ['owner-release', 'inspect-tag'].includes(actorMode) ? (actorMotion.x + motion.x) / 2 : actorMotion.x) : motion.x;
    focusActionCamera(actorFocus, seconds); paintCharacter();
    if (actionHand && ['lock', 'tag'].includes(visualPose) && action.elapsed < 430 && ((beat.changes.lock && beat.changes.lock !== 'none') || (beat.changes.tag && beat.changes.tag !== 'none'))) {
      const item = visualPose === 'lock' ? lockProp : tagProp, progress = action.elapsed / 430;
      item.setPosition(actionHand.x + (action.attachmentTarget.x - actionHand.x) * progress, actionHand.y + (action.attachmentTarget.y - actionHand.y) * progress);
    }
    if (visualPose === 'cleanup' && visual.cleaned && actionHand) {
      const removal = Math.min(1, action.elapsed / 550);
      debris.setVisible(removal < 1).setPosition(actionHand.x + removal * 22, actionHand.y - removal * 36).setAlpha(1 - removal);
    } else debris.setAlpha(1);
    if (actorReady && action.elapsed >= beat.duration) { action.index++; beginBeat(); }
    publish();
  };

  const schedule = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!destroyed) callback(); }, delay); timers.add(timer);
  };
  const clearAccident = () => {
    for (const timer of timers) clearTimeout(timer); timers.clear();
    accidentLayer.style.opacity = '0'; scene?.cameras.main.resetFX(); accident = false;
    accidentResolve?.(); accidentResolve = undefined; accidentPromise = undefined; clearInput(); publish();
  };
  const controller = {
    setPaused(value) { paused = Boolean(value); clearInput(); paintCharacter(); paintObjective(); publish(true); },
    setReducedMotion(value) { reducedMotion = Boolean(value); if (reducedMotion) { cameraZoom = 1; cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, cameraX)); scene?.cameras.main.resetFX(); } paintCharacter(); publish(true); },
    setObjective(targetId) { objective = targetId; paintObjective(); publish(true); },
    snapshot: () => ({ x: motion.x, facing: motion.facing > 0 ? 'right' : 'left', cameraX }),
    restore(position) {
      actionGeneration++; cancelAction(); clearAccident(); clearInput();
      motion.x = geometry.clampX(Number.isFinite(position.x) ? position.x : geometry.startX);
      motion.facing = position.facing === 'right' ? 1 : -1; motion.distance = 0;
      if (Number.isFinite(position.cameraX)) cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, position.cameraX));
      clearVisual(); publish(true);
    },
    reset() {
      actionGeneration++; cancelAction(); clearAccident(); paused = false; safety = {}; objective = 'control';
      motion.distance = 0; motion.x = geometry.startX; motion.facing = -1;
      cameraX = Math.max(0, Math.min(geometry.worldWidth - geometry.width, motion.x - geometry.width / 2));
      clearVisual(); publish(true);
    },
    updateSafety(value) { safety = { ...value }; if (!action && !accident) clearVisual(); },
    playAction(outcome, { beforeSafety } = {}) {
      if (destroyed) return Promise.resolve();
      cancelAction(); clearAccident(); clearInput(); resetActor();
      visual = { ...safetyVisual(beforeSafety || safety) }; visualAction = outcome.optionId; visualMessage = '선택한 행동을 현장에서 수행합니다.';
      actionPhase = 'approach'; visualPose = ''; cameraZoom = 1;
      const plan = buildActionPlan(outcome), frame = poseFrames.get(plan.beats[0].pose === 'tryout' ? 'press' : plan.beats[0].pose), contact = beatContact(plan.target, plan, plan.beats[0].control);
      visual.riskExample = Boolean(plan.riskExample);
      const destinationX = plan.beats[0].pose === 'radio' ? motion.x : geometry.clampX(contact.x + (frame ? -handOffset(frame).x : (plan.observeOffset ?? -250)) + (plan.offset || 0));
      const promise = new Promise((resolve) => { action = { outcome: { ...outcome }, plan, elapsed: 0, index: -1, pendingIndex: 0, approachTarget: plan.target, approachControl: plan.beats[0].control || null, currentTarget: null, currentControl: null, destinationX, generation: ++actionGeneration, resolve }; });
      actionText.setText((plan.target === 'energy-isolator' ? 'MCC 차단·잠금 지점' : plan.target === 'work-access' ? '컨베이어 점검구' : '조작반') + '으로 접근합니다.').setVisible(true);
      paintSafety(); paintObjective(); paintCharacter(); publish(true); return promise;
    },
    playAccident(outcome) {
      if (destroyed) return Promise.resolve();
      if (accidentPromise) return accidentPromise;
      if (action) finishAction(); accident = true; clearInput(); visualPose = 'recoil'; actionPhase = 'consequence';
      if (outcome) visualAction = outcome.optionId;
      accidentLayer.style.background = 'linear-gradient(90deg,rgba(93,18,8,.2),transparent 45%,rgba(93,18,8,.12))'; accidentLayer.style.opacity = '1';
      // The worker and moving equipment remain visible. No flashing or blackout.
      if (!reducedMotion) scene.cameras.main.shake(180, .002);
      paintCharacter(); paintSafety(); publish(true);
      accidentPromise = new Promise((resolve) => { accidentResolve = resolve; });
      schedule(() => { accidentResolve?.(); accidentResolve = undefined; }, reducedMotion ? 800 : 1100);
      return accidentPromise;
    },
    clearAccident,
    destroy() {
      if (destroyed) return;
      destroyed = true; actionGeneration++; cancelAction(); clearAccident(); clearInput(); disposers.forEach((dispose) => dispose());
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
        this.load.image('site-worker-actions', assetUrl(actionAssets.actions.file));
        this.load.image('site-equipment', assetUrl(actionAssets.equipment.file));
        this.load.image('site-debris', assetUrl(actionAssets.debris.file));
        this.load.once('loaderror', () => { loadFailed = true; readyReject(new Error('현장 이미지 파일을 불러오지 못했습니다.')); });
      },
      create() {
        if (loadFailed || destroyed) return;
        scene = this;
        this.add.image(0, geometry.backgroundY, 'site-background').setOrigin(0).setScale(geometry.backgroundScale);
        const walkTexture = this.textures.get('site-worker-walk'), idleTexture = this.textures.get('site-worker-idle');
        walkFrames.forEach((frame, index) => walkTexture.add(String(index), 0, frame.x, frame.y, frame.width, frame.height));
        const idleFrame = idle.frame; idleTexture.add('idle', 0, idleFrame.x, idleFrame.y, idleFrame.width, idleFrame.height);
        const actionTexture = this.textures.get('site-worker-actions'), equipmentTexture = this.textures.get('site-equipment');
        actionAssets.actions.frames.forEach((frame) => actionTexture.add(frame.pose, 0, frame.x, frame.y, frame.width, frame.height));
        for (const frame of equipmentFrames.values()) { const crop = frame.crop || frame; equipmentTexture.add(frame.id, 0, crop.x, crop.y, crop.width, crop.height); }
        equipmentTexture.add('speed-selector', 0, 370, 152, 38, 39);
        // Real photographed grip and a matching door finish expose its ON/OFF rotation.
        equipmentTexture.add('isolator-grip', 0, 1098, 200, 24, 84);
        equipmentTexture.add('isolator-door-finish', 0, 1040, 300, 38, 84);
        const prop = (id, x, footY, height) => {
          const frame = equipmentFrames.get(id), crop = frame.crop || frame;
          return this.add.image(x, footY, 'site-equipment', id).setScale(height / frame.bodyHeight)
            .setOrigin(frame.anchorX / crop.width, frame.footY / crop.height).setDepth(12);
        };
        controlProp = prop('control', geometry.targets.control.x, geometry.floorY, 350);
        this.add.image(controlContacts.speed.x, controlContacts.speed.y, 'site-equipment', 'speed-selector').setScale(controlScale).setDepth(15);
        this.add.text(controlContacts.speed.x, controlContacts.speed.y + 22, '속도', { fontFamily: 'sans-serif', fontSize: '11px', color: '#222725', backgroundColor: '#c4c4b8b0', padding: { x: 2, y: 1 } }).setOrigin(.5).setDepth(16);
        mccProp = prop('mcc', geometry.targets['energy-isolator'].x, geometry.floorY, 460);
        otherMccProp = prop('mcc', geometry.targets['energy-isolator'].x - 280, geometry.floorY, 460);
        const rotor = interactionHand['energy-isolator'];
        this.add.image(rotor.x, rotor.y - 3, 'site-equipment', 'isolator-door-finish').setDisplaySize(28, 82).setDepth(13);
        isolatorGrip = this.add.image(rotor.x, rotor.y - 30 * mccScale, 'site-equipment', 'isolator-grip').setScale(mccScale).setOrigin(.5, .18).setDepth(14);
        sceneCues = this.add.graphics().setDepth(16);
        lockProp = prop('padlock', 0, 0, 50).setDepth(24);
        tagProp = prop('tag', 0, 0, 72).setDepth(25);
        debris = this.add.image(geometry.targets['work-access'].x + 12, geometry.floorY - 56, 'site-debris')
          .setScale(34 / actionAssets.debris.bodyHeight)
          .setOrigin(actionAssets.debris.anchorX / actionAssets.debris.width, actionAssets.debris.footY / actionAssets.debris.height).setDepth(19);
        beltMarks = this.add.graphics().setDepth(3); beltRollers = this.add.graphics().setDepth(3);
        shadow = this.add.ellipse(motion.x, geometry.floorY + 2, 94, 13, 0x141918, .3).setDepth(18);
        character = this.add.image(motion.x, geometry.floorY, 'site-worker-idle', 'idle');
        npcShadow = this.add.ellipse(actorMotion.x, geometry.floorY + 2, 94, 13, 0x141918, .3).setDepth(18).setVisible(false);
        npc = this.add.image(actorMotion.x, geometry.floorY, 'site-worker-idle', 'idle').setDepth(21).setVisible(false);
        const smallText = { fontFamily: 'sans-serif', fontSize: '17px', color: '#fff3d6', backgroundColor: '#1d2323df', padding: { x: 8, y: 5 } };
        npcLabel = this.add.text(0, 0, '', { ...smallText, fontSize: '19px', color: '#dceefa' }).setOrigin(.5, 1).setDepth(34).setVisible(false);
        cabinetText = this.add.text(geometry.targets['energy-isolator'].x, geometry.floorY - 470, '', smallText).setOrigin(.5, 1).setDepth(30);
        otherCabinetText = this.add.text(geometry.targets['energy-isolator'].x - 280, geometry.floorY - 470, '', smallText).setOrigin(.5, 1).setDepth(30);
        controlText = this.add.text(geometry.targets.control.x, geometry.floorY - 360, '', smallText).setOrigin(.5, 1).setDepth(30);
        tagText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#262219', align: 'center', fontStyle: 'bold' }).setOrigin(.5).setDepth(26);
        radioText = this.add.text(24, 114, '', { ...smallText, fontSize: '20px' }).setScrollFactor(0).setDepth(35).setVisible(false);
        riskBadge = this.add.text(24, 155, '발생할 수 있는 상황 · 위험 예시', { ...smallText, fontSize: '20px', color: '#ffdb8b' }).setScrollFactor(0).setDepth(35).setVisible(false);
        objectiveMarker = this.add.graphics().setDepth(30);
        objectiveLabel = this.add.text(0, 0, '', { ...smallText, fontSize: '22px', color: '#ffe7a6', padding: { x: 11, y: 8 } }).setDepth(32).setVisible(false);
        actionText = this.add.text(640, 574, '', { fontFamily: 'sans-serif', fontSize: '21px', align: 'center', wordWrap: { width: 1000, useAdvancedWrap: true }, color: '#f8eed6', backgroundColor: '#171e22ed', padding: { x: 16, y: 10 } }).setOrigin(.5, 1).setScrollFactor(0).setDepth(40).setVisible(false);

        this.cameras.main.setBounds(0, 0, geometry.worldWidth, geometry.height);
        game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', '컨베이어 현장. 방향키 또는 A D로 이동, E로 가까운 대상 조사');
        listen(game.canvas, 'pointerdown', () => game.canvas.focus({ preventScroll: true }));
        paintSafety(); paintObjective(); paintCharacter(); publish(true); readyResolve(controller);
      },
      update(_time, delta) {
        if (destroyed) return;
        const seconds = Math.min(delta, 50) / 1000;
        paintBelt(seconds);
        if (action) { advanceAction(seconds); return; }
        if (!available()) return;
        if (visualPose) { visualPose = ''; visualAction = ''; actionPhase = ''; actionText.setVisible(false); cameraZoom = 1; }
        const held = [...keys.values(), ...pointers.values()];
        const direction = Number(held.some((press) => press.direction > 0)) - Number(held.some((press) => press.direction < 0));
        advanceMotion(motion, direction, seconds, geometry, { speed: geometry.walkingSpeed, acceleration: 1200, braking: 2400, stride: geometry.strideLength, frames: walkFrames.length });
        cameraX = advanceCamera(cameraX, motion.x, motion.velocity, seconds, geometry.width, geometry.worldWidth);
        paintCharacter(); publish();
      },
    },
  });
  try { return await ready; } catch (error) { controller.destroy(); throw error; }
}
