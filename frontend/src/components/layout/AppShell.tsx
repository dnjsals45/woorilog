import {
  BarChart3,
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Repeat,
  Settings,
  Tags,
  WalletCards,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogoutMutation, useMeQuery } from '../../features/auth/model/authQueries'
import { useCreateLedgerMutation, useLedgerMembersQuery, useLedgersQuery, useSwitchLedgerMutation } from '../../features/ledger/model/ledgerQueries'
import type { LedgerType } from '../../features/ledger/api/ledgerApi'
import { TransactionEntrySheet } from '../../features/transaction/ui/TransactionEntrySheet'
import { formatBudgetMonth } from '../../shared/lib/date'
import { TransactionEntryContext, type TransactionEntryPreset } from '../../shared/ui/TransactionEntryContext'
import { ApiClientError } from '../../shared/api/client'
import { ErrorState } from '../../shared/ui/DesignPrimitives'

const navigation = [
  { label: '대시보드', to: '/dashboard', icon: LayoutDashboard },
  { label: '가계부', to: '/calendar', icon: BookOpen },
  { label: '통계', to: '/stats', icon: BarChart3 },
  { label: '예산·정산', to: '/budget', icon: PiggyBank, budget: true },
  { label: '정기 거래', to: '/recurring', icon: Repeat },
  { label: '설정', to: '/settings', icon: Settings },
]

function Brand() {
  return (
    <Link className="flex items-center gap-2.5 text-emerald-700" to="/dashboard">
      <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50"><WalletCards size={22} strokeWidth={2.3} /></span>
      <span><strong className="block text-xl font-black tracking-[-0.04em]">우리로그</strong><small className="block text-[10px] font-bold text-slate-400">함께 쓰는 돈의 기록</small></span>
    </Link>
  )
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const switchLedgerMutation = useSwitchLedgerMutation()
  const [newLedgerName, setNewLedgerName] = useState('')
  const [newLedgerType, setNewLedgerType] = useState<LedgerType>('PERSONAL')
  const createLedgerMutation = useCreateLedgerMutation(newLedgerType)
  const logoutMutation = useLogoutMutation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [transactionEntryOpen, setTransactionEntryOpen] = useState(false)
  const [transactionEntryPreset, setTransactionEntryPreset] = useState<TransactionEntryPreset>()
  const [transactionEntryKey, setTransactionEntryKey] = useState(0)
  const currentMonth = formatBudgetMonth()
  const currentLedger = ledgersQuery.data?.ledgers?.find((ledger) => ledger.id === ledgersQuery.data?.currentLedgerId) ?? meQuery.data?.currentLedger
  const membersQuery = useLedgerMembersQuery(currentLedger?.id)
  const budgetPath = currentLedger ? `/ledgers/${currentLedger.id}/months/${currentMonth}` : '/settings'
  const resolvePath = (budget?: boolean, path?: string) => budget ? budgetPath : path ?? '/dashboard'
  const isActive = (path: string) => location.pathname === path || (path.startsWith('/ledgers/') && location.pathname.startsWith('/ledgers/'))

  if (meQuery.isLoading) {
    return <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] text-sm font-bold text-slate-500">사용자 정보를 확인하는 중입니다.</main>
  }
  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate replace to="/login" />
  }
  if (meQuery.isError) {
    return <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5"><ErrorState onRetry={() => meQuery.refetch()} /></main>
  }

  const closeAndNavigate = (path: string) => {
    setDrawerOpen(false)
    navigate(path)
  }

  const handleCreateLedger = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createLedgerMutation.mutate({ name: newLedgerName }, {
      onSuccess: () => {
        setNewLedgerName('')
        setDrawerOpen(false)
      },
    })
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Brand />
      <nav aria-label="주요 메뉴" className="mt-10 space-y-1.5">
        {navigation.map(({ label, to, icon: Icon, budget }) => {
          const path = resolvePath(budget, to)
          return (
            <button className={`flex min-h-12 w-full items-center gap-3 rounded-[14px] px-4 text-sm font-extrabold transition ${isActive(path) ? 'bg-[#e7f7ef] text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`} key={label} onClick={() => closeAndNavigate(path)} type="button">
              <Icon size={19} strokeWidth={2} /><span>{label}</span>
            </button>
          )
        })}
      </nav>
      <button className={`mt-4 flex min-h-11 w-full items-center gap-3 rounded-[14px] px-4 text-sm font-extrabold transition ${isActive('/categories') ? 'bg-[#e7f7ef] text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`} onClick={() => closeAndNavigate('/categories')} type="button"><Tags size={18} strokeWidth={2} />카테고리 관리</button>

      <div className="mt-auto space-y-4">
        {currentLedger ? (
          <section className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-bold text-slate-400">현재 장부</p>
            <p className="mt-2 text-xs font-extrabold text-emerald-700">{currentLedger.type === 'GROUP' ? `공동 장부 · ${membersQuery.data?.length ?? 0}명` : '개인 장부'}</p>
            {ledgersQuery.data?.ledgers?.length ? (
              <select aria-label="현재 장부 선택" className="mt-1 w-full bg-transparent text-sm font-black text-slate-900 outline-none" disabled={switchLedgerMutation.isPending} onChange={(event) => switchLedgerMutation.mutate(Number(event.target.value))} value={currentLedger.id}>
                {ledgersQuery.data.ledgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.name} · {ledger.type === 'GROUP' ? '공동' : '개인'}</option>)}
              </select>
            ) : <p className="mt-1 truncate text-sm font-black">{currentLedger.name}</p>}
            <details className="mt-3 border-t border-slate-200 pt-3"><summary className="cursor-pointer text-xs font-extrabold text-emerald-700">+ 새 장부 만들기</summary><form className="mt-3 space-y-2" onSubmit={handleCreateLedger}><div className="grid grid-cols-2 gap-2">{(['PERSONAL', 'GROUP'] as const).map((type) => <button className={`min-h-10 rounded-lg border text-xs font-bold ${newLedgerType === type ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`} key={type} onClick={() => setNewLedgerType(type)} type="button">{type === 'PERSONAL' ? '개인 장부' : '공동 장부'}</button>)}</div><label className="sr-only" htmlFor="new-ledger-name">새 장부 이름</label><input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold" id="new-ledger-name" onChange={(event) => setNewLedgerName(event.target.value)} placeholder="새 장부 이름" required value={newLedgerName} /><button className="min-h-10 w-full rounded-lg bg-emerald-600 text-xs font-extrabold text-white disabled:bg-slate-300" disabled={createLedgerMutation.isPending} type="submit">{createLedgerMutation.isPending ? '만드는 중...' : '장부 만들기'}</button></form></details>
            <div aria-label={`장부 구성원 ${membersQuery.data?.length ?? 0}명`} className="mt-4 flex -space-x-2">
              {membersQuery.data?.slice(0, 5).map((member, index) => <span className={`flex size-9 items-center justify-center rounded-full border-2 border-white text-xs font-black ${index % 2 ? 'bg-[#ffe4d6] text-rose-700' : 'bg-[#d9f4e7] text-emerald-700'}`} key={member.userId} title={member.nickname}>{member.nickname.slice(0, 1)}</span>)}
            </div>
          </section>
        ) : null}
        <div className="border-t border-slate-100 pt-3">
          {meQuery.data ? <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2"><span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">{meQuery.data.user.nickname.slice(0, 1)}</span><span className="min-w-0 truncate text-sm font-extrabold">{meQuery.data.user.nickname}</span></div> : null}
          <button className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-slate-50" onClick={() => closeAndNavigate('/help')} type="button"><CircleHelp size={18} />도움말</button>
          <button className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })} type="button"><LogOut size={18} />{logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}</button>
        </div>
      </div>
    </div>
  )

  const mobileItems = ['대시보드', '가계부', '예산·정산', '통계']
    .map((label) => navigation.find((item) => item.label === label))
    .filter((item): item is (typeof navigation)[number] => Boolean(item))

  return (
    <TransactionEntryContext.Provider value={{ openTransactionEntry: (preset) => { setTransactionEntryPreset(preset && 'nativeEvent' in preset ? undefined : preset); setTransactionEntryKey((value) => value + 1); setTransactionEntryOpen(true) } }}>
      <div className="wl-app-shell min-h-dvh bg-[#f8faf8] text-slate-950">
        <header className="fixed inset-x-0 top-0 z-40 border-b border-[#e5ede8] bg-white/95 backdrop-blur md:hidden">
          <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4"><Brand /><button aria-expanded={drawerOpen} aria-label="메뉴 열기" className="flex size-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-50" onClick={() => setDrawerOpen(true)} type="button"><Menu size={22} /></button></div>
        </header>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-[#e5ede8] bg-white p-7 md:block">{sidebar}</aside>
        {drawerOpen ? <div className="fixed inset-0 z-50 md:hidden"><button aria-label="메뉴 닫기" className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} type="button" /><aside aria-label="모바일 메뉴" className="relative h-full w-[min(86vw,320px)] overflow-y-auto bg-white p-7 shadow-2xl"><button aria-label="메뉴 닫기" className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50" onClick={() => setDrawerOpen(false)} type="button"><X size={20} /></button>{sidebar}</aside></div> : null}

        <div className="min-h-dvh pb-16 pt-14 md:pb-0 md:pl-[280px] md:pt-0"><div className="mx-auto max-w-[480px] md:max-w-none"><Outlet /></div></div>

        <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5ede8] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden">
          <div className="relative mx-auto grid min-h-14 max-w-[480px] grid-cols-5 items-center px-2 pb-[env(safe-area-inset-bottom)]">
            {mobileItems.map(({ label, to, icon: Icon, budget }, index) => { const path = resolvePath(budget, to); const column = index < 2 ? index + 1 : index + 2; return <NavLink className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-extrabold ${isActive(path) ? 'text-emerald-700' : 'text-slate-500'}`} key={label} style={{ gridColumnStart: column }} to={path}><Icon size={18} strokeWidth={2} /><span>{label}</span></NavLink> })}
            <button aria-label="거래 추가" className="absolute bottom-3 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_-4px_rgba(14,159,110,0.3)] hover:bg-emerald-700" onClick={() => setTransactionEntryOpen(true)} type="button"><Plus size={28} strokeWidth={2.5} /></button>
          </div>
        </nav>
        <TransactionEntrySheet key={transactionEntryKey} onClose={() => setTransactionEntryOpen(false)} open={transactionEntryOpen} preset={transactionEntryPreset} />
      </div>
    </TransactionEntryContext.Provider>
  )
}
