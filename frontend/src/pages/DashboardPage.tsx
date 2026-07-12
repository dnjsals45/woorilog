import { Bell, ChevronLeft, ChevronRight, Plus, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useDashboardSummaryQuery } from '../features/budget/model/budgetQueries'
import { useMeQuery } from '../features/auth/model/authQueries'
import type { LedgerType } from '../features/ledger/api/ledgerApi'
import { useCreateLedgerMutation, useLedgersQuery, useSwitchLedgerMutation } from '../features/ledger/model/ledgerQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CalendarGrid } from '../shared/ui/CalendarGrid'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { EmptyState } from '../shared/ui/DesignPrimitives'
import { useTransactionEntry } from '../shared/ui/TransactionEntryContext'

export function DashboardPage() {
  const { openTransactionEntry } = useTransactionEntry()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const dashboardQuery = useDashboardSummaryQuery()
  const switchLedgerMutation = useSwitchLedgerMutation()
  const [ledgerName, setLedgerName] = useState('')
  const [ledgerType, setLedgerType] = useState<LedgerType>('PERSONAL')
  const createLedgerMutation = useCreateLedgerMutation(ledgerType)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate to="/login" replace />

  const currentLedger = dashboardQuery.data?.currentLedger ?? ledgersQuery.data?.ledgers?.find((ledger) => ledger.id === ledgersQuery.data?.currentLedgerId) ?? meQuery.data?.currentLedger
  const currentBudgetMonth = dashboardQuery.data?.budgetMonth ?? formatBudgetMonth()
  const totalBudget = dashboardQuery.data?.totalBudgetAmount ?? 0
  const totalExpense = dashboardQuery.data?.totalExpenseAmount ?? 0
  const remainingBudget = dashboardQuery.data?.remainingBudgetAmount ?? 0
  const usage = totalBudget ? Math.min(100, Math.round((totalExpense / totalBudget) * 100)) : 0
  const memberTotal = dashboardQuery.data?.memberSpending.reduce((sum, member) => sum + member.amount, 0) ?? 0
  const categoryItems = dashboardQuery.data?.categorySpending.filter((item) => item.amount > 0) ?? []
  const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0)
  const monthDates = dashboardQuery.data?.recentTransactions.map((transaction) => transaction.transactionDate) ?? []

  function handleCreateLedger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createLedgerMutation.mutate({ name: ledgerName }, { onSuccess: () => setLedgerName('') })
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1240px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-xs font-bold text-emerald-700">오늘의 우리로그</p><h1 className="mt-0.5 text-xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-2xl md:text-3xl">{meQuery.data?.user.nickname ?? '사용자'}님, 좋은 하루예요!</h1><p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{currentBudgetMonth.replace('-', '년 ')}월도 함께 알차게 기록하고 있어요.</p></div>
        <div className="flex items-center gap-2"><div className="flex min-h-11 w-[200px] items-center justify-between rounded-xl border border-slate-200 bg-white px-1 shadow-sm sm:min-h-12 sm:w-[220px]"><button aria-label="이전 달 보기" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" type="button"><ChevronLeft size={18} /></button><span className="text-sm font-extrabold text-slate-700 sm:text-base">{currentBudgetMonth.replace('-', '년 ')}월</span><button aria-label="다음 달 보기" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" type="button"><ChevronRight size={18} /></button></div><button aria-label="알림 보기" className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm sm:size-12" type="button"><Bell size={19} /></button><span aria-label={`${meQuery.data?.user.nickname ?? '사용자'} 프로필`} className="flex size-11 items-center justify-center rounded-full bg-[#ffe4d6] text-sm font-black text-rose-700 sm:size-12">{(meQuery.data?.user.nickname ?? '사').slice(0, 1)}</span></div>
      </header>

      {meQuery.isLoading || dashboardQuery.isLoading ? <p className="py-10 text-slate-500">대시보드를 불러오는 중입니다.</p> : null}
      {meQuery.isSuccess ? (
        <>
          <section className="mt-5 grid grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-12">
            <article className="relative overflow-hidden rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ffffff_0%,#f0fbf5_100%)] p-4 shadow-[0_16px_42px_rgba(30,74,52,0.08)] sm:p-5 lg:p-6 xl:col-span-8"><div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-100/55 blur-2xl" /><div className="relative grid gap-4 lg:grid-cols-[1fr_220px] lg:items-end"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold sm:text-lg lg:text-xl">{currentLedger?.name ?? '현재 장부'}</h2><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">사용 중</span></div><p className="mt-3 text-xs font-bold text-slate-500 sm:text-sm">이번 달 남은 예산</p><p className={`mt-1 break-all text-4xl font-black leading-tight tracking-[-0.045em] sm:text-[2.5rem] lg:text-[2.75rem] ${remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatWon(remainingBudget)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 sm:text-sm"><span>총 예산 <strong className="ml-1 text-slate-900">{formatWon(totalBudget)}</strong></span><span>사용 <strong className="ml-1 text-slate-900">{formatWon(totalExpense)}</strong></span></div><Progress value={usage} /><div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500 sm:text-xs"><span>{usage}% 사용했어요</span><span>{Math.max(100 - usage, 0)}% 남음</span></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"><button className="min-h-12 rounded-[14px] bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(14,159,110,0.18)] hover:bg-emerald-700" onClick={openTransactionEntry} type="button"><Plus className="mr-1 inline" size={18} />거래 추가</button>{currentLedger ? <Link className="flex min-h-12 items-center justify-center rounded-[14px] border border-emerald-200 bg-white/80 px-5 text-sm font-extrabold text-emerald-800 hover:bg-emerald-50" to={`/ledgers/${currentLedger.id}/months/${currentBudgetMonth}`}>예산 설정</Link> : null}</div></div></article>
            <article className="dashboard-card xl:col-span-4"><div className="dashboard-card-header"><div><p className="dashboard-eyebrow">SHARED</p><h2 className="dashboard-card-title">공동 사용 현황</h2></div><span className="text-xs font-bold text-slate-400">{dashboardQuery.data?.memberSpending.length ?? 0}명</span></div><div className="mt-5 space-y-3">{dashboardQuery.data?.memberSpending.length ? dashboardQuery.data.memberSpending.map((member, index) => { const share = memberTotal ? Math.round(member.amount / memberTotal * 100) : 0; return <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3" key={member.userId}><div className="flex items-center gap-3"><span className={`flex size-9 items-center justify-center rounded-full text-sm font-black text-white ${index % 2 ? 'bg-[#ff8a7a]' : 'bg-emerald-600'}`}>{member.nickname.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex justify-between text-sm font-extrabold"><span className="truncate">{member.nickname}</span><span>{share}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100"><div className={`h-full rounded-full ${index % 2 ? 'bg-[#ff8a7a]' : 'bg-emerald-600'}`} style={{ width: `${share}%` }} /></div></div></div></div> }) : <div className="dashboard-empty">구성원별 지출이 아직 없어요.</div>}</div></article>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.8fr_1fr]">
            <Card><div className="dashboard-card-header"><div><Kicker>RECENT TRANSACTIONS</Kicker><h2 className="dashboard-card-title">최근 거래</h2></div><Link className="dashboard-text-button" to="/calendar">전체 보기</Link></div>{dashboardQuery.data?.recentTransactions.length ? <ul className="mt-4 divide-y divide-slate-100">{dashboardQuery.data.recentTransactions.slice(0, 4).map((transaction) => <li key={transaction.id}><Link className="flex items-center gap-3 rounded-xl px-1 py-3 hover:bg-slate-50" to={`/transactions/${transaction.id}`}><CategoryBadge name={transaction.category?.name} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold">{transaction.memo || transaction.category?.name || '거래'}</strong><span className="mt-1 block truncate text-xs font-medium text-slate-400">{transaction.transactionDate.replaceAll('-', '.')} · {transaction.payer.nickname}</span></span><strong className={`shrink-0 text-sm font-black ${transaction.type === 'INCOME' ? 'text-blue-600' : 'text-slate-900'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatWon(transaction.amount)}</strong></Link></li>)}</ul> : <EmptyState title="최근 등록된 거래가 없어요." description="첫 거래를 기록하면 이곳에서 바로 확인할 수 있어요." />}</Card>
            <Card><Kicker>QUICK ENTRY</Kicker><h2 className="dashboard-card-title">빠른 기록</h2><div className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-2">{['커피', '식비', '마트', '교통'].map((label) => <button className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 px-1 text-[11px] font-extrabold text-emerald-800 lg:min-h-11 lg:flex-row lg:text-sm" key={label} onClick={openTransactionEntry} type="button"><CategoryBadge name={label} size="sm" />{label}</button>)}<button className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 text-[11px] font-extrabold text-emerald-700 lg:col-span-2 lg:min-h-10 lg:text-sm" onClick={openTransactionEntry} type="button"><Plus size={17} />더보기</button></div></Card>
            <Card className="bg-[linear-gradient(135deg,#ffffff,#effbf5)]"><div className="dashboard-card-header"><div><Kicker>SETTLEMENT</Kicker><h2 className="dashboard-card-title">정산 요약</h2></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">정산 완료</span></div><p className="mt-6 text-sm font-bold text-slate-500">현재 정산 예상 금액</p><p className="mt-2 text-3xl font-black tracking-[-0.04em] text-emerald-700">{formatWon(memberTotal > 0 ? Math.round(memberTotal / Math.max(1, dashboardQuery.data?.memberSpending.length ?? 1)) : 0)}</p>{currentLedger ? <Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 text-sm font-extrabold text-white" to={`/ledgers/${currentLedger.id}/months/${currentBudgetMonth}`}>정산 내역 보기</Link> : null}</Card>
          </section>

          <section className="mt-5 hidden gap-5 lg:grid lg:grid-cols-[1fr_1.05fr]">
            <Card className="p-6"><Kicker>Analytics</Kicker><h2 className="mt-2 text-xl font-bold">소비 분석</h2><div className="mt-5 flex items-center gap-8"><div className="relative size-32 rounded-full" style={{ background: categoryGradient(categoryItems, categoryTotal) }}><div className="absolute inset-8 rounded-full bg-white" /></div><div className="space-y-1 text-sm">{categoryItems.slice(0, 4).map((item) => <p key={item.categoryName}>{item.categoryName} {categoryTotal ? Math.round(item.amount / categoryTotal * 100) : 0}%</p>)}</div></div></Card>
            <Card className="p-6"><Kicker>Calendar</Kicker><h2 className="mt-2 text-xl font-bold">미니 캘린더</h2><div className="mt-4"><CalendarGrid budgetMonth={currentBudgetMonth} compact transactionDates={monthDates} /></div></Card>
          </section>

          <details className="mt-5 rounded-2xl border border-[var(--wl-color-border)] bg-white p-5"><summary className="cursor-pointer font-bold">장부 관리</summary><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="space-y-2">{ledgersQuery.data?.ledgers.map((ledger) => <button className="flex w-full justify-between rounded-xl border border-[var(--wl-color-border)] p-3 text-left disabled:bg-[var(--wl-color-primary-soft)]" disabled={ledger.id === ledgersQuery.data.currentLedgerId} key={ledger.id} onClick={() => switchLedgerMutation.mutate(ledger.id)} type="button"><span>{ledger.name}</span><span className="text-xs">{ledger.id === ledgersQuery.data.currentLedgerId ? '사용 중' : '전환'}</span></button>)}</div><form onSubmit={handleCreateLedger}><div className="grid grid-cols-2 gap-2">{(['PERSONAL', 'GROUP'] as const).map((type) => <button className={`h-10 rounded-xl border ${ledgerType === type ? 'border-[var(--wl-color-primary)] bg-[var(--wl-color-primary-soft)]' : 'border-[var(--wl-color-border)]'}`} key={type} onClick={() => setLedgerType(type)} type="button">{type === 'GROUP' ? '공동 장부' : '개인 장부'}</button>)}</div><input aria-label="장부 이름" className="mt-3 h-11 w-full border px-3" onChange={(event) => setLedgerName(event.target.value)} placeholder="새 장부 이름" required value={ledgerName} /><button className="mt-3 h-11 w-full rounded-xl bg-[var(--wl-color-primary)] font-bold text-white" type="submit"><WalletCards className="mr-1 inline" size={17} />장부 만들기</button></form></div></details>
        </>
      ) : null}
    </main>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <article className={`dashboard-card ${className}`}>{children}</article> }
function Kicker({ children }: { children: ReactNode }) { return <p className="dashboard-eyebrow">{children}</p> }
function Progress({ value }: { value: number }) { return <div aria-label={`예산 ${value}% 사용`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={value} className="mt-4 h-2 overflow-hidden rounded-full bg-[#d7f2e5] lg:h-3" role="progressbar"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0e9f6e,#51c993)] transition-[width] duration-500" style={{ width: `${value}%` }} /></div> }
function categoryGradient(items: Array<{ amount: number }>, total: number) { const colors = ['#10a376', '#2e64e8', '#ff7017', '#8255ef']; let cursor = 0; const stops = items.slice(0, 4).map((item, index) => { const start = cursor; cursor += total ? item.amount / total * 100 : 0; return `${colors[index]} ${start}% ${cursor}%` }); return stops.length ? `conic-gradient(${stops.join(',')})` : 'conic-gradient(#d7f2e5 0 100%)' }
