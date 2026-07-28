import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
} from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useMonthlyStatisticsQuery } from '../features/budget/model/budgetQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useMonthTransactionsQuery } from '../features/transaction/model/transactionQueries'
import type { TransactionSummary } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import {
  CardHeading,
  EmptyState,
  ErrorState,
  PageHeader,
  SurfaceCard,
} from '../shared/ui/DesignPrimitives'

const colors = ['#16805d', '#5275e8', '#e66f70', '#e99a2c', '#8a6edb']

type CategoryItem = {
  categoryGroupId: number
  categoryName: string
  amount: number
}

type TrendPoint = {
  x: number
  y: number
}

export function StatisticsPage() {
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [selectedMonth, setSelectedMonth] = useState(formatBudgetMonth())
  const [period, setPeriod] = useState<6 | 12>(6)
  const [pinnedTrendIndex, setPinnedTrendIndex] = useState<number | null>(null)
  const [previewTrendIndex, setPreviewTrendIndex] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [previewCategoryId, setPreviewCategoryId] = useState<number | null>(null)
  const from = shiftMonth(selectedMonth, -(period - 1))
  const statisticsQuery = useMonthlyStatisticsQuery(ledgerId, from, selectedMonth)
  const transactionsQuery = useMonthTransactionsQuery(ledgerId, selectedMonth)
  const categoriesQuery = useCategoriesQuery(ledgerId)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  const stats = statisticsQuery.data ?? []
  const currentStatistic = stats.find((item) => item.budgetMonth === selectedMonth) ?? stats.at(-1)
  const previousStatistic = stats.at(-2)
  const currentExpense = currentStatistic?.expenseAmount ?? 0
  const currentIncome = currentStatistic?.incomeAmount ?? 0
  const currentBudget = currentStatistic?.totalBudgetAmount ?? 0
  const expenseDifference = currentExpense - (previousStatistic?.expenseAmount ?? 0)
  const dailyAverage = Math.round(currentExpense / daysInMonth(selectedMonth))
  const budgetUsage = currentBudget ? Math.round(currentExpense / currentBudget * 100) : 0
  const categories = (currentStatistic?.categorySpending ?? [])
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  const categoryTotal = categories.reduce((sum, item) => sum + item.amount, 0)
  const activeCategoryId = previewCategoryId ?? selectedCategoryId
  const activeCategory = categories.find((item) => item.categoryGroupId === activeCategoryId)
  const activeTrendIndex = previewTrendIndex ?? pinnedTrendIndex
  const activeTrend = activeTrendIndex === null ? undefined : stats[activeTrendIndex]
  const hasData = currentExpense > 0 || categoryTotal > 0
  const selectedTransactions = selectCategoryTransactions(
    transactionsQuery.data?.transactions ?? [],
    categoriesQuery.data ?? [],
    selectedCategoryId,
  )

  function moveMonth(offset: number) {
    setSelectedMonth((current) => shiftMonth(current, offset))
    setSelectedCategoryId(null)
    setPreviewCategoryId(null)
    setPinnedTrendIndex(null)
    setPreviewTrendIndex(null)
  }

  function toggleCategory(categoryId: number) {
    setSelectedCategoryId((current) => current === categoryId ? null : categoryId)
  }

  return (
    <main className="product-page product-page--wide">
      <PageHeader
        eyebrow="ANALYTICS"
        title="소비 분석"
        description="월별 소비 흐름과 카테고리 변화를 확인합니다."
        actions={(
          <div className="flex items-center rounded-xl border border-[var(--wl-color-border)] bg-white p-1 shadow-sm">
            <button
              aria-label="이전 달 분석"
              className="flex size-10 items-center justify-center rounded-lg text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-brand-50)]"
              onClick={() => moveMonth(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={19} />
            </button>
            <span className="min-w-28 px-2 text-center text-sm font-bold">{monthLabel(selectedMonth)}</span>
            <button
              aria-label="다음 달 분석"
              className="flex size-10 items-center justify-center rounded-lg text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-brand-50)]"
              onClick={() => moveMonth(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={19} />
            </button>
          </div>
        )}
      />

      {statisticsQuery.isLoading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div className="h-28 animate-pulse rounded-[18px] bg-slate-100" key={item} />)}
        </div>
      ) : null}
      {statisticsQuery.isError ? (
        <div className="mt-5"><ErrorState onRetry={() => statisticsQuery.refetch()} /></div>
      ) : null}

      {statisticsQuery.isSuccess ? (
        <>
          <section aria-label={`${monthLabel(selectedMonth)} 소비 요약`} className="mt-5 grid gap-px overflow-hidden rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-border)] sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="총 지출" value={formatWon(currentExpense)} />
            <Metric label="총 수입" value={formatWon(currentIncome)} accent="blue" />
            <Metric label="하루 평균" value={formatWon(dailyAverage)} />
            <Metric label="예산 사용률" value={currentBudget ? `${budgetUsage}%` : '미설정'} accent={budgetUsage > 100 ? 'danger' : 'brand'} />
          </section>

          {hasData ? (
            <>
              <SurfaceCard className="mt-5" labelledBy="monthly-trend-title">
                <CardHeading
                  eyebrow="TREND"
                  id="monthly-trend-title"
                  title="월별 소비 흐름"
                  trailing={(
                    <div aria-label="소비 흐름 기간" className="flex rounded-lg bg-[var(--wl-color-surface-subtle)] p-1" role="group">
                      {([6, 12] as const).map((candidate) => (
                        <button
                          aria-pressed={period === candidate}
                          className={`min-h-9 rounded-md px-3 text-xs font-bold ${period === candidate ? 'bg-white text-[var(--wl-color-primary-dark)] shadow-sm' : 'text-[var(--wl-color-text-secondary)]'}`}
                          key={candidate}
                          onClick={() => {
                            setPeriod(candidate)
                            setPinnedTrendIndex(null)
                            setPreviewTrendIndex(null)
                          }}
                          type="button"
                        >
                          {candidate}개월
                        </button>
                      ))}
                    </div>
                  )}
                />
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--wl-color-text-secondary)]">
                    {monthLabel(from)}–{monthLabel(selectedMonth)}
                  </p>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                      {activeTrend ? `${monthLabel(activeTrend.budgetMonth)} 지출` : '기간 월평균'}
                    </p>
                    <strong className="mt-1 block text-lg font-bold">
                      {formatWon(activeTrend?.expenseAmount ?? averageExpense(stats))}
                    </strong>
                  </div>
                </div>
                <TrendChart
                  activeIndex={activeTrendIndex}
                  onPin={setPinnedTrendIndex}
                  onPreview={setPreviewTrendIndex}
                  statistics={stats}
                />
                <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${expenseDifference > 0 ? 'bg-[var(--wl-data-coral-soft)] text-[var(--wl-data-coral)]' : 'bg-[var(--wl-brand-100)] text-[var(--wl-color-primary-dark)]'}`}>
                  {expenseDifference > 0 ? <ArrowUpRight aria-hidden="true" size={14} /> : <ArrowDownRight aria-hidden="true" size={14} />}
                  지난달 대비 {formatWon(Math.abs(expenseDifference))}
                </div>
              </SurfaceCard>

              <section className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
                <SurfaceCard labelledBy="category-distribution-title">
                  <CardHeading eyebrow="CATEGORY" id="category-distribution-title" title="카테고리 분포" />
                  <div className="mt-6 grid items-center gap-6 sm:grid-cols-[220px_1fr] xl:grid-cols-1">
                    <CategoryDonut
                      activeCategoryId={activeCategoryId}
                      categories={categories}
                      onPreview={setPreviewCategoryId}
                      onSelect={toggleCategory}
                      total={categoryTotal}
                    />
                    <ul className="space-y-1">
                      {categories.map((item, index) => {
                        const share = categoryTotal ? Math.round(item.amount / categoryTotal * 100) : 0
                        const active = item.categoryGroupId === activeCategoryId
                        const subdued = activeCategoryId !== null && !active
                        return (
                          <li key={item.categoryGroupId}>
                            <button
                              aria-pressed={selectedCategoryId === item.categoryGroupId}
                              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-[background-color,opacity] ${active ? 'bg-[var(--wl-color-surface-subtle)]' : 'hover:bg-[var(--wl-color-surface-subtle)]'} ${subdued ? 'opacity-45' : 'opacity-100'}`}
                              onBlur={() => setPreviewCategoryId(null)}
                              onClick={() => toggleCategory(item.categoryGroupId)}
                              onFocus={() => setPreviewCategoryId(item.categoryGroupId)}
                              onMouseEnter={() => setPreviewCategoryId(item.categoryGroupId)}
                              onMouseLeave={() => setPreviewCategoryId(null)}
                              type="button"
                            >
                              <span className="size-3 rounded-full" style={{ background: colors[index] }} />
                              <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.categoryName}</span>
                              <span className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">{share}%</span>
                              <strong className="text-sm">{formatWon(item.amount)}</strong>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </SurfaceCard>

                <SurfaceCard labelledBy="category-detail-title">
                  <CardHeading eyebrow="DETAIL" id="category-detail-title" title="카테고리 상세" />
                  <p className="mt-2 text-sm font-medium text-[var(--wl-color-text-secondary)]">
                    비율을 선택하면 {monthLabel(selectedMonth)} 거래를 확인할 수 있습니다.
                  </p>
                  <CategoryStack
                    activeCategoryId={activeCategoryId}
                    categories={categories}
                    onPreview={setPreviewCategoryId}
                    onSelect={toggleCategory}
                    total={categoryTotal}
                  />

                  <div aria-live="polite" className="mt-6 border-t border-[var(--wl-color-border)] pt-5">
                    {selectedCategoryId === null ? (
                      <div className="flex min-h-36 flex-col items-center justify-center text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--wl-color-surface-subtle)] text-[var(--wl-color-primary-dark)]">
                          <ReceiptText aria-hidden="true" size={19} />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-[var(--wl-color-text-secondary)]">
                          카테고리를 선택하면 거래 목록이 표시됩니다.
                        </p>
                      </div>
                    ) : transactionsQuery.isLoading ? (
                      <p className="py-10 text-center text-sm font-semibold text-[var(--wl-color-text-secondary)]">거래를 불러오는 중입니다.</p>
                    ) : selectedTransactions.length ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <CategoryBadge name={activeCategory?.categoryName} size="sm" />
                            <strong className="truncate">{activeCategory?.categoryName}</strong>
                          </div>
                          <strong>{formatWon(activeCategory?.amount ?? 0)}</strong>
                        </div>
                        <ul className="mt-3 divide-y divide-[var(--wl-color-border)]">
                          {selectedTransactions.slice(0, 6).map((transaction) => (
                            <li key={transaction.id}>
                              <Link className="flex min-h-14 items-center gap-3 rounded-lg px-1 py-2 hover:bg-[var(--wl-color-surface-subtle)]" to={`/transactions/${transaction.id}`}>
                                <span className="min-w-0 flex-1">
                                  <strong className="block truncate text-sm">{transaction.memo || transaction.category?.name || '거래 내역'}</strong>
                                  <span className="mt-1 block truncate text-xs font-medium text-[var(--wl-color-text-secondary)]">
                                    {transaction.transactionDate.replaceAll('-', '.')} · {transaction.payer.nickname} · {transaction.paymentMethod === 'CARD' ? transaction.card?.name ?? '카드' : '현금'}
                                  </span>
                                </span>
                                <strong className="shrink-0 text-sm">-{formatWon(transaction.amount)}</strong>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <EmptyState title="이 카테고리의 거래가 없습니다." description="분류가 변경되었거나 현재 월에 표시할 거래가 없습니다." />
                    )}
                  </div>
                </SurfaceCard>
              </section>
            </>
          ) : (
            <SurfaceCard className="mt-5">
              <EmptyState title="이 달에는 분석할 거래가 없습니다." description="거래를 기록하면 소비 흐름과 카테고리 분포가 표시됩니다." />
            </SurfaceCard>
          )}
        </>
      ) : null}
    </main>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'blue' | 'brand' | 'danger'
}) {
  const color = accent === 'blue'
    ? 'text-[var(--wl-data-blue)]'
    : accent === 'danger'
      ? 'text-[var(--wl-color-danger)]'
      : accent === 'brand'
        ? 'text-[var(--wl-color-primary-dark)]'
        : 'text-[var(--wl-color-text-main)]'
  return (
    <article className="bg-white px-5 py-4 sm:px-6">
      <p className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-[-0.03em] ${color}`}>{value}</p>
    </article>
  )
}

function TrendChart({
  statistics,
  activeIndex,
  onPreview,
  onPin,
}: {
  statistics: Array<{ budgetMonth: string; expenseAmount: number }>
  activeIndex: number | null
  onPreview: (index: number | null) => void
  onPin: (value: number | null | ((current: number | null) => number | null)) => void
}) {
  const width = 720
  const height = 260
  const left = 44
  const right = 20
  const top = 28
  const bottom = 214
  const maxExpense = Math.max(1, ...statistics.map((item) => item.expenseAmount)) * 1.12
  const x = (index: number) => left + index * ((width - left - right) / Math.max(1, statistics.length - 1))
  const y = (amount: number) => bottom - amount / maxExpense * (bottom - top)
  const points = statistics.map((item, index) => ({ x: x(index), y: y(item.expenseAmount) }))
  const averageY = y(averageExpense(statistics))
  const barWidth = statistics.length > 6 ? 24 : 48

  function handlePointKeyDown(event: KeyboardEvent<SVGGElement>, index: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onPin((current) => current === index ? null : index)
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <svg aria-label="월별 지출 막대와 추세선 결합 차트" className="h-64 min-w-[620px] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
        <g aria-hidden="true">
          {[0.25, 0.5, 0.75].map((ratio) => {
            const lineY = bottom - (bottom - top) * ratio
            return <line key={ratio} stroke="var(--wl-color-border)" strokeWidth="1" x1={left} x2={width - right} y1={lineY} y2={lineY} />
          })}
          <line stroke="var(--wl-data-amber)" strokeDasharray="5 5" strokeWidth="1.5" x1={left} x2={width - right} y1={averageY} y2={averageY} />
        </g>
        <g aria-hidden="true">
          {statistics.map((item, index) => (
            <rect
              fill={index === statistics.length - 1 ? 'var(--wl-brand-100)' : 'var(--wl-color-surface-subtle)'}
              height={bottom - y(item.expenseAmount)}
              key={item.budgetMonth}
              opacity={activeIndex !== null && activeIndex !== index ? 0.42 : 1}
              rx="7"
              stroke={index === statistics.length - 1 ? 'var(--wl-color-primary)' : 'var(--wl-color-border-strong)'}
              width={barWidth}
              x={x(index) - barWidth / 2}
              y={y(item.expenseAmount)}
            />
          ))}
          <path d={smoothPath(points)} fill="none" stroke="var(--wl-color-primary)" strokeLinecap="round" strokeWidth="3" />
        </g>
        {statistics.map((item, index) => (
          <g
            aria-label={`${monthLabel(item.budgetMonth)} 지출 ${formatWon(item.expenseAmount)}`}
            aria-pressed={activeIndex === index}
            key={item.budgetMonth}
            onBlur={() => onPreview(null)}
            onClick={() => onPin((current) => current === index ? null : index)}
            onFocus={() => onPreview(index)}
            onKeyDown={(event) => handlePointKeyDown(event, index)}
            onMouseEnter={() => onPreview(index)}
            onMouseLeave={() => onPreview(null)}
            role="button"
            tabIndex={0}
          >
            <circle cx={x(index)} cy={y(item.expenseAmount)} fill="transparent" r="15" />
            <circle
              cx={x(index)}
              cy={y(item.expenseAmount)}
              fill="white"
              opacity={activeIndex !== null && activeIndex !== index ? 0.45 : 1}
              r={activeIndex === index ? 7 : 5}
              stroke="var(--wl-color-primary)"
              strokeWidth={activeIndex === index ? 4 : 3}
            />
          </g>
        ))}
        <g aria-hidden="true">
          {statistics.map((item, index) => (
            <text
              fill="var(--wl-color-text-secondary)"
              fontSize="12"
              fontWeight="600"
              key={item.budgetMonth}
              textAnchor="middle"
              x={x(index)}
              y="244"
            >
              {Number(item.budgetMonth.slice(5))}월
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}

function CategoryDonut({
  categories,
  total,
  activeCategoryId,
  onPreview,
  onSelect,
}: {
  categories: CategoryItem[]
  total: number
  activeCategoryId: number | null
  onPreview: (categoryId: number | null) => void
  onSelect: (categoryId: number) => void
}) {
  const activeCategory = categories.find((item) => item.categoryGroupId === activeCategoryId)
  const segments = categories.reduce<{
    cursor: number
    items: Array<{ item: CategoryItem; index: number; share: number; dashOffset: number }>
  }>((state, item, index) => {
    const share = total ? item.amount / total * 100 : 0
    return {
      cursor: state.cursor + share,
      items: [...state.items, { item, index, share, dashOffset: -state.cursor }],
    }
  }, { cursor: 0, items: [] }).items

  return (
    <div className="relative mx-auto size-52">
      <svg aria-label="카테고리별 지출 비율" className="-rotate-90 size-full overflow-visible" role="img" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" pathLength="100" r="46" stroke="var(--wl-color-surface-subtle)" strokeWidth="16" />
        {segments.map(({ item, index, share, dashOffset }) => {
          const active = item.categoryGroupId === activeCategoryId
          const subdued = activeCategoryId !== null && !active
          return (
            <circle
              aria-label={`${item.categoryName} ${Math.round(share)}% ${formatWon(item.amount)}`}
              aria-pressed={active}
              cx="60"
              cy="60"
              fill="none"
              key={item.categoryGroupId}
              onBlur={() => onPreview(null)}
              onClick={() => onSelect(item.categoryGroupId)}
              onFocus={() => onPreview(item.categoryGroupId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(item.categoryGroupId)
                }
              }}
              onMouseEnter={() => onPreview(item.categoryGroupId)}
              onMouseLeave={() => onPreview(null)}
              pathLength="100"
              r="46"
              role="button"
              stroke={colors[index]}
              strokeDasharray={`${share} ${100 - share}`}
              strokeDashoffset={dashOffset}
              strokeWidth={active ? 20 : 16}
              style={{
                cursor: 'pointer',
                opacity: subdued ? 0.38 : 1,
                transition: 'opacity var(--wl-motion-fast) var(--wl-ease-product), stroke-width var(--wl-motion-fast) var(--wl-ease-product)',
              }}
              tabIndex={0}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">{activeCategory?.categoryName ?? '총 지출'}</span>
        <strong className="mt-1 max-w-28 text-base leading-5">{formatWon(activeCategory?.amount ?? total)}</strong>
      </div>
    </div>
  )
}

function CategoryStack({
  categories,
  total,
  activeCategoryId,
  onPreview,
  onSelect,
}: {
  categories: CategoryItem[]
  total: number
  activeCategoryId: number | null
  onPreview: (categoryId: number | null) => void
  onSelect: (categoryId: number) => void
}) {
  return (
    <div className="mt-5">
      <div aria-label="카테고리별 지출 비율" className="flex h-12 overflow-hidden rounded-xl bg-[var(--wl-color-surface-subtle)]" role="group">
        {categories.map((item, index) => {
          const share = total ? item.amount / total * 100 : 0
          const active = item.categoryGroupId === activeCategoryId
          const subdued = activeCategoryId !== null && !active
          return (
            <button
              aria-label={`${item.categoryName} ${Math.round(share)}%`}
              aria-pressed={active}
              className="relative min-w-8 border-r border-white/60 text-xs font-bold text-white transition-[filter,opacity] last:border-0"
              key={item.categoryGroupId}
              onBlur={() => onPreview(null)}
              onClick={() => onSelect(item.categoryGroupId)}
              onFocus={() => onPreview(item.categoryGroupId)}
              onMouseEnter={() => onPreview(item.categoryGroupId)}
              onMouseLeave={() => onPreview(null)}
              style={{
                background: colors[index],
                filter: subdued ? 'saturate(0.45)' : 'saturate(1)',
                opacity: subdued ? 0.55 : 1,
                width: `${Math.max(share, 6)}%`,
              }}
              title={`${item.categoryName} ${Math.round(share)}%`}
              type="button"
            >
              {share >= 14 ? `${Math.round(share)}%` : ''}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {categories.map((item, index) => (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--wl-color-text-secondary)]" key={item.categoryGroupId}>
            <i aria-hidden="true" className="size-2.5 rounded-full" style={{ background: colors[index] }} />
            {item.categoryName}
          </span>
        ))}
      </div>
    </div>
  )
}

function selectCategoryTransactions(
  transactions: TransactionSummary[],
  categories: Array<{ id: number; categoryGroupId: number }>,
  categoryGroupId: number | null,
) {
  if (categoryGroupId === null) return []
  const categoryIds = new Set(
    categories
      .filter((category) => category.categoryGroupId === categoryGroupId)
      .map((category) => category.id),
  )
  return transactions
    .filter((transaction) => transaction.type === 'EXPENSE' && transaction.category && categoryIds.has(transaction.category.id))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
}

function shiftMonth(budgetMonth: string, offset: number) {
  const [year, month] = budgetMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(budgetMonth: string) {
  const [year, month] = budgetMonth.split('-').map(Number)
  return `${year}년 ${month}월`
}

function daysInMonth(budgetMonth: string) {
  const [year, month] = budgetMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function averageExpense(statistics: Array<{ expenseAmount: number }>) {
  if (!statistics.length) return 0
  return Math.round(statistics.reduce((sum, item) => sum + item.expenseAmount, 0) / statistics.length)
}

function smoothPath(points: TrendPoint[]) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`
  const segments = points.slice(0, -1).map((point, index) => {
    const previous = points[index - 1] ?? point
    const next = points[index + 1]
    const afterNext = points[index + 2] ?? next
    const control1 = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6,
    }
    const control2 = {
      x: next.x - (afterNext.x - point.x) / 6,
      y: next.y - (afterNext.y - point.y) / 6,
    }
    return `C ${control1.x},${control1.y} ${control2.x},${control2.y} ${next.x},${next.y}`
  })
  return `M ${points[0].x},${points[0].y} ${segments.join(' ')}`
}
