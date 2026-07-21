import { ChevronLeft, ChevronRight, Plus, ScanText, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useBulkDeleteTransactionsMutation, useDeleteTransactionMutation, useMonthTransactionsQuery } from '../features/transaction/model/transactionQueries'
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
  const deleteMutation = useDeleteTransactionMutation()
  const bulkDeleteMutation = useBulkDeleteTransactionsMutation()
  const transactions = useMemo(() => transactionsQuery.data?.transactions ?? [], [transactionsQuery.data?.transactions])
  const transactionDates = useMemo(() => [...new Set(transactions.map((item) => item.transactionDate))], [transactions])
  const [deleteError, setDeleteError] = useState<{ transactionId: number; message: string } | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(() => new Set())
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

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
  const selectableTransactions = visibleTransactions.filter((transaction) => transaction.payer.id === meQuery.data?.user.id)
  const allVisibleSelected = selectableTransactions.length > 0 && selectableTransactions.every((transaction) => selectedTransactionIds.has(transaction.id))

  function clearSelectedTransactions() {
    setSelectedTransactionIds(new Set())
    setBulkDeleteError(null)
  }

  function moveMonth(offset: number) {
    const [year, month] = budgetMonth.split('-').map(Number)
    const next = new Date(year, month - 1 + offset, 1)
    setBudgetMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
    setSelectedDate(null)
    clearSelectedTransactions()
  }

  function toggleTransactionSelection(transactionId: number) {
    if (!selectedTransactionIds.has(transactionId) && selectedTransactionIds.size >= 100) {
      setBulkDeleteError('거래는 한 번에 최대 100건까지 삭제할 수 있습니다.')
      return
    }
    setBulkDeleteError(null)
    setSelectedTransactionIds((current) => {
      const next = new Set(current)
      if (next.has(transactionId)) next.delete(transactionId)
      else next.add(transactionId)
      return next
    })
  }

  function toggleAllVisibleTransactions() {
    const unselectedTransactions = selectableTransactions.filter((transaction) => !selectedTransactionIds.has(transaction.id))
    if (!allVisibleSelected && selectedTransactionIds.size + unselectedTransactions.length > 100) {
      setBulkDeleteError('거래는 한 번에 최대 100건까지 선택할 수 있습니다.')
    } else {
      setBulkDeleteError(null)
    }
    setSelectedTransactionIds((current) => {
      const next = new Set(current)
      const selectionTargets = allVisibleSelected
        ? selectableTransactions
        : unselectedTransactions.slice(0, 100 - current.size)
      selectionTargets.forEach((transaction) => {
        if (allVisibleSelected) next.delete(transaction.id)
        else next.add(transaction.id)
      })
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    clearSelectedTransactions()
  }

  function deleteSelectedTransactions() {
    const transactionIds = [...selectedTransactionIds]
    if (!transactionIds.length) return
    if (!window.confirm(`${transactionIds.length}건의 거래를 삭제할까요?\n삭제한 거래는 복구할 수 없습니다.`)) return

    setBulkDeleteError(null)
    bulkDeleteMutation.mutate(transactionIds, {
      onSuccess: exitSelectionMode,
      onError: (error) => setBulkDeleteError(
        error instanceof ApiClientError ? error.message : '선택한 거래를 삭제하지 못했습니다. 다시 시도해주세요.',
      ),
    })
  }

  function deleteTransactionFromList(transactionId: number) {
    if (!window.confirm('이 거래를 삭제할까요?\n삭제한 거래는 복구할 수 없습니다.')) return

    setDeleteError(null)
    deleteMutation.mutate(transactionId, {
      onError: (error) => setDeleteError({
        transactionId,
        message: error instanceof ApiClientError ? error.message : '거래를 삭제하지 못했습니다. 다시 시도해주세요.',
      }),
    })
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
        actions={<div className="flex gap-2"><button aria-label="거래 검색" className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm" onClick={() => setSearchOpen((value) => !value)} type="button"><Search size={19} /></button><button aria-expanded={filterOpen} aria-label="거래 필터" className={`flex size-11 items-center justify-center rounded-xl border bg-white shadow-sm ${typeFilter === 'ALL' ? 'border-slate-200 text-slate-600' : 'border-emerald-300 text-emerald-700'}`} onClick={() => setFilterOpen((value) => !value)} type="button"><SlidersHorizontal size={19} /></button><Link aria-label="거래 가져오기" className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm" to="/imports"><ScanText size={19} /></Link><button className="hidden min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(14,159,110,0.18)] lg:flex" onClick={() => openTransactionEntry({ transactionDate: selectedDate ?? undefined })} type="button"><Plus size={18} />거래 추가</button></div>}
      />

      {searchOpen ? <label className="mt-4 block"><span className="sr-only">거래 검색어</span><div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm"><Search className="text-slate-400" size={18} /><input autoFocus className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" onChange={(event) => { setSearchText(event.target.value); clearSelectedTransactions() }} placeholder="내역, 카테고리, 결제자 검색" value={searchText} /></div></label> : null}
      {filterOpen ? <div aria-label="거래 유형 필터" className="mt-3 flex gap-2" role="group">{([['ALL', '전체'], ['EXPENSE', '지출'], ['INCOME', '수입']] as const).map(([value, label]) => <button aria-pressed={typeFilter === value} className={`min-h-10 rounded-xl px-4 text-sm font-bold ${typeFilter === value ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`} key={value} onClick={() => { setTypeFilter(value); clearSelectedTransactions() }} type="button">{label}</button>)}</div> : null}
      {transactionsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => transactionsQuery.refetch()} /></div> : null}

      <section className="mt-5 hidden grid-cols-3 gap-5 lg:grid"><Summary label="총 수입" value={totalIncome} color="text-blue-600" /><Summary label="총 지출" value={totalExpense} color="text-orange-500" /><Summary label="잔액" value={totalIncome - totalExpense} color="text-emerald-700" /></section>

      {!transactionsQuery.isError ? <section className="mt-5 grid gap-5 xl:grid-cols-[390px_1fr]">
        <SurfaceCard className="h-fit">
          <div className="flex items-center justify-between"><button aria-label="이전 달" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => moveMonth(-1)} type="button"><ChevronLeft size={20} /></button><label><span className="sr-only">조회 월</span><input className="w-40 border-0 bg-transparent text-center text-base font-extrabold outline-none" onChange={(event) => { setBudgetMonth(event.target.value); setSelectedDate(null); clearSelectedTransactions() }} type="month" value={budgetMonth} /></label><button aria-label="다음 달" className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => moveMonth(1)} type="button"><ChevronRight size={20} /></button></div>
          <div className="mt-5"><CalendarGrid budgetMonth={budgetMonth} onSelectDate={(date) => { setSelectedDate((current) => current === date ? null : date); clearSelectedTransactions() }} selectedDate={selectedDate} transactionDates={transactionDates} /></div>
          {selectedDate ? <button className="mt-4 w-full text-center text-xs font-bold text-emerald-700" onClick={() => { setSelectedDate(null); clearSelectedTransactions() }} type="button">선택 해제하고 월 전체 보기</button> : null}
        </SurfaceCard>

        <SurfaceCard labelledBy="transaction-list-title">
          <CardHeading eyebrow="TIMELINE" id="transaction-list-title" title={selectedTitle} trailing={<div className="flex items-center gap-3"><div className="text-right"><p className="text-xs font-bold text-slate-400">{visibleTransactions.length}건</p><p className="mt-1 text-sm font-black text-slate-800">{formatWon(selectedExpense)}</p></div>{!selectionMode ? <button className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-extrabold text-slate-600" onClick={() => { setSelectionMode(true); clearSelectedTransactions() }} type="button">선택</button> : null}</div>} />
          {selectionMode ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"><button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 disabled:text-slate-300" disabled={!selectableTransactions.length || bulkDeleteMutation.isPending} onClick={toggleAllVisibleTransactions} type="button">{selectedDate ? '이날 전체 선택' : '현재 목록 전체 선택'}</button><span aria-live="polite" className="mr-auto text-sm font-bold text-slate-600">{selectedTransactionIds.size}건 선택</span><button className="min-h-10 rounded-lg bg-red-600 px-3 text-sm font-extrabold text-white disabled:bg-red-200" disabled={!selectedTransactionIds.size || bulkDeleteMutation.isPending} onClick={deleteSelectedTransactions} type="button">{selectedTransactionIds.size}건 삭제</button><button className="min-h-10 rounded-lg px-3 text-sm font-extrabold text-slate-500" disabled={bulkDeleteMutation.isPending} onClick={exitSelectionMode} type="button">취소</button></div> : null}
          {bulkDeleteError ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{bulkDeleteError}</p> : null}
          {transactionsQuery.isLoading ? <div className="mt-5 space-y-3">{[1,2,3].map((item) => <div className="h-16 animate-pulse rounded-2xl bg-slate-100" key={item} />)}</div> : null}
          {!transactionsQuery.isLoading && visibleTransactions.length ? <ul className="mt-4 divide-y divide-slate-100">{visibleTransactions.map((transaction) => {
            const canDelete = transaction.payer.id === meQuery.data?.user.id
            const transactionName = transaction.memo || transaction.category?.name || '거래 내역'

            return <li key={transaction.id}>
              <div className="flex items-center gap-1">
                {selectionMode && canDelete ? <label className="flex size-10 shrink-0 items-center justify-center"><span className="sr-only">{transactionName} 거래 선택</span><input aria-label={`${transactionName} 거래 선택`} checked={selectedTransactionIds.has(transaction.id)} className="size-5 accent-emerald-600" disabled={bulkDeleteMutation.isPending} onChange={() => toggleTransactionSelection(transaction.id)} type="checkbox" /></label> : null}
                <Link aria-label={selectionMode ? `${transactionName} ${canDelete ? '선택 전환' : '선택 불가'}` : undefined} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-3 text-left transition hover:bg-slate-50 sm:gap-4" onClick={(event) => { if (selectionMode) { event.preventDefault(); if (canDelete) toggleTransactionSelection(transaction.id) } }} to={`/transactions/${transaction.id}`}>
                  <CategoryBadge name={transaction.category?.name} />
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-slate-900 sm:text-base">{transactionName}</strong><span className="mt-1 block truncate text-xs font-medium text-slate-400">{transaction.transactionDate.replaceAll('-', '.')} · {transaction.payer.nickname} · {transaction.category?.name ?? '미분류'}</span></span>
                  <strong className={`shrink-0 text-sm font-black sm:text-base ${transaction.type === 'INCOME' ? 'text-blue-600' : 'text-slate-900'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatWon(transaction.amount)}</strong>
                </Link>
                {selectionMode && !canDelete ? <span className="max-w-20 shrink-0 text-right text-[11px] font-bold leading-4 text-slate-400">결제자만<br />삭제 가능</span> : null}
                {!selectionMode && canDelete ? <button aria-label={`${transactionName} 거래 삭제`} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300" disabled={deleteMutation.isPending} onClick={() => deleteTransactionFromList(transaction.id)} type="button"><Trash2 aria-hidden="true" size={18} /></button> : null}
              </div>
              {deleteError?.transactionId === transaction.id ? <p className="pb-3 pl-1 text-xs font-bold text-red-600" role="alert">{deleteError.message}</p> : null}
            </li>
          })}</ul> : null}
          {!transactionsQuery.isLoading && !visibleTransactions.length ? <EmptyState title={selectedDate ? '이날의 거래 기록이 없습니다.' : '이번 달 거래가 없습니다.'} description="하단의 + 버튼을 눌러 첫 거래를 입력해보세요." /> : null}
          <button className="mt-5 min-h-12 w-full rounded-xl bg-emerald-600 text-sm font-extrabold text-white xl:hidden" onClick={() => openTransactionEntry({ transactionDate: selectedDate ?? undefined })} type="button"><Plus className="mr-1 inline" size={18} />거래 추가</button>
        </SurfaceCard>
      </section> : null}
    </main>
  )
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return <SurfaceCard><p className="dashboard-eyebrow">MONTH TOTAL</p><p className="mt-1 text-sm font-bold text-slate-500">{label}</p><p className={`mt-3 text-3xl font-black tracking-[-0.04em] ${color}`}>{formatWon(value)}</p></SurfaceCard>
}
