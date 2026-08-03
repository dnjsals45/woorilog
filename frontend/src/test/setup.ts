import '@testing-library/jest-dom/vitest'

/* jsdom 은 matchMedia 를 구현하지 않습니다. 모바일 앱 뷰 판정(useIsMobileShell)이
 * 이걸 쓰므로 테스트 환경에서만 최소 구현을 채워 둡니다.
 * 기본값은 "일치하지 않음" — 테스트는 데스크톱 셸을 봅니다.
 * 모바일 셸을 테스트해야 하면 이 구현을 스파이로 덮어쓰세요. */
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      matches: false,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
