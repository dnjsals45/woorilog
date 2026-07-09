# Frontend Design Implementation

이 문서는 프론트엔드 scaffold 이후 디자인 시스템을 코드로 옮기는 기준입니다.
현재 저장소에는 아직 앱 코드가 없으므로, 이 문서는 목표 구조와 구현 순서를 정의합니다.

## Target Structure

```text
frontend/
  src/
    assets/
      landing/
        landing-desk-bg.png
    styles/
      tokens.css
      globals.css
    components/
      ui/
        Badge.tsx
        BottomSheet.tsx
        Button.tsx
        Card.tsx
        Input.tsx
        Progress.tsx
      layout/
        AppShell.tsx
        BottomNavigation.tsx
        FloatingActionButton.tsx
    pages/
      LandingPage/
      LoginPage/
      DashboardPage/
      CalendarPage/
      LedgerMonthSettingsPage/
      StatisticsPage/
      SettingsPage/
      TransactionEditPage/
      LinkInvitationPage/
```

## Source Of Truth

- Design tokens: [Design System](./design-system.md)
- Route and navigation: [Information Architecture](./information-architecture.md)
- Screen behavior: [Screen Specs](./screen-specs.md)
- Landing direction: [Landing Page Direction](./landing-page.md)
- Mockup assets: [`assets/design`](../../assets/design/README.md)

## Implementation Order

1. Create `frontend/src/styles/tokens.css` from `docs/design/design-system.md`.
2. Create basic UI primitives: `Button`, `Input`, `Card`, `Badge`, `Progress`.
3. Create mobile shell: `AppShell`, `BottomNavigation`, `FloatingActionButton`.
4. Implement `BottomSheet` and transaction entry shell.
5. Implement screens in this order: Landing, Login, Dashboard, Calendar/Ledger, Budget Month Settings, Statistics, Settings, Transaction Edit.
6. Verify each screen against the matching asset in `assets/design`.

## Asset Handling

- `assets/design` is a design reference folder, not a runtime import path.
- Runtime images should live under `frontend/src/assets` when imported by React components.
- Static public files may live under `frontend/public/assets` only when URL-based serving is simpler.
- `Landing/landing-desk-bg.png` should be copied to `frontend/src/assets/landing/landing-desk-bg.png` when the frontend is scaffolded.

## Component Rules

- UI primitives should accept semantic variants instead of raw color names.
- Page components should compose primitives and avoid repeating raw Tailwind/hex rules for common controls.
- API state, query hooks, and page layout should stay separate.
- Icons should use `lucide-react` when available.
- Persisted input forms should use React Hook Form and Zod after the frontend scaffold is ready.

## Verification

When frontend implementation starts, verify:

- `npm run lint`
- `npm run test`
- `npm run build`
- Mobile screenshot around `393px` width for core routes
- Desktop screenshot around `1440x900` for dashboard, calendar, budget, statistics, settings
