# Design System

이 문서는 우리로그 제품 UI의 전역 디자인 기준입니다. 새로운 화면은 이 문서를 기본값으로 사용하고, 화면 목적상 필요한 차이만 [Screen Specs](./screen-specs.md)에 기록합니다.

공식 시각 기준은 **Crisp Calm V1**입니다. 프로덕션 React 적용 기준과 이관 순서는 [Frontend Design Implementation](./frontend-implementation.md)을 따릅니다.

## Product Principles

우리로그는 상대의 지출을 감시하는 금융 도구가 아니라, 함께 사용한 돈을 편안하게 기록하고 이해하는 공유 가계부입니다.

### Calm Clarity

- 장식보다 정보의 순서, 간격, 정렬로 위계를 만듭니다.
- 금액은 크고 선명하게 보여주되 모든 금액에 강한 색을 사용하지 않습니다.
- 한 화면에 여러 정보를 제공하되, 사용자가 지금 확인할 핵심 정보는 하나로 좁힙니다.

### Shared, Not Competitive

- 상대방 개인 예산은 첫 화면에서 숨기고, 공동 예산과 본인 예산을 이해하는 데 필요한 정보부터 표현합니다.
- 순위, 승패, 과도한 경고처럼 상대를 평가하는 표현은 사용하지 않습니다.
- 공동 비용과 개인 비용의 범위를 항상 텍스트로 명시합니다.

### Progressive Disclosure

- 대시보드에는 요약과 다음 행동만 보여줍니다.
- 거래 입력과 상세 편집은 side sheet, bottom sheet 또는 별도 상세 화면에서 처리합니다.
- 모든 설정과 입력 필드를 한 화면에 펼쳐 놓지 않습니다.

### Product Warmth

- 친근함은 문장, 여백, 부드러운 표면색으로 표현합니다.
- 캐릭터, 장식용 이모지, 과도한 파스텔 카드로 친근함을 만들지 않습니다.
- 금융 정보에 필요한 신뢰감과 계산 근거를 유지합니다.

## Source Hierarchy

디자인 판단이 충돌할 때 다음 순서를 따릅니다.

1. 이 문서의 전역 원칙과 토큰
2. [Screen Specs](./screen-specs.md)의 화면별 규칙
3. [`frontend/src/styles/tokens/`](../../frontend/src/styles/tokens/)의 실제 토큰
4. [`frontend/src/shared/ui`](../../frontend/src/shared/ui/)와 화면별 React 구현

화면 전용 배치를 전역 규칙으로 바로 올리지 않습니다. 두 개 이상의 화면에서 반복되거나 재사용 가능성이 명확할 때 공용 컴포넌트 또는 토큰으로 승격합니다.

## Approved Visual Baseline

- `Crisp`: 중립적인 밝은 배경, 또렷한 글자, 구분되는 데이터 색으로 스캔성을 확보합니다.
- `Calm`: 넓은 유색 면과 강한 그림자를 피하고, 초록색은 행동과 선택 상태에 제한합니다.
- Tokens and motion: [`frontend/src/styles/tokens/`](../../frontend/src/styles/tokens/)
- Layout and behavior: [Screen Specs](./screen-specs.md)와 실제 React 화면

## Color

### Foundation Tokens

| Token | Hex | Usage |
| --- | --- | --- |
| `brand-800` | `#0A513B` | 짙은 브랜드 텍스트, pressed 상태 |
| `brand-700` | `#0E684B` | active navigation, text action, primary hover |
| `brand-600` | `#16805D` | primary CTA, progress, 핵심 선택 상태 |
| `brand-100` | `#E7F6F0` | active background, badge, selected control |
| `brand-50` | `#F1FAF6` | 브랜드 hover와 아주 약한 강조 표면 |
| `canvas` | `#F6F7F9` | 앱 전체의 중립적인 밝은 배경 |
| `surface` | `#FFFFFF` | panel, input, sheet |
| `surface-subtle` | `#F7FAF9` | panel 내부 그룹, hover, 비강조 영역 |
| `line` | `#DDE3E0` | divider와 기본 panel 경계 |
| `line-strong` | `#C8D2CD` | input, hover 또는 강조된 경계 |
| `ink` | `#18201D` | 제목, 본문 주요 금액 |
| `text` | `#3B4742` | 일반 본문 |
| `muted` | `#65706B` | label, metadata, 보조 설명 |
| `danger` | `#D95061` | 오류, 삭제, 예산 초과처럼 조치가 필요한 상태 |
| `danger-soft` | `#FDEFF1` | danger icon과 확인 영역의 작은 배경 |

### Data Accent Tokens

| Token | Hex | Usage |
| --- | --- | --- |
| `data-blue` | `#5275E8` | 수입 또는 첫 번째 비교 계열 |
| `data-coral` | `#E66F70` | 지출 카테고리 또는 두 번째 비교 계열 |
| `data-amber` | `#E99A2C` | 예산 또는 세 번째 비교 계열 |
| `data-violet` | `#8A6EDB` | 네 번째 비교 계열 |
| `data-neutral` | `#76847E` | 기타 또는 보조 계열 |

| Soft Token | Hex | Pair |
| --- | --- | --- |
| `data-blue-soft` | `#EEF2FF` | `data-blue` icon/category background |
| `data-coral-soft` | `#FDEFF1` | `data-coral` icon/category background |
| `data-amber-soft` | `#FFF4E3` | `data-amber` icon/category background |
| `data-violet-soft` | `#F3EFFF` | `data-violet` icon/category background |
| `data-neutral-soft` | `#EEF2F1` | `data-neutral` icon/category background |

데이터 색상은 한 화면 안에서 의미를 일관되게 사용하되, 제품 전체에서 카테고리 이름에 영구적으로 고정하지는 않습니다.

### Verified Contrast Pairs

| Foreground | Background | Contrast |
| --- | --- | --- |
| `brand-600` | `surface` | `4.91:1` |
| `muted` | `surface` | `5.14:1` |
| `ink` | `canvas` | `15.51:1` |
| `brand-700` | `brand-100` | `6.08:1` |

위 대비를 최소 기준으로 유지하며, 작은 본문과 metadata를 더 밝은 회색으로 낮추지 않습니다.

### Color Usage Rules

- 브랜드 초록은 주요 행동, 현재 선택, 예산 진행 상태에 제한합니다.
- `canvas`에는 초록색을 섞지 않고 중립적인 쿨 그레이를 사용해 화면 전체가 탁해 보이지 않게 합니다.
- 기본 panel은 선명한 `surface`를 사용하고, `surface-subtle`은 panel 내부의 보조 그룹에만 사용합니다.
- 지출·수입·예산·사용 가능액의 기본 텍스트는 `ink`입니다.
- 의미 색상은 아이콘 배경, 차트 계열, 상태 표식처럼 작은 면적에 우선 사용합니다.
- 수입 거래처럼 부호 구분이 중요한 값은 `data-blue`를 사용할 수 있습니다.
- 경고색은 실제로 사용자의 확인이나 조치가 필요할 때만 사용합니다.
- 색상만으로 상태나 범주를 구분하지 않고 이름, 금액, 비율 또는 아이콘을 함께 제공합니다.
- 장식용 gradient와 넓은 유색 배경을 기본 표면으로 사용하지 않습니다.
- 데이터 색의 채도를 낮춰 서로 비슷하게 만들지 않습니다. 넓은 면적을 줄이고 작은 chart·icon 영역에서 원색을 유지합니다.

## Typography

### Font Family

```css
font-family:
  "Pretendard Variable",
  Pretendard,
  "Apple SD Gothic Neo",
  -apple-system,
  BlinkMacSystemFont,
  sans-serif;
```

- 한글과 숫자 모두 Pretendard Variable을 우선합니다.
- 별도 영문 display font나 monospace font를 UI 제목에 섞지 않습니다.
- `font-synthesis: none`과 운영체제 font fallback을 유지합니다.

### Type Scale

| Role | Size | Weight | Usage |
| --- | --- | --- | --- |
| Page title | `23-30px` | `700` | 현재 장부명, 화면 제목 |
| Primary amount | `27-36px` | `700` | 화면에서 가장 중요한 한 개의 금액 |
| Secondary amount | `17-24px` | `700` | 보조 지표, 공동 사용 합계 |
| Section title | `15-16px` | `600` | panel과 summary 제목 |
| Body | `13-14px` | `500` | 설명, 일반 본문 |
| List title | `13-14px` | `600` | 거래명과 주요 목록 값 |
| Label | `11-12px` | `500-600` | 지표명, 범례명 |
| Metadata | `10-11px` | `500` | 날짜, 결제자, 보조 상태 |

- 제목과 금액에는 `-0.015em`에서 `-0.035em` 사이의 좁은 자간을 사용할 수 있습니다.
- 금액과 차트 수치는 `font-variant-numeric: tabular-nums`를 사용합니다.
- `800-900` 굵기는 브랜드 로고처럼 제한된 요소를 제외하고 사용하지 않습니다.
- 중요한 설명과 오류 메시지는 작은 metadata 크기로 낮추지 않습니다.
- 모바일 input은 iOS 확대를 막기 위해 `16px` 이상을 사용합니다.

## Spacing

| Token | Value | Usage |
| --- | --- | --- |
| `space-1` | `4px` | 밀접한 icon/text, metadata 간격 |
| `space-2` | `8px` | compact control, 작은 내부 간격 |
| `space-3` | `12px` | 목록 요소, control 사이 |
| `space-4` | `16px` | 모바일 좌우 여백, panel 기본 padding |
| `space-5` | `20px` | 강조 영역 내부 padding |
| `space-6` | `24px` | 주요 그룹과 section 간격 |
| `space-8` | `32px` | 페이지 단위 분리 |

- 화면마다 새로운 간격 값을 만들기보다 위 토큰을 조합합니다.
- `14px`, `18px`처럼 중간 값은 기존 컴포넌트의 밀도를 유지할 때만 허용합니다.
- 모바일 페이지 좌우 padding은 `16px`, 중간 화면은 `22-24px`, 넓은 화면은 `32-34px`를 기준으로 합니다.
- 넓은 화면의 콘텐츠 폭은 최대 `1440px` 안에서 화면 목적에 따라 결정합니다.

## Shape And Elevation

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | `8px` | text button, 작은 상태 표식 |
| `radius-md` | `12px` | input, list hover, 일반 control |
| `radius-lg` | `18px` | summary, panel |
| `radius-sheet` | `20px` | 모바일 bottom sheet 상단 |
| `radius-pill` | `999px` | segmented control, filter, progress |

- 일반 panel의 기본 radius는 `16-18px`이며 `18px`를 넘기지 않습니다.
- 모든 정보를 각각 둥근 카드로 분리하지 않습니다. 같은 맥락의 정보는 하나의 panel과 divider로 묶습니다.
- 기본 panel은 `surface + 1px line`으로 구분합니다. 배경과 분리가 더 필요하면 `0 1px 2px rgb(23 41 34 / 3.5%)` 이하의 미세한 shadow만 허용합니다.
- shadow는 overlay, bottom navigation, primary action의 hover처럼 실제 높이 차이가 있을 때만 사용합니다.
- 원형은 avatar, icon button, category mark처럼 의미가 분명한 요소에만 사용합니다.

## Icons And Category Marks

- navigation, action, status icon은 `lucide-react`의 SVG 아이콘을 사용합니다.
- 기본 icon은 `20px`, compact icon은 `16-18px`, stroke는 `1.8-2`를 사용합니다.
- 같은 문맥에서 filled icon과 outline icon을 섞지 않습니다.
- 장식용 이모지는 사용하지 않습니다.
- 식비·카페·교통처럼 빠른 스캔이 필요한 카테고리에는 이모지를 데이터 표식으로 사용할 수 있습니다.
- 카테고리 이모지는 동일한 크기의 원형 배경 안에 배치하고, 이름을 항상 함께 제공합니다.
- 이모지가 없거나 플랫폼별 모양이 달라도 의미를 이해할 수 있어야 합니다.

## Motion

| Token | Duration | Usage |
| --- | --- | --- |
| `motion-fast` | `160ms` | hover, 색상, focus, 작은 선택 변화 |
| `motion-base` | `220ms` | sheet, dialog, 화면 맥락 전환 |
| `motion-slow` | `440ms` | progress와 chart의 최초 데이터 표현 |
| `ease-product` | `cubic-bezier(.16, 1, .3, 1)` | 진입과 상태 변화 |

- 애니메이션은 선택, 저장 완료, 데이터 갱신, panel 진입의 결과를 설명할 때만 사용합니다.
- 한 화면에서 사용자의 시선을 끄는 진입 애니메이션은 1-2개 이하로 제한합니다.
- hover에서 요소의 위치나 전체 레이아웃이 변하지 않게 합니다.
- 무한 반복하는 장식 애니메이션은 사용하지 않습니다.
- 진입은 ease-out 성격을, 종료는 더 짧고 조용한 전환을 사용합니다.
- `prefers-reduced-motion: reduce`에서는 animation과 transition을 즉시 완료합니다.
- 누름 피드백은 모든 버튼 공통으로 `:active { transform: scale(0.97) }`, `transition: transform 160ms`를 사용합니다(`frontend/src/styles/base/globals.css`). `opacity` 변화로 누름을 표현하지 않습니다.

## Core Components

### Button

- Primary button은 한 영역에 하나만 둡니다.
- 기본 높이는 `44px`, 모바일 주요 제출 버튼은 `46-48px`를 사용할 수 있습니다.
- primary는 `brand-600`, hover와 pressed는 `brand-700`을 사용합니다. 흰색 label과의 대비는 `4.5:1` 이상을 유지합니다.
- 기본 primary shadow는 `0 5px 14px rgb(22 128 93 / 18%)` 이하로 제한합니다.
- secondary는 `surface + line`, text action은 배경 없이 사용합니다.
- 삭제와 되돌리기 어려운 행동만 danger variant를 사용합니다.
- loading 중에는 label을 진행형으로 바꾸고 중복 제출을 막습니다.
- 누름 피드백은 위 Motion의 `scale(0.97)` 규칙을 그대로 따릅니다.

### Icon Button

- 터치 영역은 최소 `44×44px`입니다.
- 원형 또는 `radius-md` 중 주변 컴포넌트와 맞는 한 가지 형태를 사용합니다.
- 보이는 텍스트가 없으면 접근 가능한 이름을 제공합니다.

### Input

- label은 입력창 밖에 두고 placeholder로 대체하지 않습니다.
- `surface + line-strong + radius-md`를 기본으로 합니다.
- focus에는 브랜드색 경계와 3px focus ring을 함께 제공합니다.
- 금액은 숫자 입력 안정성을 우선하고 표시 단계에서 천 단위 구분을 적용합니다.
- 오류는 색상뿐 아니라 오류 문장으로 설명합니다.

### Panel

- 서로 연관된 정보를 하나의 panel로 묶습니다.
- panel 내부의 반복 항목은 별도 카드보다 divider가 있는 list를 우선합니다.
- header와 body가 구분될 때 1px divider를 사용합니다.
- 유색 배경은 panel 전체보다 강조가 필요한 내부 그룹에 제한합니다.
- hover 가능한 panel과 row는 위치를 움직이지 않고 `line-strong` 경계 또는 `#FBFDFC` 표면으로만 반응합니다.

### Segmented Control

- 같은 데이터의 범위나 보기 방식 전환에 사용합니다.
- 항목은 2-3개를 기본으로 하며 모바일 터치 영역은 각각 최소 `44px`입니다.
- 선택된 항목은 `brand-100 + brand-700 + line-strong`, 비선택 항목은 `surface + text`로 표현합니다.

### Progress

- 예산 소진율 막대의 경고 임계값은 **60% / 90%**입니다: `60%` 미만은 브랜드 톤, `60~90%`는 경고, `90%` 이상은 위험 톤입니다(`frontend/src/shared/ui/Progress.tsx`).
- `Progress`(막대)와 `StatBlock`(금액 강조 블록)이 같은 60/90 규칙을 공유합니다. 화면마다 다른 임계값을 새로 만들지 않습니다.

### Transaction Row

- category mark, 거래명/metadata, 금액의 3영역으로 구성합니다.
- 기본 높이는 `58px` 전후로 유지합니다.
- 거래명과 금액 사이의 빈 공간을 인위적으로 넓히지 않습니다.
- 긴 거래명은 한 줄 말줄임하고 금액은 줄바꿈하지 않습니다.
- 금액은 오른쪽 정렬하고 tabular number를 사용합니다.

### Sidebar (V1)

- V1은 데스크톱 폭 전용이라 주요 이동 수단은 좌측 sidebar(232px 고정, `shared/ui/AppSidebar.tsx`) 하나입니다.
- 주요 영역은 `홈 / 가계부 / 반복 거래 / 예산 설정 / 분석` 5개입니다.
- 거래 기록은 헤더의 "거래 추가" 버튼이 여는 우측 드로어로 제공하고 같은 화면에 경쟁하는 추가 CTA를 중복 배치하지 않습니다.
- 현재 위치는 배경색과 label로 함께 표시합니다.
- 설정은 sidebar 하단, 알림은 대시보드 헤더 팝오버로 sidebar 내비게이션과 분리되어 있습니다.

### Bottom Navigation (모바일 디자인 확정 후)

아래는 V1 범위가 아니라 모바일 레이아웃이 확정된 이후의 작업입니다. 지우지 않고 남겨 둡니다.

- 중간 화면과 모바일의 주요 이동 수단입니다.
- 주요 영역은 `홈 / 거래 / 예산 / 분석`입니다.
- 거래 기록은 전역 `+` 행동으로 제공하고 같은 화면에 경쟁하는 추가 CTA를 중복 배치하지 않습니다.
- 현재 위치는 색상과 label로 함께 표시합니다.
- safe area를 포함하고 본문 하단에 navigation 높이만큼 여백을 둡니다.

### Side Sheet And Bottom Sheet

- 거래 입력처럼 현재 맥락을 유지해야 하는 짧은 작업에 사용합니다.
- V1(데스크톱 전용)은 오른쪽 side sheet만 사용합니다. bottom sheet는 모바일 레이아웃이 확정된 이후 적용합니다.
- 모바일 sheet는 화면 높이의 최대 `86dvh`를 기본으로 하며 내부 body만 스크롤합니다.
- 제목, 닫기, 입력 본문, 취소/저장 영역을 명확히 분리합니다.

### 공용화 후보 (디자인 시스템에 없는 컴포넌트)

디자인에는 반복 등장하지만 아직 `shared/ui`에 공용 컴포넌트가 없어 화면마다 직접 만든 것들입니다. 두 곳 이상에서 같은 모양이 반복되는 시점부터 공용 컴포넌트 승격을 검토합니다.

- **Switch(토글)** — 반복 거래 화면(고정비·자동등록)과 설정 알림 탭이 각각 인라인으로 구현합니다.
- **꺾은선·막대 차트** — 분석 화면과 대시보드 예산 상세(`BudgetDetailModal`)가 각각 인라인 SVG로 구현합니다. `DonutChart`는 이미 공용 컴포넌트지만 line/bar 차트는 아직 없고, 차트 라이브러리는 채택하지 않았습니다.
- **마케팅용 디스플레이 타입** — 랜딩 히어로(약 30~54px)는 위 Type Scale의 역할 클래스(최대 26px)를 넘어서 인라인 값을 씁니다.

## Data Visualization

- 총량 비교에는 bar, 시간 변화에는 line, 5개 이하 구성비에는 donut을 우선합니다.
- donut은 최대 5개 조각을 사용하고 나머지는 `기타`로 묶습니다.
- 차트 옆에 이름, 금액, 비율을 제공해 색상에 의존하지 않습니다.
- 선택된 donut 조각은 두께 또는 명도로 강조하되 전체 layout을 이동시키지 않습니다.
- 선택되지 않은 조각은 원래 색과 중립색을 섞어 채도를 낮춥니다. 완전한 회색이나 투명 상태로 숨기지 않습니다.
- hover, keyboard focus, touch 모두에서 같은 선택 결과를 제공합니다.
- 데이터가 없을 때 빈 차트를 그리지 않고 다음 행동을 안내하는 empty state를 제공합니다.
- donut은 `shared/ui/DonutChart`로 공용화되어 있습니다. 꺾은선·막대 차트가 아직 공용 컴포넌트가 없는 상태는 위 "공용화 후보"를 참고하세요.

## Responsive Rules

**V1은 데스크톱 폭 전용입니다.** 사이드바 232px 고정 + 본문 최소 1080px(`frontend/src/components/layout/AppShell.tsx`)를 기준으로 합니다. 랜딩과 온보딩만 좁은 폭에서 자연스럽게 접힙니다. 모바일 하단 navigation은 앱 셸 교체로 제거됐고, 현재 구현은 좁은 폭에서 가로 스크롤이 발생하는 알려진 제약이 있습니다.

| Range | Layout |
| --- | --- |
| `1080px+`(본문 기준) | 232px sidebar, 넓은 dashboard grid, side sheet(드로어·모달) |

- 검수 기준 viewport는 `1080px`, `1280px`, `1440px`입니다.
- 가로 스크롤, 고정 요소 겹침, 긴 장부명과 큰 금액의 잘림이 없어야 합니다.

아래는 **모바일 디자인 확정 후** 다시 적용할 규칙입니다. 지우지 않고 남겨 둡니다.

| Range (모바일 디자인 확정 후) | Layout |
| --- | --- |
| `0-760px` | 단일 column, 16px page padding, bottom navigation, bottom sheet |
| `761-1040px` | 콘텐츠에 따라 1-2 column, top bar와 bottom navigation |

- `440px` 이하는 금액과 chart의 줄바꿈을 추가로 점검합니다.
- 검수 기준 viewport는 `375px`, `390px`, `768px`, `1024px`입니다.
- 모바일에서는 현재 장부명을 화면 제목과 결합한 44px 선택 영역으로 제공합니다.

## Accessibility

- 모든 interactive target은 최소 `44×44px`입니다.
- 일반 본문은 WCAG AA 기준의 `4.5:1` 대비를 목표로 합니다.
- keyboard focus는 `rgb(22 128 93 / 28%)` 3px focus ring과 2px offset으로 명확하게 표시합니다.
- icon-only button, chart, progress에는 접근 가능한 이름과 현재 값을 제공합니다.
- 색상은 유일한 정보 전달 수단으로 사용하지 않습니다.
- dialog와 sheet는 focus 이동, 닫기, 배경 상호작용을 제어합니다.
- skeleton, loading text 또는 progress로 비동기 상태를 알립니다.
- 모든 motion은 `prefers-reduced-motion`을 존중합니다.

## Content Voice

- 짧고 차분하며 판단하지 않는 문장을 사용합니다.
- 사용자가 이미 수치로 확인할 수 있는 내용을 감탄형 문장으로 반복하지 않습니다.
- `잘 쓰고 있어요`, `균형 있게 사용했어요`처럼 사용자를 평가하는 표현을 기본 문구로 사용하지 않습니다.
- empty state는 현재 상태와 가능한 다음 행동을 함께 안내합니다.
- 오류 문장은 문제와 다시 시도할 방법을 함께 제공합니다.

## Anti-patterns

- 모든 section을 큰 radius와 shadow가 있는 카드로 만드는 화면
- 한 화면을 한 가지 초록색만으로 구분하는 화면
- canvas, 본문, divider, chart에 모두 회녹색을 섞어 전체 화면이 물 빠져 보이는 구성
- 넓은 주황색 지출 배경이나 빨간색 금액을 기본 상태로 사용하는 화면
- 거래 목록을 ERP식 표처럼 무겁게 만들거나 반대로 간격을 과도하게 벌리는 화면
- 시스템 아이콘을 이모지로 대체하는 화면
- 전역 `+`와 별도의 `거래 추가` CTA가 경쟁하는 화면
- 모든 입력과 상세 정보를 대시보드에 펼쳐 놓는 화면
- 선택되지 않은 차트 데이터를 완전히 회색으로 지우는 상호작용
- 접근성 설정과 무관하게 재생되는 장식 애니메이션
