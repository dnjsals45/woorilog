import { useEffect, useState } from 'react'

/** 모바일 앱 뷰 경계. styles/patterns/mobile-shell.css 의 `width < 1024px` 과 같은 값이어야 합니다. */
export const MOBILE_SHELL_QUERY = '(max-width: 1023.98px)'

/**
 * 바텀 탭바·시트를 쓰는 모바일 앱 뷰인지 알려줍니다.
 *
 * 레이아웃은 CSS 미디어 쿼리가 담당하고, 이 훅은 **구조가 달라지는 곳**에서만 씁니다 —
 * 사이드바 대신 탭바를 렌더한다든지, 모달 대신 시트를 연다든지. 스타일만 바뀌는 곳에서는 쓰지 마세요.
 */
export function useIsMobileShell(): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_SHELL_QUERY).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(MOBILE_SHELL_QUERY)
    const update = () => setMatches(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return matches
}
