import { useState, type FormEvent } from 'react'
import { LogIn, MessageCircle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAccessToken } from '../shared/api/client'
import { getKakaoLoginUrl } from '../features/auth/api/authApi'
import { useDevLoginMutation } from '../features/auth/model/authQueries'

export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useDevLoginMutation()
  const [email, setEmail] = useState('dev@woorilog.local')
  const [nickname, setNickname] = useState('우리로그 개발자')
  const [kakaoError, setKakaoError] = useState(false)
  const devLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN_ENABLED !== 'false'

  if (getAccessToken()) {
    return <Navigate to="/dashboard" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    loginMutation.mutate(
      { email, nickname },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
      },
    )
  }

  async function handleKakaoLogin() {
    setKakaoError(false)
    try {
      const { loginUrl } = await getKakaoLoginUrl()
      window.location.assign(loginUrl)
    } catch {
      setKakaoError(true)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8">
      <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-medium text-emerald-700">함께 쓰는 예산 장부</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            우리로그
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            개인 장부에서 시작해 공동 장부, 월 예산, 거래 기록까지 한 흐름으로
            관리합니다.
          </p>
        </div>

        <form
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <h2 className="text-xl font-semibold text-slate-950">로그인</h2>
          <p className="mt-2 text-sm text-slate-500">카카오 계정으로 안전하게 로그인합니다.</p>

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-yellow-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-yellow-400"
            onClick={handleKakaoLogin}
            type="button"
          >
            <MessageCircle size={18} aria-hidden="true" />
            카카오로 시작하기
          </button>

          {kakaoError ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              카카오 로그인이 아직 설정되지 않았거나 연결에 실패했습니다.
            </p>
          ) : null}

          {devLoginEnabled ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500">로컬 개발 및 자동화 검증용</p>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            이메일
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            별칭
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </label>

          {loginMutation.isError ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              로그인에 실패했습니다. 백엔드가 실행 중인지 확인해주세요.
            </p>
          ) : null}

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={loginMutation.isPending}
            type="submit"
          >
            <LogIn size={18} aria-hidden="true" />
            {loginMutation.isPending ? '로그인 중' : '개발자 로그인'}
          </button>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  )
}
