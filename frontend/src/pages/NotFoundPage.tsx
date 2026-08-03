import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="auth-surface flex min-h-dvh items-center justify-center px-4 text-center">
      <div className="auth-card max-w-md px-6 py-8 sm:px-7"><p className="text-sm font-bold text-[var(--wl-color-primary-dark)]">404</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">페이지를 찾을 수 없습니다.</h1><p className="mt-3 text-sm text-[var(--wl-color-text-secondary)]">주소가 변경되었거나 사용할 수 없는 페이지입니다.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[var(--wl-color-primary)] px-5 text-sm font-bold text-white" to="/">처음으로 돌아가기</Link></div>
    </main>
  )
}
