import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useKakaoLoginMutation } from '../features/auth/model/authQueries'
import { getAccessToken } from '../shared/api/client'

export function KakaoCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const loginMutation = useKakaoLoginMutation()

  useEffect(() => {
    if (code && !error && !loginMutation.isPending && !loginMutation.isSuccess) {
      loginMutation.mutate(code, {
        onSuccess: () => navigate('/dashboard', { replace: true }),
      })
    }
  }, [code, error, loginMutation, navigate])

  if (getAccessToken()) {
    return <Navigate to="/dashboard" replace />
  }

  if (error || !code) {
    return <Navigate to="/login?error=kakao-cancelled" replace />
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5 text-slate-700">
      <p className="rounded-3xl border border-[var(--wl-color-border)] bg-white px-6 py-5 text-center font-semibold shadow-[var(--wl-shadow-card)]">
        {loginMutation.isError ? '카카오 로그인에 실패했습니다. 다시 시도해주세요.' : '카카오 로그인 처리 중입니다.'}
      </p>
    </main>
  )
}
