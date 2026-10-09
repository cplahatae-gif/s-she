# 함수 계약 (contract)

두 사람이 지키는 공통 형태다. 구현 코드가 아니라 약속이다. 바꿀 때는 먼저 말하고, 제공 함수·호출부·검사를 같은 커밋에서 고친다. 확정: 2026-10-09 10:20 계약 단계에서 두 사람이 서명.

## 1. 식별자

| 종류 | 값 | 뜻 |
|---|---|---|
| 조사 id | `control` | 조작반 (오른쪽 끝, 시작 위치). 맥락 |
| 조사 id | `lock` | 로컬 스위치 자물쇠·표지 (중앙). 필수 |
| 조사 id | `worker` | 점검구 안 동료 (왼쪽 끝, 기둥 뒤). 필수 |
| 선택 id | `remove` | 자물쇠를 잘라내고 가동. 오답, 사고 재현 |
| 선택 id | `notify` | 방송 뒤 자물쇠 풀고 가동. 오답, 사고 재현 |
| 선택 id | `hold` | 보류하고 표지의 김OO를 찾아 확인. 정답 |
| 선택 id | `start` | 그냥 버튼. 가동 불가 (스트레치 2) |
| 판정 kind | `wrong` / `incomplete` / `success` / `blocked` | |
| 판정 effect | `accident` | `wrong`일 때만 |
| 화면 view | `overview` / `stage` | |
| 현장 phase | `explore` / `inspect` / `decide` / `feedback` / `accident` / `restore` / `complete` | `restore`는 스트레치 3 |

문구는 `docs/시나리오.md` 4~9장 그대로 쓴다.

## 2. 파일과 소유자

| 파일 | 소유자 | 내보내는 것 |
|---|---|---|
| `src/scenario/scenario.mjs` | 권기봉 | `clues`, `choices`, `requiredClueIds`, `newRun`, `judge`, `rewind` |
| `src/site/layout.mjs` | 권기봉 | `layout`: 월드 폭, 시작 x(오른쪽 끝), 경계, 조사 거리, id별 x, 가림 기둥 x, 이미지 규격 |
| `src/site/stage.js` | 권기봉 | `mountStage(root, options)` |
| `src/ui/panel.js` | 권기봉 | `mountPanel(root, callbacks)` |
| `src/overview/overview.js` | 하태준 | `mountOverview(root, {onEnter})` |
| `src/feedback/feedback.mjs` | 하태준 | `getExplanation(context, {signal})` |
| `src/app.js` | 하태준 | 시작·전환·run 소유. 위 함수를 연결 |
| `server/` | 하태준 | `/api/feedback` (AI 단계) |

## 3. 형태

```text
newRun()
  → { observed: Set<clueId>, attempts: 0, rewinds: 0, pressureCount: 0 }

judge(run, choiceId)
  → { kind, effect?, reason }
  잘못된 id → 예외. attempts += 1.
  순서: blocked → wrong(+effect 'accident') → incomplete(requiredClueIds 중 미조사) → success

rewind(run)
  → rewinds += 1. observed·attempts 유지. (app.js가 되감기 버튼에서 호출)

mountStage(root, { layout, clues, onInspect })
  → Promise<{ setPaused(bool), reset(), snapshot(), restore(snapshot),
              playAccident(), clearAccident(), destroy() }>
  onInspect(clueId): 거리 검사를 통과한 유효 조사만 호출
  playAccident(): 붉은 점멸 + 카메라 흔들림 0.6s + 암전. 암전 완료 시 resolve.
                  prefers-reduced-motion이면 점멸·흔들림 없이 고정 레이어 → 암전
  clearAccident(): 레이어 제거

mountPanel(root, { onClose, onDecide, onChoose, onRetry, onOverview, onRewind })
  → { showInspect(clue), showChoices(choices, observedIds), showFeedback(result),
      showAccident(card, { onRewind }), showRadio(text),        // showRadio 스트레치 1
      showRestore(steps, { onComplete }),                        // 스트레치 3
      showResult(result, run), showExplanation(explanation), close(), destroy() }
  패널은 run 상태를 갖지 않는다. 버튼은 콜백만 부른다.
  showAccident: 되감기 버튼에 포커스. Escape로 닫히지 않는다.

mountOverview(root, { onEnter })
  → { destroy() }
  구역 좌표는 이미지 비율 (u, v). 실제 표시 영역에 적용.

getExplanation({ choiceId, observedIds, kind }, { signal })
  → Promise<{ source: 'ai' | 'fixed', text }>
  오류·8초 초과·설정 없음 → source 'fixed'
```

## 4. 상태 흐름 (app.js)

```text
overview → B/C 선택 → newRun (없을 때만) → stage/explore
explore → 조사 → inspect → 닫기 → explore
explore → 판단 → decide → 제출 → judge
  wrong+accident → stage.playAccident() → panel.showAccident() → 되감기 → rewind → explore
  incomplete → feedback → explore
  blocked → feedback → explore
  success → (restore) → complete
complete → 다시 연습 → 전부 초기화 → explore
complete / explore → 공장으로 → overview (run 유지)
```

## 5. 서명

| | 하태준 | 권기봉 |
|---|---|---|
| 계약 확인 시각 | | |
