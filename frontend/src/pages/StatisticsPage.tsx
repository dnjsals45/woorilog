import { ArrowDownRight, ArrowUpRight, Lightbulb, PieChart } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useMonthlyStatisticsQuery } from '../features/budget/model/budgetQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CardHeading, EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const colors = ['#0e9f6e', '#5b8def', '#f97316', '#9b7bd8']
function monthOffset(offset: number) { const date = new Date(); date.setMonth(date.getMonth() + offset); return formatBudgetMonth(date) }

export function StatisticsPage() {
  const meQuery = useMeQuery()
  const [from, setFrom] = useState(monthOffset(-5))
  const [to, setTo] = useState(monthOffset(0))
  const statisticsQuery = useMonthlyStatisticsQuery(meQuery.data?.currentLedger.id, from, to)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate to="/login" replace />

  const categories = Array.from(
    (statisticsQuery.data ?? []).reduce((totals, statistic) => {
      statistic.categorySpending.forEach((item) => {
        const current = totals.get(item.categoryGroupId) ?? { ...item, amount: 0 }
        current.amount += item.amount
        totals.set(item.categoryGroupId, current)
      })
      return totals
    }, new Map<number, { categoryGroupId: number; categoryName: string; amount: number }>()),
  ).map(([, item]) => item).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4)
  const categoryTotal = categories.reduce((sum, item) => sum + item.amount, 0)
  const stats = statisticsQuery.data ?? []
  const currentExpense = stats.at(-1)?.expenseAmount ?? 0
  const previousExpense = stats.at(-2)?.expenseAmount ?? 0
  const expenseDifference = currentExpense - previousExpense
  const maxExpense = Math.max(1, ...stats.map((item) => item.expenseAmount))
  const points = stats.map((item, index) => `${10 + index * (80 / Math.max(1, stats.length - 1))},${84 - item.expenseAmount / maxExpense * 64}`).join(' ')
  const hasData = stats.some((item) => item.expenseAmount > 0) || categoryTotal > 0

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1200px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader eyebrow="ANALYTICS" title="통계" description="소비 흐름과 카테고리 비중을 한눈에 확인합니다." actions={<div className="grid grid-cols-2 gap-2"><MonthField label="시작 월" onChange={setFrom} value={from} /><MonthField label="종료 월" onChange={setTo} value={to} /></div>} />

      {statisticsQuery.isLoading ? <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="h-40 animate-pulse rounded-[18px] bg-slate-100" /><div className="h-40 animate-pulse rounded-[18px] bg-slate-100" /></div> : null}
      {statisticsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => statisticsQuery.refetch()} /></div> : null}
      {statisticsQuery.isSuccess ? (
        <>
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <SurfaceCard className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff,#effbf5)]">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-100/70 blur-2xl" />
              <div className="relative"><p className="dashboard-eyebrow">PERIOD EXPENSE</p><h2 className="mt-1 text-lg font-extrabold">선택 기간 총 지출</h2><p className="mt-5 text-4xl font-black tracking-[-0.05em] text-emerald-700">{formatWon(currentExpense)}</p><div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${expenseDifference > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-100 text-emerald-700'}`}>{expenseDifference > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}지난달 대비 {formatWon(Math.abs(expenseDifference))}</div></div>
            </SurfaceCard>
            <SurfaceCard className="bg-[linear-gradient(135deg,#ffffff,#fffaf3)]">
              <CardHeading eyebrow="INSIGHT" title="이번 달 소비 요약" trailing={<span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Lightbulb size={19} /></span>} />
              <p className="mt-5 text-lg font-extrabold leading-7 text-slate-900">{expenseDifference <= 0 ? `지난달보다 ${formatWon(Math.abs(expenseDifference))} 덜 썼어요.` : `지난달보다 ${formatWon(expenseDifference)} 더 썼어요.`}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{categories[0] ? `${categories[0].categoryName} 지출 비중이 가장 높습니다. 카테고리별 흐름을 확인해보세요.` : '거래를 기록하면 맞춤 소비 인사이트가 표시됩니다.'}</p>
            </SurfaceCard>
          </section>

          {hasData ? <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <SurfaceCard labelledBy="category-stat-title">
              <CardHeading eyebrow="CATEGORY" id="category-stat-title" title="카테고리별 지출 비율" />
              <div className="mt-6 grid items-center gap-7 sm:grid-cols-[220px_1fr] xl:grid-cols-1 2xl:grid-cols-[220px_1fr]">
                <div aria-label={`카테고리 지출 총액 ${formatWon(categoryTotal)}`} className="relative mx-auto size-52 rounded-full" role="img" style={{ background: categoryGradient(categories, categoryTotal) }}><div className="absolute inset-12 flex flex-col items-center justify-center rounded-full bg-white text-center"><span className="text-xs font-bold text-slate-400">총 지출</span><strong className="mt-1 text-lg font-black">{formatWon(categoryTotal)}</strong></div></div>
                <ul className="space-y-2">{categories.map((item, index) => { const share = categoryTotal ? Math.round(item.amount / categoryTotal * 100) : 0; return <li className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5" key={item.categoryName}><span className="size-3 rounded-full" style={{ background: colors[index] }} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{item.categoryName}</span><span className="text-xs font-bold text-slate-400">{share}%</span><strong className="text-sm font-black">{formatWon(item.amount)}</strong></li> })}</ul>
              </div>
              <table className="sr-only"><caption>카테고리별 지출 비율</caption><thead><tr><th>카테고리</th><th>비율</th><th>금액</th></tr></thead><tbody>{categories.map((item) => <tr key={item.categoryName}><td>{item.categoryName}</td><td>{categoryTotal ? Math.round(item.amount / categoryTotal * 100) : 0}%</td><td>{formatWon(item.amount)}</td></tr>)}</tbody></table>
            </SurfaceCard>

            <SurfaceCard labelledBy="monthly-trend-title">
              <CardHeading eyebrow="TREND" id="monthly-trend-title" title="월별 지출 추이" />
              <div className="mt-8"><svg aria-label="월별 지출 선 그래프" className="h-64 w-full" preserveAspectRatio="none" role="img" viewBox="0 0 100 100"><g stroke="#e5ede8" strokeWidth="0.5">{[20,40,60,80].map((y) => <line key={y} x1="8" x2="94" y1={y} y2={y} />)}</g><polyline fill="none" points={points || '10,84 90,84'} stroke="#0e9f6e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />{stats.map((item, index) => <circle cx={10 + index * (80 / Math.max(1, stats.length - 1))} cy={84 - item.expenseAmount / maxExpense * 64} fill="#0e9f6e" key={item.budgetMonth} r="1.8" />)}</svg><div className="mt-2 flex justify-between px-3 text-xs font-bold text-slate-400">{stats.map((item) => <span key={item.budgetMonth}>{Number(item.budgetMonth.slice(5))}월</span>)}</div></div>
              <table className="sr-only"><caption>월별 지출 추이</caption><thead><tr><th>월</th><th>지출</th></tr></thead><tbody>{stats.map((item) => <tr key={item.budgetMonth}><td>{item.budgetMonth}</td><td>{formatWon(item.expenseAmount)}</td></tr>)}</tbody></table>
            </SurfaceCard>
          </section> : <SurfaceCard className="mt-5"><EmptyState title="분석할 소비 데이터가 없습니다." description="지출 거래를 입력하면 카테고리 비율과 월별 추이가 자동으로 구성됩니다." /></SurfaceCard>}

          <section className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"><PieChart size={18} /></span><div><h2 className="text-base font-extrabold">소비 인사이트</h2><ul className="mt-2 space-y-1.5 text-sm font-medium leading-6 text-slate-600"><li>• 가장 큰 지출 카테고리는 <strong className="text-slate-900">{categories[0]?.categoryName ?? '아직 없음'}</strong>입니다.</li><li>• 월별 그래프에서 급격히 증가한 시점을 확인해 다음 달 예산에 반영해보세요.</li></ul></div></div></section>
        </>
      ) : null}
    </main>
  )
}

function MonthField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-[11px] font-bold text-slate-500">{label}<input className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold shadow-sm" onChange={(event) => onChange(event.target.value)} type="month" value={value} /></label> }
function categoryGradient(items: Array<{ amount: number }>, total: number) { let cursor = 0; const stops = items.map((item, index) => { const start = cursor; cursor += total ? item.amount / total * 100 : 0; return `${colors[index]} ${start}% ${cursor}%` }); return stops.length ? `conic-gradient(${stops.join(',')})` : 'conic-gradient(#d7f2e5 0 100%)' }
