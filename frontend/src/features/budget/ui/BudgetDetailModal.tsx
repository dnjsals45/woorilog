import { Link } from 'react-router-dom'
import { formatWon } from '../../../shared/lib/money'
import { DonutChart, type DonutSegment } from '../../../shared/ui/DonutChart'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Modal } from '../../../shared/ui/Modal'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { StatBlock } from '../../../shared/ui/StatBlock'
import { TransactionRow } from '../../../shared/ui/TransactionRow'
import type { TransactionSummary } from '../../transaction/api/transactionApi'
import type { AllocationDailySpending } from '../api/allocationDetailApi'
import type { DashboardBudget } from '../api/budgetApi'
import { useAllocationDetailQuery } from '../model/allocationDetailQueries'

/* 카테고리 도넛 조각 색. DashboardPage의 CATEGORY_PALETTE와 같은 토큰을 이 모달에서도 순서대로 돌려 씁니다. */
const CATEGORY_PALETTE = [
  'var(--wl-data-coral)',
  'var(--wl-data-violet)',
  'var(--wl-brand-600)',
  'var(--wl-data-blue)',
  'var(--wl-data-amber)',
  'var(--wl-data-neutral)',
]

export interface BudgetDetailModalProps {
  /** 공동 예산인지 내 예산인지 — 디자인 원본의 openShared/openMine 두 진입점과 대응합니다. */
  scope: 'shared' | 'mine'
  budget: DashboardBudget
  periodLabel?: string
  /** 이번 기간 남은 고정비·할부 합계. DashboardSummary.scheduledRecurringExpenseAmount를 그대로 씁니다. */
  scheduledRecurringExpenseAmount: number
  ledgerId: number
  /** 예산 기간 시작일. GET .../budget-periods/{startDate}/allocations/{allocationId} 조회에 씁니다. */
  startDate?: string
  onClose: () => void
}

function transactionMeta(transaction: TransactionSummary): string {
  const category = transaction.category?.name ?? '미분류'
  return `${transaction.transactionDate} · ${category}`
}

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

/* 날짜별 소비 흐름 — 확정 디자인은 꺾은선 하나입니다. 이 API는 날짜별 지출 금액만 주기 때문에
 * (분석 화면의 DailyFlowChart처럼 누적값은 없음) 순수 꺾은선으로 그립니다.
 * 차트 라이브러리 없이 patterns/dashboard.css 토큰을 쓰는 인라인 SVG 방식을 그대로 따릅니다. */
function DailySpendingChart({ daily }: { daily: AllocationDailySpending[] }) {
  const width = 320
  const height = 140
  const baseline = height - 20
  const max = Math.max(...daily.map((d) => d.amount), 1)
  const step = daily.length > 1 ? width / (daily.length - 1) : 0

  const points = daily.map((d, index) => ({
    d,
    x: daily.length > 1 ? index * step : width / 2,
    y: baseline - (d.amount / max) * (baseline - 16),
  }))

  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const labelIndexes = daily.length ? Array.from(new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1])) : []

  return (
    <svg aria-label="날짜별 소비 흐름" role="img" style={{ height, width: '100%' }} viewBox={`0 0 ${width} ${height}`}>
      <line stroke="var(--wl-color-border)" x1={0} x2={width} y1={baseline} y2={baseline} />
      <polyline
        fill="none"
        points={linePoints}
        stroke="var(--wl-color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      {points.map((p) => (
        <circle cx={p.x} cy={p.y} fill="var(--wl-color-primary)" key={p.d.date} r={2.5}>
          <title>{`${formatMonthDay(p.d.date)} · ${formatWon(p.d.amount)}`}</title>
        </circle>
      ))}
      {labelIndexes.map((index) => (
        <text
          fill="var(--wl-color-text-secondary)"
          fontSize={10.5}
          key={index}
          textAnchor={index === 0 ? 'start' : index === daily.length - 1 ? 'end' : 'middle'}
          x={points[index].x}
          y={height - 4}
        >
          {formatMonthDay(daily[index].date)}
        </text>
      ))}
    </svg>
  )
}

/**
 * 예산 카드 클릭 시 뜨는 상세 모달. 디자인 원본(대시보드.dc.html의 sc-if detailOpen)을 그대로 옮깁니다.
 * 카테고리별 사용액·날짜별 소비 흐름·이 예산의 거래 목록은
 * GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/allocations/{allocationId} 하나로 채웁니다.
 * 남은 고정비·할부 "항목별" 목록은 아직 API에 없어(총액만 존재) 빈 상태로 남겨둡니다.
 */
export function BudgetDetailModal({
  scope,
  budget,
  periodLabel,
  scheduledRecurringExpenseAmount,
  ledgerId,
  startDate,
  onClose,
}: BudgetDetailModalProps) {
  const detail = useAllocationDetailQuery(ledgerId, startDate, budget.allocationId)

  const categoryTotal = detail.data ? detail.data.categorySpending.reduce((sum, item) => sum + item.amount, 0) : 0
  const categorySegments: DonutSegment[] = detail.data
    ? [...detail.data.categorySpending]
        .sort((a, b) => b.amount - a.amount)
        .map((item, index) => ({
          name: item.groupName,
          amount: formatWon(item.amount),
          percent: categoryTotal > 0 ? Math.round((item.amount / categoryTotal) * 100) : 0,
          color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
        }))
    : []

  return (
    <Modal onClose={onClose} subtitle={periodLabel} title={scope === 'shared' ? '공동 예산 상세' : '내 예산 상세'} width={760}>
      <div className="budget-detail-stats">
        <StatBlock amount={formatWon(budget.availableAmount)} label="남은 금액" size="lg" />
        <StatBlock amount={formatWon(budget.spentAmount)} label="사용 금액" size="sm" />
        <StatBlock amount={formatWon(budget.amount)} label="전체 예산" size="sm" />
      </div>

      <div className="budget-detail-columns">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>카테고리별 사용액</h3>
          <div style={{ marginTop: 14 }}>
            {detail.isLoading ? (
              <Skeleton height={112} radius={16} />
            ) : detail.isError ? (
              <ErrorState description="잠시 후 다시 시도해주세요." onRetry={() => detail.refetch()} title="사용액을 불러오지 못했습니다." />
            ) : categorySegments.length ? (
              <DonutChart segments={categorySegments} size={96} />
            ) : (
              <EmptyState description="이 예산 범위의 카테고리별 사용액이 아직 없어요." title="카테고리별 사용액이 없어요" />
            )}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '24px 0 0' }}>날짜별 소비 흐름</h3>
          <div style={{ marginTop: 14 }}>
            {detail.isLoading ? (
              <Skeleton height={140} radius={16} />
            ) : detail.isError ? (
              <ErrorState description="잠시 후 다시 시도해주세요." onRetry={() => detail.refetch()} title="소비 흐름을 불러오지 못했습니다." />
            ) : detail.data && detail.data.dailySpending.length ? (
              <DailySpendingChart daily={detail.data.dailySpending} />
            ) : (
              <EmptyState description="하루 단위 지출 추이가 아직 없어요." title="날짜별 소비 흐름이 없어요" />
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              background: 'var(--wl-color-surface-subtle)',
              border: '1px solid var(--wl-color-border)',
              borderRadius: 'var(--wl-radius-md)',
              padding: 16,
            }}
          >
            <p style={{ color: 'var(--wl-color-text-secondary)', fontSize: 12.5, fontWeight: 600, margin: 0 }}>
              이번 기간 남은 고정비와 할부
            </p>
            <p className="wl-tabular" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.03em', margin: '7px 0 0' }}>
              {formatWon(scheduledRecurringExpenseAmount)}
            </p>
            {/* TODO(api): 고정비·할부 항목별 목록(라벨, 회차, 금액)이 없습니다. 지금은 총액(scheduledRecurringExpenseAmount)만 있어요.
               예: GET /api/dashboard/current 에 upcomingFixedExpenses: { label, amount }[] 같은 필드가 필요합니다. */}
            <div style={{ marginTop: 12 }}>
              <EmptyState description="항목별 남은 고정비·할부 목록은 아직 준비 중이에요." title="항목별 목록이 없어요" />
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '24px 0 0' }}>이 예산의 거래</h3>
          {detail.isLoading ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <Skeleton height={56} radius={12} />
              <Skeleton height={56} radius={12} />
              <Skeleton height={56} radius={12} />
            </div>
          ) : detail.isError ? (
            <ErrorState description="잠시 후 다시 시도해주세요." onRetry={() => detail.refetch()} title="거래 목록을 불러오지 못했습니다." />
          ) : detail.data && detail.data.transactions.length ? (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
              {detail.data.transactions.map((transaction, index) => (
                <TransactionRow
                  amount={`${transaction.type === 'EXPENSE' ? '-' : transaction.type === 'INCOME' ? '+' : ''}${formatWon(transaction.amount)}`}
                  category={transaction.category?.name ?? '기타'}
                  divider={index > 0}
                  income={transaction.type === 'INCOME'}
                  key={transaction.id}
                  meta={transactionMeta(transaction)}
                  place={transaction.merchant || transaction.memo || transaction.category?.name || '미분류 거래'}
                />
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 12 }}>
              <EmptyState description="이 예산에 해당하는 거래 내역이 없어요." title="이 예산의 거래가 없어요" />
            </div>
          )}
          <Link
            style={{
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 12.5,
              fontWeight: 700,
              marginLeft: -10,
              marginTop: 8,
              minHeight: 44,
              padding: '0 10px',
            }}
            to="/transactions"
          >
            거래 내역에서 전체 보기
          </Link>
        </div>
      </div>
    </Modal>
  )
}
