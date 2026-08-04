# Frontend Design Implementation

이 문서는 승인된 디자인 기준이 현재 React 프론트엔드에서 구현되는 구조와 유지 규칙을 정의합니다.

프론트엔드는 React, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, Lucide, React Hook Form, Zod로 구성되어 있으며, 이관 대상 디자인은 **Crisp Calm V1**입니다.

## Document Status

- 제품 목표는 [V1 Scope](../product/v1-scope.md)를 원본으로 사용합니다.
- 화면 목표와 이동 구조는 [Screen Specs](./screen-specs.md)와 [Information Architecture](./information-architecture.md)를 따릅니다.
- 아래 `Current Implementation`은 기존 코드의 기준선이며 새 V1의 완료 상태가 아닙니다.
- 달력 거래 화면, 카드 관리, 월 마감처럼 새 V1 범위와 다른 동작은 구현 단계에서 교체하거나 제거합니다.

## Source Of Truth

- Product behavior: [V1 Scope](../product/v1-scope.md)
- Global tokens and components: [Design System](./design-system.md)
- Route and navigation: [Information Architecture](./information-architecture.md)
- Screen-specific behavior: [Screen Specs](./screen-specs.md)
- Landing direction: [Landing Page Direction](./landing-page.md)
- Runtime tokens: [`frontend/src/styles/tokens/`](../../frontend/src/styles/tokens/)
- Shared UI: [`frontend/src/shared/ui`](../../frontend/src/shared/ui/)
- Screen implementation: [`frontend/src/pages`](../../frontend/src/pages/)

제품 동작이 충돌하면 V1 Scope를, 시각 기준이 충돌하면 Design System과 Screen Specs를 우선합니다. 문서와 구현이 다르면 현재 제품 동작을 확인한 뒤 문서와 코드를 같은 변경에서 맞춥니다.

## Current Structure

```text
frontend/src/
  components/layout/
    AppShell.tsx
  features/
    .../api/
    .../model/
    transaction/ui/TransactionAddDrawer.tsx
    transaction/ui/TransactionForm.tsx
    transaction/ui/TransactionDetailModal.tsx
    import/ui/TransactionImportModal.tsx
    notification/ui/NotificationInbox.tsx
  pages/
    DashboardPage.tsx
    TransactionsPage.tsx
    BudgetPage.tsx
    PeriodSummaryPage.tsx
    AnalysisPage.tsx
    RecurringTransactionPage.tsx
    UserSettingsPage.tsx
    ...
  shared/ui/
    AppSidebar.tsx
    Progress.tsx
    StatBlock.tsx
    DonutChart.tsx
    CategoryBadge.tsx
    ...
  styles/
    tokens/colors.css
    tokens/fonts.css
    tokens/typography.css
    tokens/spacing.css
    tokens/elevation.css
    tokens/motion.css
    tokens/layers.css
    base/globals.css
    patterns/controls.css
    patterns/overlay.css
    patterns/page-layout.css
    ...
  index.css
```

## Implementation Boundaries

- API client, query hook, form state와 시각 컴포넌트의 책임을 분리합니다.
- 디자인 이관 중 API 계약, 비즈니스 계산, 데이터 모델을 변경하지 않습니다.
- 페이지에서 반복되는 raw hex와 radius는 `styles/tokens/`의 해당 파일 또는 공용 variant로 이동합니다.
- 한 화면에서만 확인된 레이아웃은 먼저 page style로 유지하고, 반복이 확인되면 공용 컴포넌트로 승격합니다.
- UI primitive는 raw color 이름보다 `primary`, `secondary`, `danger`, `selected` 같은 의미 variant를 받습니다.
- icon은 `lucide-react`를 사용하고 category mark만 제한적으로 이모지를 허용합니다.
- 새로운 UI library 또는 chart library는 별도 기술 결정 없이 추가하지 않습니다.

## Current Implementation

- `styles/tokens/`가 Crisp Calm foundation, data accent, radius, elevation과 motion의 런타임 원본입니다.
  `colors.css`(foundation·semantic·data accent), `typography.css`, `spacing.css`(간격과 radius), `elevation.css`,
  `motion.css`, `fonts.css`, `layers.css`로 나뉘고 `index.css`가 이 순서로 import합니다.
- `AppSidebar.tsx`(232px 고정, sticky)와 `AppShell.tsx`가 데스크톱 좌측 sidebar, 장부 선택기(스위처)와 본문 레이아웃을 담당합니다. 모바일 navigation은 앱 셸 교체 과정에서 제거됐습니다.
- `base/globals.css`, `patterns/controls.css`, `patterns/overlay.css`, `patterns/page-layout.css`가 전역 기본값, control, overlay(모달·드로어·팝오버), 페이지 레이아웃 규칙을 나눠 담당합니다.
- 거래 추가는 `TransactionAddDrawer`(우측 560px 드로어, `TransactionForm` 직접 입력)로 처리합니다. 영수증·카드사 앱 캡처 검토는 가계부 화면의 `TransactionImportModal`(중앙 모달)이 별도로 담당합니다.
- 가계부 화면(`TransactionsPage`)은 날짜순 목록과 필터(미분류 필터 칩 포함)를 제공하고, 행 클릭은 `TransactionDetailModal`을 엽니다.
- 알림함은 `NotificationInbox`로 대시보드 헤더의 종 아이콘이 여는 팝오버입니다. 다른 화면에는 진입점이 없습니다.
- 분석 화면과 대시보드의 예산 상세(`BudgetDetailModal`)는 `DonutChart` 공용 컴포넌트와 인라인 SVG 꺾은선·막대 차트를 함께 사용합니다.
- 예산 설정 화면은 총예산, 실제·예정 지출, 개인 카테고리 예산 또는 공동 멤버 할당에 집중합니다.
- 설정 화면(`UserSettingsPage`)은 프로필·장부·멤버·카테고리·알림 5개 탭입니다.

## Responsive Mapping

**V1은 데스크톱 폭 전용입니다.** 사이드바 232px + 본문 최소 1080px(`AppShell.tsx`)를 기준으로 합니다. 랜딩과 온보딩만 좁은 폭에서 자연스럽게 접힙니다.

| Viewport | App Shell | Content |
| --- | --- | --- |
| `1080px+` (본문 기준, 사이드바 232px 포함 총 1312px+) | 232px sidebar | wide grid, right side sheet(드로어·모달) |

아래는 이전 계획이며 **V1 범위가 아니라 모바일 디자인이 확정된 이후의 작업**입니다. 지우지 않고 남겨 둡니다.

| Viewport (모바일 디자인 확정 후) | App Shell | Content |
| --- | --- | --- |
| `0-760px` | top bar, 5개 bottom navigation | single column, bottom sheet |
| `761-1040px` | top bar, 5개 bottom navigation | 1-2 column |

모바일 하단 navigation은 앱 셸 교체로 제거됐습니다. **현재 구현은 좁은 폭에서 가로 스크롤이 발생하는 알려진 제약이 있습니다.** 모바일 레이아웃은 별도 디자인 작업 이후 이 매핑을 다시 채웁니다.

## Styling Rules

- 토큰 값은 `frontend/src/styles/tokens/`를 단일 코드 원본으로 사용합니다. 새 토큰은 성격에 맞는 파일에 추가합니다.
- 기존 `--wl-color-*` 이름은 마이그레이션 중 호환 alias로 유지할 수 있지만, 신규 코드는 foundation과 semantic token을 우선합니다.
- `canvas`는 중립적인 `#F6F7F9`, panel과 input은 `surface`를 사용해 회녹색이 화면 전체에 누적되지 않게 합니다.
- 브랜드 원색과 데이터 원색은 CTA, selected state, progress, chart, 작은 icon 표식에만 사용합니다.
- Tailwind arbitrary value는 프로토타이핑 또는 화면 고유 계산에만 사용합니다.
- 공용 색상, radius, shadow, motion을 arbitrary value로 반복하지 않습니다.
- panel은 기본적으로 border로 구분하고 shadow는 overlay와 명확한 elevation에만 사용합니다.
- hover가 없는 touch 환경에서도 active, selected, loading 상태가 이해되어야 합니다.
- chart는 SVG 또는 접근 가능한 chart 구현을 사용하고 텍스트 범례를 함께 제공합니다.

## Verification

디자인 이관 후 프론트엔드 루트에서 실행합니다.

```bash
npm run lint
npm run test
npm run build
```

핵심 흐름은 필요할 때 다음 명령으로 추가 검증합니다.

```bash
npm run test:e2e
```

브라우저 검수 항목 (V1, 데스크톱 전용):

- `1080px`(본문 최소 폭), `1280px`, `1440px`
- 사이드바 232px 고정, 본문 최소 1080px 유지
- keyboard focus와 dialog(모달·드로어·팝오버) focus 이동
- 44px touch target
- loading, empty, error, long text, large amount
- `prefers-reduced-motion`
- browser console error

아래는 **모바일 디자인 확정 후** 다시 적용할 검수 항목입니다. 지금은 검증하지 않습니다.

- `375px`, `390px`, `768px`, `1024px`
- 가로 스크롤과 fixed navigation 겹침
