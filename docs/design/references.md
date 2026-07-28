# Design References

이 문서는 우리로그 UI를 만들 때 참고할 외부 제품과 디자인 기준을 정리합니다.
레퍼런스는 그대로 복제하지 않고, 우리로그의 도메인과 화면 목적에 맞는 판단 재료로만 사용합니다.

## Reference Principles

- 예산, 지출, 잔액은 한눈에 스캔되게 보여줍니다.
- 개인 장부와 공동 장부는 같은 앱 안에서 자연스럽게 전환되어야 합니다.
- 공동 장부에서는 누가 결제했는지, 누가 참여하는지, 현재 장부의 월 예산이 어떻게 쓰이고 있는지가 함께 보여야 합니다.
- 모바일 화면은 한 번에 하나의 주요 행동을 명확히 드러냅니다.
- 금융 정보는 과하게 무겁게 보이지 않되, 계산 근거와 상태는 숨기지 않습니다.

## Product References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Splitwise](https://www.splitwise.com/) | 공동 비용, 멤버별 지출, 빠른 비용 추가 | 정산 중심 흐름은 참고하되, 우리로그는 월 예산 운영을 더 앞에 둡니다. |
| [YNAB](https://www.ynab.com/) | 월 예산, 카테고리 예산, 지출 우선순위 | 예산 카테고리 구조와 월 단위 사고방식을 참고합니다. |
| [Copilot Money](https://www.copilot.money/) | 대시보드, 지출 요약, 카테고리 시각화 | 은행 연동 중심 전제는 제외하고, 정보 밀도와 카드 구성을 참고합니다. |
| [뱅크샐러드](https://app.banksalad.com/) | 한국어 금융 정보 표현, 자산/소비 요약 | 자산 관리 범위까지 넓히지는 않고, 한국어 금액/카테고리 표현을 참고합니다. |

## Production References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Design System](./design-system.md) | 전역 색상, 타이포그래피, 표면과 motion | 제품 디자인 판단의 문서 원본입니다. |
| [Screen Specs](./screen-specs.md) | 화면별 정보 위계, 상호작용과 상태 | 화면 구현과 함께 갱신합니다. |
| [`frontend/src/styles`](../../frontend/src/styles/) | 실제 token과 화면 스타일 | 실행 결과와 문서가 다르면 함께 수정합니다. |
| [`frontend/src/pages`](../../frontend/src/pages/) | 실제 route 화면과 반응형 구현 | 브라우저 검수의 대상입니다. |

## Platform References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | iOS 모바일 상호작용, safe area, touch target | 모바일 우선 화면의 기본 UX 기준으로 확인합니다. |
| [Material Design 3 Navigation Bar](https://m3.material.io/components/navigation-bar/overview) | 하단 내비게이션 구조 | 홈, 거래, 중앙 기록 action, 예산, 분석의 5개 항목을 검토할 때 참고합니다. |
| [Material Design 3 Top App Bar](https://m3.material.io/components/app-bars/overview) | 상단 장부 선택기와 화면 액션 | 현재 장부 맥락과 1-2개 주요 액션만 드러내는 기준으로 참고합니다. |

## Implementation References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api) | Kakao OAuth login/callback | Auth 구현 전 redirect URI, token 요청, user info 범위를 다시 확인합니다. |

## Reference Gaps During Implementation

추가 레퍼런스는 실제 프론트엔드 이관 중 다음 조건에서 정보 위계나 상호작용이 불분명할 때만 수집합니다.

- 긴 거래명, 큰 금액, 많은 카테고리와 같은 실제 데이터 edge case
- loading, empty, error, 권한 없음 상태
- 실제 chart library의 keyboard, touch, tooltip 동작
- 모바일 키보드와 bottom sheet, safe area가 함께 나타나는 상태
- 다크 모드가 제품 요구사항으로 별도 확정되는 경우
