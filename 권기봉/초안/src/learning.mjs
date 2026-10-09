import { STEPS, createRun, chooseOption, acknowledgeOutcome, rewind, serializeRun, runFromPayload } from './scenario.mjs';

export const MAX_LEARNING_EVENTS = 256;
const limitation = '이번 실습의 선택 기록만으로 학습 의지·성격·동기를 판단할 수 없습니다. 다른 상황의 수행과 대화가 추가로 필요합니다.';
const course = (courseId, title, stepIds, lesson, prompt, options, correctIndex, explanation) => Object.freeze({
  courseId, title, stepIds: Object.freeze(stepIds), lesson: Object.freeze(lesson),
  question: Object.freeze({ prompt, options: Object.freeze(options), correctIndex, explanation }),
});

export const CATALOG = Object.freeze([
  course('energy-basics', '정지와 에너지 차단의 차이', ['stop'], [
    '정지 버튼은 설비의 운전을 멈추는 수단입니다. 정지 표시만으로 에너지 차단이나 본인 잠금이 완료됐다고 볼 수 없습니다.',
    '저속 운전 중에도 벨트와 롤러는 움직입니다. 작업 진입 전에 현장 절차에 따른 차단·본인 잠금·표지·확인을 완료해야 합니다.',
  ], '정지 버튼을 누른 뒤 작업에 들어가기 전에 확인할 것은?', ['벨트가 느리게 움직이면 충분하다.', '정지 표시만 보면 된다.', '차단·본인 잠금·표지·확인을 현장 절차에 따라 완료한다.', '다른 사람이 정지했다고 하면 들어간다.'], 2,
  '정지는 첫 단계입니다. 작업 진입 전의 차단·잠금·표지·확인을 대신하지 않습니다.'),
  course('work-communication', '오퍼레이터와 작업 범위 공유', ['notify'], [
    '대상 설비와 작업 내용을 명확하게 전달해 오퍼레이터가 어느 설비에서 작업 중인지 알 수 있게 합니다.',
    '연락은 차단과 본인 잠금을 대신하지 않습니다. 전달을 마친 뒤에도 현장 절차의 안전조치를 이어가야 합니다.',
  ], '작업 연락에 포함할 정보로 적절한 것은?', ['대상 설비·작업 내용·작업 중 재가동하지 않도록 전달한다.', '잠깐 본다고만 말한다.', '작업 장소를 생략한다.', '정지했으니 연락을 생략한다.'], 0,
  '대상 설비와 작업 범위를 공유해야 혼선을 줄일 수 있습니다. 이후 차단·잠금도 필요합니다.'),
  course('personal-isolation', '대상 대조와 본인 잠금', ['personal-lock'], [
    '작업 대상 설비와 현장 절차에서 정한 에너지 차단 지점을 대조합니다. 다른 설비를 잠그는 것으로 대상 설비를 보호할 수 없습니다.',
    '본인 작업의 보호를 위해 대상 차단장치에 본인 자물쇠를 적용합니다. 주변 고리나 타인의 잠금은 본인 잠금의 대체가 아닙니다. 실제 작업은 현장 절차와 권한에 따릅니다.',
  ], '본인 잠금에서 먼저 대조해야 할 것은?', ['가장 가까운 자물쇠의 색상', '주변 고리의 크기', '다른 작업자의 자물쇠 유무만 확인', '작업 대상과 현장 절차에서 정한 차단 지점'], 3,
  '대상과 차단 지점을 대조하고 해당 차단장치에 본인 잠금을 적용해야 합니다.'),
  course('tag-identification', '읽을 수 있는 본인 작업 표지', ['tagout'], [
    '표지는 작업자와 작업 상태를 식별하도록 돕습니다. 본인의 식별과 현장 절차에서 요구하는 작업 정보를 확인합니다.',
    '다른 사람의 이름표나 읽을 수 없는 표지는 올바른 식별을 보장하지 못합니다. 표지는 잠금을 대신하지 않으며 표지 누락 자체가 설비를 기동시키는 것은 아닙니다.',
  ], '적절한 태그아웃 표지는?', ['아무 이름표나 사용한다.', '본인의 식별·작업 정보가 읽을 수 있게 표시된 표지', '글자가 지워져도 붙어 있으면 된다.', '자물쇠가 있으면 표지를 생략한다.'], 1,
  '본인 식별과 작업 정보를 읽을 수 있도록 확인해 부착합니다.'),
  course('isolation-verification', '무가동 확인과 조작부 복귀', ['tryout'], [
    '잠금과 표지가 보이는 것만으로 차단 유효성을 확인했다고 볼 수 없습니다. 필요한 잔류 에너지 안전조치와 현장 절차에 따른 트라이아웃을 수행합니다.',
    '시험에서 움직임이 나타나면 작업에 들어가지 않고 원인 확인과 보완을 진행해야 합니다. 무가동을 확인한 뒤에도 현장 절차에 따라 조작부를 정지 상태로 복귀합니다.',
  ], '시험에서 설비 움직임이 나타나면?', ['잠금이 보이므로 들어간다.', '작게 움직이면 무시한다.', '작업 진입을 보류하고 현장 절차에 따라 원인 확인·보완한다.', '확인 완료라고 기록한다.'], 2,
  '움직임은 차단 유효성이 확인되지 않았다는 뜻입니다. 진입을 보류하고 보완해야 합니다.'),
  course('protected-work', '잠금 유지와 확인된 작업 범위', ['cleanup'], [
    '이물질 제거 중에는 본인 잠금과 표지를 유지하고 안전조치를 확인한 작업 범위 안에서 현장 절차에 따라 작업합니다.',
    '인접 설비까지 작업 범위를 넓히기 전에는 범위 변경과 추가 안전조치를 확인해야 합니다. 이 실습은 제거 완료에서 끝나며, 작업 후 복구·재가동은 별도의 현장 절차입니다.',
  ], '제거 작업 중 적절한 행동은?', ['본인 잠금·표지를 유지하고 확인된 범위에서 작업한다.', '접근 전에 자물쇠를 푼다.', '옆 설비까지 함께 청소한다.', '제거 준비 중 기동을 요청한다.'], 0,
  '작업 중 잠금·표지를 유지하고 확인된 범위를 지켜야 합니다.'),
]);

const coaching = Object.freeze({
  stop: '정지 표시와 차단 완료를 구분하고, 작업 진입 전의 차단·잠금·표지·확인을 순서대로 떠올려 보세요.',
  notify: '오퍼레이터에게 대상 설비와 작업 내용을 명확하게 전달하는 문장을 연습해 보세요.',
  'personal-lock': '작업 대상과 차단 지점을 대조한 뒤 해당 차단장치의 본인 잠금을 확인하는 원칙을 복습해 보세요.',
  tagout: '본인 식별과 작업 정보가 읽을 수 있게 표시됐는지 확인하는 기준을 복습해 보세요.',
  tryout: '잔류 에너지 안전조치, 무가동 확인, 조작부 정지 상태 복귀를 함께 기억해 보세요.',
  cleanup: '작업 중 잠금·표지를 유지하고 확인된 작업 범위를 지키는 원칙을 복습해 보세요.',
});

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new TypeError('학습 기록 필드가 올바르지 않습니다.');
  }
}

function validateHistory(run, events) {
  const final = runFromPayload(serializeRun(run));
  if (!final.completed || final.pending) throw new TypeError('완료된 실습만 분석할 수 있습니다.');
  if (!Array.isArray(events) || events.length > MAX_LEARNING_EVENTS) throw new TypeError('학습 선택 기록 한도를 확인하세요.');
  const replay = createRun();
  const byStep = STEPS.map(() => []);
  const validated = events.map((event) => {
    exactObject(event, ['optionId']);
    if (typeof event.optionId !== 'string') throw new TypeError('선택 기록이 올바르지 않습니다.');
    const index = replay.stepIndex;
    const choice = STEPS[index]?.options.find(({ id }) => id === event.optionId);
    if (!choice) throw new TypeError('선택 기록의 순서 또는 선택지가 올바르지 않습니다.');
    const result = chooseOption(replay, choice.id);
    if (result.kind === 'blocked') throw new TypeError('진행할 수 없는 선택 기록입니다.');
    byStep[index].push(choice);
    if (choice.effect === 'accident') rewind(replay);
    else acknowledgeOutcome(replay);
    return { optionId: choice.id };
  });
  // Inspection visits are not choice events. All decision state must match replay.
  const expected = serializeRun(replay);
  const actual = serializeRun(final);
  for (const key of ['stepIndex', 'attempts', 'rewinds', 'completed']) {
    if (expected[key] !== actual[key]) throw new TypeError('선택 기록과 실습 횟수가 일치하지 않습니다.');
  }
  if (JSON.stringify(expected.safety) !== JSON.stringify(actual.safety) || expected.pending !== actual.pending) {
    throw new TypeError('선택 기록과 완료 상태가 일치하지 않습니다.');
  }
  return { final, byStep, events: validated };
}

export function buildLearningReport(run, events) {
  const history = validateHistory(run, events);
  const strengths = [];
  const weaknesses = [];
  let repeatedErrors = 0;
  STEPS.forEach((step, index) => {
    const choices = history.byStep[index];
    const wrong = choices.filter(({ correct }) => !correct);
    repeatedErrors += wrong.length - new Set(wrong.map(({ id }) => id)).size;
    if (!wrong.length) strengths.push({ stepId: step.id, title: step.title, evidence: '이 단계의 첫 선택에서 올바른 행동을 선택했습니다.' });
    else weaknesses.push({
      stepId: step.id, title: step.title,
      evidence: `잘못된 선택 ${wrong.length}회 후 올바른 행동으로 수정했습니다. 선택 내용: ${[...new Set(wrong.map(({ title }) => title))].join(' · ')}`,
      wrongOptionIds: wrong.map(({ id }) => id),
    });
  });
  const metrics = { attempts: history.final.attempts, rewinds: history.final.rewinds, firstPassCorrect: strengths.length, correctedSteps: weaknesses.length };
  const ranked = weaknesses.slice().sort((a, b) => b.wrongOptionIds.length - a.wrongOptionIds.length || STEPS.findIndex(({ id }) => id === a.stepId) - STEPS.findIndex(({ id }) => id === b.stepId));
  const recommendations = (ranked.length ? ranked : strengths).map((item) => {
    const lesson = CATALOG.find(({ stepIds }) => stepIds.includes(item.stepId));
    return { courseId: lesson.courseId, title: lesson.title, reason: ranked.length ? item.evidence : '첫 선택에서 맞춘 원칙을 다른 작업 상황에서도 유지할 수 있도록 복습합니다.', stepIds: [...lesson.stepIds] };
  });
  return {
    version: 1, source: 'rules',
    summary: `여섯 단계를 완료했습니다. 첫 선택에서 맞춘 단계는 ${strengths.length}개, 잘못된 선택을 수정한 단계는 ${weaknesses.length}개입니다.`,
    metrics, strengths, weaknesses,
    learningBehavior: {
      title: weaknesses.length ? '선택을 수정하며 절차를 완료했습니다' : '첫 선택으로 여섯 단계를 완료했습니다',
      evidence: `선택 ${metrics.attempts}회, 사고 되감기 ${metrics.rewinds}회, 같은 오답의 반복 선택 ${repeatedErrors}회가 기록됐습니다.`,
      limitation,
    },
    recommendations,
    coachingTips: (ranked.length ? ranked : strengths).slice(0, 3).map(({ stepId }) => ({ stepId, text: coaching[stepId] })),
    events: history.events,
  };
}

// AI can prioritize approved coaching and factual summaries; it cannot author new
// safety instructions, learner personality claims, evidence, or recommendations.
export function learningAIChoices(report) {
  const eligible = report.weaknesses.length ? report.weaknesses : report.strengths;
  return {
    summaries: [report.summary,
      `첫 선택에서 맞춘 단계 ${report.metrics.firstPassCorrect}개와 선택을 수정한 단계 ${report.metrics.correctedSteps}개를 바탕으로 다음 복습을 제안합니다.`,
      `선택 ${report.metrics.attempts}회와 사고 되감기 ${report.metrics.rewinds}회의 기록을 바탕으로 완료된 실습을 돌아봅니다.`],
    tips: eligible.map(({ stepId }) => ({ stepId, text: coaching[stepId] })),
  };
}

export function mergeLearningAI(report, content) {
  try {
    exactObject(content, ['summary', 'coachingTips']);
    const choices = learningAIChoices(report);
    if (!choices.summaries.includes(content.summary) || !Array.isArray(content.coachingTips)
      || content.coachingTips.length < 1 || content.coachingTips.length > 3) return report;
    const seen = new Set();
    for (const tip of content.coachingTips) {
      exactObject(tip, ['stepId', 'text']);
      if (seen.has(tip.stepId) || !choices.tips.some(({ stepId, text }) => tip.stepId === stepId && tip.text === text)) return report;
      seen.add(tip.stepId);
    }
    return { ...report, source: 'ai', summary: content.summary, coachingTips: content.coachingTips.map((tip) => ({ ...tip })) };
  } catch { return report; }
}

export function exportLearningRecord(report) {
  return {
    schema: 'safeplay.learning-record', version: 1, scenarioId: 'bc-loto-01',
    analysisSource: report.source,
    metrics: { ...report.metrics },
    events: report.events.map((event) => ({ ...event })),
    observedStrengthStepIds: report.strengths.map(({ stepId }) => stepId),
    observedWeaknessStepIds: report.weaknesses.map(({ stepId }) => stepId),
    courseIds: report.recommendations.map(({ courseId }) => courseId),
    limitation: report.learningBehavior.limitation,
  };
}

export async function getLearningReport(run, events, { signal, enabled = true } = {}) {
  const payload = serializeRun(run);
  const fixed = buildLearningReport(runFromPayload(payload), events);
  const cancelled = () => signal?.reason ?? new DOMException('요청이 취소되었습니다.', 'AbortError');
  if (signal?.aborted) throw cancelled();
  if (!enabled) return fixed;
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch('./api/learning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run: payload, events: fixed.events }), signal: controller.signal,
    });
    if (signal?.aborted) throw cancelled();
    if (!response.ok) return fixed;
    const result = await response.json();
    if (signal?.aborted) throw cancelled();
    if (result?.source !== 'ai') return fixed;
    // Independently preserve all canonical evidence, even for a tampered server reply.
    return mergeLearningAI(fixed, { summary: result.summary, coachingTips: result.coachingTips });
  } catch (error) {
    if (signal?.aborted) throw cancelled();
    return fixed;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
