import { ArrowLeft, LogIn, MessageCircle, WalletCards } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getKakaoLoginUrl } from '../features/auth/api/authApi'
import { useDevLoginMutation } from '../features/auth/model/authQueries'
import { getAccessToken } from '../shared/api/client'

export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useDevLoginMutation()
  const [email, setEmail] = useState('dev@woorilog.local')
  const [nickname, setNickname] = useState('우리로그 개발자')
  const [kakaoError, setKakaoError] = useState(false)
  const devLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN_ENABLED !== 'false'

  if (getAccessToken()) return <Navigate to="/dashboard" replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loginMutation.mutate({ email, nickname }, { onSuccess: () => navigate('/dashboard', { replace: true }) })
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
    <main className="flex min-h-dvh items-center bg-[var(--wl-color-background)] px-5 py-10 sm:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-md">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--wl-color-primary-dark)]" to="/"><ArrowLeft size={18} aria-hidden="true" />처음으로</Link>
          <div className="mt-12 flex items-center gap-2 text-[var(--wl-color-primary-dark)]"><WalletCards size={30} aria-hidden="true" /><span className="text-xl font-bold">우리로그</span></div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">함께 쓰는 돈을<br />가볍게 기록하세요.</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">공동 장부, 월 예산, 반복 거래를 한 흐름으로. 내 소비와 우리의 생활비를 더 선명하게 살펴볼 수 있어요.</p>
        </div>
        <form className="rounded-3xl border border-[var(--wl-color-border)] bg-white p-6 shadow-[var(--wl-shadow-card)] sm:p-8" onSubmit={handleSubmit}>
          <p className="text-sm font-bold text-[var(--wl-color-primary)]">WELCOME</p><h2 className="mt-2 text-2xl font-bold text-slate-950">우리로그 시작하기</h2><p className="mt-2 text-sm leading-6 text-slate-500">카카오 계정으로 안전하고 간편하게 로그인하세요.</p>
          <button className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#fee500] px-4 text-sm font-bold text-[#191919] transition hover:bg-[#f5dc00]" onClick={handleKakaoLogin} type="button"><MessageCircle size={19} aria-hidden="true" />카카오로 시작하기</button>
          {kakaoError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">카카오 로그인이 아직 설정되지 않았거나 연결에 실패했습니다.</p> : null}
          {devLoginEnabled ? <div className="mt-7 border-t border-[var(--wl-color-border)] pt-6"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Local development</p><label className="mt-4 block text-sm font-semibold text-slate-700">이메일<input className="mt-2 h-12 w-full rounded-xl border border-[var(--wl-color-border)] px-3 text-base text-slate-950" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label className="mt-4 block text-sm font-semibold text-slate-700">별칭<input className="mt-2 h-12 w-full rounded-xl border border-[var(--wl-color-border)] px-3 text-base text-slate-950" onChange={(event) => setNickname(event.target.value)} required value={nickname} /></label>{loginMutation.isError ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">로그인에 실패했습니다. 백엔드가 실행 중인지 확인해주세요.</p> : null}<button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--wl-color-primary-dark)] disabled:bg-slate-300" disabled={loginMutation.isPending} type="submit"><LogIn size={18} aria-hidden="true" />{loginMutation.isPending ? '로그인 중' : '개발자 로그인'}</button></div> : null}
        </form>
      </section>
    </main>
  )
}
