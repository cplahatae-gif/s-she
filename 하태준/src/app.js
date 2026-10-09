import { mountOverview } from './overview/overview.js';
import { mountStage } from './site/stage.js';
import { layout } from './site/layout.mjs';
import { TARGETS, ACTIONS, SAFETY_STEPS, createRun, inspect, applyAction, rewind } from './scenario/scenario.mjs';
import { equipmentMarkup } from './ui/panel.js';

const sceneRoot = document.querySelector('#scene-root');
const dialog = document.querySelector('#game-dialog');
const dialogContent = document.querySelector('#dialog-content');
const overviewButton = document.querySelector('#overview-button');
const motionInput = document.querySelector('#reduced-motion');
const footer = document.querySelector('#footer-context');
const announcement = document.querySelector('#announcement');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
motionInput.checked = motionPreference.matches;
let run = null;
let briefShown = false;
let stage = null;
let overview = null;
let view = 'overview';
let modalKind = '';
let returnFocus = null;
let position = null;
let savedPosition = null;
let safeEntryPosition = null;
let sceneGeneration = 0;
let toastTimer = null;
const actionSafetyKeys = {
  'isolate-energy': 'isolated', 'attach-personal-lock': 'locked', 'attach-tag': 'tagged',
  'clear-residual-energy': 'residualCleared', 'verify-isolation': 'verified',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function announce(text) { announcement.textContent = text; }
function safetyMarkup(className = 'panel-safety') {
  return `<ul class="${className}">${SAFETY_STEPS.map(step => `<li class="${run?.safety[step.key] ? 'done' : 'missing'}"><span class="step-mark" aria-hidden="true">${run?.safety[step.key] ? '✓' : '○'}</span>${escapeHtml(step.label)}<span class="sr-only">${run?.safety[step.key] ? '완료' : '미완료'}</span></li>`).join('')}</ul>`;
}
function updateHud() {
  const steps = sceneRoot.querySelector('#hud-safety');
  if (steps) steps.innerHTML = `<p>작업 전 안전조치 · ${SAFETY_STEPS.filter(step => run.safety[step.key]).length} / ${SAFETY_STEPS.length} 완료</p>${safetyMarkup('safety-list')}<p class="verification-status">차단 확인 결과: ${run.safety.verification === 'failed' ? '이상 발견, 보완 필요' : run.safety.verification === 'passed' ? '통과' : '미확인'}</p>`;
  const counters = sceneRoot.querySelector('#hud-counters');
  if (counters) counters.innerHTML = `판단 시도 <strong>${run.attempts}</strong> 되감기 <strong>${run.rewinds}</strong>`;
  stage?.updateSafety(run.safety);
}
function updatePosition(nextPosition) {
  position = nextPosition;
  const target = nextPosition.distance <= layout.interactionRadius ? TARGETS.find(item => item.id === nextPosition.nearestTargetId) : null;
  const chip = sceneRoot.querySelector('#location-chip');
  if (chip) {
    chip.textContent = target ? `지금 위치: ${target.title} 근처` : '지금 위치: 이동 통로';
    chip.dataset.worldX = String(Math.round(nextPosition.x));
  }
}
function toast(message) {
  clearTimeout(toastTimer);
  sceneRoot.querySelector('.stage-toast')?.remove();
  const element = document.createElement('div'); element.className = 'stage-toast'; element.textContent = message;
  sceneRoot.append(element); announce(message);
  toastTimer = setTimeout(() => element.remove(), 3500);
}
function openDialog(kind, html, initialFocus = '[data-close]') {
  if (!dialog.open) returnFocus = document.activeElement;
  modalKind = kind;
  dialog.classList.toggle('accident-dialog', kind === 'accident');
  dialogContent.innerHTML = `<div class="dialog-inner">${html}</div>`;
  stage?.setPaused(true);
  if (!dialog.open) dialog.showModal();
  dialogContent.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeDialog));
  dialogContent.querySelector(initialFocus)?.focus();
}
function closeDialog() {
  if (modalKind === 'accident' || modalKind === 'result') return;
  dialog.close();
}
function forceCloseDialog() {
  modalKind = '';
  if (dialog.open) dialog.close();
}
dialog.addEventListener('cancel', event => {
  if (modalKind === 'accident' || modalKind === 'result') event.preventDefault();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  if (modalKind === 'accident') { stage?.setPaused(true); return; }
  const previousModal = modalKind;
  modalKind = '';
  stage?.setPaused(Boolean(run?.completed) || previousModal === 'accident');
  if (view === 'stage') {
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus();
    else sceneRoot.querySelector('.stage-canvas canvas')?.focus();
  }
});
motionInput.addEventListener('change', () => stage?.setReducedMotion(motionInput.checked));
overviewButton.addEventListener('click', showOverview);

function showOverview() {
  if (modalKind === 'accident') return;
  sceneGeneration += 1;
  clearTimeout(toastTimer);
  savedPosition = stage?.snapshot() ?? savedPosition;
  forceCloseDialog(); stage?.destroy(); stage = null;
  overview?.destroy();
  view = 'overview'; position = null;
  overviewButton.hidden = true; overviewButton.disabled = false;
  footer.textContent = run ? '공장으로 돌아왔습니다. B/C 구역을 선택하면 기록과 위치가 이어집니다.' : '공장 전경에서 B/C 구역을 선택하세요.';
  overview = mountOverview(sceneRoot, { onEnter: enterStage });
}

async function enterStage() {
  if (view === 'loading') return;
  const firstVisit = !briefShown;
  if (!run) run = createRun();
  overview?.destroy(); overview = null;
  view = 'loading'; const generation = ++sceneGeneration;
  overviewButton.hidden = false; overviewButton.disabled = true;
  sceneRoot.innerHTML = '<div class="stage-host"></div><div class="scene-loading" role="status"><h2>현장으로 이동 중입니다.</h2><p>컨베이어 현장과 작업자를 불러오는 중입니다.</p></div>';
  try {
    const controller = await mountStage(sceneRoot.querySelector('.stage-host'), {
      reducedMotion: motionInput.checked, onInspect: openInspection, onPosition: updatePosition,
    });
    if (generation !== sceneGeneration) { controller.destroy(); return; }
    stage = controller;
    if (savedPosition) stage.restore(savedPosition);
    stage.setPaused(true);
    view = 'stage'; overviewButton.disabled = false;
    sceneRoot.querySelector('.scene-loading')?.remove();
    const hud = document.createElement('div'); hud.className = 'stage-hud';
    hud.innerHTML = '<div class="stage-heading"><strong>마지막 자물쇠</strong><small>이물질 제거 전, 직접 안전을 확보하세요.</small></div><div id="hud-counters" class="run-counters"></div>';
    const safety = document.createElement('div'); safety.className = 'safety-hud';
    safety.innerHTML = '<div id="hud-safety" class="safety-progress"></div><div id="location-chip" class="location-chip">지금 위치: 점검구 바깥</div>';
    const keys = document.createElement('div'); keys.className = 'stage-key-guide'; keys.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> 또는 <kbd>A</kbd> <kbd>D</kbd> 이동 &nbsp; <kbd>E</kbd> 가까운 대상 조사';
    sceneRoot.append(hud, safety, keys);
    updateHud(); if (position) updatePosition(position);
    footer.textContent = '작업자 시점 · 차단 지점으로 이동한 뒤 안전조치를 수행하세요.';
    if (run.completed) showResult({ kind: 'success', reason: '' });
    else if (firstVisit) showBrief();
    else { stage.setPaused(false); sceneRoot.querySelector('canvas')?.focus(); toast('이전 기록과 위치에서 체험을 이어갑니다.'); }
  } catch (error) {
    if (generation !== sceneGeneration) return;
    stage?.destroy(); stage = null; view = 'error'; overviewButton.disabled = false;
    sceneRoot.innerHTML = '<div class="scene-loading"><h2>현장 자료를 불러오지 못했습니다.</h2><p>배경, 작업자 이미지 또는 Phaser 연결을 확인한 뒤 다시 시도하세요.</p><button class="primary" type="button">다시 불러오기</button></div>';
    sceneRoot.querySelector('button').addEventListener('click', enterStage);
    announce('현장 자료를 불러오지 못했습니다. 다시 불러오기를 선택하세요.');
    console.error('현장 불러오기 실패:', error);
  }
}
function showBrief() {
  briefShown = true;
  openDialog('brief', '<div class="dialog-topline"><span class="dialog-kicker">작업 요청</span></div><h2 id="dialog-title">마지막 자물쇠</h2><p class="dialog-copy">컨베이어 점검구 안에 이물질이 끼었습니다. 제거 작업을 맡았습니다. 벨트는 멈춰 있지만, 작업에 들어가기 전에 직접 안전을 확보해야 합니다.</p><p class="prototype-note">차단 위치와 행동은 체험을 위한 가정입니다. 실제 작업에서는 승인된 현장별 설비 절차를 따릅니다.</p><div class="keyboard-guide">좌우 방향키 또는 A / D로 이동합니다.<br>가까운 대상에서 E 또는 조사 버튼을 누르세요.<br>조사 기록과 안전조치 완료 상태는 다릅니다.</div><div class="dialog-actions"><button class="primary" data-close type="button">현장 탐색 시작</button></div>');
}
function openInspection(targetId) {
  if (view !== 'stage' || !stage || dialog.open || run.completed) return;
  const target = TARGETS.find(item => item.id === targetId);
  if (!target || position?.nearestTargetId !== targetId || !position.inRange) return;
  inspect(run, targetId);
  if (targetId === 'work-access') safeEntryPosition = stage.snapshot();
  renderTarget(target);
}
function renderTarget(target, message = '', focusedAction = null) {
  const actions = ACTIONS.filter(action => action.targetId === target.id);
  const entry = target.id === 'work-access';
  const actionButtons = actions.map(action => {
    const completed = Boolean(run.safety[actionSafetyKeys[action.id]]);
    return `<button type="button" data-action="${escapeHtml(action.id)}" class="${action.id === 'enter-work' ? 'primary' : action.id === 'attach-wrong-lock' ? 'danger-button' : ''} ${completed ? 'completed-action' : ''}">${escapeHtml(action.label)}${completed ? '<span class="action-status">완료</span>' : ''}</button>`;
  }).join('');
  openDialog('inspect', `<div class="dialog-topline"><span class="dialog-kicker">${entry ? '작업 진입 판단' : '대상 조사와 행동'}</span><button type="button" class="dialog-close" data-close>닫기 <span aria-hidden="true">×</span></button></div><h2 id="dialog-title">${escapeHtml(target.title)}</h2><p class="dialog-copy">${escapeHtml(target.text)}</p><p class="target-fact">${escapeHtml(target.fact)}</p>${equipmentMarkup(target.id, run.safety)}${entry ? safetyMarkup() : ''}<p class="prototype-note">화면 속 차단 지점·잔류 에너지 조치·확인 행동은 초안의 가정입니다. 현장 절차 대조 후 확정합니다.</p><div class="action-grid">${actionButtons}</div><p class="action-feedback" role="status">${escapeHtml(message)}</p>${entry ? '<div class="dialog-actions"><button data-close type="button">안전조치 보완</button></div>' : ''}`, focusedAction ? `[data-action="${focusedAction}"]` : '[data-close]');
  dialogContent.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => performAction(target, button.dataset.action)));
}
async function performAction(target, actionId) {
  if (!stage || modalKind !== 'inspect' || position?.nearestTargetId !== target.id || !position.inRange) return;
  const result = applyAction(run, actionId);
  updateHud(); announce(result.reason);
  if (result.kind === 'wrong' && result.effect === 'accident') {
    forceCloseDialog(); stage.setPaused(true);
    modalKind = 'accident'; overviewButton.disabled = true; const generation = sceneGeneration;
    await stage.playAccident();
    if (generation === sceneGeneration) showAccident(result);
  } else if (result.kind === 'success') {
    showResult(result);
  } else if (result.kind === 'incomplete' || result.kind === 'blocked') {
    openDialog('feedback', `<div class="dialog-topline"><span class="dialog-kicker">안전조치 보완</span><button class="dialog-close" data-close type="button">닫기 ×</button></div><h2 id="dialog-title">${result.kind === 'blocked' ? '조치를 보완해야 합니다.' : '아직 필수 조치가 끝나지 않았습니다.'}</h2><p class="dialog-copy">${escapeHtml(result.reason)}</p>${safetyMarkup()}<div class="dialog-actions"><button class="primary" type="button" data-close>현장으로 돌아가 보완</button></div>`, '.primary');
  } else {
    renderTarget(target, result.reason, actionId);
  }
}
function showAccident(result) {
  openDialog('accident', `<div class="dialog-topline"><span class="dialog-kicker">사고 재현</span></div><h2 id="dialog-title">벨트가 움직였습니다.</h2><p class="dialog-copy">이물질을 제거하려던 순간 컨베이어가 불시에 움직였습니다.</p><div class="accident-context">${escapeHtml(result.reason)}</div><p class="rewind-note">조사 기록과 안전조치는 유지됩니다. 작업 진입 전 안전한 위치에서 잘못된 조치를 보완하세요.</p><div class="dialog-actions"><button id="rewind-button" type="button" class="primary">되감기</button></div><p class="rewind-note">현실에는 없는 버튼입니다.</p>`, '#rewind-button');
  dialogContent.querySelector('#rewind-button').addEventListener('click', () => {
    rewind(run); overviewButton.disabled = false; forceCloseDialog(); stage.clearAccident();
    if (safeEntryPosition) stage.restore(safeEntryPosition);
    updateHud(); stage.setPaused(false);
    toast('작업 진입 전으로 돌아왔습니다. 안전조치를 보완하세요.');
    sceneRoot.querySelector('.stage-interact')?.focus();
  });
}
function showResult(result) {
  openDialog('result', `<div class="dialog-topline"><span class="dialog-kicker">작업 완료</span></div><h2 id="dialog-title">안전을 확인하고<br>작업에 들어갔습니다.</h2><figure class="result-image"><img src="../assets/images/scenario-scenes/05-safe-cleanup.png" alt="안전한 이물질 제거를 설명하는 참고 장면"><figcaption>설명을 위한 참고 이미지입니다.</figcaption></figure>${safetyMarkup()}<div class="result-counters"><span>판단 시도<strong>${run.attempts}</strong></span><span>되감기<strong>${run.rewinds}</strong></span></div><span id="explanation-label" class="explanation-label">고정 설명</span><p id="result-explanation" class="dialog-copy">${escapeHtml(result.reason || '멈춰 있다는 표시를 믿고 들어가지 않았습니다. 직접 차단하고 본인 자물쇠·표지를 체결한 뒤, 차단을 확인하고 작업에 들어갔습니다.')}</p><p>정지와 에너지 차단은 다릅니다.</p><p>본인 자물쇠와 표지로 본인의 작업을 보호합니다.</p><p>잠금 후에도 차단이 유효한지 확인하고 작업에 들어갑니다.</p><p class="result-final">현실에는 되감기가 없습니다.</p><div class="dialog-actions"><button id="retry-button" class="primary" type="button">다시 연습</button><button id="result-overview" type="button">공장으로</button></div>`, '#retry-button');
  const resultImage = dialogContent.querySelector('.result-image');
  const image = resultImage.querySelector('img');
  const retryImage = document.createElement('button');
  retryImage.type = 'button'; retryImage.textContent = '참고 이미지 다시 불러오기'; retryImage.hidden = true;
  resultImage.append(retryImage);
  image.addEventListener('error', () => {
    resultImage.querySelector('figcaption').textContent = '참고 이미지를 불러오지 못했습니다. 작업 결과와 기록은 유지됩니다.';
    retryImage.hidden = false;
  });
  image.addEventListener('load', () => {
    resultImage.querySelector('figcaption').textContent = '설명을 위한 참고 이미지입니다.';
    retryImage.hidden = true;
  });
  retryImage.addEventListener('click', () => {
    retryImage.hidden = true;
    resultImage.querySelector('figcaption').textContent = '참고 이미지를 다시 불러오는 중입니다.';
    image.src = `${image.src.split('?')[0]}?retry=${Date.now()}`;
  });
  dialogContent.querySelector('#retry-button').addEventListener('click', retry);
  dialogContent.querySelector('#result-overview').addEventListener('click', showOverview);

}
function retry() {
  clearTimeout(toastTimer);
  forceCloseDialog(); run = createRun(); savedPosition = null; safeEntryPosition = null;
  stage.clearAccident(); stage.reset(); updateHud(); stage.setPaused(true);
  showBrief(); announce('새 연습을 시작합니다. 모든 기록과 안전조치가 초기화되었습니다.');
}

showOverview();
