# Landing Page Direction

랜딩 페이지는 우리로그의 첫 진입 화면입니다.
앱 내부 화면 목업과 다르게, 실제 서비스 진입을 돕는 화면이므로 배경 이미지와 명확한 시작 CTA를 중심에 둡니다.

## Source Reference

- Background image: `assets/design/Landing/landing-desk-bg.png`
- Landing mockups: `assets/design/Landing/*.png`

## Direction

- 첫 viewport는 좌측 hero copy, 우측 배경 이미지와 제품 미리보기 영역을 둡니다.
- 배경 이미지는 따뜻한 작업 책상 분위기를 유지해 "함께 쓰는 생활비 기록"의 생활감을 살립니다.
- primary CTA는 Kakao login 또는 시작 액션으로 연결합니다.
- local/test 환경에서는 Playwright와 수동 UI 검증을 위한 개발자 로그인 CTA를 보조 액션으로 노출할 수 있습니다.
- hero 이후에는 핵심 기능을 짧게 보여주되, 실제 앱 사용이 목적이므로 마케팅 섹션을 과하게 늘리지 않습니다.

## Implementation Notes

- 랜딩 구현은 현재 저장소의 디자인 문서와 `assets/design`만 기준으로 삼습니다.
- 외부 ref 프로젝트에 의존하지 않습니다.
- 실제 구현에서는 수동 SVG icon보다 프로젝트에서 채택한 icon library를 우선합니다.
- 모바일에서는 배경 이미지를 숨기거나 상단 보조 이미지로 축소하고, CTA와 로그인 흐름을 먼저 보여줍니다.

## Copy Direction

랜딩 copy는 다음 톤을 유지합니다.

- "함께 쓰는 우리 집 가계부"
- "수입과 지출을 함께 관리하고, 투명한 소비로 더 단단해지는 우리."
- "무료로 시작하기"
- "둘러보기"

구현 중 제품명이 앞에 드러나야 하며, 앱 내부 화면으로 진입하는 경로가 랜딩 장식보다 우선합니다.
