import { mountOverview } from './overview.js';
import { mountStage } from './stage.js';
import { TARGETS, STEPS, SAFETY_STEPS, createRun, chooseOption, acknowledgeOutcome, getCurrentStep, getPendingOutcome, rewind } from './scenario.mjs';
import { getExplanation } from './feedback.mjs';
import { getWrongChoiceFeedback } from './choice-feedback.mjs';
import { CATALOG, MAX_LEARNING_EVENTS, buildLearningReport, getLearningReport, exportLearningRecord } from './learning.mjs';

const sceneRoot = document.querySelector('#scene-root');
const dialog = document.querySelector('#game-dialog');
const dialogContent = document.querySelector('#dialog-content');
const overviewButton = document.querySelector('#overview-button');
const motionInput = document.querySelector('#reduced-motion');
const textInput = document.querySelector('#large-text');
const appShell = document.querySelector('.app-shell');
const footer = document.querySelector('#footer-context');
const announcement = document.querySelector('#announcement');
motionInput.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let run = null, stage = null, overview = null, position = null, savedPosition = null;
let view = 'overview', modalKind = '', returnFocus = null, briefAcknowledged = false;
let sceneGeneration = 0, explanationGeneration = 0, explanationRequest = null, toastTimer = null;
let actionInFlight = false, actionCheckpoint = null, actionBeforeSafety = null;
let learningEvents = [], learningReport = null, learningResolved = false;
let learningGeneration = 0, learningRequest = null;
const trainingChecks = new Map();
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
  learningGeneration += 1;
  learningRequest?.abort(); learningRequest = null;
}
function safetyMarkup(className = 'panel-safety') {
  return `<ol class="${className}">${SAFETY_STEPS.map((step, index) => `<li class="${run?.safety[step.key] ? 'done' : index === run?.stepIndex ? 'current' : 'missing'}"><span class="step-mark" aria-hidden="true">${run?.safety[step.key] ? '✓' : index + 1}</span>${escapeHtml(step.label)}<span class="sr-only">${run?.safety[step.key] ? '완료' : index === run?.stepIndex ? '현재 단계' : '미완료'}</span></li>`).join('')}</ol>`;
}
function updateGoal() {
  const step = getCurrentStep(run);
  const goal = sceneRoot.querySelector('#current-goal');
  if (!goal) return;
  if (!step) { goal.textContent = '이물질 제거 작업 완료'; return; }
  const target = targetById(step.targetId)?.title ?? '';
  let guide = `${target}에서 행동을 선택하세요.`;
  if (actionInFlight || run.pending) guide = '행동과 현장 변화를 확인하세요.';
  else if (position?.objectiveDirection === 'left' || position?.objectiveDirection === 'right') {
    guide = `이동 방향: ${target} ${position.objectiveDirection === 'left' ? '←' : '→'} · 가까이 가서 E`;
  } else if (isNear(step.targetId) || position?.objectiveDirection === 'here') {
    guide = `${target} · E로 행동 선택`;
  }
  goal.textContent = `${step.title}\n${guide}`;
  goal.dataset.direction = position?.objectiveDirection ?? '';
  goal.dataset.distance = String(position?.objectiveDistance ?? '');
}
function updateHud() {
  const step = getCurrentStep(run);
  const progress = sceneRoot.querySelector('#hud-safety');
  if (progress) progress.innerHTML = `<p>작업 절차 <strong>${Math.min(run.stepIndex, 6)} / 6</strong></p>${safetyMarkup('safety-list')}`;
  updateGoal();
  const counters = sceneRoot.querySelector('#hud-counters');
  if (counters) counters.innerHTML = `선택 <strong>${run.attempts}</strong> 되감기 <strong>${run.rewinds}</strong>`;
  sceneRoot.dataset.stepIndex = String(run.stepIndex);
  stage?.updateSafety(run.safety); stage?.setObjective?.(step?.targetId ?? null);
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
    for (const field of ['velocity', 'facing', 'frame', 'cameraX', 'floorY', 'visualAction', 'pose', 'beltRunning', 'lockVisible', 'tagVisible', 'cameraZoom', 'actionPhase', 'visualMessage', 'objectiveDirection', 'objectiveDistance', 'actorPhase', 'actorAction', 'actorX', 'objectiveVisible', 'objectiveOutline', 'objectiveArrow', 'actorMode', 'actorOwner', 'ownerReleased', 'inspectionStatus', 'isolationOn', 'scopeBlocked', 'riskExample', 'choiceFocused', 'displayFacing', 'choiceZoom', 'choiceScale', 'frontRenderedHeight', 'waitingMotion']) {
      chip.dataset[field] = String(nextPosition[field] ?? '');
    }
  }
  updateGoal();
}
function toast(message) {
  clearTimeout(toastTimer); sceneRoot.querySelector('.stage-toast')?.remove();
  const element = document.createElement('div'); element.className = 'stage-toast'; element.textContent = message;
  sceneRoot.append(element); announce(message); toastTimer = setTimeout(() => element.remove(), 4200);
}
function openDialog(kind, html, initialFocus = '.primary') {
  if (!dialog.open) returnFocus = document.activeElement;
  modalKind = kind; dialog.dataset.kind = kind;
  document.querySelector('.app-shell').dataset.dialog = kind;
  dialog.classList.toggle('accident-dialog', kind === 'accident');
  dialog.classList.toggle('compact-feedback', ['outcome', 'accident'].includes(kind) && run?.pending?.kind === 'wrong');
  dialogContent.innerHTML = `<div class="dialog-inner">${html}</div>`;
  stage?.setPaused(true);
  if (!dialog.open) dialog.showModal();
  stage?.setChoiceFocus?.(kind === 'quiz');
  dialogContent.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { stage?.setChoiceFocus?.(false); dialog.close(); }));
  dialogContent.querySelectorAll('[data-overview]').forEach(button => button.addEventListener('click', showOverview));
  requestAnimationFrame(() => dialogContent.querySelector(initialFocus)?.focus());
}
function forceCloseDialog() { stage?.setChoiceFocus?.(false); modalKind = ''; document.querySelector('.app-shell').dataset.dialog = ''; if (dialog.open) dialog.close(); }
dialog.addEventListener('cancel', event => {
  if (modalKind === 'quiz') stage?.setChoiceFocus?.(false);
  if (['accident', 'outcome', 'result', 'brief'].includes(modalKind)) event.preventDefault();
  if (modalKind === 'training') { event.preventDefault(); showResult(); }
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  stage?.setChoiceFocus?.(false);
  modalKind = ''; document.querySelector('.app-shell').dataset.dialog = ''; stage?.setPaused(Boolean(run?.completed || run?.pending || actionInFlight));
  if (view === 'stage') {
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus();
    else sceneRoot.querySelector('.stage-canvas canvas')?.focus();
  }
});
dialog.addEventListener('keydown', event => {
  if (!['quiz', 'training'].includes(modalKind) || event.repeat || !/^[1-4]$/.test(event.key)) return;
  const button = dialogContent.querySelectorAll(modalKind === 'quiz' ? '[data-option]' : '[data-training-option]')[Number(event.key) - 1];
  if (button && !button.disabled) { event.preventDefault(); button.click(); }
});
motionInput.addEventListener('change', () => { stage?.setReducedMotion(motionInput.checked); overview?.setReducedMotion(motionInput.checked); });
textInput.addEventListener('change', () => {
  appShell.classList.toggle('large-text', textInput.checked);
  dialog.classList.toggle('large-text', textInput.checked);
});
overviewButton.addEventListener('click', showOverview);

function showOverview() {
  sceneGeneration += 1; cancelExplanation(); clearTimeout(toastTimer);
  savedPosition = stage?.snapshot() ?? savedPosition;
  forceCloseDialog(); stage?.destroy(); stage = null; actionInFlight = false;
  overview?.destroy(); view = 'overview'; position = null;
  document.querySelector('.app-shell').dataset.view = view;
  overviewButton.hidden = true; overviewButton.disabled = false;
  footer.textContent = run ? 'B/C 구역을 선택하면 현재 단계와 선택 결과를 이어갑니다.' : '공장 전경에서 B/C 구역을 선택하세요.';
  overview = mountOverview(sceneRoot, { onEnter: enterStage, resume: Boolean(run), reducedMotion: motionInput.checked });
}
async function enterStage() {
  if (view === 'loading') return;
  if (!run) run = createRun();
  cancelExplanation();
  view = 'loading'; const generation = ++sceneGeneration;
  document.querySelector('.app-shell').dataset.view = view;
  overviewButton.hidden = false; overviewButton.disabled = true;
  const host = document.createElement('div'); host.className = 'stage-host';
  sceneRoot.append(host);
  if (!overview) {
    const loading = document.createElement('div'); loading.className = 'scene-loading';
    loading.setAttribute('role', 'status'); loading.textContent = '컨베이어 현장으로 이동합니다.';
    sceneRoot.append(loading);
  }
  try {
    const controller = await mountStage(host, { reducedMotion: motionInput.checked, onInspect: openInspection, onPosition: updatePosition });
    if (generation !== sceneGeneration) { controller.destroy(); return; }
    stage = controller; if (savedPosition) stage.restore(savedPosition);
    stage.setPaused(true);
    const enteringOverview = overview;
    await enteringOverview?.reveal();
    if (generation !== sceneGeneration) { controller.destroy(); return; }
    enteringOverview?.destroy(); overview = null;
    view = 'stage'; overviewButton.disabled = false;
    document.querySelector('.app-shell').dataset.view = view;
    sceneRoot.querySelector('.scene-loading')?.remove();
    const hud = document.createElement('div'); hud.className = 'stage-hud';
    hud.innerHTML = '<div class="stage-heading"><strong>컨베이어 이물질 제거</strong><small id="current-goal"></small></div>';
    const safety = document.createElement('div'); safety.className = 'safety-hud';
    safety.innerHTML = '<div id="hud-safety" class="safety-progress"></div><div class="field-status"><div id="location-chip" class="location-chip">현재 위치: 현장 통로</div><div id="hud-counters" class="run-counters"></div></div>';
    const keys = document.createElement('div'); keys.className = 'stage-key-guide'; keys.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> 이동 &nbsp; <kbd>E</kbd> 현재 위치에서 행동 선택';
    sceneRoot.append(hud, safety, keys); updateHud(); if (position) updatePosition(position);
    footer.textContent = '단계별 행동을 선택하고 현장의 변화와 설명을 확인하세요.';
    if (run.completed) showResult();
    else if (run.pending) await presentOutcome(getPendingOutcome(run));
    else if (!briefAcknowledged) showBrief();
    else { stage.setPaused(false); toast('이전 위치와 단계에서 이어갑니다. 다음 행동의 위치로 이동하세요.'); }
  } catch (error) {
    if (generation !== sceneGeneration) return;
    stage?.destroy(); stage = null; overview?.destroy(); overview = null; view = 'error'; overviewButton.disabled = false;
    document.querySelector('.app-shell').dataset.view = view;
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
  openDialog('quiz', `<div class="dialog-topline"><span class="dialog-kicker">${run.stepIndex + 1} / 6 · ${escapeHtml(step.title)}</span><button class="dialog-close" data-close type="button">현장 보기 ×</button></div><p class="question-location">${escapeHtml(targetById(step.targetId)?.title)}</p><p class="choice-wait-cue">당신의 판단을 기다립니다.</p><h2 id="dialog-title">${escapeHtml(step.question)}</h2><div class="choice-options-scroll"><div class="option-list">${step.options.map((option, index) => `<button type="button" data-option="${escapeHtml(option.id)}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option.text)}</span><kbd>${index + 1}</kbd></button>`).join('')}</div></div><p class="choice-guide">한 가지 행동을 선택하세요. 숫자 키 1–4로도 선택할 수 있습니다.</p>`, '[data-option]');
  dialogContent.querySelectorAll('[data-option]').forEach(button => button.addEventListener('click', () => selectOption(button.dataset.option)));
}
async function selectOption(optionId) {
  if (modalKind !== 'quiz' || actionInFlight || run.pending || !isNear(getCurrentStep(run)?.targetId)) return;
  if (learningEvents.length >= MAX_LEARNING_EVENTS) {
    openDialog('history-limit', '<h2 id="dialog-title">이번 실습의 선택 기록이 가득 찼습니다.</h2><p class="dialog-copy">256회까지의 기록을 유지했습니다. 새 실습을 시작하면 기록과 진행 상태가 초기화됩니다.</p><div class="dialog-actions"><button id="limit-retry" class="primary" type="button">새 실습 시작</button><button data-overview type="button">공장 전경</button></div>');
    dialogContent.querySelector('#limit-retry').addEventListener('click', retry);
    return;
  }
  actionInFlight = true;
  dialogContent.querySelectorAll('[data-option]').forEach(button => { button.disabled = true; });
  actionCheckpoint = stage.snapshot();
  actionBeforeSafety = { ...run.safety };
  const outcome = chooseOption(run, optionId);
  if (['progress', 'wrong'].includes(outcome.kind)) learningEvents.push({ optionId });
  await presentOutcome(outcome);
}
async function presentOutcome(outcome) {
  if (!outcome || !stage) return;
  actionInFlight = true; const generation = sceneGeneration; const controller = stage;
  forceCloseDialog(); controller.setPaused(true); updateHud();
  try {
    await controller.playAction(outcome, { beforeSafety: actionBeforeSafety ?? { ...run.safety } });
    if (generation !== sceneGeneration) return;
    if (outcomeIsAccident(outcome)) {
      await controller.playAccident(outcome);
      if (generation !== sceneGeneration) return;
      showAccident(outcome);
    } else showOutcome(outcome);
  } finally { if (generation === sceneGeneration) actionInFlight = false; }
}
function outcomeText(outcome) { return outcome.explanation ?? outcome.reason ?? ''; }
function wrongFeedbackMarkup(outcome) {
  const copy = getWrongChoiceFeedback(outcome.optionId);
  return `<h2 id="dialog-title">${escapeHtml(copy.title)}</h2><dl class="choice-consequence" data-feedback-option="${escapeHtml(copy.optionId)}"><div><dt>잘못된 점</dt><dd>${escapeHtml(copy.mistake)}</dd></div><div><dt>위험</dt><dd>${escapeHtml(copy.risk)}</dd></div><div><dt>다음 행동</dt><dd>${escapeHtml(copy.next)}</dd></div></dl><details class="choice-details"><summary>자세한 설명</summary><p>${escapeHtml(outcomeText(outcome))}</p></details>`;
}
async function replayPendingOutcome() {
  if (actionInFlight || view !== 'stage' || !stage || !run.pending) return;
  const outcome = getPendingOutcome(run);
  if (!outcome || outcomeIsCorrect(outcome)) return;
  stage.clearAccident();
  if (actionCheckpoint) stage.restore(actionCheckpoint);
  await presentOutcome(outcome);
}
function bindSceneReplay() {
  dialogContent.querySelector('[data-replay]')?.addEventListener('click', replayPendingOutcome);
}
function showOutcome(outcome) {
  const correct = outcomeIsCorrect(outcome);
  const body = correct ? `<h2 id="dialog-title">${escapeHtml(outcome.title)}</h2><p class="performed-action"><span>선택한 행동</span>${escapeHtml(outcome.actionCaption ?? outcome.text)}</p><p class="dialog-copy">${escapeHtml(outcomeText(outcome))}</p>` : wrongFeedbackMarkup(outcome);
  openDialog('outcome', `<div class="dialog-topline"><span class="dialog-kicker ${correct ? 'correct-label' : 'risk-label'}">${correct ? '단계 완료' : '이 선택의 위험'}</span><button class="dialog-close" data-overview type="button">공장 전경</button></div>${body}<div class="dialog-actions"><button id="acknowledge-button" class="primary" type="button">${correct ? run.stepIndex === STEPS.length - 1 ? '작업 결과 확인' : '다음 단계' : '다시 선택'}</button>${correct ? '' : '<button data-replay type="button">장면 다시 보기</button>'}</div>`);
  bindSceneReplay();
  dialogContent.querySelector('#acknowledge-button').addEventListener('click', () => {
    if (actionInFlight || !run.pending) return;
    acknowledgeOutcome(run); forceCloseDialog();
    if (!correct && actionCheckpoint) stage.restore(actionCheckpoint);
    updateHud();
    if (run.completed) showResult();
    else if (isNear(getCurrentStep(run).targetId)) openCurrentQuiz();
    else { stage.setPaused(false); toast(`${getCurrentStep(run).title}: ${targetById(getCurrentStep(run).targetId)?.title} 가까이 이동하세요.`); }
  });
}
function showAccident(outcome) {
  openDialog('accident', `<div class="dialog-topline"><span class="dialog-kicker">사고 재현</span><button class="dialog-close" data-overview type="button">공장 전경</button></div>${wrongFeedbackMarkup(outcome)}<p class="rewind-note">되감기는 선택 전 상태로 돌아갑니다.<br>현실에는 되감기가 없습니다.</p><div class="dialog-actions"><button id="rewind-button" class="primary" type="button">되감기</button><button data-replay type="button">장면 다시 보기</button></div>`);
  bindSceneReplay();
  dialogContent.querySelector('#rewind-button').addEventListener('click', () => {
    if (actionInFlight || !run.pending) return;
    rewind(run); forceCloseDialog(); stage.clearAccident();
    if (actionCheckpoint) stage.restore(actionCheckpoint);
    updateHud(); stage.setPaused(false); openCurrentQuiz(); announce('선택 직전으로 돌아왔습니다. 같은 단계의 행동을 다시 선택하세요.');
  });
}
function learningMarkup(report) {
  const records = items => items.map(item => `<li><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.evidence)}</p></li>`).join('');
  return `<div class="learning-heading"><h3>이번 실습의 학습 기록</h3><span id="learning-source">${report.source === 'ai' ? 'AI 코칭 · 선택 기록 기반' : '선택 기록 분석 (기본)'}</span></div><p class="learning-summary">${escapeHtml(report.summary)}</p>
    <div class="learning-columns"><section aria-labelledby="record-title"><h4 id="record-title">선택에서 확인한 내용</h4><ul class="evidence-list">${records(report.strengths)}</ul><h4>보완할 절차</h4>${report.weaknesses.length ? `<ul class="evidence-list weaknesses">${records(report.weaknesses)}</ul>` : '<p class="learning-empty">이번 실습에서 잘못된 선택은 기록되지 않았습니다.</p>'}<div class="learning-behavior"><h4>${escapeHtml(report.learningBehavior.title)}</h4><p>${escapeHtml(report.learningBehavior.evidence)}</p><small>${escapeHtml(report.learningBehavior.limitation)}</small></div></section>
    <section aria-labelledby="course-title"><h4 id="course-title">이어서 학습하기</h4><ol class="course-list">${report.recommendations.map((course, index) => `<li><span class="course-order">${index + 1}</span><div><h5>${escapeHtml(course.title)}</h5><p>${escapeHtml(course.reason)}</p><button type="button" data-course="${escapeHtml(course.courseId)}">${trainingChecks.get(course.courseId)?.correct ? '교육 다시 보기 · 확인 완료' : '교육 시작 · 확인 문제'}</button></div></li>`).join('')}</ol>${report.coachingTips.length ? `<div class="coaching-notes"><h4>${report.source === 'ai' ? 'AI 코칭' : '다음 실습의 확인점'}</h4><ul>${report.coachingTips.map(tip => `<li>${escapeHtml(tip.text)}</li>`).join('')}</ul></div>` : ''}</section></div>`;
}
function renderLearning() {
  const target = dialogContent.querySelector('#learning-report');
  if (!target || modalKind !== 'result' || !learningReport) return;
  const focusedCourse = target.contains(document.activeElement) ? document.activeElement.dataset.course : null;
  target.innerHTML = learningMarkup(learningReport);
  target.dataset.source = learningReport.source;
  target.setAttribute('aria-busy', String(Boolean(learningRequest)));
  target.querySelectorAll('[data-course]').forEach(button => {
    button.addEventListener('click', () => showTraining(button.dataset.course));
    if (focusedCourse === button.dataset.course) button.focus({ preventScroll: true });
  });
}
function showResult() {
  cancelExplanation();
  if (!learningReport) learningReport = buildLearningReport(run, learningEvents);
  const metrics = learningReport.metrics;
  openDialog('result', `<div class="debrief-header"><span class="dialog-kicker">6단계 완료</span><h2 id="dialog-title">작업을 마쳤습니다.<br>이번 선택을 돌아보세요.</h2><p>안전조치를 확인하고 이물질을 제거했습니다.</p></div><div class="debrief-scroll"><div class="debrief-metrics"><span>행동 선택 <strong>${metrics.attempts}</strong></span><span>되감기 <strong>${metrics.rewinds}</strong></span><span>첫 시도 완료 <strong>${metrics.firstPassCorrect} / 6</strong></span><span>보완한 단계 <strong>${metrics.correctedSteps}</strong></span></div>${safetyMarkup()}<section class="debrief-explanation"><span id="explanation-label" class="explanation-label">기본 설명</span><p id="result-explanation" class="dialog-copy">설비 정지, 오퍼레이터 전달, MCC 개인 잠금, 태그아웃, 트라이아웃을 거쳐 작업했습니다. 현실에는 되감기가 없습니다.</p></section><div id="learning-report" aria-live="polite"></div><p id="learning-status" class="learning-status" role="status"></p></div><div class="debrief-footer"><button id="retry-button" class="primary" type="button">다시 연습</button><button id="download-learning" type="button">교육 연계 데이터 저장</button><button data-overview type="button">공장 전경</button></div>`);
  dialogContent.querySelector('#retry-button').addEventListener('click', retry);
  dialogContent.querySelector('#download-learning').addEventListener('click', saveLearningRecord);
  renderLearning();
  if (!learningResolved) {
    learningRequest = new AbortController(); const generation = ++learningGeneration;
    dialogContent.querySelector('#learning-report').setAttribute('aria-busy', 'true');
    const status = dialogContent.querySelector('#learning-status');
    status.textContent = '기본 분석을 표시했습니다. 추가 코칭을 확인하고 있습니다.';
    getLearningReport(run, learningEvents, { enabled: true, signal: learningRequest.signal }).then(report => {
      if (generation !== learningGeneration || modalKind !== 'result' || view !== 'stage') return;
      learningReport = report; learningResolved = true; learningRequest = null; renderLearning();
      status.textContent = report.source === 'ai' ? 'AI 코칭을 반영했습니다. 판정과 선택 근거는 그대로입니다.' : '선택 기록에 따른 기본 분석입니다. AI 연결 없이도 교육을 이어갈 수 있습니다.';
    }).catch(() => {
      if (generation !== learningGeneration || modalKind !== 'result') return;
      learningRequest = null; learningResolved = true; renderLearning();
      status.textContent = '선택 기록에 따른 기본 분석을 사용합니다.';
    });
  }
  explanationRequest = new AbortController(); const generation = ++explanationGeneration;
  getExplanation(run, { enabled: aiEnabled, signal: explanationRequest.signal }).then(explanation => {
    if (generation !== explanationGeneration || modalKind !== 'result' || view !== 'stage') return;
    dialogContent.querySelector('#result-explanation').textContent = explanation.text;
    dialogContent.querySelector('#explanation-label').textContent = explanation.source === 'ai' ? 'AI 보충 설명 · 판정은 고정 규칙 적용' : '기본 설명';
  }).catch(() => undefined);
}
function showTraining(courseId) {
  const course = CATALOG.find(item => item.courseId === courseId);
  if (!course || !run.completed) return;
  cancelExplanation();
  const answer = trainingChecks.get(courseId);
  openDialog('training', `<div class="debrief-header"><span class="dialog-kicker">추천 교육</span><h2 id="dialog-title">${escapeHtml(course.title)}</h2><p>짧은 설명을 읽고 한 가지 행동을 선택하세요.</p></div><div class="debrief-scroll training-content">${course.lesson.map(paragraph => `<p class="dialog-copy">${escapeHtml(paragraph)}</p>`).join('')}<h3>${escapeHtml(course.question.prompt)}</h3><div class="option-list">${course.question.options.map((option, index) => `<button type="button" data-training-option="${index}" ${answer?.index === index ? 'aria-pressed="true"' : 'aria-pressed="false"'}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span><kbd>${index + 1}</kbd></button>`).join('')}</div>${answer ? `<div tabindex="-1" class="training-feedback ${answer.correct ? 'correct' : 'retry'}" role="status"><strong>${answer.correct ? '확인했습니다.' : '다시 확인해 보세요.'}</strong><p>선택한 행동: ${escapeHtml(course.question.options[answer.index])}</p><p>${escapeHtml(course.question.explanation)}</p></div>` : '<p class="choice-guide">숫자 키 1–4로도 선택할 수 있습니다. 교육 문제는 게임 기록을 바꾸지 않습니다.</p>'}</div><div class="debrief-footer"><button id="back-to-result" class="primary" type="button">분석 결과로 돌아가기</button></div>`, answer ? '.training-feedback' : '[data-training-option]');
  dialogContent.querySelector('#back-to-result').addEventListener('click', showResult);
  dialogContent.querySelectorAll('[data-training-option]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.trainingOption);
    trainingChecks.set(courseId, { index, correct: index === course.question.correctIndex });
    showTraining(courseId);
    dialogContent.querySelector('.training-feedback')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }));
}
function saveLearningRecord() {
  if (!learningReport || !run.completed) return;
  const data = exportLearningRecord(learningReport);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'safeplay-learning-record.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('익명 선택 기록과 추천 교육 ID를 JSON으로 저장했습니다.');
}
function retry() {
  sceneGeneration += 1; cancelExplanation(); clearTimeout(toastTimer); sceneRoot.querySelector('.stage-toast')?.remove();
  forceCloseDialog(); run = createRun(); savedPosition = null; actionCheckpoint = null; actionBeforeSafety = null;
  actionInFlight = false; briefAcknowledged = false; position = null;
  learningEvents = []; learningReport = null; learningResolved = false; trainingChecks.clear();
  stage.clearAccident(); stage.reset(); updateHud(); stage.setPaused(true);
  showBrief(); announce('새 연습을 시작합니다. 위치, 단계, 안전조치와 기록을 초기화했습니다.');
}
showOverview();
