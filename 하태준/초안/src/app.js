import { mountOverview } from './overview.js';
import { mountStage } from './stage.js';
import { TARGETS, STEPS, SAFETY_STEPS, createRun, chooseOption, acknowledgeOutcome, getCurrentStep, getPendingOutcome, getPresentationState, rewind } from './scenario.mjs';
import { getExplanation } from './feedback.mjs';

const sceneRoot = document.querySelector('#scene-root');
const dialog = document.querySelector('#game-dialog');
const dialogContent = document.querySelector('#dialog-content');
const overviewButton = document.querySelector('#overview-button');
const motionInput = document.querySelector('#reduced-motion');
const footer = document.querySelector('#footer-context');
const announcement = document.querySelector('#announcement');
motionInput.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.body.dataset.reducedMotion = String(motionInput.checked);
// Keep comparison controls available inside modal dialogs as well as the header.
document.querySelectorAll('[data-theme-choice]').forEach(button => {
  button.addEventListener('click', () => {
    const theme = button.dataset.themeChoice;
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach(control => {
      control.setAttribute('aria-pressed', String(control.dataset.themeChoice === theme));
    });
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f5f5f7' : theme === 'dark' ? '#171719' : '#202927';
  });
});
let run = null, stage = null, overview = null, position = null, savedPosition = null;
let view = 'overview', modalKind = '', returnFocus = null, briefAcknowledged = false;
let sceneGeneration = 0, explanationGeneration = 0, explanationRequest = null, toastTimer = null;
let actionInFlight = false, actionCheckpoint = null;
const aiEnabled = new URLSearchParams(location.search).get('ai') === 'on';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const announce = text => { announcement.textContent = text; };
const targetById = id => TARGETS.find(target => target.id === id);
const isNear = id => position?.nearestTargetId === id && position.inRange;
const outcomeIsCorrect = outcome => outcome.kind === 'progress' || outcome.correct === true;
const outcomeIsAccident = outcome => outcome.kind === 'accident' || outcome.effect === 'accident';

function cancelExplanation() {
  explanationGeneration += 1;
  explanationRequest?.abort(); explanationRequest = null;
}
function safetyMarkup(className = 'panel-safety', safety = run?.safety) {
  return `<ol class="${className}">${SAFETY_STEPS.map((step, index) => `<li class="${safety?.[step.key] ? 'done' : index === run?.stepIndex ? 'current' : 'missing'}"><span class="step-mark" aria-hidden="true">${safety?.[step.key] ? '✓' : index + 1}</span>${escapeHtml(step.label)}<span class="sr-only">${safety?.[step.key] ? '완료' : index === run?.stepIndex ? '현재 단계' : '미완료'}</span></li>`).join('')}</ol>`;
}
function updateHud(safety = run.safety) {
  const step = getCurrentStep(run);
  const progress = sceneRoot.querySelector('#hud-safety');
  if (progress) progress.innerHTML = `<p>작업 절차 · ${SAFETY_STEPS.filter(step => safety[step.key]).length} / 6 완료</p>${safetyMarkup('safety-list', safety)}`;
  const goal = sceneRoot.querySelector('#current-goal');
  if (goal) goal.textContent = step ? `다음 행동: ${step.title} · ${targetById(step.targetId)?.title ?? ''}` : '이물질 제거 작업 완료';
  const counters = sceneRoot.querySelector('#hud-counters');
  if (counters) counters.innerHTML = `선택 <strong>${run.attempts}</strong> 되감기 <strong>${run.rewinds}</strong>`;
  sceneRoot.dataset.stepIndex = String(run.stepIndex);
  stage?.updateSafety(safety); stage?.setObjective?.(step?.targetId ?? null);
}
function updatePosition(nextPosition) {
  position = nextPosition;
  const target = nextPosition.inRange ? targetById(nextPosition.nearestTargetId) : null;
  const chip = sceneRoot.querySelector('#location-chip');
  if (chip) {
    chip.textContent = target ? `현재 위치: ${target.title}` : '현재 위치: 현장 통로';
    chip.dataset.worldX = String(Math.round(nextPosition.x));
    chip.dataset.targetId = nextPosition.nearestTargetId;
    chip.dataset.inRange = String(Boolean(nextPosition.inRange));
    for (const field of ['velocity', 'facing', 'frame', 'cameraX', 'floorY']) {
      chip.dataset[field] = String(nextPosition[field] ?? '');
    }
  }
}
function toast(message) {
  clearTimeout(toastTimer); sceneRoot.querySelector('.stage-toast')?.remove();
  const element = document.createElement('div'); element.className = 'stage-toast'; element.textContent = message;
  sceneRoot.append(element); announce(message); toastTimer = setTimeout(() => element.remove(), 4200);
}
function openDialog(kind, html, initialFocus = '.primary') {
  if (!dialog.open) returnFocus = document.activeElement;
  modalKind = kind; dialog.dataset.kind = kind;
  dialog.classList.toggle('accident-dialog', kind === 'accident');
  dialogContent.innerHTML = `<div class="dialog-inner">${html}</div>`;
  stage?.setPaused(true);
  if (!dialog.open) dialog.showModal();
  dialogContent.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialogContent.querySelectorAll('[data-overview]').forEach(button => button.addEventListener('click', showOverview));
  requestAnimationFrame(() => dialogContent.querySelector(initialFocus)?.focus());
}
function forceCloseDialog() { modalKind = ''; if (dialog.open) dialog.close(); }
dialog.addEventListener('cancel', event => {
  if (['accident', 'outcome', 'result', 'brief', 'action-error'].includes(modalKind)) event.preventDefault();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  modalKind = ''; stage?.setPaused(Boolean(run?.completed || run?.pending || actionInFlight));
  if (view === 'stage') {
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus();
    else sceneRoot.querySelector('.stage-canvas canvas')?.focus();
  }
});
dialog.addEventListener('keydown', event => {
  if (modalKind !== 'quiz' || event.repeat || !/^[1-4]$/.test(event.key)) return;
  const button = dialogContent.querySelectorAll('[data-option]')[Number(event.key) - 1];
  if (button && !button.disabled) { event.preventDefault(); button.click(); }
});
motionInput.addEventListener('change', () => {
  document.body.dataset.reducedMotion = String(motionInput.checked);
  stage?.setReducedMotion(motionInput.checked);
});
overviewButton.addEventListener('click', showOverview);

function showOverview() {
  sceneGeneration += 1; cancelExplanation(); clearTimeout(toastTimer);
  savedPosition = stage?.snapshot() ?? savedPosition;
  forceCloseDialog(); stage?.destroy(); stage = null; actionInFlight = false;
  overview?.destroy(); view = 'overview'; document.body.dataset.view = view; position = null;
  overviewButton.hidden = true; overviewButton.disabled = false;
  footer.textContent = run ? 'B/C 구역을 선택하면 현재 단계와 선택 결과를 이어갑니다.' : '공장 전경에서 B/C 구역을 선택하세요.';
  overview = mountOverview(sceneRoot, { onEnter: enterStage, resume: Boolean(run) });
}
async function enterStage() {
  if (view === 'loading') return;
  if (!run) run = createRun();
  cancelExplanation(); overview?.destroy(); overview = null;
  view = 'loading'; document.body.dataset.view = view; const generation = ++sceneGeneration;
  overviewButton.hidden = false; overviewButton.disabled = true;
  sceneRoot.innerHTML = '<img class="loading-factory" src="./assets/stage-background.png" alt=""><div class="stage-host"></div><div class="scene-loading" role="status"><h2>컨베이어 현장으로 이동합니다.</h2><p>현장과 작업자를 불러오는 중입니다.</p></div>';
  try {
    const controller = await mountStage(sceneRoot.querySelector('.stage-host'), { reducedMotion: motionInput.checked, onInspect: openInspection, onPosition: updatePosition });
    if (generation !== sceneGeneration) { controller.destroy(); return; }
    stage = controller; if (savedPosition) stage.restore(savedPosition);
    stage.setPaused(true); view = 'stage'; document.body.dataset.view = view; overviewButton.disabled = false;
    sceneRoot.querySelector('.scene-loading')?.remove(); sceneRoot.querySelector('.loading-factory')?.remove();
    const hud = document.createElement('div'); hud.className = 'stage-hud';
    hud.innerHTML = '<div class="stage-heading"><strong>컨베이어 이물질 제거</strong><small id="current-goal"></small></div><div id="hud-counters" class="run-counters"></div>';
    const safety = document.createElement('div'); safety.className = 'safety-hud';
    safety.innerHTML = '<div id="hud-safety" class="safety-progress"></div><div id="location-chip" class="location-chip">현재 위치: 현장 통로</div>';
    const keys = document.createElement('div'); keys.className = 'stage-key-guide'; keys.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> 이동 &nbsp; <kbd>E</kbd> 현재 위치에서 행동 선택';
    sceneRoot.append(hud, safety, keys); updateHud(getPresentationState(run).beforeSafety); if (position) updatePosition(position);
    footer.textContent = '단계별 행동을 선택하고 현장의 변화와 설명을 확인하세요.';
    if (run.completed) showResult();
    else if (run.pending) await presentOutcome(getPendingOutcome(run));
    else if (!briefAcknowledged) showBrief();
    else { stage.setPaused(false); toast('이전 위치와 단계에서 이어갑니다. 다음 행동의 위치로 이동하세요.'); }
  } catch (error) {
    if (generation !== sceneGeneration) return;
    stage?.destroy(); stage = null; view = 'error'; document.body.dataset.view = view; overviewButton.disabled = false;
    sceneRoot.innerHTML = '<div class="scene-loading"><h2>현장을 불러오지 못했습니다.</h2><p>현장 이미지와 서버 연결을 확인한 뒤 다시 불러오세요.</p><button class="primary" type="button">다시 불러오기</button></div>';
    sceneRoot.querySelector('button').addEventListener('click', enterStage);
    announce('현장을 불러오지 못했습니다. 다시 불러오기를 선택하세요.'); console.error('현장 불러오기 실패:', error);
  }
}
function showBrief() {
  openDialog('brief', `<div class="dialog-topline"><span class="dialog-kicker">작업반장의 지시</span><button class="dialog-close" data-overview type="button">공장 전경</button></div><div class="foreman-brief"><div class="foreman-portrait"><img src="../../assets/images/character-candidates/candidate-02-40s.png" alt="작업반장 역할의 인물"></div><div><p class="speaker-label">작업반장</p><blockquote>“컨베이어 밑에 있는 이물질을 제거하세요.”</blockquote></div></div><h2 id="dialog-title">작업을 시작하기 전에<br>무엇을 하겠습니까?</h2><p class="dialog-copy">현재 조작반 근처에 있습니다. 먼저 할 행동을 고른 뒤, 행동이 만든 현장 변화를 확인하세요.</p><p class="prototype-note">현장 절차를 검토하기 위한 교육 초안입니다. 실제 작업은 승인된 현장 절차에 따릅니다.</p><div class="dialog-actions"><button id="begin-button" class="primary" type="button">첫 행동 선택</button></div>`);
  dialogContent.querySelector('#begin-button').addEventListener('click', () => {
    briefAcknowledged = true; forceCloseDialog(); openCurrentQuiz();
  });
}
function openInspection(targetId) {
  if (view !== 'stage' || !stage || dialog.open || run.completed || run.pending || actionInFlight || !isNear(targetId)) return;
  const step = getCurrentStep(run);
  if (!step) return;
  if (step.targetId !== targetId) { toast(`지금은 ${step.title} 단계입니다. ${targetById(step.targetId)?.title} 가까이 이동하세요.`); return; }
  run.observed.add(targetId); openCurrentQuiz();
}
function openCurrentQuiz() {
  const step = getCurrentStep(run);
  if (!step || run.pending || actionInFlight) return;
  if (!isNear(step.targetId)) { stage?.setPaused(false); toast(`${targetById(step.targetId)?.title} 가까이 이동한 뒤 E 또는 행동 선택 버튼을 누르세요.`); return; }
  run.observed.add(step.targetId);
  openDialog('quiz', `<div class="dialog-topline"><span class="dialog-kicker">${run.stepIndex + 1} / 6 · ${escapeHtml(step.title)}</span><button class="dialog-close" data-close type="button">현장 보기 ×</button></div><p class="question-location">${escapeHtml(targetById(step.targetId)?.title)}</p><h2 id="dialog-title">${escapeHtml(step.question)}</h2><div class="option-list">${step.options.map((option, index) => `<button type="button" data-option="${escapeHtml(option.id)}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option.text)}</span><kbd>${index + 1}</kbd></button>`).join('')}</div><p class="choice-guide">한 가지 행동을 선택하세요. 숫자 키 1–4로도 선택할 수 있습니다.</p>`, '[data-option]');
  dialogContent.querySelectorAll('[data-option]').forEach(button => button.addEventListener('click', () => selectOption(button.dataset.option)));
}
async function selectOption(optionId) {
  if (modalKind !== 'quiz' || actionInFlight || run.pending || !isNear(getCurrentStep(run)?.targetId)) return;
  actionInFlight = true;
  dialogContent.querySelectorAll('[data-option]').forEach(button => { button.disabled = true; });
  actionCheckpoint = stage.snapshot();
  const outcome = chooseOption(run, optionId);
  await presentOutcome(outcome);
}
async function presentOutcome(outcome) {
  if (!outcome || !stage) return;
  actionInFlight = true; const generation = sceneGeneration; const controller = stage;
  const presentation = getPresentationState(run);
  forceCloseDialog(); controller.setPaused(true); updateHud(presentation.beforeSafety);
  try {
    await controller.playAction(outcome, presentation);
    if (generation !== sceneGeneration) return;
    if (outcomeIsAccident(outcome)) {
      await controller.playAccident(outcome);
      if (generation !== sceneGeneration) return;
      showAccident(outcome);
    } else { updateHud(presentation.afterSafety); showOutcome(outcome); }
  } catch (error) {
    if (generation !== sceneGeneration) return;
    openDialog('action-error', '<h2 id="dialog-title">행동 장면을 불러오지 못했습니다.</h2><p class="dialog-copy">선택한 행동은 보관되어 있습니다. 이미지를 다시 불러와 같은 행동을 확인하세요.</p><div class="dialog-actions"><button id="retry-action" class="primary" type="button">장면 다시 불러오기</button><button data-overview type="button">공장 전경</button></div>');
    dialogContent.querySelector('#retry-action').addEventListener('click', () => { if (!actionInFlight) presentOutcome(getPendingOutcome(run)); });
    console.error('행동 장면 불러오기 실패:', error);
  } finally { if (generation === sceneGeneration) actionInFlight = false; }
}
function outcomeText(outcome) { return outcome.explanation ?? outcome.reason ?? ''; }
function showOutcome(outcome) {
  const correct = outcomeIsCorrect(outcome);
  openDialog('outcome', `<div class="dialog-topline"><span class="dialog-kicker ${correct ? 'correct-label' : 'risk-label'}">${correct ? '단계 완료' : '이 선택의 위험'}</span><button class="dialog-close" data-overview type="button">공장 전경</button></div><h2 id="dialog-title">${escapeHtml(outcome.title)}</h2><p class="performed-action"><span>선택한 행동</span>${escapeHtml(outcome.actionCaption ?? outcome.text)}</p><p class="dialog-copy">${escapeHtml(outcomeText(outcome))}</p><div class="dialog-actions"><button id="acknowledge-button" class="primary" type="button">${correct ? run.stepIndex === STEPS.length - 1 ? '작업 결과 확인' : '다음 단계' : '다시 선택'}</button></div>`);
  dialogContent.querySelector('#acknowledge-button').addEventListener('click', () => {
    if (actionInFlight || !run.pending) return;
    acknowledgeOutcome(run); forceCloseDialog(); updateHud();
    if (run.completed) showResult();
    else if (isNear(getCurrentStep(run).targetId)) openCurrentQuiz();
    else { stage.setPaused(false); toast(`${getCurrentStep(run).title}: ${targetById(getCurrentStep(run).targetId)?.title} 가까이 이동하세요.`); }
  });
}
function showAccident(outcome) {
  openDialog('accident', `<div class="dialog-topline"><span class="dialog-kicker">사고 재현</span><button class="dialog-close" data-overview type="button">공장 전경</button></div><h2 id="dialog-title">${escapeHtml(outcome.title)}</h2><p class="performed-action"><span>선택한 행동</span>${escapeHtml(outcome.actionCaption ?? outcome.text)}</p><div class="accident-context">${escapeHtml(outcomeText(outcome))}</div><p class="rewind-note">선택 직전으로 돌아갑니다. 이전 단계의 안전조치와 기록은 유지됩니다.</p><div class="dialog-actions"><button id="rewind-button" class="primary" type="button">되감기</button></div><p class="rewind-note">현실에는 되감기가 없습니다.</p>`);
  dialogContent.querySelector('#rewind-button').addEventListener('click', () => {
    if (actionInFlight || !run.pending) return;
    rewind(run); forceCloseDialog(); stage.clearAccident();
    if (actionCheckpoint) stage.restore(actionCheckpoint);
    updateHud(); stage.setPaused(false); openCurrentQuiz(); announce('선택 직전으로 돌아왔습니다. 같은 단계의 행동을 다시 선택하세요.');
  });
}
function showResult() {
  cancelExplanation();
  openDialog('result', `<div class="dialog-topline"><span class="dialog-kicker">6단계 완료</span></div><h2 id="dialog-title">안전조치를 확인하고<br>이물질을 제거했습니다.</h2>${safetyMarkup()}<div class="result-counters"><span>행동 선택 <strong>${run.attempts}</strong></span><span>되감기 <strong>${run.rewinds}</strong></span></div><span id="explanation-label" class="explanation-label">기본 설명</span><p id="result-explanation" class="dialog-copy">설비 정지, 오퍼레이터 전달, MCC 개인 잠금, 태그아웃, 트라이아웃을 거쳐 작업했습니다. 현실에는 되감기가 없습니다.</p><div class="dialog-actions"><button id="retry-button" class="primary" type="button">다시 연습</button><button data-overview type="button">공장 전경</button></div>`);
  dialogContent.querySelector('#retry-button').addEventListener('click', retry);
  explanationRequest = new AbortController(); const generation = ++explanationGeneration;
  getExplanation(run, { enabled: aiEnabled, signal: explanationRequest.signal }).then(explanation => {
    if (generation !== explanationGeneration || modalKind !== 'result' || view !== 'stage') return;
    dialogContent.querySelector('#result-explanation').textContent = explanation.text;
    dialogContent.querySelector('#explanation-label').textContent = explanation.source === 'ai' ? 'AI 보충 설명 · 판정은 고정 규칙 적용' : '기본 설명';
  }).catch(() => undefined);
}
function retry() {
  sceneGeneration += 1; cancelExplanation(); clearTimeout(toastTimer); sceneRoot.querySelector('.stage-toast')?.remove();
  forceCloseDialog(); run = createRun(); savedPosition = null; actionCheckpoint = null;
  actionInFlight = false; briefAcknowledged = false; position = null;
  stage.clearAccident(); stage.reset(); updateHud(); stage.setPaused(true);
  showBrief(); announce('새 연습을 시작합니다. 위치, 단계, 안전조치와 기록을 초기화했습니다.');
}
showOverview();
