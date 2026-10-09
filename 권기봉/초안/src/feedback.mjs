import { judgeEntry, runFromPayload, serializeRun } from './scenario.mjs';

export function sentences(text) {
  if (typeof text !== 'string' || text.length > 1200) return [];
  return text.trim().match(/[^.!?。！？]+[.!?。！？](?:[”’"']|$|\s)*/gu)?.map((part) => part.trim()) ?? [];
}

export function fixedExplanation(result) {
  let text;
  switch (result.kind) {
    case 'success':
      text = '설비를 정지하고 운전자에게 알린 뒤 MCC에서 에너지를 차단했습니다. 본인 자물쇠·표지를 체결하고 잔류 에너지를 처리한 뒤 시동 시험으로 차단을 확인하고 이물질을 제거했습니다. 현실에는 되감기가 없습니다.';
      break;
    case 'incomplete':
      text = '아직 필수 조치가 끝나지 않았습니다. 빠진 단계를 완료한 뒤 작업에 들어가세요. 현실에는 되감기가 없습니다.';
      break;
    case 'wrong': {
      const reason = sentences(result.reason)[0] ?? '위험한 에너지가 남은 상태로 작업에 들어갔습니다.';
      text = `${reason} 작업 전에 차단·잠금과 잔류 에너지 안전조치 및 차단 확인을 완료해야 합니다. 현실에는 되감기가 없습니다.`;
      break;
    }
    case 'blocked':
      text = '차단 상태가 확인되지 않아 작업 진입을 보류합니다. 현장 절차에 따라 원인을 확인하고 안전조치를 보완하세요. 현실에는 되감기가 없습니다.';
      break;
    default:
      throw new TypeError('허용되지 않은 판정입니다.');
  }
  return { source: 'fixed', text };
}

export function validSupplement(text, fixed) {
  const parts = sentences(text);
  if (parts.length !== 3 || parts.join(' ') !== text.trim()) return false;
  // The immutable outcome and final warning surround one educational AI sentence.
  const original = sentences(fixed.text);
  return parts[0] === original[0] && parts[2] === original[2]
    && !/(성공|실패|판정|가능|허가|승인|안전합니다|안전하다|진입해도|들어가도|생략|불필요|필요\s*없|필요하지|않아도|없어도|충분|선택사항|해제해|무시해|재가동|완료했|완료됐|확인됐)/u.test(parts[1]);
}

export async function getExplanation(run, { signal, enabled = false } = {}) {
  const payload = serializeRun(run);
  const snapshot = runFromPayload(payload);
  const fixed = fixedExplanation(judgeEntry(snapshot));
  if (signal?.aborted) throw signal.reason ?? new DOMException('요청이 취소되었습니다.', 'AbortError');
  if (!enabled) return fixed;
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('./api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (signal?.aborted) throw signal.reason ?? new DOMException('요청이 취소되었습니다.', 'AbortError');
    if (!response.ok) return fixed;
    const result = await response.json();
    if (signal?.aborted) throw signal.reason ?? new DOMException('요청이 취소되었습니다.', 'AbortError');
    if (result?.source === 'ai' && validSupplement(result.text, fixed)) return { source: 'ai', text: result.text };
    return fixed;
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    return fixed;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
