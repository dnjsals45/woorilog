# Design System

이 문서는 우리로그 V1 UI를 구현할 때 우선 적용할 토큰과 컴포넌트 기준입니다.
디자인 예시는 [Design References](./references.md)와 `assets/design`을 기준으로 확인합니다.
프론트엔드 코드 구조는 [Frontend Design Implementation](./frontend-implementation.md)을 따릅니다.

## Principle

우리로그는 따뜻하지만 가벼운 공동 자금 관리 서비스입니다.

- Lifestyle 70%
- Financial Service 20%
- Productivity Tool 10%

UI는 생활비를 함께 기록하는 친근함을 가지되, 금액과 예산 상태는 금융 서비스처럼 선명해야 합니다.

## Token Source

프론트엔드 scaffold 이후 `frontend/src/styles/tokens.css`에 이 문서의 값을 CSS custom properties로 옮깁니다.
Tailwind를 사용할 때도 값의 원본은 토큰으로 유지하고, 임의 hex 사용은 줄입니다.

```css
:root {
  --wl-color-primary: #0e9f6e;
  --wl-color-primary-dark: #057a55;
  --wl-color-primary-soft: #e7f7ef;
  --wl-color-background: #f8faf8;
  --wl-color-surface: #ffffff;
  --wl-color-border: #e5ede8;
  --wl-color-text-main: #111827;
  --wl-color-text-secondary: #6b7280;
  --wl-color-income: #2563eb;
  --wl-color-expense: #f97316;
  --wl-color-danger: #ef4444;
}
```

## Color Tokens

| Token | Hex | Usage |
| --- | --- | --- |
| `primary` | `#0E9F6E` | 주요 CTA, 활성 navigation, 핵심 금액 강조 |
| `primary-dark` | `#057A55` | primary hover/pressed |
| `primary-soft` | `#E7F7EF` | 선택된 배경, badge, light progress |
| `background` | `#F8FAF8` | 앱 전체 배경 |
| `surface` | `#FFFFFF` | card, modal, sheet, input |
| `border` | `#E5EDE8` | divider, card border, input border |
| `text-main` | `#111827` | 제목, 본문, 금액 |
| `text-secondary` | `#6B7280` | 보조 정보, label, caption |
| `income` | `#2563EB` | 수입, 입금, positive transaction |
| `expense` | `#F97316` | 지출, 사용량 경고 전 단계 |
| `danger` | `#EF4444` | 삭제, 오류, 위험 상태 |

## Typography

- Primary font: `Pretendard, Inter, system-ui, -apple-system, sans-serif`
- 모바일 input은 iOS zoom 방지를 위해 `16px` 이상을 사용합니다.
- 금액은 숫자가 먼저 읽히게 하고 `원`은 같은 baseline에 둡니다.
- 화면 제목은 모바일에서 `28-32px`, 데스크톱에서 `32-40px` 범위를 기본으로 합니다.
- 카드 제목은 `20-24px`, 목록 item 제목은 `16-18px`를 기본으로 합니다.
- 보조 설명과 metadata는 `13-15px`를 기본으로 하며 contrast가 너무 낮아지지 않게 합니다.
- Letter spacing은 기본 `0`을 유지합니다.

## Spacing

| Token | Value | Usage |
| --- | --- | --- |
| `space-1` | `4px` | icon/text gap, compact inner gap |
| `space-2` | `8px` | small gap, badge padding |
| `space-3` | `12px` | input inner gap, list item gap |
| `space-4` | `16px` | mobile horizontal padding, form gap |
| `space-5` | `20px` | card inner padding on mobile |
| `space-6` | `24px` | card gap, desktop section padding |
| `space-8` | `32px` | major section gap |

Mobile page horizontal padding은 `20px` 전후, desktop content max width는 화면별로 `1120-1200px` 범위를 우선합니다.

## Radius And Shadow

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | small button, badge |
| `radius-md` | `12px` | input, list item |
| `radius-lg` | `16px` | repeated card |
| `radius-xl` | `24px` | bottom sheet, large summary card |

- 카드 radius는 기본 `16px`, 정보량이 큰 summary card는 `20-24px`까지 허용합니다.
- 버튼 radius는 기본 `8-12px`입니다.
- shadow는 카드 계층을 구분할 때만 사용하고, 반복 list item에는 border 중심으로 처리합니다.

## Core Components

### Button

- Primary CTA height: mobile `48px` 이상, desktop `44px` 이상.
- Secondary button은 white surface + border를 기본으로 합니다.
- Danger button은 삭제/취소처럼 irreversible action에만 사용합니다.
- Loading 상태에서는 label을 바꾸고 disabled 처리합니다.

### Input

- Mobile input font size는 `16px` 이상입니다.
- Label은 input 바깥에 두고, 값은 오른쪽 정렬이 필요한 금액/날짜 입력을 제외하면 왼쪽 정렬합니다.
- 금액 입력은 숫자 입력 안정성을 우선하고, 표시 단계에서 천 단위 구분을 적용합니다.

### Card

- 카드는 정보를 묶는 단위에만 사용합니다.
- 페이지 전체 section을 card로 감싸지 않습니다.
- 반복 거래 item과 거래 item은 카드보다 list item에 가까운 밀도를 유지합니다.

### Badge

- 상태 badge는 `primary-soft`, `income`, `expense`, `danger`의 soft background를 사용합니다.
- 장부 type, member role, invitation status처럼 짧은 상태에만 사용합니다.

### Progress

- 예산 사용률은 primary progress를 기본으로 합니다.
- 위험 임계값은 구현 단계에서 정책 문서와 맞춰 정합니다.
- progress 옆에는 계산 근거가 되는 총 예산/사용 금액을 함께 보여줍니다.

### Bottom Navigation

- 모바일 primary navigation입니다.
- Dashboard, Ledger, Budget, Stats, Settings 순서를 기본으로 합니다.
- 중앙 FAB가 있을 경우 navigation item과 터치 영역이 겹치지 않게 합니다.

### Floating Action Button

- 전역 거래 입력 진입점입니다.
- FAB와 별도 `+ 거래 추가` 버튼이 한 화면에 동시에 있을 때는 primary action 중복을 피합니다.
- 모바일에서는 FAB를 우선하고, desktop에서는 화면 안 CTA를 우선할 수 있습니다.

### Bottom Sheet

- 거래 입력, 날짜 선택, 짧은 contextual task에 사용합니다.
- mobile transaction input의 기본 패턴입니다.
- safe area를 고려하고, 닫기 버튼과 저장 버튼을 명확히 둡니다.

## Mobile UX Rules

- 기본 타겟 viewport: modern mobile width `393px` 근처
- interactive target은 최소 `44px`
- bottom navigation과 bottom sheet는 safe area를 고려합니다.
- main page 전환은 spinner보다 skeleton을 우선합니다.
- hover 중심 UI보다 touch feedback을 우선합니다.
- layout shift를 만드는 hover/animation을 피합니다.

## Screen Priority

구현은 mobile asset을 우선 기준으로 잡고, desktop asset은 넓은 viewport의 정보 배치 참고로 사용합니다.
랜딩은 [Landing Page Direction](./landing-page.md)을 따릅니다.

| Screen | Primary Reference |
| --- | --- |
| Landing | `assets/design/Landing/landing-desk-bg.png`, `assets/design/Landing/*.png` |
| Dashboard | `assets/design/Mobile/01_dashboard.png` |
| Calendar / Ledger | `assets/design/Mobile/02_ledger.png` |
| Budget Month Settings | `assets/design/Mobile/03_budget_settlement.png` |
| Statistics | `assets/design/Mobile/04_statistics.png` |
| Settings | `assets/design/Mobile/05_settings.png` |
| Transaction Entry | `assets/design/Mobile/06_transaction_entry_bottom_sheet.png` |

## Anti-patterns

- 거래 목록을 ERP식 테이블처럼 무겁게 만들지 않습니다.
- 시스템 아이콘 역할에 emoji를 사용하지 않습니다.
- 정산/예산 계산 근거를 화면에서 완전히 숨기지 않습니다.
- 장식적 gradient/orb에 의존하지 않습니다.
- 구현 중 임의 색상과 임의 radius를 화면마다 새로 만들지 않습니다.
