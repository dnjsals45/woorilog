const RETURN_PATH_KEY = 'woorilog.auth.returnPath'

function normalizeInternalPath(path: string | null | undefined) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return null
  }

  try {
    const url = new URL(path, window.location.origin)
    if (url.origin !== window.location.origin) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function storeAuthReturnPath(path: string) {
  const normalizedPath = normalizeInternalPath(path)
  if (!normalizedPath) return

  try {
    window.sessionStorage.setItem(RETURN_PATH_KEY, normalizedPath)
  } catch {
    // 로그인 자체는 브라우저 저장소 사용 가능 여부와 무관하게 계속 진행합니다.
  }
}

export function getAuthReturnPath(fallback = '/dashboard') {
  try {
    const returnPath = normalizeInternalPath(window.sessionStorage.getItem(RETURN_PATH_KEY))
    return returnPath ?? fallback
  } catch {
    return fallback
  }
}

export function clearAuthReturnPath() {
  try {
    window.sessionStorage.removeItem(RETURN_PATH_KEY)
  } catch {
    // 저장소 정리 실패가 로그인 완료를 막지 않게 합니다.
  }
}
