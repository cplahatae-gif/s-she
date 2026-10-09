const frozenRows = rows => Object.freeze(rows.map(row => Object.freeze(row)));

export const TARGETS = frozenRows([
  { id: 'work-access', title: '컨베이어 점검구', text: '점검구 안에 이물질이 끼어 있습니다. 들어가기 전에 안전조치를 완료해야 합니다.', fact: '멈춘 벨트도 불시에 움직일 수 있습니다.' },
  { id: 'control-panel', title: '조작반', text: '조작반에는 정지 상태가 표시되어 있습니다. 표시를 읽는 것만으로 에너지가 차단되지는 않습니다.', fact: '정지 표시는 에너지 차단과 잠금의 확인을 대신하지 못합니다.' },
  { id: 'energy-isolator', title: '에너지 차단·잠금 지점', text: '해당 설비의 에너지를 차단하고 본인 자물쇠와 표지를 체결하는 지점입니다.', fact: '다른 위치에 건 자물쇠는 해당 설비의 차단 상태를 유지하지 못합니다.' },
  { id: 'verification-point', title: '잔류 에너지·차단 확인 지점', text: '차단과 유효 잠금 뒤 잔류 에너지 안전조치를 하고 차단을 확인합니다.', fact: '안전조치를 변경하면 차단을 다시 확인해야 합니다.' },
]);

export const ACTIONS = frozenRows([
  { id: 'isolate-energy', label: '에너지 차단', targetId: 'energy-isolator' },
  { id: 'attach-personal-lock', label: '본인 자물쇠 체결', targetId: 'energy-isolator' },
  { id: 'attach-wrong-lock', label: '다른 위치에 자물쇠 체결 (실습)', targetId: 'energy-isolator' },
  { id: 'attach-tag', label: '표지 부착', targetId: 'energy-isolator' },
  { id: 'clear-residual-energy', label: '잔류 에너지 안전조치', targetId: 'verification-point' },
  { id: 'verify-isolation', label: '차단 확인', targetId: 'verification-point' },
  { id: 'enter-work', label: '현재 상태로 점검구에 들어가 이물질을 제거한다.', targetId: 'work-access' },
]);

export const SAFETY_STEPS = frozenRows([
  { key: 'isolated', label: '에너지 차단' },
  { key: 'lockState', label: '본인 자물쇠 체결' },
  { key: 'tagged', label: '표지 부착' },
  { key: 'residualCleared', label: '잔류 에너지 안전조치' },
  { key: 'verification', label: '차단 확인' },
]);

export const TEXT = Object.freeze({
  brief: '컨베이어 점검구 안에 이물질이 끼었습니다. 제거 작업을 맡았습니다. 벨트는 멈춰 있지만, 작업에 들어가기 전에 직접 안전을 확보해야 합니다.',
  isolationMissing: '벨트가 멈춰 있어도 다시 움직일 수 있습니다. 정지 표시는 에너지 차단과 잠금의 확인을 대신하지 못합니다.',
  lockInvalid: '자물쇠가 보이는 것만으로 안전해지지 않습니다. 해당 설비의 에너지를 차단하고 그 차단 상태를 유지하도록 잠가야 합니다.',
  verificationFailed: '차단이 확인되지 않았습니다. 현장 절차에 따라 원인을 확인하고 안전조치를 보완하세요.',
  incomplete: '아직 필수 조치가 끝나지 않았습니다. 빠진 단계를 완료한 뒤 작업에 들어가세요.',
  accidentTitle: '벨트가 움직였습니다.',
  accidentBody: '이물질을 제거하려던 순간 컨베이어가 불시에 움직였습니다.',
  resultTitle: '안전을 확인하고 작업에 들어갔습니다.',
  resultDescription: '멈춰 있다는 표시를 믿고 들어가지 않았습니다. 직접 차단하고 본인 자물쇠·표지를 체결한 뒤, 차단을 확인하고 작업에 들어갔습니다.',
  exampleNotice: '화면 속 차단 지점과 안전조치는 게임용 예시입니다. 실제 작업에서는 승인된 현장별 설비 절차를 따릅니다.',
  completed: '이번 작업은 완료했습니다. 다시 연습하면 새 작업을 시작합니다.',
  requestRejected: '현재 위치와 화면에서 가능한 행동을 다시 확인하세요.',
});

export function createRun() {
  return {
    observed: new Set(), attempts: 0, rewinds: 0, completed: false,
    safety: { isolated: false, lockState: 'none', tagged: false, residualCleared: false, verification: 'unperformed' },
  };
}

function findId(rows, id) {
  if (typeof id !== 'string') throw new TypeError('식별자는 문자열이어야 합니다.');
  const row = rows.find(item => item.id === id);
  if (!row) throw new RangeError('허용되지 않은 식별자입니다.');
  return row;
}

const blocked = reason => ({ kind: 'blocked', reason });
const verificationFailed = () => ({ kind: 'blocked', effect: 'verification-failed', reason: TEXT.verificationFailed });

export function inspect(run, targetId) {
  const target = findId(TARGETS, targetId);
  if (run.completed) return blocked(TEXT.completed);
  run.observed.add(targetId);
  return target;
}

export function applyAction(run, actionId) {
  findId(ACTIONS, actionId);
  if (run.completed) return blocked(TEXT.completed);
  if (actionId === 'enter-work') return judgeEntry(run);
  const safety = run.safety;
  let key, value, reason;
  switch (actionId) {
    case 'isolate-energy':
      key = 'isolated'; value = true; reason = '에너지를 차단했습니다.';
      break;
    case 'attach-personal-lock':
    case 'attach-wrong-lock':
      if (!safety.isolated) return blocked('먼저 에너지를 차단하세요.');
      key = 'lockState'; value = actionId === 'attach-personal-lock' ? 'valid' : 'wrong';
      reason = value === 'valid' ? '본인 자물쇠를 체결했습니다.' : '다른 위치에 자물쇠를 체결했습니다. 해당 설비의 잠금을 확인하세요.';
      break;
    case 'attach-tag':
      if (safety.lockState !== 'valid') return blocked('먼저 본인 자물쇠를 올바르게 체결하세요.');
      safety.tagged = true;
      return { kind: 'progress', reason: '표지를 부착했습니다.' };
    case 'clear-residual-energy':
      if (!safety.isolated || safety.lockState !== 'valid') return blocked('에너지 차단과 본인 자물쇠 체결을 먼저 완료하세요.');
      key = 'residualCleared'; value = true; reason = '잔류 에너지 안전조치를 완료했습니다.';
      break;
    case 'verify-isolation':
      if (!safety.isolated || safety.lockState !== 'valid' || !safety.residualCleared) {
        safety.verification = 'failed';
        return verificationFailed();
      }
      safety.verification = 'passed';
      return { kind: 'progress', reason: '차단을 확인했습니다.' };
  }
  if (safety[key] !== value) {
    safety[key] = value;
    safety.verification = 'unperformed';
  }
  return { kind: 'progress', reason };
}

export function judgeEntry(run) {
  if (run.completed) return blocked(TEXT.completed);
  run.attempts += 1;
  const safety = run.safety;
  if (!safety.isolated) return { kind: 'wrong', effect: 'accident', reason: TEXT.isolationMissing };
  if (safety.lockState !== 'valid') return { kind: 'wrong', effect: 'accident', reason: TEXT.lockInvalid };
  if (safety.verification === 'failed') return verificationFailed();
  if (!safety.tagged || !safety.residualCleared || safety.verification !== 'passed') return { kind: 'incomplete', reason: TEXT.incomplete };
  run.completed = true;
  return { kind: 'success', reason: TEXT.resultDescription };
}

export function rewind(run) {
  if (run.completed) return blocked(TEXT.completed);
  run.rewinds += 1;
  return run;
}
