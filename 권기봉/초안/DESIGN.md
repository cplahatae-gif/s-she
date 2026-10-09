# SAFEPLAY 작업자 시점 플레이 초안

독립 초안의 작업자는 컨베이어 이물질 제거를 맡는다. 작업반장이 “컨베이어 밑에 있는 이물질을 제거하세요”라고 지시하고, 첫 질문은 “작업 시작 전에 무엇을 하겠습니까?”이다. 전체 공장뷰에서 B/C를 선택하면 안전한 위치에서 시작한다. 현장 이동과 대상 조사를 거쳐 여섯 질문을 순서대로 해결한다.

이번 변경은 사용자가 요청한 로컬 게임 수정이다. 커밋·푸시·스테이징·fetch·pull·stash·reset을 수행하지 않는다. 기존 루트 구현·문서·vendor·reference는 수정 범위 밖이다. 변경 전후 `git status`와 소유 파일의 `git diff`를 확인하고 동시 작업자의 변경은 보존한다.

## 실행 계획과 책임

1. 규칙 담당: `src/scenario.mjs`의 여섯 단계·24개 보기·단계별 결과·상태 계약을 구현하고 `tests/scenario.test.mjs`로 검증한다.
2. 앱 담당: `src/app.js`에서 현재 질문의 네 보기, 행동 결과 확인, 같은 단계 재도전, 완료 흐름을 연결한다.
3. 현장 담당: `src/stage.js`의 이동·대상 배치·행동 애니메이션을 연결한다. 장면은 규칙의 결과를 표현하며 판정하지 않는다.
4. 피드백 담당: 서버와 고정 설명을 새 전송 객체 및 순수 재판정에 맞춘다.
5. 통합 확인: 소유 파일별 diff·Node 검사 후 실제 브라우저에서 여섯 단계, 서로 다른 오답, 되감기, 재연습, 공장 왕복을 검증한다. 실제로 확인한 항목만 QA 기록에 남긴다.

기술은 저장소의 Phaser 4.2.1, HTML/CSS, JavaScript ES 모듈 및 Node 기본 모듈이다. 공장뷰는 기존 전경을 읽는다. 현장 배경과 작업자 시트는 `assets/assets.json`의 측정값으로 배치하며, 생성 이력은 `assets/generation-prompts.md`와 걷기 자료의 별도 프롬프트 기록에 있다. `reference/`에서 런타임 import하지 않는다.

## 독립 함수 계약

`src/scenario.mjs`는 DOM·Phaser·통신 없이 다음을 제공한다. 다른 루트 시나리오의 계약과 독립적인 초안 계약이다.

- `STEPS`: 읽기 전용 여섯 단계. `{id,title,targetId,question,options}`이며 각 `options`는 고유한 네 보기, 정답 한 개다. 보기는 `{id,text,correct,effect,title,explanation,actionCaption,animation}`이다. 정답의 위치는 `[2,0,3,1,2,0]`으로 달라진다.
- 단계 순서: 설비 정지 → 오퍼레이터 전달 → MCC 차단·본인 잠금 → 태그아웃 → 잔류 에너지 안전조치·트라이아웃 → 이물질 제거.
- `SAFETY_STEPS`: 화면에 표시할 `{key,label}` 여섯 개. `stopped`, `notified`, `locked`, `tagged`, `verified`, `cleaned`다.
- `TARGETS`: `{id,title,text,fact}` 세 개. `control` 조작반·연락, `energy-isolator` MCC 차단·잠금, `work-access` 점검구. 단계별 대상은 `control → control → energy-isolator → energy-isolator → control → work-access`다.
- `createRun()`: `{stepIndex:0,observed:Set,attempts:0,rewinds:0,completed:false,safety,pending:null}`. 안전조치 객체는 `stopped`, `notified`, `isolated`, `lockPresent`, `locked`, `tagged`, `residualCleared`, `verified`, `cleaned`의 아홉 불리언이며 처음에는 모두 false다.
- `inspect(run,targetId)`: 유효한 대상을 관찰 Set에 기록하고 대상 내용을 반환한다. 조사만으로 안전조치가 완료되지 않는다.
- `getCurrentStep(run)`: 현재 단계를 반환한다. 완료하면 null이다. `getPendingOutcome(run)`은 아직 확인하지 않은 선택의 결과를 복원하며, 대기가 없으면 null이다.
- `chooseOption(run,optionId)`: 현재 단계의 유효한 선택에서만 `attempts`를 한 번 증가시킨다. 정답은 해당 단계의 안전조치를 반영하고 `pending:{stepId,optionId,kind:'progress'}`를 만든다. 오답은 이전 체크포인트의 안전조치를 유지하며 `pending.kind='wrong'`을 만든다. 다른 단계·완료·결과 확인 대기 중에는 `blocked`, 알 수 없는 ID는 어떤 변경보다 먼저 RangeError다.
- 결과 형식은 `{kind,effect,title,reason,explanation,actionCaption,animation,stepId,optionId}`다. `kind`는 `progress`, `wrong`, `blocked`, `success`; 선택별 `effect`는 `safe-action`, `accident`, `notice`, `mismatch`, `unidentified`, `unverified`, `paused`다. 차단 응답에는 선택 ID나 애니메이션이 없을 수 있다.
- `acknowledgeOutcome(run)`: 정답 결과 확인 뒤에만 `stepIndex`를 증가시킨다. 마지막 정답 확인에서 `stepIndex=6`, `completed=true`, `kind='success'`가 된다. 비사고 오답 확인은 pending만 해제하고 같은 질문으로 돌아간다. 사고 결과는 이 함수로 해제할 수 없다.
- `rewind(run)`: 사고 오답에서만 pending을 해제하고 `rewinds`를 증가시킨다. 선택 전 단계·안전조치와 관찰·시도 기록을 유지한다. 사고 장면에서 실행한 위험 분기는 설명용 표현이며, 정상 진행의 체크포인트를 덮어쓰지 않는다.
- `judgeEntry(run)`: 순수 재판정이다. 여섯 단계와 아홉 안전조치가 완료되면 `success`, 아니면 `wrong`과 작업 보류 설명을 반환한다. 미완료 상태만으로 사고를 만들지 않으며 횟수·완료 상태를 변경하지 않는다.
- `serializeRun(run)`: Set을 배열로 바꾸고 안전조치·pending을 복사한 JSON 전송 객체를 검증하여 반환한다. `runFromPayload(payload)`는 독립된 Set과 객체를 복원한다.

정상 상태 변화는 `stopped → notified → isolated+lockPresent+locked → tagged → residualCleared+verified → cleaned`다. 다음 단계는 결과 확인까지 끝나야 선택할 수 있다. 두 번 클릭하거나 결과 창에서 다른 보기를 골라도 시도 횟수는 늘지 않는다. 다시 연습은 `createRun()`으로 모든 기록과 조치를 초기화한다.

전송 검증은 정확한 필드·허용 ID·중복 없는 조사 배열·불리언·0~1,000,000 정수 횟수·0~6 단계 번호를 요구한다. 안전조치는 확인된 단계의 정확한 접두 상태와 같아야 하며, 정답 pending이면 현재 단계 조치만 추가한다. pending의 단계·보기·종류는 현재 질문과 일치해야 한다. 완료 플래그는 단계 6과 동치이고, 시도·되감기 횟수의 하한 및 상호 관계도 검증한다. 알 수 없는 필드, 과거·미래 pending, 허위 완료와 모순된 상태를 거부한다.

서버는 검증한 상태로 `judgeEntry`를 호출하며 클라이언트 결과 문자열을 판정 근거로 사용하지 않는다. 정답 대기 상태의 이물질 제거는 아직 완료로 인정하지 않는다. 이 상태 검증은 행동 이력 인증이나 성적 저장 기능이 아니다. AI는 규칙 결과를 바꾸지 않고 보충 설명만 제공한다.

## 시뮬레이션 가정과 현장 확인

이 초안은 예시 설비의 선택형 실습이며 승인된 실제 작업 절차가 아니다. 구체적인 전압·MCC 내부 작업·무자격 조작 방법을 안내하지 않는다. 대상 에너지와 차단 지점, 잠금 위치, 잔류 에너지 처리, 트라이아웃 방법, 작업 권한은 해당 설비의 현장 절차로 확인해야 한다.

오답은 선택별 결과를 갖는다. 불통보는 작업 인지 누락과 재가동 오인 우려, 다른 설비 잠금은 대상 불일치, 타인 잠금 의존은 본인 보호 누락, 잘못된 표지는 식별 정보 오류, 트라이아웃 누락은 유효성 미확인, 시험 중 움직임은 차단 이상 발견으로 표현한다. 표지 누락 자체가 설비를 기동시키지 않는다. 사고는 운전 중 접근, 차단 전 접근, 부적합 체결 후 진입, 작업 전 잠금 해제 후 진입의 네 가지 위험 행동 분기에서만 재현한다. 작업 범위 밖 행동과 재가동 요청은 실제 접근·재가동 전에 보류한다.

## 현재 규칙 검증

시나리오 Node 검사 14개가 통과했다. 여섯 단계·각 네 보기·정답 위치, 18개 오답의 서로 다른 설명과 결과, 결과 확인 전 진행 차단, 중복 입력의 단일 기록, 잘못된 ID의 무변경, 전체 완료, 사고 되감기 기록 유지, 새 실습 초기화, 순수 재판정, 모든 pending JSON 왕복 및 허위 상태 거부를 확인한다. 이번 통합의 브라우저 검증과 서버 검사 결과는 담당자가 실제 실행 후 QA 기록으로 확정한다. 이전 자유 행동 버전의 QA 결과를 이번 버전의 확인으로 재사용하지 않는다.
