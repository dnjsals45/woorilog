# Screen Specs

화면별 상세 명세는 구현 PR과 함께 점진적으로 채웁니다.

공통 시각 기준은 [Design System](./design-system.md)과 [`frontend/src/styles/tokens.css`](../../frontend/src/styles/tokens.css)입니다. 각 화면의 `Implementation`은 현재 동작을 확인하는 코드 원본입니다.

## Dashboard

- Goal: 현재 장부의 이번 달 상태를 빠르게 확인합니다.
- Primary Action: 거래 추가.
- Key Information: 누적 지출, 수입, 남은 예산, 정산 금액, 최근 거래, 카테고리 지출, 공동 사용 현황.
- Implementation: [`DashboardPage.tsx`](../../frontend/src/pages/DashboardPage.tsx), [`dashboard.css`](../../frontend/src/styles/dashboard.css)

### Information Hierarchy

1. 현재 장부와 조회 월
2. 이번 달 지출과 예산 진행률
3. 수입, 남은 예산, 정산 금액
4. 최근 거래
5. 카테고리별 지출
6. 공동 사용 현황

### Layout

- 데스크톱에서는 왼쪽 sidebar 상단에 현재 장부 선택기를 둡니다.
- `1040px` 이하에서는 장부명을 화면 제목과 결합한 선택기로 제공합니다.
- 이번 달 요약은 하나의 panel 안에서 primary metric과 secondary metric을 구분합니다.
- primary metric은 이번 달 지출과 예산 진행률을 함께 보여줍니다.
- 수입, 남은 예산, 정산 금액은 각각 큰 카드로 분리하지 않고 compact metric group으로 묶습니다.
- 최근 거래는 기본 4건을 compact list로 보여주고 전체 목록으로 이동할 수 있게 합니다.
- 모바일에서는 모든 본문 panel을 한 column으로 쌓고 하단 navigation에 가려지지 않게 여백을 확보합니다.

### Color

- 이번 달 지출 영역은 `surface-subtle`을 사용하며 넓은 주황색 배경을 사용하지 않습니다.
- 지출, 수입, 예산, 정산 금액은 기본적으로 `ink`를 사용합니다.
- 예산 진행률과 긍정적인 전월 비교처럼 의미가 명확한 곳에만 브랜드 초록을 사용합니다.
- 수입, 예산, 정산의 의미 색상은 작은 icon 배경이나 chart 계열에 제한합니다.

### Category Donut

- 최대 5개 범주를 표시하고 나머지는 `기타`로 묶습니다.
- 초기 상태에서는 중앙에 총 지출을 표시합니다.
- 범례를 hover, focus 또는 touch하면 해당 조각의 두께를 키우고 중앙 값을 선택 범주의 이름과 금액으로 바꿉니다.
- 선택되지 않은 조각은 원래 색과 중립색을 혼합해 채도를 낮추며 완전히 회색으로 숨기지 않습니다.
- 범례에는 category mark, 이름, 금액, 비율을 함께 표시합니다.
- 모바일 touch 선택은 같은 항목을 다시 누르거나 바깥을 선택할 때 해제할 수 있습니다.

### Transaction Entry

- 데스크톱은 오른쪽 side sheet, 모바일은 bottom sheet를 사용합니다.
- 별도 확장형 FAB는 사용하지 않고 모바일 navigation 중앙의 `기록`으로 진입합니다.
- 저장 후 새 거래 행, 총지출, 남은 예산, 예산 진행률을 함께 갱신합니다.
- 갱신된 값과 새 행에는 짧은 1회성 피드백을 제공하되 `prefers-reduced-motion`에서는 즉시 완료합니다.

### States

- `loading`: panel 구조를 유지하는 skeleton 또는 명확한 loading text를 표시합니다.
- `no transaction`: 최근 거래와 chart에 첫 거래 기록 행동을 안내합니다.
- `budget not configured`: 남은 예산 대신 예산 설정 필요 상태와 설정 진입점을 제공합니다.
- `no settlement`: 정산할 금액이 없음을 중립 또는 긍정 상태로 표시합니다.
- `failed summary`: 실패한 영역과 재시도 행동을 함께 표시합니다.
- `long content`: 긴 장부명과 거래명은 말줄임하고, 큰 금액은 주요 영역에서 잘리지 않게 크기를 조정합니다.

### Verification

- `375px`, `390px`, `768px`, `1024px`, `1440px`에서 검수합니다.
- 장부 전환, 월 이동, 요약 범위 전환, chart 선택, 거래 입력과 저장을 keyboard와 pointer로 확인합니다.
- 가로 스크롤, bottom navigation 겹침, sheet 내부 이중 스크롤이 없어야 합니다.

## Calendar / Ledger

- Goal: 날짜별 거래를 탐색하고 기록합니다.
- Primary Action: 거래 추가 또는 날짜 선택.
- Key Information: 조회 월, 월 수입·지출·잔액, 선택 날짜, 거래 목록.
- States: empty date, loading transactions, failed transactions.
- Implementation: [`LedgerPage.tsx`](../../frontend/src/pages/LedgerPage.tsx), [`CalendarGrid.tsx`](../../frontend/src/shared/ui/CalendarGrid.tsx)

### Calendar And List

- 월 이동은 달력 헤더 중앙에서 수행하고 상단 요약에 월 선택기를 중복 배치하지 않습니다.
- 달력 카드 프레임은 5주와 6주인 달 모두 같은 높이를 유지합니다. 5주인 달은 같은 날짜 셀 크기를 유지하면서 행 사이 공간을 더 넓게 사용합니다.
- 달력 접기는 `900px` 이하에서만 제공합니다. 넓은 화면에서는 항상 달력을 표시해 빈 왼쪽 열이 생기지 않게 합니다.
- 데스크톱의 달력과 목록 비율은 약 `45:55`이며 같은 grid 행에서 안정적인 높이를 유지합니다.
- 거래 목록은 페이지당 6건을 표시합니다. 범위는 왼쪽, 이전·다음과 현재 페이지는 하단 중앙에 둡니다.
- 월, 날짜, 검색 또는 유형 필터가 바뀌면 첫 페이지와 선택 삭제 상태로 돌아갑니다.
- 금액은 오른쪽에 고정해 세로 비교가 가능해야 하고 거래명과 금액 사이의 불필요한 빈 공간을 만들지 않습니다.

## Budget Month Settings

- Goal: 장부의 월 예산과 멤버/카테고리 할당을 설정합니다.
- Primary Action: 월 예산 저장.
- Key Information: 사용 가능한 예산, 실제 지출, 예정 지출, 월 총 예산, 개인 카테고리 예산 또는 공동 멤버별 할당.
- States: not configured, loading, save error.
- Implementation: [`BudgetMonthPage.tsx`](../../frontend/src/pages/BudgetMonthPage.tsx)

예산 설정 화면에는 정산 요약과 월 마감 action을 배치하지 않습니다. 개인 장부는 카테고리 예산과 고정비를, 공동 장부는 월 총 예산과 멤버별 할당을 관리합니다. 예정 정기 지출은 사용 가능한 예산에서 함께 차감합니다.

## Statistics

- Goal: 월별 소비 흐름과 카테고리 분포를 확인합니다.
- Primary Action: 분석 월·기간 변경 또는 카테고리 선택.
- Key Information: 총 지출, 총 수입, 하루 평균, 예산 사용률, 6/12개월 추세, 카테고리 분포와 선택 카테고리 거래.
- States: no data, loading chart, failed statistics, empty category transaction.
- Implementation: [`StatisticsPage.tsx`](../../frontend/src/pages/StatisticsPage.tsx)

### Chart Interaction

- 월별 소비 흐름은 막대, 추세선과 평균 기준선을 함께 표시합니다.
- 차트 지점은 hover, focus와 click으로 강조하며 이름과 금액을 텍스트로 함께 제공합니다.
- 도넛, 범례와 누적 가로 막대는 같은 카테고리 선택 상태를 공유합니다.
- 포커스되지 않은 카테고리는 원색을 완전히 제거하지 않고 채도와 불투명도만 낮춥니다.
- 카테고리를 선택하면 현재 월의 해당 대분류 거래를 최대 6건까지 표시하고 거래 상세로 연결합니다.
- 색만으로 값을 전달하지 않고 범례, 비율, 금액과 screen-reader용 label을 함께 제공합니다.

## Settings

- Goal: 장부, 초대, 별칭과 보조 관리 화면 진입점을 관리합니다.
- Primary Action: 설정 항목 추가/수정.
- Key Information: 현재 장부, 장부에서 보일 내 이름, 멤버, 초대 상태, 관리 화면 진입점.
- States: no invitation, invite pending, save error.
- Implementation: [`SettingsPage.tsx`](../../frontend/src/pages/SettingsPage.tsx)

## Category Management

- Goal: 거래에 쓸 카테고리를 생성·수정·삭제하고 통계 대분류를 연결합니다.
- Primary Action: 카테고리 추가, 수정 저장 또는 삭제.
- Key Information: 카테고리 이름, 수입/지출 유형, 통계 대분류.
- States: 카테고리 없음, 대분류 없음, 저장 실패, 사용 중인 카테고리 삭제 불가.
- Entry: 앱 보조 메뉴와 거래 입력 시트의 `카테고리 관리`.
- Implementation: [`CategoryManagementPage.tsx`](../../frontend/src/pages/CategoryManagementPage.tsx)

## Transaction Edit

- Goal: 기존 거래를 확인하고 수정합니다.
- Primary Action: 거래 저장.
- Key Information: 금액, 일자, 카테고리, 메모, 결제자.
- States: loading transaction, validation error, not found.
- Implementation: [`TransactionEditPage.tsx`](../../frontend/src/pages/TransactionEditPage.tsx)

## Transaction Entry Sheet

- Goal: 새 거래를 빠르게 입력합니다.
- Primary Action: 거래 저장.
- Key Information: 입력 방식, 거래 유형, 날짜, 카테고리, 금액, 결제수단, 결제자, 메모.
- States: validation error, preview pending, preview failed, empty candidate, save pending, save failed.
- Implementation: [`TransactionEntrySheet.tsx`](../../frontend/src/features/transaction/ui/TransactionEntrySheet.tsx), [`TransactionImportPanel.tsx`](../../frontend/src/features/transaction/ui/TransactionImportPanel.tsx)

- 데스크톱은 오른쪽 side sheet, 모바일은 bottom sheet로 표시합니다.
- `직접 입력 / 영수증 / 문자 내역`을 시트 안에서 전환하고 별도 가져오기 화면이나 헤더 icon을 사용하지 않습니다.
- 영수증과 문자는 바로 저장하지 않고 후보를 먼저 표시합니다.
- 후보의 유형, 날짜, 금액, 카테고리와 메모를 수정하고 저장 대상을 선택할 수 있어야 합니다.

## Invitation Link

- Goal: 초대 링크를 확인하고 공동 장부에 참여합니다.
- Primary Action: 초대 수락.
- Key Information: 장부 이름, 초대한 사용자, 초대 상태.
- States: expired token, already accepted, login required.
- Implementation: [`InvitationLinkPage.tsx`](../../frontend/src/pages/InvitationLinkPage.tsx)

## Landing / Login / Onboarding

- Goal: 사용자가 서비스 목적을 이해하고 로그인 또는 초기 장부 생성으로 진입합니다.
- Primary Action: 시작하기 또는 Kakao login.
- Key Information: 제품명, 핵심 가치, Kakao login CTA, local/test developer login CTA, 초기 장부 생성 입력.
- States: login loading, login failed, onboarding validation error.
- Implementation: [`LandingPage.tsx`](../../frontend/src/pages/LandingPage.tsx), [`LoginPage.tsx`](../../frontend/src/pages/LoginPage.tsx), [`KakaoCallbackPage.tsx`](../../frontend/src/pages/KakaoCallbackPage.tsx)

## Recurring Transactions

- Goal: 반복되는 수입과 지출을 미리 등록하고 월 예상 금액을 확인합니다.
- Primary Action: 반복 거래 추가 또는 수정.
- Key Information: 거래 유형, 금액, 주기, 시작일, 활성 상태.
- States: no recurring transaction, paused, validation error, save failed.
- Implementation: [`RecurringTransactionPage.tsx`](../../frontend/src/pages/RecurringTransactionPage.tsx)

## Card Management

- Goal: 장부에서 사용하는 카드와 결제금액 확정 기준을 관리합니다.
- Primary Action: 카드 추가 또는 수정.
- Key Information: 카드 이름, 소유자, 확정일, 현재 사용 상태.
- States: no card, validation error, card in use, delete blocked.
- Implementation: [`CardManagementPage.tsx`](../../frontend/src/pages/CardManagementPage.tsx)

## Notifications

- Goal: 초대, 예산, 장부 상태의 중요한 변화를 확인합니다.
- Primary Action: 알림 확인 또는 모두 읽음.
- Key Information: 알림 유형, 발생 시각, 읽음 상태, 연결된 행동.
- States: no notification, unread filter empty, loading, failed notifications.
- Implementation: [`NotificationsPage.tsx`](../../frontend/src/pages/NotificationsPage.tsx)

## Help

- Goal: 주요 기능의 사용법을 찾고 추가 문의로 이동합니다.
- Primary Action: 도움말 검색 또는 문의.
- Key Information: 자주 묻는 질문, 검색 결과, 문의 진입점.
- States: no search result, loading, failed help content.
- Implementation: [`HelpPage.tsx`](../../frontend/src/pages/HelpPage.tsx)
