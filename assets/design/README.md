# Woorilog Design Assets v1

다운로드 가능한 화면별 PNG 목업 모음입니다.

## 구성

- Desktop: 1440x900 기준 웹 화면 6장
- Mobile: iPhone 16 Pro 기준 393x852의 2x 레티나 목업 6장
- Landing: 로그인/온보딩/장부 생성 목업 3장, hero 배경 이미지 1장

## 사용처

- Figma 레퍼런스 이미지 삽입
- Antigravity / Codex 디자인 참고자료
- 구현 전 화면 구조와 시각 방향 확인
- README 또는 문서용 화면 예시

## Landing 기준

랜딩 페이지는 `Landing/landing-desk-bg.png`와 이 폴더의 Landing 목업을 기준으로 구성합니다.
자세한 기준은 [Landing Page Direction](../../docs/design/landing-page.md)을 확인합니다.

## Screen Mapping

| Asset | Route / Screen | Notes |
| --- | --- | --- |
| `Landing/landing-desk-bg.png` | `/` | 랜딩 hero 배경 이미지입니다. 프론트 scaffold 이후 runtime asset으로 복사합니다. |
| `Landing/01_login.png` | `/login` | 로그인 화면 목업입니다. |
| `Landing/02_onboarding.png` | first login onboarding | 첫 로그인 후 안내 흐름 참고용입니다. |
| `Landing/03_create_ledger.png` | ledger creation | 초기 장부 생성 화면 참고용입니다. |
| `Mobile/01_dashboard.png` | `/dashboard` | 모바일 우선 구현 기준입니다. |
| `Mobile/02_ledger.png` | `/calendar` | 거래 탐색/월 캘린더 화면 기준입니다. |
| `Mobile/03_budget_settlement.png` | `/ledgers/:ledgerId/months/:budgetMonth` | 월 예산/정산 설정 화면 기준입니다. |
| `Mobile/04_statistics.png` | `/stats` | 통계 화면 기준입니다. |
| `Mobile/05_settings.png` | `/settings` | 설정 화면 기준입니다. |
| `Mobile/06_transaction_entry_bottom_sheet.png` | global transaction entry | FAB에서 여는 거래 입력 sheet 기준입니다. |
| `Desktop/01_dashboard.png` | `/dashboard` | 넓은 viewport 정보 배치 참고용입니다. |
| `Desktop/02_ledger.png` | `/calendar` | 넓은 viewport 캘린더/거래 목록 배치 참고용입니다. |
| `Desktop/03_budget_settlement.png` | `/ledgers/:ledgerId/months/:budgetMonth` | 넓은 viewport 예산/정산 배치 참고용입니다. |
| `Desktop/04_statistics.png` | `/stats` | 넓은 viewport 차트 배치 참고용입니다. |
| `Desktop/05_settings.png` | `/settings` | 넓은 viewport 설정 배치 참고용입니다. |
| `Desktop/06_transaction_detail.png` | `/transactions/:transactionId` | 거래 상세/수정 화면 기준입니다. |

## Runtime Asset Rule

이 폴더는 디자인 기준과 목업 보관소입니다.
프론트엔드 구현에서 이미지를 직접 import하지 않고, 실제 앱에 필요한 파일만 `frontend/src/assets` 또는 `frontend/public/assets`로 복사해 사용합니다.

## 참고

이 파일들은 대화 중 확정한 Woorilog 디자인 시스템을 바탕으로 재구성한 독립 목업 PNG입니다.
실제 운영 코드 스크린샷이 아니라 디자인 레퍼런스용입니다.
