import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useKakaoLogin } from '../features/auth/model/authQueries'
import { AuthReturnRedirect } from '../features/auth/ui/AuthReturnRedirect'
import { getAccessToken } from '../shared/api/client'

export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const completeKakaoLogin = useKakaoLogin()
  const attemptedCodeRef = useRef<string | null>(null)
  const [loginSucceeded, setLoginSucceeded] = useState(false)
  const [loginFailed, setLoginFailed] = useState(false)

  const runKakaoLogin = useCallback(async () => {
    if (!code) return

    setLoginFailed(false)
    try {
      await completeKakaoLogin(code)
      setLoginSucceeded(true)
    } catch {
      setLoginFailed(true)
    }
  }, [code, completeKakaoLogin])

  useEffect(() => {
    if (!code || error || attemptedCodeRef.current === code) return
    attemptedCodeRef.current = code
    void runKakaoLogin()
  }, [code, error, runKakaoLogin])

  if (loginSucceeded || getAccessToken()) {
    return <AuthReturnRedirect />
  }

  if (error || !code) {
    return <Navigate to="/?error=kakao-cancelled" replace />
  }

  return (
    <main className="auth-surface flex min-h-dvh items-center justify-center px-5 text-slate-700">
      <section className="auth-card px-6 py-5 text-center font-semibold">
        <p>{loginFailed ? '카카오 로그인에 실패했습니다. 로그인 화면에서 다시 시도해주세요.' : '카카오 로그인 처리 중입니다.'}</p>
        {loginFailed ? <div className="mt-4"><Link className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600" to="/">처음으로 돌아가기</Link></div> : null}
      </section>
    </main>
  )
}
