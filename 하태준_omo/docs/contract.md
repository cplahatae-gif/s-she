# SAFEPLAY 작업자 시나리오 계약

근거: [구현계획](../구현계획.md), [PRD](../PRD.md), [결정사항](결정사항.md). 이 계약은 `하태준_omo`에만 적용한다. `src/scenario/scenario.mjs`는 문서 객체 모델(DOM), Phaser(브라우저 2D 게임 엔진), 타이머, 난수, 네트워크 없이 결정론적으로 동작한다.

## 공개 상수와 식별자

공개 상수는 `TARGETS`, `ACTIONS`, `SAFETY_STEPS`, `TEXT`다. 배열 및 그 항목, `TEXT` 객체는 동결한다. 조사 반환값 수정으로 이후 표시 내용이 바뀌지 않는다. 아래 두 표가 식별자의 유일한 권위 표다. 기존 운전원 식별자는 재사용하지 않는다.

### 대상 표

`TARGETS`는 `{ id: string, title: string, text: string, fact: string }` 배열이다. `text`는 조사 설명, `fact`는 짧은 학습 사실이다. 허용 행동은 `ACTIONS`의 `targetId`로 구한다.

| id | title | 허용 행동 |
|---|---|---|
| `work-access` | 컨베이어 점검구 | `enter-work` |
| `control-panel` | 조작반 | 없음, 조사만 허용 |
| `energy-isolator` | 에너지 차단·잠금 지점 | `isolate-energy`, `attach-personal-lock`, `attach-wrong-lock`, `attach-tag` |
| `verification-point` | 잔류 에너지·차단 확인 지점 | `clear-residual-energy`, `verify-isolation` |

### 행동 표

`ACTIONS`는 `{ id: string, label: string, targetId: string }` 배열이다.

| id | label | targetId |
|---|---|---|
| `isolate-energy` | 에너지 차단 | `energy-isolator` |
| `attach-personal-lock` | 본인 자물쇠 체결 | `energy-isolator` |
| `attach-wrong-lock` | 다른 위치에 자물쇠 체결 (실습) | `energy-isolator` |
| `attach-tag` | 표지 부착 | `energy-isolator` |
| `clear-residual-energy` | 잔류 에너지 안전조치 | `verification-point` |
| `verify-isolation` | 차단 확인 | `verification-point` |
| `enter-work` | 현재 상태로 점검구에 들어가 이물질을 제거한다. | `work-access` |

`SAFETY_STEPS`는 다음 `{ key, label }` 배열이다. 완료 표시는 오른쪽 조건으로 계산한다. 별도의 보조 불리언(boolean)을 저장하지 않는다.

| key | label | 완료 조건 |
|---|---|---|
| `isolated` | 에너지 차단 | `safety.isolated === true` |
| `lockState` | 본인 자물쇠 체결 | `safety.lockState === 'valid'` |
| `tagged` | 표지 부착 | `safety.tagged === true` |
| `residualCleared` | 잔류 에너지 안전조치 | `safety.residualCleared === true` |
| `verification` | 차단 확인 | `safety.verification === 'passed'` |

## 한 판과 공개 함수

`createRun()`은 매번 아래 초기 객체를 새로 반환한다. `observed` 집합(Set)과 `safety`도 판마다 참조가 분리된다.

```javascript
{
  observed: new Set(),
  attempts: 0,
  rewinds: 0,
  completed: false,
  safety: {
    isolated: false,
    lockState: 'none', // 'none' | 'wrong' | 'valid'
    tagged: false,
    residualCleared: false,
    verification: 'unperformed' // 'unperformed' | 'failed' | 'passed'
  }
}
```

`observed`는 허용된 대상 ID의 집합이고, 카운터는 0 이상의 정수다. `locked`, `lockPresent`, `verified`는 저장하지 않는다. 앱만 한 판을 소유하며 규칙 함수 호출을 통해 제자리 갱신한다. 전달한 `run`은 `createRun()`으로 생성한 신뢰 가능한 앱 내부 객체다.

| 함수 | 반환 | 허용 변경 |
|---|---|---|
| `createRun()` | 새 `run` | 없음 |
| `inspect(run, targetId)` | 동결된 해당 `TARGETS` 항목 또는 단계 거절 결과 | 미완료 판의 `observed`에 ID 추가만 |
| `applyAction(run, actionId)` | 아래 행동 결과 | 허용 안전 상태, 진입일 때 판단 기록 |
| `judgeEntry(run)` | 아래 진입 결과 | 유효 진입당 `attempts + 1`, 성공 때 `completed = true` |
| `rewind(run)` | 같은 `run`, 완료 판이면 단계 거절 결과 | 유효 되감기당 `rewinds + 1`만 |

조사는 중복되어도 한 번만 기록한다. 조사 전후 안전 상태와 모든 카운터, 완료 상태는 불변이다. 대상 설명을 읽는 일은 안전조치가 아니다. `judgeEntry()`는 미리보기 함수가 아니라 진입 제출 함수다. `applyAction(run, 'enter-work')`는 이 경로를 한 번 실행하며 호출부는 다시 `judgeEntry()`를 호출하지 않는다.

## 오류와 결과 형식

식별자 자료형을 먼저 검사한다. 인자 누락(`undefined`), `null`, 숫자, 객체, 배열 등 비문자 식별자는 `TypeError`, 빈 문자열과 허용 목록 밖 문자열은 `RangeError`다. 완료 판에서도 식별자 검사가 우선한다. 오류 전후 `run` 전체와 모든 카운터는 동일하다.

현재 단계 또는 선행 조건에서 허용되지 않는 유효 ID는 `{ kind: 'blocked', reason: string }`로 거절하고 상태 전체를 유지한다. 완료 후 조사, 행동, 직접 진입과 되감기도 거절한다. 규칙 모듈은 화면 상태를 저장하지 않으므로 사고 중 중복 제출, 거리, 대상별 행동, 사고 카드 외 되감기의 차단은 앱의 책임이다.

| 상황 | 정확한 반환 구조 |
|---|---|
| 허용 안전조치 및 확인 성공 | `{ kind: 'progress', reason: string }` |
| 단계 또는 선행 조건 거절 | `{ kind: 'blocked', reason: string }` |
| 실행된 확인 행동 실패 | `{ kind: 'blocked', effect: 'verification-failed', reason: TEXT.verificationFailed }` |
| 차단 또는 유효 잠금 없는 진입 | `{ kind: 'wrong', effect: 'accident', reason: string }` |
| 진입 시 기록된 확인 실패 | `{ kind: 'blocked', effect: 'verification-failed', reason: TEXT.verificationFailed }` |
| 진입 시 일반 미완료 | `{ kind: 'incomplete', reason: TEXT.incomplete }` |
| 성공 진입 | `{ kind: 'success', reason: TEXT.resultDescription }` |

`effect`는 표에 명시한 두 값 외에는 생략한다. `null`이나 임의 효과를 추가하지 않는다. `reason`은 항상 고정 문자열이다. `blocked`만으로 무변경이라고 가정하지 않는다. 실제 실행된 확인 실패는 `verification = 'failed'`를 기록하는 예외이며, 이미 기록된 실패를 만난 유효 진입도 `attempts`가 증가한다.

## 안전조치와 확인 무효화

- 차단은 `isolated = true`로 만든다.
- 두 잠금 행동은 차단 후에만 가능하며 각각 `lockState = 'valid'`, `'wrong'`으로 만든다. 잠금 변경으로 `tagged`, `residualCleared`를 자동 완료하거나 해제하지 않는다.
- 표지는 유효 잠금 후에만 가능하며 `tagged = true`로 만든다. 기존 확인 결과를 유지한다.
- 잔류 에너지 조치는 차단과 유효 잠금 후에만 가능하며 `residualCleared = true`로 만든다.
- 확인 행동은 차단, 유효 잠금, 잔류 에너지 조치가 모두 충족되면 `passed`, 하나라도 빠지면 `failed`를 기록한다. 표지 부착 여부는 확인 자체의 성공 조건에 포함하지 않는다. 실패 후 보완하고 다시 확인할 수 있다.

확인을 `unperformed`로 무효화하는 실제 변경은 정확히 다음 세 가지다.

1. `isolated`가 `false`에서 `true`로 변경됨.
2. `lockState`가 다른 값으로 변경됨.
3. `residualCleared`가 `false`에서 `true`로 변경됨.

같은 값으로 반복 요청하면 멱등(idempotent, 반복해도 같은 상태)이며 기존 확인 결과를 유지한다. 조사, 표지, 되감기는 확인을 무효화하지 않는다.

## 진입 우선순위와 카운터

유효한 진입 제출은 아래 순서로 첫 조건 하나만 선택한다.

1. `isolated === false`: `wrong`, `effect: 'accident'`, `TEXT.isolationMissing`.
2. `lockState !== 'valid'`: `wrong`, `effect: 'accident'`, `TEXT.lockInvalid`.
3. `verification === 'failed'`: `blocked`, `effect: 'verification-failed'`, `TEXT.verificationFailed`.
4. `tagged === false`, `residualCleared === false`, `verification !== 'passed'` 중 하나 이상: `incomplete`, `TEXT.incomplete`.
5. 모두 충족: `success`, `completed = true`, `TEXT.resultDescription`. 안전한 이물질 제거와 결과로 이동한다.

3번은 1번과 2번을 통과한 경우에만 평가한다. 표지도 빠졌다면 기록된 확인 실패가 일반 미완료보다 먼저다. 사고 원인은 차단 또는 잠금 실패로 한정한다.

유효 `enter-work` 제출은 사고, 미완료, 기록된 확인 실패, 성공 모두 `attempts`를 정확히 1 늘린다. `verify-isolation` 행동 자체의 성공 또는 실패, 조사, 안전조치, 보완 선택, 무효 요청, 완료 뒤 요청은 늘리지 않는다. 보완 선택은 별도 규칙 행동 ID가 아니라 패널을 닫는 앱 동작이다.

## 화면, 거리와 소유권

화면 상태는 `overview`, `stage-loading`, `brief`, `stage`, `inspection`, `entry-check`, `accident-playing`, `accident-card`, `result`, `asset-error`다. `src/app.js`만 `run`, `screen`, `activeTargetId`를 변경한다. 현장은 위치·속도·방향·카메라의 일시 상태만, 패널은 전달받은 스냅숏(snapshot, 조회 시점 상태)만 가진다.

현장 조사 콜백(callback)은 `targetId`만 전달한다. 앱은 `screen === 'stage'`, 알려진 대상, 유한한 현재 `stage.snapshot().x`, `Math.abs(x - layout.targets[targetId].standX) <= interactionRadius`를 검사한 뒤 조사하고 `activeTargetId`를 설정한다. 콜백이 주장하는 거리는 신뢰하지 않는다.

패널 행동 콜백은 대상 ID와 행동 ID를 전달한다. 앱은 `screen`이 `inspection` 또는 `entry-check`인지, 대상이 `activeTargetId`와 같은지, 현장의 `stage.snapshot().paused === true`인지, 현재 위치가 유한하며 같은 거리 검사를 통과하는지, 행동의 `targetId`가 요청 대상과 같은지 모두 재검사한 뒤 규칙을 호출한다. 창 비활성화 및 처리 중 중복 요청도 거절한다. 실패하면 `TEXT.requestRejected`만 표시하며 `run`을 바꾸지 않는다.

위치는 단일 수평 보행선의 `standX`를 기준으로 계산한다. 이미지 중심과 세로 원근 좌표를 거리 계산에 쓰지 않는다. 패널이 열리면 현장을 일시 정지하고 입력과 속도를 해제한다. 닫을 때 입력을 초기화하고 현장 조작 위치로 포커스(Focus)를 복원한다.

## 수명주기

- 처음 현장 진입은 로딩, 작업 요청, 점검구 밖 안전한 위치의 탐색 순서다.
- 진입은 처리 잠금을 먼저 잡아 중복 실행을 막는다. 사고 결과는 `accident-playing` 후 `accident-card`, 성공은 안전한 작업 표현 후 `result`로 간다.
- 사고 재현 일반 모드는 붉은 화면 층, 350밀리초 흔들림, 900밀리초 암전, 1,300밀리초 이내 카드다. 움직임 줄이기는 점멸·흔들림 없이 붉은 고정 층, 500밀리초 암전, 900밀리초 이내 카드다. 제출부터 카드 표시와 되감기 버튼 포커스까지 어느 경로도 6초를 넘기지 않는다.
- 사고 중에는 공장 복귀를 금지하고 사고 카드는 Escape로 닫지 못한다. 앱은 `accident-card`에서 되감기를 한 번만 수락한다. 되감기는 진입 직전 안전한 위치로 복귀하며 `rewinds`만 늘린다. 조사, 안전조치, 판단 시도, 완료 상태를 유지한다.
- 일반 패널에서 공장 복귀하면 패널과 `activeTargetId`를 닫고 현장을 정지한다. 조사, 안전조치, 카운터, 작업자 위치는 유지한다. 재진입은 미완료 판의 저장 위치 `stage`, 완료 판의 `result`로 복원한다. 일시 패널을 다시 열지 않는다.
- 다시 연습은 `createRun()`과 함께 위치, 입력, 속도, 카메라, 패널, 활성 대상, 연출 타이머와 처리 잠금을 초기화한다. 작업 요청부터 새 판으로 시작한다.
- 창 비활성화 시 입력과 속도를 해제한다. 공장, 패널, 결과에서는 이동하지 않는다. 재진입과 재연습 때 이벤트와 타이머를 해제해 중복 실행과 이전 판의 지연 콜백을 막는다.
- 자산 로딩 실패는 `asset-error`에서 알리고 재시도한다. 재시도로 안전조치나 완료 상태를 만들지 않는다.

## 고정 화면 문구

`TEXT`는 다음 키와 값의 동결 객체다. 결과 설명에 출처 라벨을 붙이지 않고 네트워크 응답으로 교체하지 않는다.

| 키 | 고정 문자열 |
|---|---|
| `brief` | 컨베이어 점검구 안에 이물질이 끼었습니다. 제거 작업을 맡았습니다. 벨트는 멈춰 있지만, 작업에 들어가기 전에 직접 안전을 확보해야 합니다. |
| `isolationMissing` | 벨트가 멈춰 있어도 다시 움직일 수 있습니다. 정지 표시는 에너지 차단과 잠금의 확인을 대신하지 못합니다. |
| `lockInvalid` | 자물쇠가 보이는 것만으로 안전해지지 않습니다. 해당 설비의 에너지를 차단하고 그 차단 상태를 유지하도록 잠가야 합니다. |
| `verificationFailed` | 차단이 확인되지 않았습니다. 현장 절차에 따라 원인을 확인하고 안전조치를 보완하세요. |
| `incomplete` | 아직 필수 조치가 끝나지 않았습니다. 빠진 단계를 완료한 뒤 작업에 들어가세요. |
| `accidentTitle` | 벨트가 움직였습니다. |
| `accidentBody` | 이물질을 제거하려던 순간 컨베이어가 불시에 움직였습니다. |
| `resultTitle` | 안전을 확인하고 작업에 들어갔습니다. |
| `resultDescription` | 멈춰 있다는 표시를 믿고 들어가지 않았습니다. 직접 차단하고 본인 자물쇠·표지를 체결한 뒤, 차단을 확인하고 작업에 들어갔습니다. |
| `exampleNotice` | 화면 속 차단 지점과 안전조치는 게임용 예시입니다. 실제 작업에서는 승인된 현장별 설비 절차를 따릅니다. |
| `completed` | 이번 작업은 완료했습니다. 다시 연습하면 새 작업을 시작합니다. |
| `requestRejected` | 현재 위치와 화면에서 가능한 행동을 다시 확인하세요. |

선행 조건 거절과 안전조치 진행의 안내도 모듈의 고정 문자열을 사용한다. 동적 설명 생성이나 통신은 하지 않는다.
