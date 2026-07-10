import { BarChart3 } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useMonthlyStatisticsQuery } from '../features/budget/model/budgetQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

function monthOffset(offset: number) {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  return formatBudgetMonth(date)
}

export function StatisticsPage() {
  const meQuery = useMeQuery()
  const [from, setFrom] = useState(monthOffset(-5))
  const [to, setTo] = useState(monthOffset(0))
  const ledgerId = meQuery.data?.currentLedger.id
  const statisticsQuery = useMonthlyStatisticsQuery(ledgerId, from, to)
  const maximum = Math.max(
    1,
    ...(statisticsQuery.data?.flatMap((item) => [item.totalBudgetAmount, item.expenseAmount, item.incomeAmount]) ?? [0]),
  )

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-medium text-emerald-700" to="/dashboard">
            대시보드로 돌아가기
          </Link>
          <div className="mt-2 flex items-center gap-2 text-slate-950">
            <BarChart3 size={26} aria-hidden="true" />
            <h1 className="text-3xl font-semibold">월별 통계</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {meQuery.data?.currentLedger.name ?? '현재 장부'}의 예산, 지출, 수입을 비교합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="text-sm text-slate-700">
            시작 월
            <input
              className="mt-1 block h-10 rounded-md border border-slate-300 px-3 text-slate-950"
              onChange={(event) => setFrom(event.target.value)}
              type="month"
              value={from}
            />
          </label>
          <label className="text-sm text-slate-700">
            종료 월
            <input
              className="mt-1 block h-10 rounded-md border border-slate-300 px-3 text-slate-950"
              onChange={(event) => setTo(event.target.value)}
              type="month"
              value={to}
            />
          </label>
        </div>
      </header>

      {statisticsQuery.isLoading ? <p className="py-8 text-slate-500">통계를 불러오는 중입니다.</p> : null}
      {statisticsQuery.isError ? <p className="py-8 text-red-700">통계를 불러오지 못했습니다.</p> : null}

      {statisticsQuery.data ? (
        <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">월</th>
                <th className="px-4 py-3 font-medium">예산</th>
                <th className="px-4 py-3 font-medium">지출</th>
                <th className="px-4 py-3 font-medium">수입</th>
                <th className="px-4 py-3 font-medium">지출 비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statisticsQuery.data.map((item) => (
                <tr key={item.budgetMonth}>
                  <td className="px-4 py-4 font-medium text-slate-950">{item.budgetMonth}</td>
                  <td className="px-4 py-4 text-slate-700">{formatWon(item.totalBudgetAmount)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatWon(item.expenseAmount)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatWon(item.incomeAmount)}</td>
                  <td className="min-w-52 px-4 py-4">
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.round((item.expenseAmount / maximum) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  )
}
