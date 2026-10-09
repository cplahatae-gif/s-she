import { ACTIONS, SAFETY_STEPS, TEXT } from '../scenario/scenario.mjs';

export function stepComplete(safety, key) {
  if (key === 'lockState') return safety[key] === 'valid';
  if (key === 'verification') return safety[key] === 'passed';
  return safety[key] === true;
}

export function safetyMarkup(safety, compact = false) {
  return `<ol class="safety-list${compact ? ' compact' : ''}">${SAFETY_STEPS.map(({key,label},i) => {
    const done = stepComplete(safety,key);
    const failed = key === 'verification' && safety.verification === 'failed';
    return `<li class="${done ? 'done' : failed ? 'failed' : ''}"><span class="step-number">${done ? '✓' : String(i+1).padStart(2,'0')}</span><span>${label}</span><strong>${done ? '완료' : failed ? '이상 발견' : '미완료'}</strong></li>`;
  }).join('')}</ol>`;
}

function equipment(targetId, safety) {
  if (targetId === 'energy-isolator') return `<div class="equipment-view" aria-label="게임용 예시 차단 장치">
    <div class="isolator-diagram ${safety.isolated ? 'is-off' : ''}"><span class="device-title">차단 장치</span><span class="switch-handle"></span><span class="device-state">${safety.isolated ? '에너지 차단' : '에너지 연결'}</span>
    ${safety.lockState === 'valid' ? '<span class="lock-token">본인 잠금</span>' : ''}${safety.tagged ? '<span class="tag-token">본인 표지</span>' : ''}</div>
    <div class="wrong-location"><span>장치 밖 난간</span>${safety.lockState === 'wrong' ? '<span class="lock-token">잘못된 체결</span>' : '<span class="rail-line"></span>'}</div>
    <p>${safety.lockState === 'wrong' ? '자물쇠는 보이지만 차단 장치를 잠그지 않았습니다.' : '차단 장치에 체결한 자물쇠와 다른 위치의 자물쇠를 구분하세요.'}</p></div>`;
  if (targetId === 'control-panel') return '<div class="equipment-view control-view"><span class="status-light"></span><strong>벨트 정지 표시</strong><p>정지 표시 확인은 에너지 차단 행동이 아닙니다.</p></div>';
  if (targetId === 'verification-point') return `<div class="equipment-view"><p class="eyebrow">확인 결과</p><strong>${safety.verification === 'passed' ? '차단 확인 완료' : safety.verification === 'failed' ? '이상 발견 · 작업 보류' : '아직 확인하지 않았습니다.'}</strong><p>잔류 에너지 안전조치: ${safety.residualCleared ? '완료' : '미완료'}</p><p>실제 설비의 확인 방법과 조치는 승인된 현장 절차를 따릅니다.</p></div>`;
  return '<div class="equipment-view"><strong>점검구 밖 안전한 위치</strong><p>안전조치를 확인한 뒤 작업 진입을 결정하세요.</p></div>';
}

export function panelMarkup(type, { run, target, reason = '' } = {}) {
  const top = (kicker,title) => `<p class="eyebrow">${kicker}</p><h2 id="panel-title" tabindex="-1">${title}</h2>`;
  const close = '<button class="secondary" type="button" data-command="close">닫기</button>';
  if (type === 'brief') return `${top('B/C · 작업 요청','마지막 자물쇠')}<p class="role-label">이물질 제거 작업자</p><p class="panel-copy">${TEXT.brief}</p><div class="brief-route"><span>차단 지점 이동</span><span>직접 차단·잠금</span><span>안전조치·확인</span><span>점검구 복귀</span></div><p class="panel-note">${TEXT.exampleNotice}</p><div class="panel-actions"><button class="primary" type="button" data-command="begin">현장 탐색 시작</button></div>`;
  if (type === 'accident-card') return `${top('작업 진입 · 사고 재현',TEXT.accidentTitle)}<p class="panel-copy">${TEXT.accidentBody}</p><p class="feedback-message danger">${reason}</p><p class="panel-note">조사와 안전조치 기록은 유지됩니다. 진입 전 안전한 위치로 돌아가 보완하세요.</p><div class="panel-actions"><button class="primary" type="button" data-testid="rewind" data-command="rewind">되감기</button></div><p class="last-line">현실에는 되감기가 없습니다.</p>`;
  if (type === 'result') return `${top('안전한 작업 · 결과',TEXT.resultTitle)}<div class="cleanup-summary"><span aria-hidden="true">✓</span><div><strong>이물질 제거 완료</strong><p>모든 필수 조치를 마친 뒤 안전하게 작업했습니다.</p></div></div>${safetyMarkup(run.safety)}<div class="result-counts"><span>판단 시도 <strong>${run.attempts}</strong></span><span>되감기 <strong>${run.rewinds}</strong></span></div><p class="panel-copy">${TEXT.resultDescription}</p><div class="panel-actions"><button class="primary" data-testid="retry" data-command="restart">다시 연습</button><button class="secondary" data-command="overview">공장으로</button></div><p class="last-line">현실에는 되감기가 없습니다.</p>`;
  if (type === 'asset-error') return `${top('현장 로딩 오류','현장을 불러오지 못했습니다.')}<p class="panel-copy">화면 구성에 필요한 파일을 확인한 뒤 다시 불러오세요.</p><div class="panel-actions"><button class="primary" data-testid="retry" data-command="reload">다시 불러오기</button><button class="secondary" data-command="overview">공장으로</button></div>`;
  const isEntry = type === 'entry-check';
  const actions = ACTIONS.filter(a => a.targetId === target.id);
  return `${top(isEntry ? '작업 진입 판단' : '가까운 대상 조사',target.title)}<p class="panel-copy">${target.text}</p>${isEntry ? safetyMarkup(run.safety) : equipment(target.id,run.safety)}<p class="target-fact">${target.fact}</p><div class="feedback-message" id="action-feedback" role="status" ${reason ? '' : 'hidden'}>${reason}</div><div class="equipment-actions">${actions.map(a=>`<button type="button" class="${a.id === 'attach-wrong-lock' ? 'wrong-action' : 'primary'}" data-action="${a.id}" data-target="${target.id}" ${a.id === 'enter-work' ? 'data-testid="entry-submit"' : ''}>${a.label}</button>`).join('')}</div><div class="panel-actions">${isEntry ? '<button class="secondary" data-command="close">안전조치 보완</button>' : close}<button class="text-button" data-command="overview">공장으로</button></div>`;
}
