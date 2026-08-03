import { useState } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useAnalyticsQuery } from '../features/analytics/model/analyticsQueries'
import type { AnalyticsScope } from '../features/analytics/api/analyticsApi'
import { useTransactionsQuery } from '../features/transaction/model/transactionQueries'
import type { TransactionSummary } from '../features/transaction/api/transactionApi'
import { formatWon } from '../shared/lib/money'
import { AppHeader } from '../shared/ui/AppHeader'
import { CardHeading, EmptyState, ErrorState, SurfaceCard } from '../shared/ui/DesignPrimitives'
import { DonutChart, type DonutSegment } from '../shared/ui/DonutChart'
import { SegmentedControl } from '../shared/ui/SegmentedControl'
import { Skeleton } from '../shared/ui/Skeleton'
import { StatBlock } from '../shared/ui/StatBlock'
import { TransactionRow } from '../shared/ui/TransactionRow'

/* 카테고리 색은 대시보드(DashboardPage.tsx)의 CATEGORY_PALETTE와 같은 순서·같은 토큰을 씁니다.
 * 카테고리 수는 장부마다 다르므로 항목마다 색을 고정하지 않고 데이터 색 토큰을 순서대로 돌려 씁니다. */
const CATEGORY_PALETTE = [
  'var(--wl-data-coral)',
  'var(--wl-data-violet)',
  'var(--wl-brand-600)',
  'var(--wl-data-blue)',
  'var(--wl-data-amber)',
  'var(--wl-data-neutral)',
]

const SCOPE_OPTIONS: Array<{ value: AnalyticsScope; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'SHARED', label: '공동 예산' },
  { value: 'MINE', label: '내 예산' },
]

/** 'YYYY-MM-DD'를 delta개월만큼 이동합니다. 월 길이가 다르면 말일로 접습니다 (shared/lib/date.ts의 addDateInputPeriod와 같은 규칙). */
function shiftPeriodStart(periodStart: string, deltaMonths: number): string {
  const [year, month, day] = periodStart.split('-').map(Number)
  const targetYear = year + Math.floor((month - 1 + deltaMonths) / 12)
  const targetMonth = ((((month - 1 + deltaMonths) % 12) + 12) % 12) + 1
  const lastDay = new Date(targetYear, targetMonth, 0).getDate()
  const targetDay = Math.min(day, lastDay)
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function formatKoreanYearMonth(iso: string): string {
  const [year, month] = iso.split('-')
  return `${year.slice(2)}년 ${month}월`
}

function formatKoreanMonthDay(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

function formatCompactWon(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return abs >= 10_000 ? `${sign}${Math.round(abs / 1000) / 10}만` : `${sign}${Math.round(abs / 1000)}천`
}

function todayInput(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function transactionScope(transaction: TransactionSummary) {
  return transaction.scope ?? transaction.budgetSource ?? null
}

function inAnalyticsScope(transaction: TransactionSummary, scope: AnalyticsScope, myUserId: number | undefined): boolean {
  const source = transactionScope(transaction)
  if (scope === 'SHARED') return source?.type === 'SHARED'
  if (scope === 'MINE') return source?.type === 'PERSONAL' && source.ownerUserId === myUserId
  return true
}

function budgetLabel(transaction: TransactionSummary, myUserId: number | undefined): string {
  const source = transactionScope(transaction)
  if (source?.type === 'SHARED') return '공동'
  if (source?.type === 'PERSONAL' && source.ownerUserId === myUserId) return '내 예산'
  return transaction.payer?.nickname ?? '개인'
}

export function AnalysisPage() {
  const me = useMeQuery()
  const [scope, setScope] = useState<AnalyticsScope>('ALL')
  const [periodStart, setPeriodStart] = useState<string | undefined>(undefined)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [trendWindow, setTrendWindow] = useState<'recent' | 'all'>('recent')
  const ledgerId = me.data?.currentLedger.id

  const analytics = useAnalyticsQuery(ledgerId, periodStart, scope)
  const data = analytics.data

  /* 거래 원본이 필요한 세 구역(최근 기록/카테고리 상세, 미분류 거래 수, 수입) 은 분석 API에 없으므로
   * 같은 기간의 거래 목록(listTransactions)을 그대로 재사용하고 화면에서 범위(scope)만 다시 나눕니다.
   * limit=200은 이 화면이 그리는 카드 안에서 감당 가능한 최대치로 고른 값입니다 — 한 기간의 거래가
   * 이보다 많으면 미분류 수·최근 기록·수입 합계가 실제보다 적게 나올 수 있습니다. */
  const transactions = useTransactionsQuery(data ? ledgerId : undefined, { periodStart: data?.periodStart, limit: 200 })
  const scopedTransactions = (transactions.data?.items ?? []).filter((t) => inAnalyticsScope(t, scope, me.data?.user.id))
  const expenseTransactions = scopedTransactions
    .filter((t) => t.type === 'EXPENSE')
    .slice()
    .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1))
  const incomeTransactions = scopedTransactions.filter((t) => t.type === 'INCOME')
  const unclassifiedCount = expenseTransactions.filter((t) => !t.category).length

  function changeScope(next: AnalyticsScope) {
    setScope(next)
    setSelectedCategory(null)
  }

  function changePeriod(next: string) {
    setPeriodStart(next)
    setSelectedCategory(null)
  }

  if (analytics.isLoading) {
    return (
      <>
        <AppHeader title="분석" />
        <div className="dashboard-page">
          <Skeleton height={140} radius={18} />
          <div className="analysis-skeleton-grid">
            <Skeleton height={280} radius={18} />
            <Skeleton height={280} radius={18} />
          </div>
        </div>
      </>
    )
  }
  if (analytics.isError) {
    return (
      <>
        <AppHeader title="분석" />
        <div className="dashboard-page">
          <ErrorState onRetry={() => analytics.refetch()} />
        </div>
      </>
    )
  }
  if (!data) {
    return (
      <>
        <AppHeader title="분석" />
        <div className="dashboard-page">
          <EmptyState description="잠시 후 다시 시도해주세요." title="분석을 준비하지 못했습니다." />
        </div>
      </>
    )
  }

  const periodLabel = `${formatKoreanYearMonth(data.periodEnd)} 예산 기간 · ${formatKoreanMonthDay(data.periodStart)} ~ ${formatKoreanMonthDay(data.periodEnd)}`
  const nextPeriodStart = shiftPeriodStart(data.periodStart, 1)

  const categoryRows = [...data.categoryDistribution].sort((a, b) => b.amount - a.amount)
  const categoryTotal = categoryRows.reduce((sum, row) => sum + row.amount, 0)
  const categorySegments: DonutSegment[] = categoryRows.map((row, index) => ({
    name: row.groupName,
    amount: formatWon(row.amount),
    percent: categoryTotal > 0 ? Math.round((row.amount / categoryTotal) * 100) : 0,
    color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
  }))

  /* previousAmount가 null이면 지난 기간 자체가 없는 카테고리라 비교 대상에서 뺍니다 (0과는 다른 의미).
   * 색은 대분류별 지출 도넛과 같은 순서를 쓰기 위해 원래 categoryRows 인덱스를 함께 들고 다닙니다. */
  const comparableCategoryRows = categoryRows
    .map((row, paletteIndex) => ({ ...row, paletteIndex }))
    .filter((row): row is typeof row & { previousAmount: number } => row.previousAmount !== null)

  const daysInPeriod = data.dailyFlow.length || 1
  const peakEntry = data.dailyFlow.reduce<typeof data.dailyFlow[number] | undefined>(
    (best, current) => (current.amount > (best?.amount ?? -1) ? current : best),
    undefined,
  )

  const delta = data.changeAmount
  const deltaTone =
    delta === null
      ? undefined
      : delta >= 0
        ? { background: 'var(--wl-data-coral-soft)', color: 'var(--wl-color-expense)' }
        : { background: 'var(--wl-color-primary-soft)', color: 'var(--wl-color-primary-dark)' }
  const deltaPercent =
    delta !== null && data.previousPeriodExpenseAmount ? Math.abs(Math.round((delta / data.previousPeriodExpenseAmount) * 100)) : 0

  const detailItems = selectedCategory
    ? expenseTransactions.filter((t) => (t.category?.groupName ?? '미분류') === selectedCategory)
    : expenseTransactions.slice(0, 6)
  const detailTotal = detailItems.reduce((sum, t) => sum + t.amount, 0)

  const incomeTotal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)

  const trendEntries = trendWindow === 'recent' ? data.trend.slice(-6) : data.trend
  const trendMax = Math.max(...trendEntries.map((entry) => entry.expenseAmount), 1)
  const trendAvg = trendEntries.length ? trendEntries.reduce((sum, entry) => sum + entry.expenseAmount, 0) / trendEntries.length : 0

  return (
    <>
      <AppHeader
        meta={periodLabel}
        stepper={{
          label: formatKoreanYearMonth(data.periodEnd),
          onPrev: () => changePeriod(shiftPeriodStart(data.periodStart, -1)),
          onNext: () => changePeriod(nextPeriodStart),
          disableNext: nextPeriodStart > todayInput(),
          prevLabel: '이전 기간',
          nextLabel: '다음 기간',
        }}
        title="분석"
      />

      <div className="analysis-scope-bar">
        <SegmentedControl
          label="분석 범위"
          onChange={(value) => changeScope(value as AnalyticsScope)}
          options={SCOPE_OPTIONS}
          value={scope}
        />
        <span className="wl-meta">상대방 개인 거래는 분석에 넣지 않아요</span>
      </div>

      <div className="dashboard-page">
        {categoryRows.length === 0 ? (
          <EmptyState description="거래를 기록하면 이곳에 소비 흐름이 표시됩니다." title="이 기간에는 지출이 없습니다." />
        ) : (
          <>
            <section className="analysis-hero">
              <StatBlock amount={formatWon(data.totalExpenseAmount)} label="이 기간 총지출" size="hero">
                <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginTop: 12 }}>
                  {delta !== null ? (
                    <span
                      className="wl-tabular"
                      style={{
                        background: deltaTone?.background,
                        borderRadius: 'var(--wl-radius-pill)',
                        color: deltaTone?.color,
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: '4px 10px',
                      }}
                    >
                      {delta >= 0 ? '+' : '-'}
                      {formatWon(Math.abs(delta))} ({deltaPercent}%)
                    </span>
                  ) : null}
                  <span className="wl-meta">
                    {data.previousPeriodExpenseAmount !== null
                      ? `지난 기간 ${formatWon(data.previousPeriodExpenseAmount)}`
                      : '비교할 이전 기간이 없습니다.'}
                  </span>
                </div>
              </StatBlock>
              <div className="analysis-hero-divider" />
              <div className="analysis-hero-stats">
                <StatBlock amount={formatWon(Math.round(data.totalExpenseAmount / daysInPeriod))} label="하루 평균" />
                <StatBlock
                  amount={peakEntry && peakEntry.amount > 0 ? formatKoreanMonthDay(peakEntry.date) : '없어요'}
                  label="가장 많이 쓴 날"
                  note={peakEntry && peakEntry.amount > 0 ? formatWon(peakEntry.amount) : '기록이 없어요'}
                />
                <StatBlock amount={`${unclassifiedCount}건`} label="미분류 거래" note="총지출에는 포함돼요" />
              </div>
            </section>

            <section className="analysis-category-detail">
              <SurfaceCard labelledBy="analysis-category-title">
                <CardHeading eyebrow="" id="analysis-category-title" title="대분류별 지출" />
                <div style={{ marginTop: 16 }}>
                  <DonutChart onSelect={setSelectedCategory} segments={categorySegments} selected={selectedCategory} size={150} />
                </div>
              </SurfaceCard>

              <SurfaceCard labelledBy="analysis-detail-title">
                <div style={{ alignItems: 'baseline', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                  <h2 className="wl-section-title" id="analysis-detail-title" style={{ margin: 0 }}>
                    {selectedCategory ? `${selectedCategory} 거래` : '최근 기록'}
                  </h2>
                  <span className="wl-tabular wl-meta">
                    {detailItems.length}건 · {formatWon(detailTotal)}
                  </span>
                </div>
                {detailItems.length ? (
                  <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
                    {detailItems.map((t, index) => (
                      <TransactionRow
                        amount={`-${formatWon(t.amount)}`}
                        category={t.category?.groupName ?? '미분류'}
                        divider={index > 0}
                        key={t.id}
                        meta={`${formatKoreanMonthDay(t.transactionDate)} · ${budgetLabel(t, me.data?.user.id)}`}
                        place={t.merchant || t.memo || t.category?.groupName || '미분류 거래'}
                      />
                    ))}
                  </ul>
                ) : (
                  <div style={{ marginTop: 14 }}>
                    <EmptyState description="이 기간에는 해당하는 거래가 없어요." title="거래가 없습니다." />
                  </div>
                )}
                {!selectedCategory ? (
                  <p className="wl-meta" style={{ borderTop: '1px solid var(--wl-color-border)', marginTop: 14, paddingTop: 12 }}>
                    왼쪽에서 대분류를 누르면 그 대분류의 거래만 모아서 보여드려요.
                  </p>
                ) : null}
              </SurfaceCard>
            </section>

            <section className="analysis-daily-compare">
              <SurfaceCard labelledBy="analysis-daily-title">
                <div style={{ alignItems: 'baseline', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                  <h2 className="wl-section-title" id="analysis-daily-title" style={{ margin: 0 }}>
                    일별 지출과 누적 사용액
                  </h2>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span className="wl-meta" style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                      <i aria-hidden="true" style={{ background: 'var(--wl-color-expense-fill)', borderRadius: 2, display: 'block', height: 8, width: 8 }} />
                      일별 지출
                    </span>
                    <span className="wl-meta" style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                      <i aria-hidden="true" style={{ background: 'var(--wl-color-primary)', borderRadius: 2, display: 'block', height: 2, width: 14 }} />
                      누적 사용액
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <DailyFlowChart daily={data.dailyFlow} />
                </div>
              </SurfaceCard>

              <SurfaceCard labelledBy="analysis-compare-title">
                <CardHeading eyebrow="" id="analysis-compare-title" title="지난 기간과 비교" />
                {comparableCategoryRows.length ? (
                  <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
                    {comparableCategoryRows.map((row, index) => {
                      const rowDelta = row.amount - row.previousAmount
                      const rowTone =
                        rowDelta > 0
                          ? { background: 'var(--wl-data-coral-soft)', color: 'var(--wl-color-expense)' }
                          : { background: 'var(--wl-color-primary-soft)', color: 'var(--wl-color-primary-dark)' }
                      return (
                        <li
                          key={row.groupCode}
                          style={{
                            alignItems: 'center',
                            borderTop: index > 0 ? '1px solid var(--wl-color-border)' : undefined,
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'space-between',
                            padding: '10px 0',
                          }}
                        >
                          <span style={{ alignItems: 'center', display: 'flex', gap: 10, minWidth: 0 }}>
                            <i
                              aria-hidden="true"
                              style={{
                                background: CATEGORY_PALETTE[row.paletteIndex % CATEGORY_PALETTE.length],
                                borderRadius: 2,
                                display: 'block',
                                flexShrink: 0,
                                height: 8,
                                width: 8,
                              }}
                            />
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.groupName}</span>
                          </span>
                          <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                            <span className="wl-tabular wl-meta">{formatWon(row.amount)}</span>
                            <span
                              className="wl-tabular"
                              style={{
                                background: rowTone.background,
                                borderRadius: 'var(--wl-radius-pill)',
                                color: rowTone.color,
                                fontSize: 11.5,
                                fontWeight: 700,
                                padding: '3px 8px',
                              }}
                            >
                              {rowDelta === 0 ? '변화 없음' : `${rowDelta > 0 ? '+' : '-'}${formatWon(Math.abs(rowDelta))}`}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <EmptyState description="비교할 지난 기간이 없어요." title="지난 기간과 비교할 데이터가 없습니다." />
                  </div>
                )}
              </SurfaceCard>
            </section>

            <SurfaceCard className="mt-5" labelledBy="analysis-trend-title">
              <div style={{ alignItems: 'baseline', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                <div>
                  <h2 className="wl-section-title" id="analysis-trend-title" style={{ margin: 0 }}>
                    기간별 추세
                  </h2>
                  <p className="wl-meta" style={{ margin: '5px 0 0' }}>
                    예산 기간마다의 총지출이에요. 점선은 {trendEntries.length}개 기간 평균이고 진한 막대가 이번 기간이에요.
                  </p>
                </div>
                {data.trend.length > 6 ? (
                  <SegmentedControl
                    label="추세 범위"
                    onChange={(value) => setTrendWindow(value as 'recent' | 'all')}
                    options={[
                      { value: 'recent', label: '최근 6기간' },
                      { value: 'all', label: `전체 ${data.trend.length}기간` },
                    ]}
                    value={trendWindow}
                  />
                ) : null}
              </div>
              {trendEntries.length ? (
                <div className="analysis-trend-scroll">
                  <TrendChart avg={trendAvg} entries={trendEntries} max={trendMax} />
                </div>
              ) : (
                <div style={{ marginTop: 18 }}>
                  <EmptyState description="기간별 추세를 계산할 데이터가 아직 없어요." title="추세 데이터가 없습니다." />
                </div>
              )}
            </SurfaceCard>

            <section className="analysis-income">
              <div>
                <h2 className="wl-section-title" style={{ margin: 0 }}>
                  수입은 따로 봐요
                </h2>
                <p className="wl-meta" style={{ lineHeight: 1.6, margin: '6px 0 0', wordBreak: 'keep-all' }}>
                  수입은 총지출이나 예산 사용률에 넣지 않아요.
                </p>
                <p
                  className="wl-tabular"
                  style={{ color: 'var(--wl-color-income)', fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', margin: '12px 0 0' }}
                >
                  {formatWon(incomeTotal)}
                </p>
              </div>
              {incomeTransactions.length ? (
                <ul style={{ display: 'grid', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
                  {incomeTransactions.map((income) => (
                    <li
                      key={income.id}
                      style={{
                        alignItems: 'baseline',
                        borderBottom: '1px solid var(--wl-color-border)',
                        display: 'flex',
                        gap: 12,
                        justifyContent: 'space-between',
                        paddingBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{income.merchant || income.memo || '수입'}</span>
                      <strong className="wl-tabular" style={{ color: 'var(--wl-color-income)', fontSize: 14, fontWeight: 700 }}>
                        {formatWon(income.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState description="이 기간에는 수입 기록이 없어요." title="수입이 없습니다." />
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}

/* 일별 지출(막대) + 누적 사용액(선). 디자인 시스템에 아직 막대·꺾은선 차트 컴포넌트가 없어
 * patterns/dashboard.css 토큰을 그대로 쓰는 인라인 SVG로 그립니다.
 * 데이터 소스: AnalyticsResponse.dailyFlow (date, amount, cumulativeAmount) — scope 쿼리로 이미 필터된 값입니다. */
function DailyFlowChart({ daily }: { daily: Array<{ date: string; amount: number; cumulativeAmount: number }> }) {
  const width = 640
  const height = 190
  const max = Math.max(...daily.map((d) => d.amount), 1)
  const maxCumulative = Math.max(...daily.map((d) => d.cumulativeAmount), 1)
  const step = width / Math.max(daily.length, 1)
  const baseline = height - 20

  const bars = daily.map((d, index) => {
    const barHeight = max ? (d.amount / max) * (baseline - 20) : 0
    return (
      <rect
        fill="var(--wl-color-expense-fill)"
        height={Math.max(1, barHeight)}
        key={d.date}
        opacity={0.85}
        rx={3}
        width={Math.max(1, step - 4)}
        x={index * step + 2}
        y={baseline - barHeight}
      >
        <title>{`${formatKoreanMonthDay(d.date)} · ${formatWon(d.amount)}`}</title>
      </rect>
    )
  })

  const linePoints = daily
    .map((d, index) => {
      const x = index * step + step / 2
      const y = baseline - (d.cumulativeAmount / maxCumulative) * (baseline - 20)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const labelIndexes = daily.length
    ? Array.from(new Set([0, Math.floor((daily.length - 1) / 3), Math.floor(((daily.length - 1) * 2) / 3), daily.length - 1]))
    : []

  return (
    <svg aria-label="일별 지출과 누적 사용액" role="img" style={{ height: 190, width: '100%' }} viewBox={`0 0 ${width} ${height}`}>
      <line stroke="var(--wl-color-border)" x1={0} x2={width} y1={baseline} y2={baseline} />
      {bars}
      <polyline fill="none" points={linePoints} stroke="var(--wl-color-primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      {labelIndexes.map((index) => (
        <text
          fill="var(--wl-color-text-secondary)"
          fontSize={11}
          key={index}
          textAnchor="middle"
          x={index * step + step / 2}
          y={height - 4}
        >
          {formatKoreanMonthDay(daily[index].date).replace(/^\d+월 /, '')}
        </text>
      ))}
    </svg>
  )
}

/* 기간별 총지출 추세. 진한 막대가 이번 기간(마지막 항목), 점선이 창(window) 평균입니다.
 * 데이터 소스: AnalyticsResponse.trend (startDate, endDate, expenseAmount). */
function TrendChart({
  entries,
  max,
  avg,
}: {
  entries: Array<{ startDate: string; endDate: string; expenseAmount: number }>
  max: number
  avg: number
}) {
  /* 컨테이너 폭 대신 항목당 최소 폭(80px)을 확보합니다. 기간이 많아지면 svg 자체가
   * 넓어지고, 감싼 .analysis-trend-scroll 래퍼가 넘치는 부분을 가로 스크롤합니다. */
  const width = Math.max(560, entries.length * 80)
  const height = 190
  const baseline = height - 34
  const step = width / Math.max(entries.length, 1)
  const barWidth = Math.min(step * 0.56, 64)
  const avgY = baseline - (avg / max) * (baseline - 40)

  return (
    <svg aria-label="기간별 총지출 추세" role="img" style={{ height: 190, width }} viewBox={`0 0 ${width} ${height}`}>
      <line stroke="var(--wl-color-text-secondary)" opacity={0.7} strokeDasharray="4 5" x1={0} x2={width} y1={avgY} y2={avgY} />
      <text fill="var(--wl-color-text-secondary)" fontSize={11} textAnchor="end" x={width - 2} y={avgY - 6}>
        평균 {formatCompactWon(avg)}
      </text>
      <line stroke="var(--wl-color-border)" x1={0} x2={width} y1={baseline} y2={baseline} />
      {entries.map((entry, index) => {
        const barHeight = (entry.expenseAmount / max) * (baseline - 40)
        const centerX = index * step + step / 2
        const isCurrent = index === entries.length - 1
        return (
          <g key={entry.startDate}>
            <text
              fill={isCurrent ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-secondary)'}
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
              x={centerX}
              y={baseline - barHeight - 6}
            >
              {formatCompactWon(entry.expenseAmount)}
            </text>
            <rect
              fill={isCurrent ? 'var(--wl-color-primary)' : 'var(--wl-brand-100)'}
              height={Math.max(2, barHeight)}
              rx={7}
              width={barWidth}
              x={centerX - barWidth / 2}
              y={baseline - barHeight}
            >
              <title>{`${formatKoreanYearMonth(entry.endDate)} · ${formatWon(entry.expenseAmount)}`}</title>
            </rect>
            <text
              fill={isCurrent ? 'var(--wl-color-text-main)' : 'var(--wl-color-text-secondary)'}
              fontSize={11}
              textAnchor="middle"
              x={centerX}
              y={height - 12}
            >
              {formatKoreanYearMonth(entry.endDate)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
