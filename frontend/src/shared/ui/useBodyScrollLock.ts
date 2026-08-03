import { useEffect } from 'react'

/* 열려 있는 오버레이 수. 시트가 겹쳐 열렸다 하나만 닫혔다고 본문 스크롤이 풀리면 안 됩니다. */
let lockCount = 0
let restoreOverflow = ''

/**
 * 오버레이가 열려 있는 동안 뒤 화면이 스크롤되지 않게 잠급니다.
 * 모바일에서 시트를 넘기다 뒤 목록이 같이 밀리는 걸 막는 용도라 앱 뷰·데스크톱 모두에 겁니다.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined
    if (lockCount === 0) {
      restoreOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0) document.body.style.overflow = restoreOverflow
    }
  }, [active])
}
