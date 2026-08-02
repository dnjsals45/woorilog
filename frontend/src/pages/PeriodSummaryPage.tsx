import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useAnalyticsQuery } from '../features/analytics/model/analyticsQueries'
import { useBudgetPeriodQuery } from '../features/budget/model/budgetPeriodQueries'
import { useBudgetPeriodSummaryQuery, useCopyBudgetPeriodMutation } from '../features/budget/model/periodSummaryQueries'
import type { BudgetAllocation } from '../features/budget/api/budgetPeriodApi'
import { formatWon } from '../shared/lib/money'
import { AppHeader } from '../shared/ui/AppHeader'
import { Badge } from '../shared/ui/Badge'
import { Button } from '../shared/ui/Button'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import { Progress } from '../shared/ui/Progress'
import { SegmentedControl } from '../shared/ui/SegmentedControl'
import { Skeleton } from '../shared/ui/Skeleton'
import { StatBlock } from '../shared/ui/StatBlock'
import { Toast } from '../shared/ui/Toast'

type Scope = 'SHARED' | 'MINE'

const SCOPE_OPTIONS: Array<{ value: Scope; label: string }> = [
  { value: 'SHARED', label: '공동 예산' },
  { value: 'MINE', label: '내 예산' },
]

/** 'YYYY-MM-DD' → '26년 07월 10일'. 이 화면 전용 표기라 shared/lib/date.ts는 건드리지 않고 로컬로 둡니다. */
function formatKoreanFullDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${year.slice(2)}년 ${month}월 ${day}일`
}

/** 'YYYY-MM-DD'에 day만큼 더합니다 (달력 이동, 로컬 자정 기준). */
function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

type BudgetResultCard = {
  key: string
  name: string
  over: boolean
  badgeLabel: string
  resultLabel: string
  resultAmount: number
  usagePercent: number
  usageLeft: string
}

function buildResultCard(name: string, allocation: BudgetAllocation | undefined): BudgetResultCard | null {
  if (!allocation) return null
  const over = allocation.spentAmount > allocation.amount
  const resultAmount = over ? allocation.spentAmount - allocation.amount : allocation.amount - allocation.spentAmount
  const usagePercent = allocation.amount > 0 ? Math.round((allocation.spentAmount / allocation.amount) * 100) : 0
  return {
    key: name,
    name,
    over,
    badgeLabel: over ? '초과' : '예산 안',
    resultLabel: over ? '초과 금액' : '남은 금액',
    resultAmount,
    usagePercent,
    usageLeft: `${formatWon(allocation.amount)} 중 ${formatWon(allocation.spentAmount)} 사용`,
  }
}

/** "공동 예산은 12,400원 넘겼고, 내 예산은 47,600원 남았어요" 형태의 headline을 카드 결과로부터 만듭니다. */
function buildHeadline(cards: BudgetResultCard[]): string {
  if (!cards.length) return '이 기간 예산 결과가 아직 없어요'
  const clause = (card: BudgetResultCard, isLast: boolean) => {
    const shortName = card.name === '내 할당 예산' ? '내 예산' : card.name
    const verb = card.over ? '넘겼' : '남았'
    return `${shortName}은 ${formatWon(card.resultAmount)} ${verb}${isLast ? '어요' : '고,'}`
  }
  return cards.map((card, index) => clause(card, index === cards.length - 1)).join(' ')
}

export function PeriodSummaryPage() {
  const { startDate } = useParams<{ startDate: string }>()
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const myUserId = me.data?.user.id

  const summary = useBudgetPeriodSummaryQuery(ledgerId, startDate)
  const period = summary.data?.period

  const [scope, setScope] = useState<Scope>('SHARED')
  const analytics = useAnalyticsQuery(period ? ledgerId : undefined, period?.startDate, scope)

  const nextStartDate = period ? addIsoDays(period.endDate, 1) : undefined
  const nextPeriod = useBudgetPeriodQuery(ledgerId, nextStartDate)
  const copyMutation = useCopyBudgetPeriodMutation(ledgerId, nextStartDate)

  const [toastText, setToastText] = useState('')
  const toastTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!toastText) return undefined
    toastTimerRef.current = window.setTimeout(() => setToastText(''), 3500)
    return () => window.clearTimeout(toastTimerRef.current)
  }, [toastText])

  if (summary.isLoading) {
    return (
      <>
        <AppHeader title="기간 종료 요약" />
        <div className="dashboard-page">
          <Skeleton height={90} radius={18} />
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
            <Skeleton height={220} radius={18} />
            <Skeleton height={220} radius={18} />
          </div>
        </div>
      </>
    )
  }
  if (summary.isError) {
    return (
      <>
        <AppHeader title="기간 종료 요약" />
        <div className="dashboard-page">
          <ErrorState onRetry={() => summary.refetch()} />
        </div>
      </>
    )
  }
  if (!summary.data || !period) {
    return (
      <>
        <AppHeader title="기간 종료 요약" />
        <div className="dashboard-page">
          <EmptyState description="주소가 정확한지 확인해주세요." title="이 예산 기간을 찾을 수 없습니다." />
        </div>
      </>
    )
  }

  const sharedAllocation = period.allocations.find((allocation) => allocation.source.type === 'SHARED')
  const mineAllocation = period.allocations.find(
    (allocation) => allocation.source.type === 'PERSONAL' && allocation.source.ownerUserId === myUserId,
  )
  const budgetCards = [buildResultCard('공동 예산', sharedAllocation), buildResultCard('내 할당 예산', mineAllocation)].filter(
    (card): card is BudgetResultCard => card !== null,
  )
  const headline = buildHeadline(budgetCards)

  const categoryRows = [...(analytics.data?.categoryDistribution ?? [])].sort((a, b) => b.amount - a.amount)
  const categoryMax = Math.max(...categoryRows.map((row) => row.amount), 1)
  const scopeNote =
    scope === 'SHARED'
      ? '공동 예산에서 차감한 거래만 집계했어요.'
      : '내 할당 예산에서 차감한 거래만 집계했어요. 상대방 개인 지출은 들어 있지 않아요.'

  const showCopyCard = Boolean(nextStartDate) && !nextPeriod.isLoading && nextPeriod.data?.prepared !== true
  const daysUntilNext = nextStartDate ? daysBetween(todayIso(), nextStartDate) : null

  function handleCopy() {
    copyMutation.mutate(period!.startDate, {
      onSuccess: () => setToastText('이번 기간 설정을 다음 기간으로 복사했어요'),
    })
  }

  return (
    <>
      <PeriodSummaryPageStyle />
      <AppHeader
        actions={
          <Link
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              minHeight: 44,
              padding: '0 12px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--wl-color-text-secondary)',
            }}
            to="/dashboard"
          >
            <Icon name="x" size="md" />
            닫기
          </Link>
        }
        title="기간 종료 요약"
      />

      <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 1080 }}>
        <section className="wl-period-summary-rise">
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-primary-dark)' }}>
            {formatKoreanFullDate(period.startDate)} ~ {formatKoreanFullDate(period.endDate)}
          </p>
          <h2 style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            {headline}
          </h2>
          <p style={{ margin: '10px 0 0', maxWidth: '62ch', fontSize: 14, lineHeight: 1.65, color: 'var(--wl-color-text-body)', wordBreak: 'keep-all' }}>
            남은 금액과 초과액은 다음 기간으로 넘기지 않아요. 끝난 기간의 결과로만 남습니다.
          </p>
        </section>

        {budgetCards.length ? (
          <section className="wl-period-summary-rise" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
            {budgetCards.map((card) => (
              <article className="dashboard-card" key={card.key}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ fontSize: 15, fontWeight: 700 }}>{card.name}</strong>
                  <Badge tone={card.over ? 'danger' : 'brand'}>{card.badgeLabel}</Badge>
                </div>
                <div style={{ marginTop: 14 }}>
                  <StatBlock
                    amount={formatWon(card.resultAmount)}
                    label={card.resultLabel}
                    size="lg"
                    tone={card.over ? 'var(--wl-color-danger)' : undefined}
                  />
                </div>
                <div style={{ marginTop: 16 }}>
                  <Progress value={card.usagePercent} />
                </div>
                <p
                  className="wl-tabular"
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, margin: '9px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}
                >
                  <span>{card.usageLeft}</span>
                  <span>사용률 {card.usagePercent}%</span>
                </p>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState description="이 기간에는 배분된 예산이 없어요." title="예산 결과가 없습니다." />
        )}

        <section className="wl-period-summary-rise dashboard-card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>대분류별 지출</h3>
            <SegmentedControl label="지출 범위" onChange={(value) => setScope(value as Scope)} options={SCOPE_OPTIONS} value={scope} />
          </div>
          {analytics.isLoading ? (
            <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : categoryRows.length ? (
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '14px 32px', margin: '18px 0 0', padding: 0, listStyle: 'none' }}>
              {categoryRows.map((row) => (
                <li key={row.groupCode}>
                  <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: 13.5, color: 'var(--wl-color-text-body)' }}>
                    {row.groupName}
                    <strong className="wl-tabular" style={{ fontWeight: 700, color: 'var(--wl-color-text-main)' }}>
                      {formatWon(row.amount)}
                    </strong>
                  </span>
                  <span style={{ display: 'block', marginTop: 6, height: 6, borderRadius: 'var(--wl-radius-pill)', background: 'var(--wl-color-surface-subtle)' }}>
                    <span
                      style={{
                        display: 'block',
                        width: `${Math.round((row.amount / categoryMax) * 100)}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: row.groupName === '미분류' ? 'var(--wl-data-neutral-muted)' : 'var(--wl-color-primary)',
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 18 }}>
              <EmptyState description="이 범위에는 이 기간의 지출이 없어요." title="지출 내역이 없습니다." />
            </div>
          )}
          <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>{scopeNote}</p>
        </section>

        <section className="wl-period-summary-rise" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)', alignItems: 'start' }}>
          <div className="dashboard-card">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>아직 분류하지 않은 거래</h3>
            <p className="wl-tabular" style={{ margin: '14px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-.035em' }}>
              {summary.data.unclassifiedCount}건
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)', wordBreak: 'keep-all' }}>
              미분류 거래도 총지출에는 들어가 있어요. 지금 분류하면 이 기간의 분석이 다시 계산돼요.
            </p>
            <Link
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                margin: '6px 0 0 -10px',
                padding: '0 10px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--wl-color-primary-dark)',
              }}
              to="/transactions/uncategorized"
            >
              미분류 거래 분류하기
            </Link>
          </div>

          <div className="dashboard-card">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>다음 기간에 이어지는 고정비와 할부</h3>
              <strong className="wl-tabular" style={{ fontSize: 15, fontWeight: 700 }}>{formatWon(summary.data.nextPeriodScheduledAmount)}</strong>
            </div>
            {/* TODO(api): GET .../budget-periods/{startDate}/summary 는 다음 기간 예정 고정비·할부의 합계
                (nextPeriodScheduledAmount)만 반환합니다. 이 카드처럼 항목별로(사용처, "매월 5일 · 공동" 같은 주기·예산
                주체, "5/12회차" 같은 할부 회차, 금액) 나열하려면 항목 배열이 필요합니다.
                features/scheduled/api/scheduledPlanApi.ts의 ScheduledPlan 타입에도 budgetSource와 할부 회차(sequence/
                totalCount) 필드가 없어 클라이언트에서 조합할 수 없습니다. */}
            <div style={{ marginTop: 16 }}>
              <EmptyState
                description="사용처별 목록은 아직 준비 중이에요. 위 합계에는 포함되어 있어요."
                title="항목별 내역은 곧 제공돼요."
              />
            </div>
            <Link
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                margin: '6px 0 0 -10px',
                padding: '0 10px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--wl-color-primary-dark)',
              }}
              to="/recurring"
            >
              반복 거래에서 관리하기
            </Link>
          </div>
        </section>

        {showCopyCard ? (
          <section
            className="wl-period-summary-rise dashboard-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, background: 'var(--wl-color-surface-subtle)' }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>다음 기간 예산은 아직 정하지 않았어요</h3>
              <p style={{ margin: '6px 0 0', maxWidth: '52ch', fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)', wordBreak: 'keep-all' }}>
                {daysUntilNext !== null && daysUntilNext > 0
                  ? `${daysUntilNext}일 뒤 새 기간이 시작돼요. 그때까지 정하지 않으면 이번 기간 설정을 그대로 복사해요.`
                  : '새 기간이 곧 시작돼요. 정하지 않으면 이번 기간 설정을 그대로 복사해요.'}
              </p>
            </div>
            <Button loading={copyMutation.isPending} onClick={handleCopy} variant="secondary">
              이번 기간 설정 복사하기
            </Button>
          </section>
        ) : null}

        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
          상대방의 개인 예산 세부 내역은 이 요약에 넣지 않아요. 끝난 기간의 거래도 계속 추가하거나 고칠 수 있어요.
        </p>
      </div>

      {toastText ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 32,
            zIndex: 60,
            transform: 'translateX(-50%)',
            animation: 'wl-period-summary-toast-in 200ms var(--wl-ease-out-strong) both',
          }}
        >
          <Toast tone="success">{toastText}</Toast>
        </div>
      ) : null}
    </>
  )
}

/* 기간 종료 요약 전용 진입 모션 — 섹션이 순서대로 살짝 떠오르고(디자인의 wl-rise), 토스트는 화면 하단
 * 가운데에서 위로 뜹니다(다른 화면의 우하단 토스트와 달리 이 화면만 가운데 정렬입니다).
 * prefers-reduced-motion 비활성화는 tokens/motion.css의 전역 규칙이 처리합니다. */
function PeriodSummaryPageStyle() {
  return (
    <style>{`
      .wl-period-summary-rise { animation: wl-period-summary-rise 260ms var(--wl-ease-out-strong) both; }
      @keyframes wl-period-summary-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      @keyframes wl-period-summary-toast-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
    `}</style>
  )
}
