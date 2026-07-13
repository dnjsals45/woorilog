# Information Architecture

## Navigation

V1은 모바일 중심 하단 내비게이션을 기준으로 합니다.

```text
Landing
Login
OAuth Callback
Protected App
  Dashboard
  Calendar / Ledger
  Budget Month Settings
  Statistics
  Settings
  Category Management
  Transaction Edit
  Invitation Link
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | 서비스 소개와 로그인 진입 |
| `/login` | Kakao login, local/test developer login |
| `/auth/kakao/callback` | OAuth callback 처리 |
| `/dashboard` | 현재 장부의 예산/지출/최근 거래 요약 |
| `/calendar` | 날짜별 거래 탐색과 거래 입력 |
| `/stats` | 월별/카테고리별 통계 |
| `/settings` | 장부, 별칭, 반복 거래 설정 |
| `/categories` | 거래 카테고리와 통계 대분류 관리 |
| `/transactions/:transactionId` | 거래 상세/수정 |
| `/ledgers/:ledgerId/months/:budgetMonth` | 월 예산과 월 마감 설정 |
| `/invitations/links/:token` | 초대 링크 조회/수락 |

## Screen Priority Rule

각 화면은 구현 전에 다음을 정리합니다.

- Screen Goal
- Primary Action
- Key Information
- CTA
- Loading/Empty/Error State

## Mobile Navigation

- Dashboard: 현재 장부의 요약과 빠른 검토
- Ledger/Calendar: 거래 탐색과 기록
- FAB: 거래 입력
- Budget: 월 예산 설정과 마감
- Stats: 소비 흐름과 카테고리 통계
- Settings: 장부/반복거래/별칭/초대 관리
- Category Management: 카테고리 생성·수정과 통계 대분류 연결

장부 선택기에는 현재 장부 전환과 `새 개인 장부`, `새 공동 장부` 생성 진입점을 함께 둡니다.
