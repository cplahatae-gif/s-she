export const SAFETY_STEPS = Object.freeze([
  { key: 'isolated', label: '에너지 차단' },
  { key: 'locked', label: '본인 자물쇠 체결' },
  { key: 'tagged', label: '표지 부착' },
  { key: 'residualCleared', label: '잔류 에너지 안전조치' },
  { key: 'verified', label: '차단 확인' },
].map(Object.freeze));

export const ACTIONS = Object.freeze([
  { id: 'isolate-energy', label: '에너지 차단', targetId: 'energy-isolator' },
  { id: 'attach-personal-lock', label: '본인 자물쇠 체결', targetId: 'energy-isolator' },
  { id: 'attach-wrong-lock', label: '다른 위치에 자물쇠 체결 (실습)', targetId: 'energy-isolator' },
  { id: 'attach-tag', label: '표지 부착', targetId: 'energy-isolator' },
  { id: 'clear-residual-energy', label: '잔류 에너지 안전조치', targetId: 'energy-isolator' },
  { id: 'verify-isolation', label: '차단 확인', targetId: 'energy-isolator' },
  { id: 'enter-work', label: '현재 상태로 점검구에 들어가 이물질을 제거한다.', targetId: 'work-access' },
].map(Object.freeze));

export const TARGETS = Object.freeze([
  {
    id: 'work-access', title: '컨베이어 점검구',
    text: '컨베이어 점검구 안에 이물질이 끼었습니다. 제거 작업을 맡았습니다. 벨트는 멈춰 있지만, 작업에 들어가기 전에 직접 안전을 확보해야 합니다.',
    fact: '정지와 에너지 차단은 다릅니다.',
  },
  {
    id: 'energy-isolator', title: '에너지 차단·잠금 지점',
    text: '내가 작업할 컨베이어의 차단 지점인지 확인하세요. 현장 절차에 따라 에너지를 차단하고, 본인 자물쇠와 표지를 체결하세요. 열쇠는 본인이 관리합니다.',
    fact: '잠금 후에도 확인이 필요합니다. 현장 절차에 따라 잔류 에너지를 안전하게 처리하고 차단이 유효한지 확인하세요. 확인되지 않은 상태에서는 작업에 들어가지 않습니다.',
  },
].map(Object.freeze));

const targetIds = new Set(TARGETS.map(({ id }) => id));
const actionIds = new Set(ACTIONS.map(({ id }) => id));
const safetyKeys = ['isolated', 'lockPresent', 'locked', 'tagged', 'residualCleared', 'verified'];
const runKeys = ['observed', 'attempts', 'rewinds', 'completed', 'safety'];
const counterLimit = 1_000_000;
const result = (kind, reason) => ({ kind, reason });
const allSafe = (safety) => SAFETY_STEPS.every(({ key }) => safety[key]);

export function createRun() {
  return {
    observed: new Set(), attempts: 0, rewinds: 0, completed: false,
    safety: { isolated: false, lockPresent: false, locked: false, tagged: false, residualCleared: false, verified: false },
  };
}

export function inspect(run, targetId) {
  if (!targetIds.has(targetId)) throw new RangeError('알 수 없는 조사 대상입니다.');
  run.observed.add(targetId);
  return TARGETS.find(({ id }) => id === targetId);
}

export function applyAction(run, actionId) {
  if (!actionIds.has(actionId)) throw new RangeError('알 수 없는 행동입니다.');
  if (run.completed) return result('blocked', '이번 작업은 완료했습니다. 다시 연습하면 새 작업을 시작합니다.');
  if (actionId === 'enter-work') return judgeEntry(run);
  const safety = run.safety;
  switch (actionId) {
    case 'isolate-energy':
      safety.isolated = true;
      return result('progress', '실습의 에너지 차단 상태를 완료했습니다. 본인 자물쇠와 표지를 체결하세요.');
    case 'attach-personal-lock':
      if (!safety.isolated) return result('blocked', '먼저 에너지를 차단한 뒤 본인 자물쇠를 체결하세요.');
      safety.lockPresent = true;
      safety.locked = true;
      return result('progress', '본인 자물쇠로 차단 상태를 유지했습니다. 표지와 나머지 안전조치를 확인하세요.');
    case 'attach-wrong-lock':
      if (!safety.isolated) return result('blocked', '먼저 에너지를 차단해야 잠금 위치를 실습할 수 있습니다.');
      safety.lockPresent = true;
      safety.locked = false;
      safety.tagged = false;
      safety.residualCleared = false;
      safety.verified = false;
      return result('progress', '자물쇠가 보이는 것만으로 안전해지지 않습니다. 해당 설비의 에너지를 차단하고 그 차단 상태를 유지하도록 잠가야 합니다.');
    case 'attach-tag':
      if (!safety.locked) return result('blocked', '본인 자물쇠로 차단 장치를 제대로 잠근 뒤 표지를 부착하세요.');
      safety.tagged = true;
      return result('progress', '표지를 부착했습니다. 잔류 에너지 안전조치와 차단 확인도 필요합니다.');
    case 'clear-residual-energy':
      if (!safety.isolated || !safety.locked) return result('blocked', '에너지 차단과 올바른 본인 잠금부터 완료하세요.');
      safety.residualCleared = true;
      return result('progress', '실습의 잔류 에너지 안전조치 상태를 완료했습니다. 차단 확인을 수행하세요.');
    case 'verify-isolation':
      if (!safety.isolated || !safety.locked || !safety.residualCleared) {
        return result('blocked', '차단이 확인되지 않았습니다. 현장 절차에 따라 원인을 확인하고 안전조치를 보완하세요.');
      }
      safety.verified = true;
      return result('progress', '실습의 차단 확인을 완료했습니다. 모든 필수 조치가 완료됐는지 확인하세요.');
  }
}

export function judgeEntry(run) {
  if (run.completed) return result('blocked', '이번 작업은 완료했습니다. 다시 연습하면 새 작업을 시작합니다.');
  run.attempts += 1;
  const safety = run.safety;
  if (!safety.isolated || !safety.locked || !safety.residualCleared) {
    let reason = '잠금 뒤 차단 확인을 생략해 불완전한 차단을 발견하지 못했습니다. 작업 전에 차단의 유효성을 확인해야 합니다.';
    if (!safety.isolated || !safety.lockPresent) {
      reason = '벨트가 멈춰 있어도 다시 움직일 수 있습니다. 정지 표시는 에너지 차단과 잠금의 확인을 대신하지 못합니다.';
    } else if (!safety.locked) {
      reason = '자물쇠가 보이는 것만으로 안전해지지 않습니다. 해당 설비의 에너지를 차단하고 그 차단 상태를 유지하도록 잠가야 합니다.';
    } else if (safety.verified === false) {
      reason = '실습에서는 필요한 잔류 에너지 안전조치가 끝나지 않아 위험한 에너지가 남아 있습니다. 안전조치를 보완하고 차단을 확인하세요.';
    }
    return { kind: 'wrong', reason, effect: 'accident' };
  }
  if (!allSafe(safety)) return result('incomplete', '아직 필수 조치가 끝나지 않았습니다. 빠진 단계를 완료한 뒤 작업에 들어가세요.');
  run.completed = true;
  return result('success', '멈춰 있다는 표시를 믿고 들어가지 않았습니다. 직접 차단하고 본인 자물쇠·표지를 체결한 뒤, 차단을 확인하고 작업에 들어갔습니다.');
}

export function rewind(run) {
  run.rewinds += 1;
  return run;
}

export function serializeRun(run) {
  const payload = {
    observed: [...run.observed], attempts: run.attempts, rewinds: run.rewinds,
    completed: run.completed, safety: { ...run.safety },
  };
  runFromPayload(payload);
  return payload;
}

function exactObject(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${name}는 객체여야 합니다.`);
  }
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new TypeError(`${name} 필드가 올바르지 않습니다.`);
  }
}

export function runFromPayload(payload) {
  exactObject(payload, runKeys, 'run');
  exactObject(payload.safety, safetyKeys, 'safety');
  if (!Array.isArray(payload.observed) || payload.observed.length > targetIds.size
    || payload.observed.some((id) => !targetIds.has(id))
    || new Set(payload.observed).size !== payload.observed.length) {
    throw new TypeError('조사 기록이 올바르지 않습니다.');
  }
  for (const key of ['attempts', 'rewinds']) {
    if (!Number.isSafeInteger(payload[key]) || payload[key] < 0 || payload[key] > counterLimit) {
      throw new TypeError('기록 횟수가 올바르지 않습니다.');
    }
  }
  if (typeof payload.completed !== 'boolean' || safetyKeys.some((key) => typeof payload.safety[key] !== 'boolean')) {
    throw new TypeError('안전조치 상태는 불리언이어야 합니다.');
  }
  const safety = payload.safety;
  if ((safety.lockPresent && !safety.isolated)
    || (safety.locked && (!safety.isolated || !safety.lockPresent))
    || (safety.tagged && !safety.locked)
    || (safety.residualCleared && (!safety.isolated || !safety.locked))
    || (safety.verified && (!safety.isolated || !safety.locked || !safety.residualCleared))
    || (payload.completed && (!allSafe(safety) || payload.attempts < 1))) {
    throw new TypeError('서로 모순되는 안전조치 상태입니다.');
  }
  return {
    observed: new Set(payload.observed), attempts: payload.attempts, rewinds: payload.rewinds,
    completed: payload.completed, safety: { ...safety },
  };
}
