# SAFEPLAY 작업자 시점 플레이 초안

이 폴더는 `docs/시나리오.md` v3를 체험하는 독립 초안이다. 사용자는 레미콘 컨베이어 점검구의 이물질을 제거할 작업자이며, 전체 공장뷰에서 B/C를 선택하고 안전한 점검구 밖에서 시작한다. 이동 → 차단 지점 상호작용 → 안전조치 → 점검구 진입 → 사고·되감기 또는 성공을 한 판으로 연결한다.

기술은 저장소의 Phaser 4.2.1, HTML/CSS, JavaScript ES 모듈 및 Node 기본 모듈이다. 공장뷰는 기존 전경을 읽는다. 현장 배경과 작업자 시트는 기존 참고 이미지를 바탕으로 새로 생성한 자료이며 복사본이 아니다. 실제 산출물은 2172×724 배경과 1254×1254 작업자 시트이고 `assets/assets.json`의 측정값으로 배치한다. 생성 프롬프트는 `assets/generation-prompts.md`에 기록했다. 기존 루트 구현·문서·vendor·reference는 수정하지 않는다. `reference/`에서 런타임 import하지 않는다.

## 독립 함수 계약

기존 `docs/contract.md`는 운전원 판정용 계약으로 남아 있다. 이 초안은 그 계약을 바꿨다고 간주하지 않으며 `control`, `lock`, `worker`, `remove`, `notify`, `hold`, `start`를 새 뜻으로 재사용하지 않는다. 실제 루트 통합은 담당자 합의 뒤 제공 함수·호출부·검사를 함께 변경한다.

`src/scenario.mjs`는 DOM·Phaser·통신 없이 다음을 제공한다.

- `SAFETY_STEPS`: `{key,label}` 5개. `isolated`, `locked`, `tagged`, `residualCleared`, `verified`가 필수다.
- `TARGETS`: `{id,title,text,fact}`. `work-access`와 `energy-isolator`. 본문은 v3 문구를 그대로 사용한다.
- `ACTIONS`: `{id,label,targetId}`. 차단 지점의 `isolate-energy`, `attach-personal-lock`, `attach-wrong-lock`, `attach-tag`, `clear-residual-energy`, `verify-isolation`; 점검구의 `enter-work`.
- `createRun()`: `{observed:Set, attempts:0, rewinds:0, completed:false, safety:{isolated:false,lockPresent:false,locked:false,tagged:false,residualCleared:false,verified:false}}`.
- `inspect(run,targetId)`: 유효한 대상만 관찰 Set에 추가하고 대상을 반환한다. 안전조치와 판단 횟수는 바꾸지 않는다.
- `applyAction(run,actionId)`: `{kind,reason,effect?}`를 반환한다. 종류는 `progress`, `blocked`, `wrong`, `incomplete`, `success`다. 모르는 ID는 어떤 변경보다 먼저 예외 처리한다. 완료한 한 판은 추가 조작을 차단한다.
- `judgeEntry(run)`: 작업 진입 판단마다 `attempts`를 1회 올린다. 차단·올바른 잠금·잔류 에너지 조치 중 하나라도 없으면 `wrong` + `effect:'accident'`; 이 셋은 끝났으나 표지·확인이 누락되면 `incomplete`; 모든 필수 조치가 끝났으면 `success`와 `completed=true`다. 완료한 판의 재판정은 `blocked`이며 횟수를 늘리지 않는다. 앱은 `enter-work`를 `applyAction`으로 한 번만 호출한다.
- `rewind(run)`: `rewinds`만 증가한다. 안전조치·관찰·판단·완료 상태를 유지한다. 앱은 사고 뒤 카드에서만 호출하며 플레이어를 진입 전 안전한 위치로 돌린다.
- `serializeRun(run)`: Set을 배열로 바꾸고 검증한 JSON 전송 객체를 반환한다.
- `runFromPayload(payload)`: 정확한 필드·허용 ID·불리언·중복 없는 관찰 배열·0~1,000,000의 정수 횟수를 검증하고 독립된 Set·안전조치 객체로 복원한다. 알 수 없는 필드와 불가능한 종속 상태를 거부한다.

안전조치 선행 조건: 차단 → 본인 잠금; 올바른 잠금 → 표지; 차단+올바른 잠금 → 잔류 에너지 조치; 차단+올바른 잠금+잔류 에너지 조치 → 확인. `lockPresent`는 자물쇠가 보인다는 상태로 `locked`와 다르다. 잘못된 잠금으로 변경하면 `locked`, `tagged`, `residualCleared`, `verified`를 false로 되돌린다. 올바른 잠금을 다시 수행해 보완할 수 있다. 같은 유효 조작의 반복은 안전조치와 횟수에 추가 변화를 만들지 않는다.

서버는 자체 모듈로 `runFromPayload` 검증 후 재판정한다. 성공 전송에는 `completed=true`가 포함되므로 검증한 사본의 `completed=false`를 명시적으로 설정하고 `judgeEntry`를 한 번 호출한다. 클라이언트 결과 문자열을 판정 근거로 신뢰하지 않는다. 이 상태 재판정은 행동 이력을 인증하는 기능이 아니며 성적 저장·인증은 범위 밖이다. 서버가 증가시킨 판단 횟수는 클라이언트의 기록으로 되돌려 붙이지 않는다. AI는 재판정 결과에 보충 설명 3문장만 제공한다.

## 시뮬레이션 가정과 현장 확인

이 초안은 아직 승인된 실제 설비 작업 절차가 아니다. `residualCleared=false`는 위험한 잔류 에너지가 남아 있는 실습 상태로 명시한다. 잘못된 체결은 차단 장치를 유지하지 못하는 다른 위치에 자물쇠를 단 실습 상태다. 표지·확인 누락만으로 무작위 사고를 만들지 않는다. 조치 버튼은 특정 장치를 조작하는 실제 순서·기동 시도 방법을 가르치지 않고 상태 변화를 체험하게 한다.

해당 컨베이어의 에너지 종류와 차단 지점, 본인 자물쇠 체결 위치, 잔류 에너지 처리 방법, 차단 확인 방법, 작업자의 권한, 체결 실패 원인과 장면 배치는 사내 설비 절차·교육자료 및 담당자 대조 후 확정해야 한다. 시작 안내에 초안과 현장 절차 확인 필요를 짧게 표시한다.

## 구현 및 확인 목록

- 아트 구현: 원본 공장 전경 유지, 새 현장·작업자 이미지 및 측정 메타데이터 제공. 작업자 발 접촉점과 프레임 경계를 반영했다. 생성 이미지의 가장자리 품질과 프레임별 인물 높이 차이는 남은 시각적 한계다.
- 현장 확인: 가까운 대상에서 E 조사, 좌우 키 이동, x=76/3124 경계, 카메라 이동·경계, 시작 위치 x=704를 Chrome에서 확인했다. 연속 키 누르기와 창 비활성화의 실제 동작은 수동 확인하지 않았다.
- 앱·패널 확인: 미조치 진입 → 사고 카드 → Escape 닫기 차단 → 되감기, 잘못된 잠금 → 올바른 잠금 보완, 표지·확인 누락의 미완료, 다섯 조치 완료 후 성공을 Chrome에서 확인했다.
- 접근성·재진입 확인: 방향키·Space·E·Escape와 클릭 조작, 움직임 줄이기에서 사고 카드·되감기 도달을 확인했다. 재연습 뒤 캔버스 한 개와 초기 위치·상태를 확인했다. 연속 입력·blur 처리와 타이머 정리는 소스 검토 범위다.
- 서버 확인: Node 검사에서 정적 허용 목록·비공개 경로 차단·재판정·입력 제한·제공자 모의 응답·취소를 확인했다. `?ai=on`의 실제 키 미설정 요청은 고정 설명 3문장으로 복귀했다. 유료 OpenAI 호출은 수행하지 않았다.
- 기록 확인: 공장 왕복에서 잠금 상태·위치·횟수 유지; 다시 연습에서 다섯 조치·횟수 0·위치 x=704로 초기화했다.
- QA 결과: 시나리오 16개와 서버 17개, 합계 33개 Node 검사 통과. 앱·공장뷰·현장·시나리오·피드백·서버 구문 검사 통과. Chrome 1280×720에서 현장 배치와 결과 화면의 가로 넘침 없음을 확인했고 콘솔 오류·경고도 없었다. 상세 경로와 스크린샷은 `qa/REPORT.md`에 기록했다. 모바일은 아직 확인하지 않았다.
