import { ChevronLeft, ChevronRight, Plus, ScanText, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useMonthTransactionsQuery } from '../features/transaction/model/transactionQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth, formatDateInput } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CalendarGrid } from '../shared/ui/CalendarGrid'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { CardHeading, EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'
import { useTransactionEntry } from '../shared/ui/TransactionEntryContext'

export function LedgerPage() {
  const meQuery = useMeQuery()
  const { openTransactionEntry } = useTransactionEntry()
  const [budgetMonth, setBudgetMonth] = useState(formatBudgetMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(formatDateInput())
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL')
  const ledgerId = meQuery.data?.currentLedger.id
  const transactionsQuery = useMonthTransactionsQuery(ledgerId, budgetMonth)
  const transactions = useMemo(() => transactionsQuery.data?.transactions ?? [], [transactionsQuery.data?.transactions])
  const transactionDates = useMemo(() => [...new Set(transactions.map((item) => item.transactionDate))], [transactions])

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate to="/login" replace />

  const visibleTransactions = transactions.filter((transaction) => {
    const matchesDate = selectedDate ? transaction.transactionDate === selectedDate : true
    const searchTarget = `${transaction.memo ?? ''} ${transaction.category?.name ?? ''} ${transaction.payer.nickname}`.toLowerCase()
    const matchesType = typeFilter === 'ALL' || transaction.type === typeFilter
    return matchesDate && matchesType && searchTarget.includes(searchText.trim().toLowerCase())
  })
  const totalIncome = transactions.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = transactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0)
  const selectedExpense = visibleTransactions.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0)

  function moveMonth(offset: number) {
    const [year, month] = budgetMonth.split('-').map(Number)
    const next = new Date(year, month - 1 + offset, 1)
    setBudgetMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
    setSelectedDate(null)
  }

  const selectedTitle = selectedDate
    ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일 거래`
    : `${budgetMonth.replace('-', '년 ')}월 전체 거래`

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1240px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader
        eyebrow="LEDGER"
        title="가계부"
        description="오늘 바로 입력하고 날짜별 지출과 수입을 확인합니다."
        actions={<div className="flex gap-2"><button aria-label="거래 검색" className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm" onClick={() => setSearchOpen((value) => !value)} type="button"><Search size={19} /></button><button aria-expanded={filterOpen} aria-label="거래 필터" className={`flex size-11 items-center justify-center rounded-xl border bg-white shadow-sm ${typeFilter === 'ALL' ? 'border-slate-200 text-slate-600' : 'border-emerald-300 text-emerald-700'}`} onClick={() => setFilterOpen((value) => !value)} type="button"><SlidersHorizontal size={19} /></button><Link aria-label="거래 가져오기" className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm" to="/imports"><ScanText size={19} /></Link><button className="hidden min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(14,159,110,0.18)] lg:flex" onClick={() => openTransactionEntry()} type="button"><Plus size={18} />거래 추가</button></div>}
      />

      {searchOpen ? <label className="mt-4 block"><span className="sr-only">거래 검색어</span><div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm"><Search className="text-slate-400" size={18} /><input autoFocus className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" onChange={(event) => setSearchText(event.target.value)} placeholder="내역, 카테고리, 결제자 검색" value={searchText} /></div></label> : null}
      {filterOpen ? <div aria-label="거래 유형 필터" className="mt-3 flex gap-2" role="group">{([['ALL', '전체'], ['EXPENSE', '지출'], ['INCOME', '수입']] as const).map(([value, label]) => <button aria-pressed={typeFilter === value} className={`min-h-10 rounded-xl px-4 text-sm font-bold ${typeFilter === value ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`} key={value} onClick={() => setTypeFilter(value)} type="button">{label}</button>)}</div> : null}
      {transactionsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => transactionsQuery.refetch()} /></div> : null}

      <section className="mt-5 hidden grid-cols-3 gap-5 lg:grid"><Summary label="총 수입" value={totalIncome} color="text-blue-600" /><Summary label="총 지출" value={totalExpense} color="text-orange-500" /><Summary label="잔액" value={totalIncome - totalExpense} color="text-emerald-700" /></section>

      {!transactionsQuery.isError ? <section className="mt-5 grid gap-5 xl:grid-cols-[390px_1fr]">
        <SurfaceCard className="h-fit">
          <div className="flex items-center justify-between"><button aria-label="이전 달" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => moveMonth(-1)} type="button"><ChevronLeft size={20} /></button><label><span className="sr-only">조회 월</span><input className="w-40 border-0 bg-transparent text-center text-base font-extrabold outline-none" onChange={(event) => { setBudgetMonth(event.target.value); setSelectedDate(null) }} type="month" value={budgetMonth} /></label><button aria-label="다음 달" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => moveMonth(1)} type="button"><ChevronRight size={20} /></button></div>
          <div className="mt-5"><CalendarGrid budgetMonth={budgetMonth} onSelectDate={(date) => setSelectedDate((current) => current === date ? null : date)} selectedDate={selectedDate} transactionDates={transactionDates} /></div>
          {selectedDate ? <button className="mt-4 w-full text-center text-xs font-bold text-emerald-700" onClick={() => setSelectedDate(null)} type="button">선택 해제하고 월 전체 보기</button> : null}
        </SurfaceCard>

        <SurfaceCard labelledBy="transaction-list-title">
          <CardHeading eyebrow="TIMELINE" id="transaction-list-title" title={selectedTitle} trailing={<div className="text-right"><p className="text-xs font-bold text-slate-400">{visibleTransactions.length}건</p><p className="mt-1 text-sm font-black text-slate-800">{formatWon(selectedExpense)}</p></div>} />
          {transactionsQuery.isLoading ? <div className="mt-5 space-y-3">{[1,2,3].map((item) => <div className="h-16 animate-pulse rounded-2xl bg-slate-100" key={item} />)}</div> : null}
          {!transactionsQuery.isLoading && visibleTransactions.length ? <ul className="mt-4 divide-y divide-slate-100">{visibleTransactions.map((transaction) => <li key={transaction.id}><Link className="flex items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-slate-50 sm:gap-4" to={`/transactions/${transaction.id}`}><CategoryBadge name={transaction.category?.name} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-slate-900 sm:text-base">{transaction.memo || transaction.category?.name || '거래 내역'}</strong><span className="mt-1 block truncate text-xs font-medium text-slate-400">{transaction.transactionDate.replaceAll('-', '.')} · {transaction.payer.nickname} · {transaction.category?.name ?? '미분류'}</span></span><strong className={`shrink-0 text-sm font-black sm:text-base ${transaction.type === 'INCOME' ? 'text-blue-600' : 'text-slate-900'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatWon(transaction.amount)}</strong></Link></li>)}</ul> : null}
          {!transactionsQuery.isLoading && !visibleTransactions.length ? <EmptyState title={selectedDate ? '이날의 거래 기록이 없습니다.' : '이번 달 거래가 없습니다.'} description="하단의 + 버튼을 눌러 첫 거래를 입력해보세요." /> : null}
          <button className="mt-5 min-h-12 w-full rounded-xl bg-emerald-600 text-sm font-extrabold text-white xl:hidden" onClick={() => openTransactionEntry()} type="button"><Plus className="mr-1 inline" size={18} />거래 추가</button>
        </SurfaceCard>
      </section> : null}
    </main>
  )
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return <SurfaceCard><p className="dashboard-eyebrow">MONTH TOTAL</p><p className="mt-1 text-sm font-bold text-slate-500">{label}</p><p className={`mt-3 text-3xl font-black tracking-[-0.04em] ${color}`}>{formatWon(value)}</p></SurfaceCard>
}
