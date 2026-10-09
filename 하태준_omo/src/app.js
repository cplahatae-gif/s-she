import { mountOverview } from './overview/overview.js';
import { mountStage } from './site/stage.js';
import { layout, distanceToTarget } from './site/layout.mjs';
import { TARGETS, ACTIONS, SAFETY_STEPS, TEXT, createRun, inspect, applyAction, rewind } from './scenario/scenario.mjs';
import { panelMarkup, safetyMarkup, stepComplete } from './ui/panel.js';
import { mountDiagnostics } from './ui/diagnostics.js';

const root = document.querySelector('#app');
const motion = document.querySelector('#reduced-motion');
const overviewButton = document.querySelector('#overview-return');
const dialog = document.querySelector('#panel-host');
const live = document.querySelector('#live-status');
const media = matchMedia('(prefers-reduced-motion: reduce)');
const diagnostics = mountDiagnostics(document.body);
let run = createRun(), screen = 'overview', activeTargetId = null;
let stage = null, overview = null, field = null, firstVisit = true, busy = false;
let generation = 0, safeEntryPosition = null, accidentStarted = 0, accidentElapsedMs = 0;
let returnFocus = null, previousPosition = null;

function announce(text) { live.textContent = text; }
function diagnose() { diagnostics.update({ screen, run, snapshot: stage?.snapshot(), accidentElapsedMs }); }
function setScreen(next) {
  screen = next;
  document.body.dataset.screen = screen;
  overviewButton.hidden = screen === 'overview';
  overviewButton.disabled = ['stage-loading', 'accident-playing', 'accident-card', 'brief'].includes(screen);
  diagnose();
}
function closeDialog() { if (dialog.open) dialog.close(); dialog.replaceChildren(); activeTargetId = null; }
function updateHud() {
  if (!field) return;
  const completed = SAFETY_STEPS.filter(s => stepComplete(run.safety,s.key)).length;
  field.querySelector('#safety-progress').innerHTML = safetyMarkup(run.safety, true);
  field.querySelector('#progress-count').textContent = `${completed} / 5`;
  field.querySelector('#attempt-count').textContent = String(run.attempts);
  field.querySelector('#rewind-count').textContent = String(run.rewinds);
  field.querySelector('#current-objective').textContent = run.completed ? '안전한 작업을 완료했습니다.' : !run.safety.isolated ? '차단 지점으로 이동해 에너지를 차단하세요.' : run.safety.lockState !== 'valid' ? '차단 장치에 본인 자물쇠를 체결하세요.' : !run.safety.tagged ? '본인 표지를 부착하세요.' : !run.safety.residualCleared ? '잔류 에너지 안전조치를 수행하세요.' : run.safety.verification !== 'passed' ? '차단 확인을 수행하세요.' : '점검구로 돌아가 작업 진입을 판단하세요.';
  stage?.updateSafety(run.safety);
  diagnose();
}
function showPanel(type, {target,reason=''}={}) {
  stage?.setPaused(true);
  if (!dialog.open) returnFocus = document.activeElement;
  setScreen(type);
  dialog.className = `game-panel panel-${type}`;
  dialog.setAttribute('aria-labelledby','panel-title');
  dialog.removeAttribute('aria-label');
  dialog.innerHTML = panelMarkup(type,{run,target,reason});
  if (!dialog.open) dialog.showModal();
  const focus = type === 'accident-card' ? '[data-testid="rewind"]' : type === 'result' ? '[data-testid="retry"]' : type === 'brief' ? '[data-command="begin"]' : '#panel-title';
  dialog.querySelector(focus)?.focus();
  diagnose();
}
function resumeStage() {
  closeDialog(); busy = false;
  setScreen('stage'); stage.setPaused(false);
  if (returnFocus?.isConnected && field.contains(returnFocus) && !returnFocus.disabled) returnFocus.focus();
  else stage.focus();
  updateHud();
}
function showOverview() {
  if (['accident-playing','accident-card','stage-loading'].includes(screen)) return;
  generation++;
  if (stage) { previousPosition = stage.snapshot(); stage.setPaused(true); }
  closeDialog(); busy = false;
  if (field) field.hidden = true;
  setScreen('overview');
  overview?.destroy();
  const host = document.createElement('div'); host.className = 'overview-host'; root.append(host);
  overview = mountOverview(host,{onEnter:()=>enterStage(host)});
}
async function enterStage(overviewHost) {
  if (screen !== 'overview') return;
  setScreen('stage-loading'); overview?.destroy(); overview = null; overviewHost?.remove();
  const currentGeneration = ++generation;
  if (!field) {
    field = document.createElement('section'); field.className = 'field-layout';
    field.innerHTML = `<header class="field-heading"><div><p class="eyebrow">01 / B/C 벨트 컨베이어</p><h1>작업 전, 직접 안전을 확보하세요.</h1></div><div class="run-counts"><span>판단 시도 <strong id="attempt-count">0</strong></span><span>되감기 <strong id="rewind-count">0</strong></span></div></header><div class="field-stage" id="stage-host"></div><section class="field-progress" aria-label="작업 전 안전조치"><div class="progress-heading"><span>안전조치 <strong id="progress-count">0 / 5</strong></span><p id="current-objective"></p></div><div id="safety-progress"></div></section>`;
    root.append(field);
  }
  field.hidden = false;
  try {
    if (!stage) {
      const loadedStage = await mountStage(field.querySelector('#stage-host'), {onInspect:requestInspection,onFrame:diagnose,reducedMotion:motion.checked});
      if (currentGeneration !== generation) { loadedStage.destroy(); return; }
      stage = loadedStage;
    }
    if (previousPosition) stage.setPosition(previousPosition);
    updateHud();
    if (run.completed) showPanel('result');
    else if (firstVisit) { firstVisit = false; showPanel('brief'); }
    else resumeStage();
  } catch (error) {
    if (currentGeneration !== generation) return;
    stage?.destroy(); stage = null;
    announce('현장 로딩에 실패했습니다. 다시 불러오세요.');
    showPanel('asset-error');
  }
}
function inRange(targetId) {
  if (!TARGETS.some(t=>t.id===targetId) || !stage) return false;
  const { x } = stage.snapshot();
  return Number.isFinite(x) && distanceToTarget(x,targetId) <= layout.interactionRadius;
}
function requestInspection(targetId) {
  if (screen !== 'stage' || busy || document.hidden || !inRange(targetId)) return;
  const target = inspect(run,targetId);
  if (target.kind === 'blocked') return;
  activeTargetId = targetId;
  showPanel(targetId === 'work-access' ? 'entry-check' : 'inspection', {target});
}
async function requestAction(targetId, actionId) {
  const action = ACTIONS.find(a=>a.id===actionId && a.targetId===targetId);
  if (busy || document.hidden || !['inspection','entry-check'].includes(screen) || !action || targetId !== activeTargetId || !stage?.snapshot().paused || !inRange(targetId)) {
    announce(TEXT.requestRejected); return;
  }
  busy = true;
  const currentGeneration = generation;
  if (actionId === 'enter-work') safeEntryPosition = stage.snapshot();
  const result = applyAction(run,actionId);
  updateHud();
  if (result.effect === 'accident') {
    accidentStarted = performance.now(); accidentElapsedMs = 0;
    closeDialog(); setScreen('accident-playing');
    const played = await stage.playAccident();
    if (played === false || currentGeneration !== generation || screen !== 'accident-playing') return;
    showPanel('accident-card',{reason:result.reason});
    accidentElapsedMs = performance.now() - accidentStarted; diagnose();
  } else if (result.kind === 'success') {
    showPanel('result'); busy = false;
  } else {
    showPanel(screen,{target:TARGETS.find(t=>t.id===targetId),reason:result.reason});
    dialog.querySelector(`[data-action="${actionId}"]`)?.focus();
    announce(result.reason);
    queueMicrotask(()=>{ if(currentGeneration===generation) busy=false; });
  }
}
function restart() {
  if (screen !== 'result') return;
  generation++; closeDialog(); run = createRun(); previousPosition = null; safeEntryPosition = null;
  accidentElapsedMs = 0; busy = false;
  stage.clearAccident(); stage.reset(); updateHud();
  showPanel('brief'); announce('새 연습을 시작합니다. 모든 기록과 안전조치를 초기화했습니다.');
}
dialog.addEventListener('click', event=> {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.action) { requestAction(button.dataset.target,button.dataset.action); return; }
  const command = button.dataset.command;
  if (command === 'begin' && screen === 'brief') resumeStage();
  else if (command === 'close' && ['inspection','entry-check'].includes(screen)) resumeStage();
  else if (command === 'rewind' && screen === 'accident-card') {
    generation++; rewind(run); stage.clearAccident();
    stage.setPosition(safeEntryPosition); resumeStage(); announce('진입 전 위치로 돌아왔습니다. 안전조치를 보완하세요.');
  } else if (command === 'restart') restart();
  else if (command === 'overview') showOverview();
  else if (command === 'reload' && screen === 'asset-error') { closeDialog();setScreen('overview');enterStage(); }
});
dialog.addEventListener('keydown',event=>{ if(event.repeat && ['Enter',' '].includes(event.key)) event.preventDefault(); });
dialog.addEventListener('cancel',event=> {
  event.preventDefault();
  if (['inspection','entry-check'].includes(screen)) resumeStage();
});
overviewButton.addEventListener('click',showOverview);
function updateMotion() {
  document.body.classList.toggle('reduce-motion',motion.checked);
  stage?.setReducedMotion(motion.checked);
}
motion.checked = media.matches;
motion.addEventListener('change',updateMotion);
media.addEventListener('change',event=>{motion.checked=event.matches;updateMotion();});
window.addEventListener('pagehide',()=>{generation++;stage?.destroy();overview?.destroy();diagnostics.destroy();});
updateMotion();showOverview();
