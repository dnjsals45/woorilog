import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  LogOut,
  Plus,
  Settings,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../shared/api/client'
import { useLogoutMutation, useMeQuery } from '../features/auth/model/authQueries'
import {
  useCreateLedgerMutation,
  useLedgersQuery,
  useSwitchLedgerMutation,
} from '../features/ledger/model/ledgerQueries'
import type { LedgerType } from '../features/ledger/api/ledgerApi'
import { useDashboardSummaryQuery } from '../features/budget/model/budgetQueries'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

export function DashboardPage() {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const dashboardQuery = useDashboardSummaryQuery()
  const logoutMutation = useLogoutMutation()
  const switchLedgerMutation = useSwitchLedgerMutation()
  const [ledgerName, setLedgerName] = useState('')
  const [ledgerType, setLedgerType] = useState<LedgerType>('PERSONAL')
  const createLedgerMutation = useCreateLedgerMutation(ledgerType)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  function handleCreateLedger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    createLedgerMutation.mutate(
      { name: ledgerName },
      {
        onSuccess: () => setLedgerName(''),
      },
    )
  }

  const currentLedger =
    dashboardQuery.data?.currentLedger ??
    ledgersQuery.data?.ledgers.find(
      (ledger) => ledger.id === ledgersQuery.data?.currentLedgerId,
    ) ?? meQuery.data?.currentLedger
  const currentBudgetMonth = dashboardQuery.data?.budgetMonth ?? formatBudgetMonth()
  const monthlySummary = [
    {
      label: '이번 달 예산',
      value: formatWon(dashboardQuery.data?.totalBudgetAmount ?? 0),
    },
    {
      label: '사용 금액',
      value: formatWon(dashboardQuery.data?.totalExpenseAmount ?? 0),
    },
    {
      label: '남은 예산',
      value: formatWon(dashboardQuery.data?.remainingBudgetAmount ?? 0),
    },
  ]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            {currentLedger ? ledgerTypeLabel(currentLedger.type) : '장부 준비 중'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
            우리로그
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {meQuery.data?.user.nickname ?? '사용자'}님의 현재 장부를 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            type="button"
          >
            <ChartNoAxesCombined size={18} aria-hidden="true" />
            대시보드
          </button>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            to="/calendar"
          >
            <CalendarDays size={18} aria-hidden="true" />
            거래 장부
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            to="/stats"
          >
            <ChartNoAxesCombined size={18} aria-hidden="true" />
            통계
          </Link>
          {currentLedger ? (
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
              to={`/ledgers/${currentLedger.id}/months/${currentBudgetMonth}`}
            >
              <Landmark size={18} aria-hidden="true" />
              예산
            </Link>
          ) : null}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            to="/settings"
          >
            <Settings size={18} aria-hidden="true" />
            설정
          </Link>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            로그아웃
          </button>
        </div>
      </header>

      {meQuery.isLoading ? (
        <section className="py-10 text-slate-500">세션을 확인하는 중입니다.</section>
      ) : null}

      {meQuery.isError ? (
        <section className="py-10 text-red-700">세션 정보를 불러오지 못했습니다.</section>
      ) : null}

      {meQuery.isSuccess ? (
        <>
          <section className="grid gap-3 py-6 sm:grid-cols-3" aria-label="월 예산 요약">
            {monthlySummary.map((item) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={item.label}
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="grid flex-1 gap-4 pb-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-950">
                <CalendarDays size={20} aria-hidden="true" />
                <h2 className="text-lg font-semibold">최근 기록</h2>
              </div>
              {dashboardQuery.data?.recentTransactions.length ? (
                <div className="mt-5 divide-y divide-slate-100">
                  {dashboardQuery.data.recentTransactions.map((transaction) => (
                    <Link
                      className="flex items-center justify-between gap-4 py-3"
                      key={transaction.id}
                      to={`/transactions/${transaction.id}`}
                    >
                      <span>
                        <span className="block font-medium text-slate-950">
                          {transaction.memo || transaction.category?.name || '거래'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {transaction.transactionDate}
                        </span>
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatWon(transaction.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-slate-500">
                  아직 최근 거래가 없습니다.
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">카테고리별 지출</h2>
                <div className="mt-4 space-y-3">
                  {dashboardQuery.data?.categorySpending.length ? (
                    dashboardQuery.data.categorySpending.map((item) => (
                      <div className="flex items-center justify-between gap-3" key={item.categoryId ?? item.categoryName}>
                        <span className="text-sm text-slate-700">{item.categoryName}</span>
                        <span className="text-sm font-semibold text-slate-950">{formatWon(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">이번 달 지출이 없습니다.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">멤버별 사용 현황</h2>
                <div className="mt-4 space-y-3">
                  {dashboardQuery.data?.memberSpending.length ? (
                    dashboardQuery.data.memberSpending.map((item) => (
                      <div className="flex items-center justify-between gap-3" key={item.userId}>
                        <span className="text-sm text-slate-700">{item.nickname}</span>
                        <span className="text-sm font-semibold text-slate-950">{formatWon(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">표시할 멤버 사용 내역이 없습니다.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-950">
                  <CircleDollarSign size={20} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">장부 전환</h2>
                </div>

                <div className="mt-5 space-y-2">
                  {ledgersQuery.data?.ledgers.map((ledger) => (
                    <button
                      className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-left transition hover:border-emerald-600 disabled:border-emerald-700 disabled:bg-emerald-50"
                      disabled={ledger.id === ledgersQuery.data.currentLedgerId}
                      key={ledger.id}
                      onClick={() => switchLedgerMutation.mutate(ledger.id)}
                      type="button"
                    >
                      <span>
                        <span className="block font-medium text-slate-950">{ledger.name}</span>
                        <span className="text-sm text-slate-500">
                          {ledgerTypeLabel(ledger.type)} · owner #{ledger.ownerId}
                        </span>
                      </span>
                      {ledger.id === ledgersQuery.data.currentLedgerId ? (
                        <span className="text-sm font-medium text-emerald-700">사용 중</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </section>

              <form
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                onSubmit={handleCreateLedger}
              >
                <h2 className="text-lg font-semibold text-slate-950">장부 추가</h2>
                <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="장부 종류">
                  {(['PERSONAL', 'GROUP'] as const).map((type) => (
                    <button
                      className="h-10 rounded-md border border-slate-300 text-sm font-medium text-slate-700 transition data-[selected=true]:border-emerald-700 data-[selected=true]:bg-emerald-50 data-[selected=true]:text-emerald-800"
                      data-selected={ledgerType === type}
                      key={type}
                      onClick={() => setLedgerType(type)}
                      type="button"
                    >
                      {ledgerTypeLabel(type)}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  장부 이름
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    value={ledgerName}
                    onChange={(event) => setLedgerName(event.target.value)}
                    placeholder="예: 생활비 장부"
                    required
                  />
                </label>
                <button
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={createLedgerMutation.isPending}
                  type="submit"
                >
                  <Plus size={18} aria-hidden="true" />
                  장부 만들기
                </button>
              </form>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  )
}

function ledgerTypeLabel(type: LedgerType) {
  return type === 'GROUP' ? '공동 장부' : '개인 장부'
}
