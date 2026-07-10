import { ArrowRight, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAccessToken } from '../shared/api/client'

export function LandingPage() {
  const startPath = getAccessToken() ? '/dashboard' : '/login'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-5 py-10 sm:px-8">
      <section className="max-w-2xl">
        <div className="flex items-center gap-2 text-emerald-700">
          <WalletCards size={28} aria-hidden="true" />
          <span className="text-lg font-semibold">우리로그</span>
        </div>
        <p className="mt-10 text-sm font-medium text-emerald-700">함께 쓰는 우리 집 가계부</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-6xl">
          수입과 지출을 함께 관리하고,
          <br />
          더 단단한 소비를 만드세요.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          개인 장부와 공동 장부, 월 예산과 반복 거래를 한 흐름으로 기록합니다.
        </p>
        <Link
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-emerald-700 px-5 font-semibold text-white transition hover:bg-emerald-800"
          to={startPath}
        >
          {getAccessToken() ? '내 장부로 가기' : '무료로 시작하기'}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}
