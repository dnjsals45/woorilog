# Screen Specs

화면별 상세 명세는 구현 PR과 함께 점진적으로 채웁니다.

## Dashboard

- Goal: 현재 장부의 이번 달 상태를 빠르게 확인합니다.
- Primary Action: 거래 추가.
- Key Information: 월 예산, 누적 지출, 남은 예산, 최근 거래, 카테고리 지출.
- States: no transaction, loading summary, failed summary.
- Reference Asset: `assets/design/Mobile/01_dashboard.png`, `assets/design/Desktop/01_dashboard.png`

## Calendar / Ledger

- Goal: 날짜별 거래를 탐색하고 기록합니다.
- Primary Action: 거래 추가 또는 날짜 선택.
- Key Information: 선택 날짜, 일별 지출, 거래 목록.
- States: empty date, loading transactions, failed transactions.
- Reference Asset: `assets/design/Mobile/02_ledger.png`, `assets/design/Desktop/02_ledger.png`

## Budget Month Settings

- Goal: 장부의 월 예산과 멤버/카테고리 할당을 설정합니다.
- Primary Action: 월 예산 저장.
- Key Information: 월 총 예산, 카테고리 예산, 멤버별 할당, 마감 상태.
- States: not configured, closed month, save error.
- Reference Asset: `assets/design/Mobile/03_budget_settlement.png`, `assets/design/Desktop/03_budget_settlement.png`

## Statistics

- Goal: 월별 소비 흐름과 카테고리 분포를 확인합니다.
- Primary Action: 월/필터 변경.
- Key Information: 월 총 지출, 카테고리별 지출, 추세.
- States: no data, loading chart, failed statistics.
- Reference Asset: `assets/design/Mobile/04_statistics.png`, `assets/design/Desktop/04_statistics.png`

## Settings

- Goal: 장부, 초대, 별칭, 반복 거래를 관리합니다.
- Primary Action: 설정 항목 추가/수정.
- Key Information: 현재 장부, 멤버, 초대, 반복 거래 템플릿.
- States: no invitation, no recurring transaction, save error.
- Reference Asset: `assets/design/Mobile/05_settings.png`, `assets/design/Desktop/05_settings.png`

## Category Management

- Goal: 거래에 쓸 카테고리를 생성·수정·삭제하고 통계 대분류를 연결합니다.
- Primary Action: 카테고리 추가, 수정 저장 또는 삭제.
- Key Information: 카테고리 이름, 수입/지출 유형, 통계 대분류.
- States: 카테고리 없음, 대분류 없음, 저장 실패, 사용 중인 카테고리 삭제 불가.
- Entry: 앱 보조 메뉴와 거래 입력 시트의 `카테고리 관리`.

## Transaction Edit

- Goal: 기존 거래를 확인하고 수정합니다.
- Primary Action: 거래 저장.
- Key Information: 금액, 일자, 카테고리, 메모, 결제자.
- States: loading transaction, validation error, not found.
- Reference Asset: `assets/design/Desktop/06_transaction_detail.png`

## Transaction Entry Bottom Sheet

- Goal: 새 거래를 빠르게 입력합니다.
- Primary Action: 거래 저장.
- Key Information: 거래 유형, 날짜, 카테고리, 금액, 결제수단, 결제자, 메모.
- States: validation error, save pending, save failed.
- Reference Asset: `assets/design/Mobile/06_transaction_entry_bottom_sheet.png`

## Invitation Link

- Goal: 초대 링크를 확인하고 공동 장부에 참여합니다.
- Primary Action: 초대 수락.
- Key Information: 장부 이름, 초대한 사용자, 초대 상태.
- States: expired token, already accepted, login required.

## Landing / Login / Onboarding

- Goal: 사용자가 서비스 목적을 이해하고 로그인 또는 초기 장부 생성으로 진입합니다.
- Primary Action: 시작하기 또는 Kakao login.
- Key Information: 제품명, 핵심 가치, Kakao login CTA, local/test developer login CTA, 초기 장부 생성 입력.
- States: login loading, login failed, onboarding validation error.
- Reference Asset: `assets/design/Landing/landing-desk-bg.png`, `assets/design/Landing/01_login.png`, `assets/design/Landing/02_onboarding.png`, `assets/design/Landing/03_create_ledger.png`
