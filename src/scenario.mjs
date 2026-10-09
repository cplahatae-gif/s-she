const option = (id, text, correct, effect, title, explanation, actionCaption, animation = 'none') => Object.freeze({
  id, text, correct, effect, title, explanation, actionCaption, animation,
});

export const STEPS = Object.freeze([
  {
    id: 'stop', title: '1. 설비 정지', targetId: 'control',
    question: '작업반장: “컨베이어 밑에 있는 이물질을 제거하세요.” 작업 시작 전에 무엇을 하겠습니까?',
    options: [
      option('stop-enter-running', '운전 중인 컨베이어 밑으로 들어가 바로 제거한다.', false, 'accident', '운전 중 접근으로 끼임 위험', '이 선택에서는 움직이는 벨트 가까이 손을 넣어 끼임 상황이 발생합니다. 이물질 제거 전에 설비를 정지하고 이후의 차단·잠금·확인 절차를 완료해야 합니다.', '움직이는 벨트에 접근 → 끼임 상황 재현', 'reach-danger'),
      option('stop-emergency-only', '비상정지만 누르면 모든 안전조치가 끝난 것으로 본다.', false, 'unverified', '정지만으로 에너지 차단을 확인할 수 없음', '비상정지는 정지 수단이며 에너지 차단·본인 잠금의 완료를 뜻하지 않습니다. 작업 진입을 보류하고 현장 절차에 따라 나머지 조치를 이어가야 합니다.', '정지 표시만 확인 → 작업 보류', 'stop-control'),
      option('stop-correct', '현장 절차에 따라 작업 대상 컨베이어를 정지한다.', true, 'safe-action', '설비를 정지했습니다', '정지는 첫 단계입니다. 오퍼레이터에게 작업 내용을 전달한 뒤 대상 설비의 에너지 차단·본인 잠금·표지·트라이아웃을 이어갑니다.', '조작반에서 정지 → 벨트 정지', 'stop-control'),
      option('stop-slower', '속도를 낮추고 천천히 움직일 때 작업한다.', false, 'paused', '저속 운전도 움직이는 설비', '속도를 낮춰도 벨트와 롤러는 움직입니다. 이 선택에서는 접근 전에 작업을 보류합니다. 정지 절차부터 다시 선택하세요.', '저속 운전 상태 확인 → 접근 보류'),
    ],
  },
  {
    id: 'notify', title: '2. 오퍼레이터에게 전달', targetId: 'control',
    question: '설비를 정지했습니다. 오퍼레이터에게 무엇을 전달하겠습니까?',
    options: [
      option('notify-correct', '오퍼레이터에게 대상 컨베이어와 이물질 제거 작업을 알리고 작업 중 재가동하지 않도록 전달한다.', true, 'safe-action', '작업 내용을 전달했습니다', '대상 설비와 작업 범위를 공유해 오퍼레이터가 작업 중임을 인지하도록 했습니다. 전달만으로 에너지 차단이 완료되지는 않으므로 본인 잠금 단계로 이동합니다.', '오퍼레이터와 작업 대상·내용 공유', 'radio-contact'),
      option('notify-skip', '정지했으니 오퍼레이터에게 알리지 않고 다음 작업을 준비한다.', false, 'notice', '오퍼레이터가 작업 사실을 모릅니다', '작업 사실을 전달하지 않으면 오퍼레이터가 설비를 다시 사용할 수 있다고 오인할 우려가 있습니다. 아직 접근하지 않고 통보를 보완합니다.', '작업 전달 누락 → 재가동 오인 우려 표시', 'radio-contact'),
      option('notify-vague', '“잠깐 볼게요”라고만 말하고 대상 설비와 작업 내용을 생략한다.', false, 'unidentified', '작업 대상이 불명확합니다', '어느 컨베이어에서 어떤 작업을 하는지 전달되지 않았습니다. 오퍼레이터와 작업 대상·범위를 확인하기 전에는 다음 단계로 진행하지 않습니다.', '모호한 연락 → 대상 확인 요청', 'radio-contact'),
      option('notify-enter', '오퍼레이터에게 알리지 않고 정지한 벨트 밑으로 들어간다.', false, 'accident', '정지 후에도 차단 없이 접근하면 위험', '이 선택에서는 에너지 차단과 본인 잠금 없이 진입하고 설비가 다시 움직이는 상황을 재현합니다. 통보 누락 자체가 기동을 일으키는 것은 아니며, 접근 전에 통보와 차단·잠금·확인이 필요합니다.', '차단 전 접근 → 재움직임·끼임 상황 재현', 'reach-danger'),
    ],
  },
  {
    id: 'personal-lock', title: '3. MCC 차단·개인 잠금', targetId: 'energy-isolator',
    question: '예시 설비의 MCC 차단·잠금 지점에 도착했습니다. 어떻게 하겠습니까?',
    options: [
      option('lock-other-equipment', '근처 다른 컨베이어의 차단장치를 잠근다.', false, 'mismatch', '다른 설비를 차단했습니다', '다른 컨베이어를 잠가도 작업 대상의 에너지는 차단되지 않습니다. 작업 대상과 현장 절차에서 정한 차단 지점을 대조하고 보완해야 합니다.', '대상 불일치 표시 → 차단 지점 재확인', 'wrong-lock'),
      option('lock-other-person', '다른 사람의 자물쇠가 있으니 본인 자물쇠를 생략한다.', false, 'notice', '본인의 잠금 보호가 없습니다', '다른 사람의 잠금은 그 사람의 작업과 연결됩니다. 본인이 작업하는 동안 차단 상태를 유지하는 본인 잠금이 필요하며, 타인의 자물쇠를 임의로 다루지 않습니다.', '타인 잠금만 확인 → 본인 잠금 필요 표시', 'wrong-lock'),
      option('lock-wrong-then-enter', '차단장치가 아닌 주변 고리에 자물쇠를 걸고 점검구로 들어간다.', false, 'accident', '부적합한 체결은 차단을 유지하지 못함', '이 선택에서는 자물쇠가 차단장치를 잠그지 못한 채 진입해 설비의 재움직임과 끼임을 재현합니다. 자물쇠가 보인다는 사실만으로 안전하지 않으며, 대상 차단 상태를 유지하는 체결이어야 합니다.', '부적합 체결 후 접근 → 끼임 상황 재현', 'reach-danger'),
      option('lock-correct', '현장 절차와 작업 권한에 따라 대상 설비 에너지를 차단하고 해당 차단장치에 본인 자물쇠를 체결한다.', true, 'safe-action', '대상 설비를 차단하고 본인 잠금했습니다', '예시 설비의 해당 차단장치에 본인 잠금을 적용하고 열쇠는 본인이 관리합니다. 다음으로 작업자를 식별할 표지를 부착합니다.', '대상 차단 → 해당 차단장치 본인 잠금', 'isolate-panel'),
    ],
  },
  {
    id: 'tagout', title: '4. 태그아웃', targetId: 'energy-isolator',
    question: '본인 잠금을 완료했습니다. 태그아웃은 어떻게 하겠습니까?',
    options: [
      option('tag-skip', '자물쇠가 있으니 표지는 붙이지 않는다.', false, 'unidentified', '작업자 식별 표지가 없습니다', '표지가 없으면 작업자와 작업 상태를 알아보기 어렵습니다. 표지 누락 자체가 설비를 기동시키지는 않지만, 식별을 보완하기 전에는 진행하지 않습니다.', '표지 없음 → 작업자 식별 누락 표시', 'wrong-tag'),
      option('tag-correct', '현장 절차에 맞는 본인 식별과 작업 정보를 담은 표지를 잠금 지점에 부착한다.', true, 'safe-action', '태그아웃을 완료했습니다', '표지로 작업자와 작업 상태를 알릴 수 있게 했습니다. 다음으로 필요한 잔류 에너지 안전조치와 트라이아웃 확인을 수행합니다.', '잠금 지점에 본인 작업 표지 부착', 'apply-tag'),
      option('tag-wrong-name', '누구 것인지 확인하지 않은 다른 작업자의 이름표를 붙인다.', false, 'mismatch', '표지의 작업자 정보가 다릅니다', '다른 작업자의 정보는 실제 작업자를 잘못 식별하게 만듭니다. 본인의 식별과 현장 절차에서 요구하는 정보를 확인해 표지를 보완합니다.', '표지 정보 불일치 → 내용 확인', 'wrong-tag'),
      option('tag-unreadable', '글자가 지워진 표지를 붙이고 그대로 진행한다.', false, 'notice', '표지 정보를 읽을 수 없습니다', '표지가 붙어 있어도 식별 정보가 읽히지 않으면 작업자와 작업 상태를 확인하기 어렵습니다. 읽을 수 있는 표지로 보완해야 합니다.', '읽기 어려운 표지 → 교체 필요 표시', 'wrong-tag'),
    ],
  },
  {
    id: 'tryout', title: '5. 트라이아웃', targetId: 'control',
    question: '차단·잠금·표지를 완료했습니다. 작업 진입 전에 무엇을 확인하겠습니까?',
    options: [
      option('tryout-skip', '자물쇠와 표지만 보고 트라이아웃을 생략한다.', false, 'unverified', '차단 유효성을 확인하지 않았습니다', '눈에 보이는 잠금·표지만으로 차단이 유효한지 확인할 수 없습니다. 이 선택에서는 진입을 보류하며, 잔류 에너지 안전조치와 현장 절차에 따른 트라이아웃을 보완합니다.', '확인 생략 → 미확인 상태로 작업 보류'),
      option('tryout-failed', '시험에서 설비 움직임이 나타나도 확인 완료로 처리한다.', false, 'mismatch', '시험에서 차단 이상을 발견했습니다', '움직임이 나타나면 차단의 유효성이 확인되지 않은 상태입니다. 작업에 들어가지 않고 현장 절차에 따라 원인을 확인하고 안전조치를 보완해야 합니다.', '시험 중 움직임 발견 → 접근 금지·보완', 'tryout-control'),
      option('tryout-correct', '현장 절차의 잔류 에너지 안전조치 후 트라이아웃으로 무가동을 확인하고, 조작부를 정지 상태로 복귀시킨다.', true, 'safe-action', '무가동 확인을 완료했습니다', '예시 설비의 필요한 잔류 에너지 안전조치와 트라이아웃 확인을 완료하고 조작부를 정지 상태로 되돌렸습니다. 이제 확인된 작업 범위의 이물질 제거로 이동합니다.', '잔류 에너지 안전조치 → 무가동 확인 → 정지 상태 복귀', 'tryout-control'),
      option('tryout-no-return', '시험에서 움직임이 없으면 조작부를 기동 상태에 둔 채 진행한다.', false, 'paused', '시험 뒤 조작부 상태를 복귀해야 합니다', '시험 후 조작부를 정지 상태로 되돌리는 절차를 빠뜨렸습니다. 이후 조작의 혼선을 줄이도록 현장 절차에 따른 정지 상태 복귀까지 확인해야 합니다.', '무가동 시험 후 기동 지시 남음 → 상태 복귀 필요', 'tryout-control'),
    ],
  },
  {
    id: 'cleanup', title: '6. 이물질 제거', targetId: 'work-access',
    question: '필수 조치를 완료하고 무가동을 확인했습니다. 이물질을 어떻게 제거하겠습니까?',
    options: [
      option('cleanup-correct', '본인 잠금과 표지를 유지한 채 확인된 작업 범위에서 현장 절차에 따라 이물질을 제거한다.', true, 'safe-action', '안전조치 후 이물질을 제거했습니다', '정지 → 오퍼레이터 전달 → MCC 차단·본인 잠금 → 태그아웃 → 잔류 에너지 안전조치·트라이아웃을 완료하고 작업했습니다. 이 실습은 제거 완료에서 끝나며 작업 후 복구·재가동은 별도의 현장 절차입니다.', '잠금·표지 유지 → 확인된 범위의 이물질 제거', 'clear-debris'),
      option('cleanup-unlock', '본인 자물쇠를 먼저 풀고 점검구에 들어가 이물질을 제거한다.', false, 'accident', '접근 전에 잠금을 해제하면 보호를 잃음', '이 선택에서는 작업 진입 전에 본인 잠금을 해제해 차단 상태의 유지 보호를 잃고, 설비가 다시 움직여 끼임 상황이 발생합니다. 작업 중에는 현장 절차에 따른 잠금·표지를 유지해야 합니다.', '잠금 해제 후 접근 → 재움직임·끼임 상황 재현', 'unlock-entry'),
      option('cleanup-expand', '확인한 컨베이어 옆의 다른 설비까지 함께 청소한다.', false, 'unverified', '확인된 작업 범위를 벗어납니다', '인접 설비의 에너지 차단과 안전조치는 확인되지 않았습니다. 이 선택에서는 다른 설비에 접근하기 전에 작업을 보류하고 범위 변경을 현장 절차로 확인해야 합니다.', '옆 설비 접근 계획 → 확인 범위 밖 작업 보류'),
      option('cleanup-restart', '작업자가 점검구 밖에서 기동을 요청하고, 다시 움직이는지 본 뒤 제거를 준비한다.', false, 'paused', '제거 전에 재가동을 요청했습니다', '재가동 요청은 이물질 제거를 위한 차단·잠금 상태와 맞지 않습니다. 이 선택에서는 실제 재가동과 접근 전에 요청을 보류하고 잠금·표지를 유지한 제거 작업으로 돌아갑니다.', '기동 요청 → 요청 보류·잠금 유지', 'radio-contact'),
    ],
  },
].map((step) => Object.freeze({ ...step, options: Object.freeze(step.options) })));

export const SAFETY_STEPS = Object.freeze([
  { key: 'stopped', label: '설비 정지' }, { key: 'notified', label: '오퍼레이터 전달' },
  { key: 'locked', label: 'MCC 차단·개인 잠금' }, { key: 'tagged', label: '태그아웃' },
  { key: 'verified', label: '트라이아웃' }, { key: 'cleaned', label: '이물질 제거' },
].map(Object.freeze));

export const TARGETS = Object.freeze([
  { id: 'control', title: '조작반·오퍼레이터 연락', text: '설비 정지, 작업 내용 전달, 트라이아웃 확인을 진행하는 예시 지점입니다.', fact: '정지는 차단·잠금의 완료를 뜻하지 않습니다. 트라이아웃은 현장 절차에 따릅니다.' },
  { id: 'energy-isolator', title: 'MCC 차단·잠금 지점', text: '작업 대상 설비의 현장 절차와 작업 권한에 따라 차단·본인 잠금·표지를 적용하는 예시 지점입니다. MCC 내부를 여는 실습이 아닙니다.', fact: '다른 설비나 주변 고리를 잠그는 것으로 작업 대상의 차단 상태를 유지할 수 없습니다.' },
  { id: 'work-access', title: '컨베이어 점검구', text: '작업반장: “컨베이어 밑에 있는 이물질을 제거하세요.” 안전조치를 완료한 뒤 확인된 작업 범위에서 제거합니다.', fact: '차단·잠금·확인 전에 움직이는 설비 가까이 접근하지 않습니다.' },
].map(Object.freeze));

const targetIds = new Set(TARGETS.map(({ id }) => id));
const optionById = new Map(STEPS.flatMap((step) => step.options.map((choice) => [choice.id, { step, choice }])));
const safetyKeys = ['stopped', 'notified', 'isolated', 'lockPresent', 'locked', 'tagged', 'residualCleared', 'verified', 'cleaned'];
const stateChanges = [['stopped'], ['notified'], ['isolated', 'lockPresent', 'locked'], ['tagged'], ['residualCleared', 'verified'], ['cleaned']];
const runKeys = ['stepIndex', 'observed', 'attempts', 'rewinds', 'completed', 'safety', 'pending'];
const counterLimit = 1_000_000;
const blankSafety = () => Object.fromEntries(safetyKeys.map((key) => [key, false]));
const blocked = (reason) => ({ kind: 'blocked', title: '현재 단계에서 진행할 수 없습니다', reason, explanation: reason });
const outcome = (step, choice) => ({
  kind: choice.correct ? 'progress' : 'wrong', effect: choice.effect, title: choice.title,
  reason: choice.explanation, explanation: choice.explanation, actionCaption: choice.actionCaption,
  animation: choice.animation, stepId: step.id, optionId: choice.id,
});

export function createRun() {
  return { stepIndex: 0, observed: new Set(), attempts: 0, rewinds: 0, completed: false, safety: blankSafety(), pending: null };
}

export function inspect(run, targetId) {
  if (!targetIds.has(targetId)) throw new RangeError('알 수 없는 조사 대상입니다.');
  run.observed.add(targetId);
  return TARGETS.find(({ id }) => id === targetId);
}

export function getCurrentStep(run) { return run.completed ? null : STEPS[run.stepIndex] ?? null; }
export function getPendingOutcome(run) {
  if (!run.pending) return null;
  const { step, choice } = optionById.get(run.pending.optionId);
  return outcome(step, choice);
}

export function chooseOption(run, optionId) {
  const entry = optionById.get(optionId);
  if (!entry) throw new RangeError('알 수 없는 선택지입니다.');
  if (run.completed) return blocked('이번 작업을 완료했습니다. 다시 연습하면 새 작업을 시작합니다.');
  if (run.pending) return blocked('현재 행동의 결과를 확인한 뒤 선택하세요.');
  if (entry.step !== getCurrentStep(run)) return blocked('현재 단계의 선택지만 고를 수 있습니다.');
  if (run.attempts >= counterLimit) return blocked('실습 기록 한도에 도달했습니다. 새 실습을 시작하세요.');
  run.attempts += 1;
  if (entry.choice.correct) for (const key of stateChanges[run.stepIndex]) run.safety[key] = true;
  const decision = outcome(entry.step, entry.choice);
  run.pending = { stepId: entry.step.id, optionId, kind: decision.kind };
  return decision;
}

export function acknowledgeOutcome(run) {
  if (!run.pending) return blocked('확인할 결과가 없습니다.');
  const { step, choice } = optionById.get(run.pending.optionId);
  if (!choice.correct && choice.effect === 'accident') return blocked('사고 결과를 확인하고 되감기로 작업 직전 상태에 돌아가세요.');
  run.pending = null;
  if (!choice.correct) return outcome(step, choice);
  run.stepIndex += 1;
  run.completed = run.stepIndex === STEPS.length;
  return { ...outcome(step, choice), kind: run.completed ? 'success' : 'progress' };
}

export function rewind(run) {
  if (!run.pending || run.pending.kind !== 'wrong' || optionById.get(run.pending.optionId).choice.effect !== 'accident') return blocked('사고 결과에서만 되감기할 수 있습니다.');
  run.pending = null;
  run.rewinds += 1;
  return run;
}

export function judgeEntry(run) {
  if (run.stepIndex === STEPS.length && safetyKeys.every((key) => run.safety[key])) {
    const choice = STEPS[5].options.find((item) => item.correct);
    return { ...outcome(STEPS[5], choice), kind: 'success' };
  }
  const hasEntryProtection = run.safety.isolated && run.safety.locked && run.safety.residualCleared;
  const reason = hasEntryProtection
    ? '아직 여섯 단계가 완료되지 않았습니다. 표지·트라이아웃·작업 범위를 포함해 현재 단계를 확인하세요.'
    : '차단·본인 잠금·잔류 에너지 안전조치가 확인되지 않았습니다. 지금 작업에 진입하면 위험한 에너지에 노출될 수 있어 진입을 보류합니다.';
  return { kind: 'wrong', effect: hasEntryProtection ? 'unverified' : 'paused', title: '작업 완료를 확인할 수 없습니다', reason, explanation: reason };
}

export function serializeRun(run) {
  const payload = { stepIndex: run.stepIndex, observed: [...run.observed], attempts: run.attempts, rewinds: run.rewinds,
    completed: run.completed, safety: { ...run.safety }, pending: run.pending ? { ...run.pending } : null };
  runFromPayload(payload);
  return payload;
}

function exactObject(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${name}는 객체여야 합니다.`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new TypeError(`${name} 필드가 올바르지 않습니다.`);
}

export function runFromPayload(payload) {
  exactObject(payload, runKeys, 'run');
  exactObject(payload.safety, safetyKeys, 'safety');
  if (!Number.isInteger(payload.stepIndex) || payload.stepIndex < 0 || payload.stepIndex > STEPS.length) throw new TypeError('단계 번호가 올바르지 않습니다.');
  if (!Array.isArray(payload.observed) || payload.observed.length > targetIds.size || [...payload.observed].some((id) => !targetIds.has(id)) || new Set(payload.observed).size !== payload.observed.length) throw new TypeError('조사 기록이 올바르지 않습니다.');
  for (const key of ['attempts', 'rewinds']) {
    if (!Number.isSafeInteger(payload[key]) || payload[key] < 0 || payload[key] > counterLimit) throw new TypeError('기록 횟수가 올바르지 않습니다.');
  }
  if (typeof payload.completed !== 'boolean' || safetyKeys.some((key) => typeof payload.safety[key] !== 'boolean')) throw new TypeError('안전조치 상태는 불리언이어야 합니다.');
  let pendingCorrect = false;
  if (payload.pending !== null) {
    exactObject(payload.pending, ['stepId', 'optionId', 'kind'], 'pending');
    const entry = optionById.get(payload.pending.optionId);
    if (!entry || entry.step !== STEPS[payload.stepIndex] || payload.pending.stepId !== entry.step.id || payload.pending.kind !== (entry.choice.correct ? 'progress' : 'wrong')) throw new TypeError('대기 중인 선택 결과가 현재 단계와 맞지 않습니다.');
    pendingCorrect = entry.choice.correct;
  }
  const completedCount = payload.stepIndex + Number(pendingCorrect);
  const expected = blankSafety();
  for (let index = 0; index < completedCount; index += 1) for (const key of stateChanges[index]) expected[key] = true;
  if (safetyKeys.some((key) => payload.safety[key] !== expected[key])
    || payload.completed !== (payload.stepIndex === STEPS.length)
    || payload.attempts < completedCount + Number(payload.pending?.kind === 'wrong')
    || payload.rewinds > payload.attempts - completedCount - Number(payload.pending?.kind === 'wrong')) throw new TypeError('서로 모순되는 단계·안전조치·기록 상태입니다.');
  return { stepIndex: payload.stepIndex, observed: new Set(payload.observed), attempts: payload.attempts, rewinds: payload.rewinds,
    completed: payload.completed, safety: { ...payload.safety }, pending: payload.pending ? { ...payload.pending } : null };
}
