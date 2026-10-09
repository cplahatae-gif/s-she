// These are visual rehearsals. Scenario verdicts remain in scenario.mjs.
const beat = (pose, message, changes = {}, duration = 800) => ({ pose, message, changes, duration });
export function buildActionPlan(outcome) {
  const id = outcome.optionId;
  const plan = { id, target: 'control', beats: [], accident: outcome.effect === 'accident' };
  switch (id) {
    case 'stop-correct': plan.beats = [beat('press', '조작반 정지 버튼을 누릅니다.'), beat('press', '벨트 정지 · 에너지 차단은 아직입니다.', { beltRunning: false, control: 'stop' }, 1200)]; break;
    case 'stop-enter-running': plan.target = 'work-access'; plan.beats = [beat('unsafe', '운전 중인 벨트 아래로 손을 뻗습니다.', { beltRunning: true }), beat('recoil', '움직이는 벨트에 손이 끌려갑니다. 접근 중단!', { beltRunning: true }, 1400)]; break;
    case 'stop-emergency-only': plan.beats = [beat('press', '비상정지를 누릅니다.'), beat('press', '벨트는 멈췄지만 전원과 차단장치는 유지됩니다.', { beltRunning: false, control: 'emergency' }, 1200)]; break;
    case 'stop-slower': plan.beats = [beat('press', '운전 속도를 낮춥니다.', { beltRunning: true, beltSpeed: 0.3 }), beat('recoil', '저속이어도 벨트와 롤러는 계속 움직입니다. 접근 보류.', {}, 1200)]; break;
    case 'notify-correct': plan.beats = [beat('radio', '무전: B/C 이물질 제거 작업. 작업 중 재가동하지 마세요.', { radio: 'calling' }, 1200), beat('radio', '오퍼레이터: 대상과 작업 내용을 확인했습니다.', { radio: 'acknowledged' }, 1200)]; break;
    case 'notify-skip': plan.beats = [beat('press', '작업 통보 없이 조작반을 떠나려 합니다.'), beat('recoil', '오퍼레이터 작업 기록: 통보 없음 · 사용 가능으로 오인할 우려', { radio: 'missing' }, 1200)]; break;
    case 'notify-vague': plan.beats = [beat('radio', '무전: 잠깐 볼게요.', { radio: 'calling' }), beat('radio', '오퍼레이터: 어느 설비에서 어떤 작업을 합니까?', { radio: 'unidentified' }, 1200)]; break;
    case 'notify-enter': plan.target = 'work-access'; plan.beats = [beat('unsafe', '정지한 벨트 밑에 접근합니다. 차단·잠금은 없습니다.', { beltRunning: false }), beat('recoil', '오퍼레이터가 작업을 모르고 기동 · 벨트 재움직임', { beltRunning: true, radio: 'remote-start' }, 1500)]; break;
    case 'lock-other-equipment': plan.target = 'energy-isolator'; plan.beats = [beat('lock', '옆 B/C-02 차단장치에 자물쇠를 체결합니다.', { lock: 'wrong-circuit' }), beat('lock', 'B/C-01 차단장치는 여전히 ON · 대상 불일치', {}, 1200)]; break;
    case 'lock-other-person': plan.target = 'energy-isolator'; plan.beats = [beat('press', '타인 자물쇠만 가리켜 확인합니다.', { lock: 'other-person' }), beat('recoil', '김 작업자 잠금 · 본인 잠금은 없습니다.', {}, 1200)]; break;
    case 'lock-wrong-then-enter': plan.target = 'energy-isolator'; plan.beats = [beat('lock', '차단장치가 아닌 옆 고리에 자물쇠를 걸었습니다.', { lock: 'wrong-hook' }), beat('unsafe', '잠금으로 유지되지 않은 설비에 접근합니다.', { beltRunning: false }), beat('recoil', '차단장치는 ON · 벨트 재움직임과 끼임 상황', { beltRunning: true }, 1500)]; break;
    case 'lock-correct': plan.target = 'energy-isolator'; plan.beats = [beat('lock', 'B/C-01 외부 차단장치를 OFF로 전환합니다.', { isolated: true, beltRunning: false }), beat('lock', '해당 차단장치에 본인 자물쇠를 체결합니다.', { lock: 'personal' }, 1300)]; break;
    case 'tag-skip': plan.target = 'energy-isolator'; plan.beats = [beat('tag', '자물쇠만 남기고 표지는 붙이지 않습니다.', { tag: 'none' }), beat('recoil', '표지 없음 · 작업자 식별 정보를 확인할 수 없습니다.', {}, 1200)]; break;
    case 'tag-correct': plan.target = 'energy-isolator'; plan.beats = [beat('tag', '본인 이름과 B/C-01 작업 정보를 확인합니다.'), beat('tag', '잠금 지점에 작업 표지를 부착합니다.', { tag: 'personal' }, 1300)]; break;
    case 'tag-wrong-name': plan.target = 'energy-isolator'; plan.beats = [beat('tag', '다른 작업자의 이름표를 부착합니다.', { tag: 'wrong-name' }), beat('tag', '표지: 김 작업자 · 실제 작업자와 불일치', {}, 1200)]; break;
    case 'tag-unreadable': plan.target = 'energy-isolator'; plan.beats = [beat('tag', '글자가 지워진 표지를 부착합니다.', { tag: 'unreadable' }), beat('tag', '식별란을 읽을 수 없습니다. 읽을 수 있는 표지로 교체해야 합니다.', {}, 1200)]; break;
    case 'tryout-skip': plan.beats = [beat('recoil', '시험 조작 없이 잠금·표지만 확인합니다.'), beat('recoil', '차단 유효성 미확인 · 점검구 접근 보류', { verification: 'missing' }, 1200)]; break;
    case 'tryout-failed': plan.beats = [beat('tryout', '시험 기동 버튼을 누릅니다.', { control: 'start' }), beat('recoil', '벨트가 움직입니다. 차단 이상 · 작업 중단!', { beltRunning: true, verification: 'failed' }, 1000), beat('press', '조작부를 정지시키고 접근을 보류합니다.', { beltRunning: false, control: 'stop' }, 1100)]; break;
    case 'tryout-correct': plan.beats = [beat('tryout', '현장 절차의 잔류 에너지 안전조치 후 시험 기동합니다.', { control: 'start', beltRunning: false }), beat('tryout', '벨트·롤러 움직임 없음 · 무가동 확인', { verification: 'verified' }, 1000), beat('press', '조작부를 정지 상태로 복귀합니다.', { control: 'stop' }, 900)]; break;
    case 'tryout-no-return': plan.beats = [beat('tryout', '시험 기동 · 움직임 없음', { control: 'start', beltRunning: false }), beat('tryout', '기동 지시가 남아 있습니다. 조작부 정지 복귀 누락.', { verification: 'no-return' }, 1300)]; break;
    case 'cleanup-correct': plan.target = 'work-access'; plan.beats = [beat('cleanup', '차단·잠금·표지를 유지하고 확인된 범위의 이물질을 집습니다.', {}, 1200), beat('cleanup', '이물질을 점검구 밖으로 제거합니다.', { cleaned: true }, 1400)]; break;
    case 'cleanup-unlock': plan.target = 'energy-isolator'; plan.beats = [beat('lock', '작업 전에 본인 자물쇠를 해제합니다.', { lock: 'none', tag: 'none', isolated: false }, 1300), beat('unsafe', '잠금 보호를 잃은 컨베이어에 다시 접근합니다.', { beltRunning: false }), beat('recoil', '전원 복구 · 벨트 재움직임과 끼임 상황', { beltRunning: true }, 1500)]; break;
    case 'cleanup-expand': plan.target = 'work-access'; plan.offset = 230; plan.beats = [beat('unsafe', '확인한 점검구를 지나 옆 설비까지 작업하려 합니다.'), beat('recoil', 'B/C-02 안전조치 미확인 · 범위 밖 접근 보류', { verification: 'scope-mismatch' }, 1300)]; break;
    case 'cleanup-restart': plan.target = 'work-access'; plan.beats = [beat('radio', '무전: 제거 전에 기동해 주세요.', { radio: 'calling' }), beat('radio', '오퍼레이터: 작업 잠금이 유지 중입니다. 기동 요청을 보류합니다.', { radio: 'rejected', beltRunning: false }, 1300)]; break;
    default: throw new RangeError('표현할 선택 행동이 없습니다.');
  }
  // Follow-on examples change the scene, never the scenario verdict.
  if (id === 'lock-other-person') {
    plan.riskExample = true;
    plan.observeOffset = -330;
    plan.beats = [beat('observe', '김 작업자 잠금에 의존합니다.', { lock: 'other-person', isolated: true, beltRunning: false }, 1500),
      { ...beat('observe', '잠금 주인이 돌아옵니다.', {}, 1500), actor: 'owner-release' },
      beat('observe', '본인 잠금 없음 · 차단 보호가 사라집니다.', {}, 1700)];
  }
  if (['tag-skip', 'tag-wrong-name', 'tag-unreadable'].includes(id)) {
    if (id === 'tag-skip') plan.beats[0].pose = 'observe';
    plan.beats[0].message = { 'tag-skip': '작업 표지를 남기지 않습니다.', 'tag-wrong-name': '다른 이름의 표지를 부착합니다.', 'tag-unreadable': '읽을 수 없는 표지를 부착합니다.' }[id];
    plan.beats[0].duration = 1500;
    plan.beats[1] = { ...beat('observe', '동료가 작업 표지를 확인합니다.', {}, 1500), actor: 'inspect-tag' };
    plan.beats.push(beat('observe', '작업자 확인 보류 · 잠금은 유지됩니다.', {}, 1700));
  }
  if (['notify-skip', 'notify-vague', 'cleanup-restart'].includes(id)) {
    if (id === 'notify-skip') { plan.beats[0].pose = 'observe'; plan.beats[0].message = '작업 통보를 생략합니다.'; }
    plan.beats[0].duration = 1400;
    plan.beats[1].actor = 'radio-reply'; plan.beats[1].pose = 'observe'; plan.beats[1].duration = 1600;
    plan.beats[1].message = id === 'notify-vague' ? '오퍼레이터가 설비명을 다시 묻습니다.' : id === 'notify-skip' ? '오퍼레이터에게 작업 정보가 없습니다.' : '오퍼레이터가 기동 요청을 보류합니다.';
  }
  if (id === 'tryout-skip') plan.beats = [beat('observe', '시험 버튼을 누르지 않고 넘어갑니다.', { verification: 'missing', verificationHold: true }, 1500), beat('observe', '버튼 시험 없음 · 접근을 보류합니다.', {}, 1700)];
  if (id === 'tryout-no-return') { plan.beats[1].pose = 'observe'; plan.beats[1].message = '초록 기동 지시가 계속 남아 있습니다.'; plan.beats[1].duration = 1700; }
  if (id === 'cleanup-expand') { plan.observeOffset = 0; plan.beats = [beat('observe', '미확인 설비의 경계로 이동합니다.', { scopeBlocked: true }, 1500), beat('observe', '안전조치 미확인 · 경계에서 멈춥니다.', { verification: 'scope-mismatch' }, 1700)]; }
  if (['notify-enter', 'lock-wrong-then-enter', 'cleanup-unlock'].includes(id)) {
    plan.initiator = 'coworker';
    plan.beats.find((step) => step.pose === 'unsafe').actor = 'restart';
    plan.beats.at(-1).duration = 2000;
  }
  if (id.startsWith('tryout-') && id !== 'tryout-skip') plan.beats[0].control = 'start';
  if (['tryout-correct', 'tryout-failed'].includes(id)) plan.beats.at(-1).control = 'stop';
  if (id === 'stop-slower') plan.beats[0].control = 'speed';
  if (id === 'lock-other-equipment') plan.equipment = 'other-circuit';
  if (id === 'lock-wrong-then-enter') plan.equipment = 'door-latch';
  if (['lock-wrong-then-enter', 'cleanup-unlock'].includes(id)) plan.beats[1].target = 'work-access';
  return plan;
}

export function safetyVisual(safety) {
  return { beltRunning: !safety.stopped, beltSpeed: 1, isolated: Boolean(safety.isolated), lock: safety.locked ? 'personal' : 'none', tag: safety.tagged ? 'personal' : 'none', cleaned: Boolean(safety.cleaned), radio: safety.notified ? 'acknowledged' : 'none', control: safety.stopped ? 'stop' : 'start', verification: safety.verified ? 'verified' : 'none' };
}

// Applied only after the visible actor makes contact or replies.
export function actorConsequence(mode, visual, optionId) {
  if (mode === 'restart') return { beltRunning: true, control: 'start' };
  if (mode === 'owner-release') {
    if (visual.lock !== 'other-person') throw new RangeError('타인 잠금 주인만 해당 잠금을 해제할 수 있습니다.');
    return { lock: 'none', isolated: false, beltRunning: false, ownerReleased: true };
  }
  if (mode === 'inspect-tag') return { inspectionStatus: visual.tag === 'none' ? 'missing-tag' : visual.tag === 'wrong-name' ? 'owner-mismatch' : 'unreadable-tag' };
  if (mode === 'radio-reply') return { radio: optionId === 'notify-vague' ? 'unidentified' : optionId === 'notify-skip' ? 'missing' : 'rejected' };
  throw new RangeError('알 수 없는 현장 동료 행동입니다.');
}
