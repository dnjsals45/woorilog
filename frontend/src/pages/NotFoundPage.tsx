import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5 text-center">
      <div><p className="text-sm font-black text-emerald-700">404</p><h1 className="mt-2 text-3xl font-black">페이지를 찾을 수 없습니다.</h1><p className="mt-3 text-sm text-slate-500">주소가 변경되었거나 사용할 수 없는 페이지입니다.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white" to="/">처음으로 돌아가기</Link></div>
    </main>
  )
}
