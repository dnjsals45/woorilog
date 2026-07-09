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

## Internal Mockups

| Reference | Use For | Notes |
| --- | --- | --- |
| [`assets/design`](../../assets/design/README.md) | 앱 내부 화면 구조, 색감, 정보 위계, 반응형 기준 | 실제 운영 화면이 아니라 구현 전 디자인 레퍼런스입니다. 구현 중 접근성, 반응형, 실제 데이터 길이를 기준으로 조정합니다. |

## Platform References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | iOS 모바일 상호작용, safe area, touch target | 모바일 우선 화면의 기본 UX 기준으로 확인합니다. |
| [Material Design 3 Navigation Bar](https://m3.material.io/components/navigation-bar/overview) | 하단 내비게이션 구조 | Dashboard, Ledger, Budget, Stats, Settings 이동 구조를 검토할 때 참고합니다. |
| [Material Design 3 Top App Bar](https://m3.material.io/components/app-bars/overview) | 상단 장부 선택기와 화면 액션 | 현재 장부 맥락과 1-2개 주요 액션만 드러내는 기준으로 참고합니다. |

## Implementation References

| Reference | Use For | Notes |
| --- | --- | --- |
| [Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api) | Kakao OAuth login/callback | Auth 구현 전 redirect URI, token 요청, user info 범위를 다시 확인합니다. |

## Screens To Collect

구현 전에 다음 화면은 저해상도 스케치나 참고 스크린샷을 모아 비교합니다.

- Dashboard: 월 예산, 누적 지출, 남은 예산, 최근 거래가 동시에 보이는 화면
- Calendar / Ledger: 날짜별 거래 탐색과 빠른 추가가 공존하는 화면
- Budget Month Settings: 월 총 예산, 카테고리 예산, 멤버별 할당 편집 화면
- Settings: 장부 전환, 멤버, 초대, 반복 거래가 섞이지 않는 설정 구조
- Invitation Link: 로그인 전/후 초대 수락 상태 화면
