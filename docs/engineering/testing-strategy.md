# Testing Strategy

이 문서는 새 V1 목표 계약을 구현할 때 필요한 검증 범위를 정의합니다. 현재 테스트 suite는 이전 구현의 회귀 기준선이며, 기능별 전환에서 아래 시나리오를 추가하거나 교체합니다.

## 목표

- 돈·기간·예약 계산은 빠른 단위 테스트로 경계를 고정합니다.
- API의 request/response, 인증, 권한과 개인정보 필터는 통합 테스트로 검증합니다.
- MySQL constraint, transaction과 동시성은 Testcontainers MySQL로 검증합니다.
- 프론트엔드는 구현 세부보다 사용자가 보는 결과와 실제 상호작용을 검증합니다.
- E2E는 가입·초대·예산·거래 가져오기처럼 계층을 가로지르는 핵심 흐름에 제한합니다.

## 위험 우선순위

| 우선순위 | 위험 | 주 검증 |
| --- | --- | --- |
| P0 | 상대방 비공개 거래·카드 식별 정보 노출 | API integration, E2E |
| P0 | 예산·거래 합계 손실 또는 중복 자동 거래 | domain unit, MySQL integration |
| P0 | 초대 동시 수락으로 3명 이상 참여 | MySQL integration |
| P1 | 예산 기간·월말·윤년 경계 오류 | pure unit, integration |
| P1 | 탈퇴 후 권한과 예약 거래 상태 오류 | integration |
| P1 | OCR batch의 부분 저장·중복 저장 | integration, UI flow |
| P2 | 화면 empty/error/loading 상태와 접근성 | component, E2E |

## Backend

### Unit

Spring context 없이 다음 순수 규칙을 검증합니다.

- `1..28`과 말일 예산 기간의 시작·종료일
- 기간 시작일 변경이 과거 구간을 바꾸지 않는 규칙
- 전체·개인·공동 배분과 예비비 계산
- 현재 잔액·예정액·사용 가능액, 음수 초과 표시
- category budget의 미배분·상위 예산 증액 확인
- 이체 하위 유형별 예산·수입·지출 반영
- 할부 원금 나눗셈과 나머지 1원 배분
- 주·월·연 반복일과 존재하지 않는 월 일자의 말일 보정
- 80%·100% threshold 상태 전이와 재진입
- 사용자 시간대의 일요일 21시 주간 권장액
- 사용처 정규화, category 추천 범위와 중복 후보 판정

모든 날짜 테스트는 고정 `Clock`과 명시적인 `ZoneId`를 사용합니다.

### Focused API / Security

- malformed JSON과 validation의 공통 error format
- nickname 미확정 사용자의 허용·차단 endpoint
- resource id API가 장부 멤버십을 다시 검사하는지
- 개인 거래 owner, 공동 거래 active member, former member의 읽기·쓰기 경계
- 공유 개인 거래 응답의 payment method 식별 필드 제거
- 목록·검색·dashboard·analytics query에서 상대방 개인 거래 제외
- batch classify가 한 항목 실패 시 전체 rollback되는지
- optional·nullable field와 enum 직렬화가 계약과 일치하는지

### MySQL Integration

- Kakao callback, refresh token rotation/reuse rejection, logout
- 사용자별 기본 개인 장부 exactly-one 보장
- 공동 장부 owner 1명·활성 멤버 최대 2명 constraint
- 초대 링크 교체·30분 만료·accept/reject·동시 수락
- 소유권 이전, 탈퇴·내보내기, 재참여와 다른 상대방 차단
- 멤버십 종료 시 예약 계획 전체 일시정지
- 겹치지 않는 budget period와 다음 기간 설정·자동 복사
- reserve transfer 원자성, allocation·category budget 증액 확인
- 과거 기간 거래 수정 후 집계 재계산과 새 알림 미생성
- category rename/delete와 transaction snapshot 보존·선택적 과거 적용
- 개인/공동 거래 mutation과 공유 상태 변경
- installment/recurring occurrence 중복 방지와 실제·예정 이중 차감 방지
- import preview의 저신뢰 제외, 사용자·장부별 추천, batch save 원자성·멱등성
- notification threshold 재진입, read-all과 기간 전환 정리
- migration 전후 장부·거래·금액 합계와 권한 query

실제 DB 방언, unique constraint, lock과 transaction이 중요한 테스트는 H2로 대체하지 않습니다.

### Command

```bash
cd backend
./gradlew test
```

CI는 `MySqlPersistenceIntegrationTest`가 skip되지 않았는지 별도로 검사합니다. 새 MySQL 필수 suite를 분리하면 같은 방식으로 skip을 실패 처리합니다.

## Frontend

### Component / Route

- Kakao login callback, 실패 후 자동 재요청 방지와 원래 내부 경로 복귀
- 최초 닉네임 확정, 일반 로그인·초대 링크 복귀 분기
- 장부 선택과 former read-only 상태
- 초대 전·예산 전·거래 전 dashboard empty state
- 현재/과거 예산 기간 이동과 말일 표시
- 개인·공동·예비비 배분, 증액 확인과 저장 실패 feedback
- 빠른 기록의 필수값·기본 차감 대상·저장 후 계속 입력
- 거래 검색·복합 filter·미분류 일괄 처리
- 전체 공유 on/off와 거래별 공개 설정
- import 후보 기본 선택, 중복 강조, 일괄 category/source 변경과 제외 건수
- 반복 거래 pause/resume과 고정비·할부 표시
- 알림 개별/전체 읽음과 설정 가능한 알림만 노출
- loading, empty, error, retry와 mutation 실패 상태

API mock은 [API Contract](./api-contract.md)의 실제 response shape를 사용하고 상대방 비공개 필드를 편의상 추가하지 않습니다.

### Browser E2E

핵심 경로:

1. 신규 login → nickname 확정 → 기본 개인 장부 첫 거래
2. 공동 장부 생성 → 링크 공유 → 다른 사용자 login → 명시적 수락
3. 두 사용자 예산 배분 → 본인·공동 거래 → dashboard 합계
4. 개인 거래 공유 변경 → 상대방 상세 노출과 home/analytics 제외 확인
5. 여러 이미지 preview → 중복 후보 제외 → 선택 batch 저장
6. member 탈퇴/내보내기 → read-only 과거 조회와 예약 거래 pause

각 흐름은 desktop 한 개와 mobile 한 개의 대표 viewport에서 실행하고 모든 component test를 viewport별로 중복하지 않습니다.

### 접근성과 반응형

- keyboard focus, dialog focus trap/return, 명시적인 label과 error 연결
- 44px touch target, `prefers-reduced-motion`
- 375px, 768px, 1024px, 1440px에서 가로 overflow
- 긴 장부명·닉네임, 큰 금액, 빈/많은 거래와 category
- 색상 외 텍스트·아이콘으로 초과·중복·오류 상태 전달

### Command

```bash
cd frontend
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Contract와 Fixture

- fixture 이름과 금액은 제품 용어인 개인 할당, 공동 할당, 예비비와 예산 기간을 사용합니다.
- 두 사용자 fixture는 owner와 member를 명시하고 비공개·공개 거래를 모두 포함합니다.
- 날짜는 달력 월과 다른 10일 시작 기간, 말일 시작, 2월·윤년을 포함합니다.
- OCR fixture는 정상, 저신뢰, 중복, 일부 실패를 분리하고 실제 카드번호·credential을 포함하지 않습니다.
- API schema가 안정되면 OpenAPI 또는 contract fixture를 프론트 mock과 backend serialization test가 공유하도록 검토합니다.
- 알려진 공백: import candidate 타입에서 `id`/`suggestedAllocation`으로 선언했던 필드가 실제 백엔드 응답 키인 `candidateId`/`defaultBudgetSource`와 달랐던 사례가 있었습니다. 프론트 타입과 mock이 서로 일치했고 실제 백엔드 응답을 태우는 테스트가 없어 `tsc`와 기존 unit test 모두 이 불일치를 잡지 못했습니다. 현재는 프론트 타입이 [API Contract](./api-contract.md)의 필드명과 일치하도록 고쳐졌지만, 같은 종류의 필드명 불일치를 자동으로 잡는 검증은 아직 없습니다.

## CI

현재 PR과 `main` push에서 다음을 실행합니다.

- backend `./gradlew test`
- MySQL 필수 integration test skip 검사
- frontend `npm ci`, lint, test, build
- Playwright Chromium smoke

느린 OCR 품질 corpus와 migration 대용량 검증은 결정적인 소규모 smoke와 분리해 schedule 또는 수동 release 검증으로 운영합니다. flaky test는 재시도 횟수로 가리지 않고 clock, network, selector 또는 fixture 원인을 먼저 고칩니다.
