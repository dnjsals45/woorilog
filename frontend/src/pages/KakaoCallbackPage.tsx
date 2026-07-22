import { useEffect, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useKakaoLoginMutation } from '../features/auth/model/authQueries'
import { AuthReturnRedirect } from '../features/auth/ui/AuthReturnRedirect'
import { getAccessToken } from '../shared/api/client'

export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const loginMutation = useKakaoLoginMutation()
  const attemptedCodeRef = useRef<string | null>(null)
  const { mutate } = loginMutation

  useEffect(() => {
    if (!code || error || attemptedCodeRef.current === code) return
    attemptedCodeRef.current = code
    mutate(code)
  }, [code, error, mutate])

  if (getAccessToken()) {
    return <AuthReturnRedirect />
  }

  if (error || !code) {
    return <Navigate to="/login?error=kakao-cancelled" replace />
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5 text-slate-700">
      <section className="rounded-3xl border border-[var(--wl-color-border)] bg-white px-6 py-5 text-center font-semibold shadow-[var(--wl-shadow-card)]">
        <p>{loginMutation.isError ? '카카오 로그인에 실패했습니다. 다시 시도해주세요.' : '카카오 로그인 처리 중입니다.'}</p>
        {loginMutation.isError ? <div className="mt-4 flex flex-wrap justify-center gap-2"><button className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" onClick={() => { loginMutation.reset(); mutate(code) }} type="button">다시 시도</button><Link className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600" to="/login">로그인으로 돌아가기</Link></div> : null}
      </section>
    </main>
  )
}
