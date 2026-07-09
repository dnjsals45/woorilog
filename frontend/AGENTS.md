# AGENTS.md

우리로그 프론트엔드 작업 지침입니다. 루트 `AGENTS.md`의 일반 원칙을 함께 따릅니다.

## 기본 원칙

- 프론트엔드 구현은 React, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, lucide-react, React Hook Form, Zod 기준으로 진행합니다.
- 일반적인 React 관례보다 이 프로젝트의 가까운 코드, API 계약, 디자인 문서를 우선합니다.
- 서버 상태는 TanStack Query를 우선하고, 전역 클라이언트 상태는 꼭 필요한 경우에만 추가합니다.
- API client, query hook, route, form state, 화면 컴포넌트의 책임을 섞지 않습니다.
- 새 화면이나 큰 UI 변경은 `docs/design/**` 문서를 먼저 확인합니다.

## 최종 검토가 필요한 판단

- API 계약 호환성
- 인증/권한 흐름
- TanStack Query key와 cache invalidation 정책
- package/dependency 변경
- 접근성, 반응형 구조, 최종 검증

## 검증

```bash
npm run lint
npm run test
npm run build
```

## 주의할 것

- Redux, Zustand, UI component library, chart library는 명시적으로 채택할 때만 도입합니다.
- chart library는 통계 화면 구현 시점에 Recharts를 우선 후보로 검토합니다.
- 관련 없는 리팩터링, 포맷 변경, 파일 이동을 섞지 않습니다.
- 아이콘이 필요한 UI에 emoji를 시스템 아이콘 대체재로 사용하지 않습니다.
