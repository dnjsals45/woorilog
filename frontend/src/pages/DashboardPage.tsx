import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BudgetDetailModal } from '../features/budget/ui/BudgetDetailModal'
import { useDashboardSummaryQuery } from '../features/budget/model/budgetQueries'
import { NotificationInbox } from '../features/notification/ui/NotificationInbox'
import { useNotificationsQuery } from '../features/notification/model/notificationQueries'
import type { DashboardBudget } from '../features/budget/api/budgetApi'
import type { TransactionSummary } from '../features/transaction/api/transactionApi'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { AppHeader } from '../shared/ui/AppHeader'
import { DonutChart, type DonutSegment } from '../shared/ui/DonutChart'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import { Skeleton } from '../shared/ui/Skeleton'
import { StatBlock } from '../shared/ui/StatBlock'
import { TransactionRow } from '../shared/ui/TransactionRow'
import { useTransactionEntry } from '../shared/ui/TransactionEntryContext'

/* 카테고리 도넛과 구성원 지출 막대는 원본 목데이터(CATEGORIES)처럼 항목마다 색을 고정하지 않고,
 * 데이터 색 토큰을 순서대로 돌려 씁니다 — 실제 카테고리·구성원 수는 장부마다 다르기 때문입니다. */
const CATEGORY_PALETTE = [
  'var(--wl-data-coral)',
  'var(--wl-data-violet)',
  'var(--wl-brand-600)',
  'var(--wl-data-blue)',
  'var(--wl-data-amber)',
  'var(--wl-data-neutral)',
]
const MEMBER_PALETTE = ['var(--wl-data-blue)', 'var(--wl-data-violet)', 'var(--wl-data-amber)', 'var(--wl-data-coral)']

const GUIDES: Record<'INVITE_PARTNER' | 'ALLOCATE_BUDGET' | 'ADD_FIRST_TRANSACTION', { title: string; body: string; cta: string }> = {
  INVITE_PARTNER: {
    title: '아직 상대방이 참여하지 않았어요',
    body: '초대 링크를 보내 함께 쓸 사람을 먼저 초대해 주세요. 링크는 만든 뒤 30분 동안만 쓸 수 있어요.',
    cta: '초대 링크 만들기',
  },
  ALLOCATE_BUDGET: {
    title: '두 사람의 예산 배분을 정해주세요',
    body: '전체 예산을 각자의 할당 예산과 공동 예산으로 나누면 남은 금액과 주간 권장액을 볼 수 있어요.',
    cta: '예산 배분 정하기',
  },
  ADD_FIRST_TRANSACTION: {
    title: '첫 거래를 기록해 볼까요?',
    body: '금액만 입력하는 빠른 기록으로 시작하거나, 영수증과 카드 앱 캡처를 여러 장 올려 한 번에 가져올 수 있어요.',
    cta: '거래 기록하기',
  },
}

function budgetRatio(budget: DashboardBudget) {
  return budget.amount > 0 ? Math.round((budget.spentAmount / budget.amount) * 100) : 0
}

function progressColor(ratio: number) {
  if (ratio >= 90) return 'var(--wl-color-danger)'
  if (ratio >= 60) return 'var(--wl-data-amber)'
  return 'var(--wl-color-primary)'
}

/* 원본 renderVals()의 "남은 N일 동안 하루 X원씩" 안내를 그대로 옮기되,
 * 입력은 실제 사용 가능액과 기간 종료일입니다. */
function paceNote(available: number, endDate?: string) {
  if (!endDate) return undefined
  const end = new Date(`${endDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86_400_000) + 1
  if (daysLeft <= 0) return undefined
  if (available <= 0) return '이미 예산을 다 사용했어요.'
  const perDay = Math.floor(available / daysLeft)
  return `남은 ${daysLeft}일 동안 하루 ${formatWon(perDay)}씩 쓰면 예산 안에서 끝나요.`
}

/** 'YYYY-MM'을 delta개월만큼 이동합니다. AppHeader의 월 이동 화살표에서 씁니다. */
function shiftBudgetMonth(budgetMonth: string, delta: number): string {
  const [year, month] = budgetMonth.split('-').map(Number)
  return formatBudgetMonth(new Date(year, month - 1 + delta, 1))
}

function budgetMonthLabel(budgetMonth: string): string {
  const [year, month] = budgetMonth.split('-')
  return `${year}년 ${Number(month)}월`
}

/* 원본의 "이번 주 남은 N일 기준" 안내를 그대로 옮기되, 남은 일수는 weekStartDate(이번 주 시작일)로 계산합니다. */
function weeklyGuideNote(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86_400_000) + 1)
  return `이번 주 남은 ${daysLeft}일 기준`
}

function paymentMethodLabel(transaction: TransactionSummary): string | undefined {
  if (transaction.card?.name) return transaction.card.name
  const method = transaction.paymentMethod
  if (!method) return undefined
  const type = typeof method === 'string' ? method : method.type
  const displayName = typeof method === 'object' ? method.displayName : undefined
  if (displayName) return displayName
  if (type === 'CASH') return '현금'
  if (type === 'CARD') return '카드'
  if (type === 'OTHER') return '기타'
  return undefined
}

function transactionScopeLabel(transaction: TransactionSummary): string {
  if (transaction.scope?.type === 'SHARED') return '공동'
  return transaction.payer?.nickname ?? '개인'
}

export function DashboardPage() {
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState<string | undefined>(undefined)
  const dashboard = useDashboardSummaryQuery(selectedBudgetMonth)
  const notifications = useNotificationsQuery()
  const { openTransactionEntry } = useTransactionEntry()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [budgetDetailScope, setBudgetDetailScope] = useState<'shared' | 'mine' | null>(null)

  if (dashboard.isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-skeleton">
          <Skeleton height={210} radius={18} />
          <div>
            <Skeleton height={320} radius={18} />
            <Skeleton height={320} radius={18} />
          </div>
        </div>
      </div>
    )
  }
  if (dashboard.isError) {
    return (
      <div className="dashboard-page">
        <ErrorState onRetry={() => dashboard.refetch()} />
      </div>
    )
  }
  const data = dashboard.data
  if (!data) {
    return (
      <div className="dashboard-page">
        <EmptyState description="잠시 후 다시 시도해주세요." title="대시보드를 준비하지 못했습니다." />
      </div>
    )
  }

  const ledgerName = data.ledger?.name ?? data.currentLedger.name
  const unreadCount = notifications.data?.unreadCount ?? 0
  const guide = data.emptyState && data.emptyState !== 'READY' ? GUIDES[data.emptyState] : undefined
  const guideHref =
    data.emptyState === 'INVITE_PARTNER'
      ? data.ledger?.id
        ? `/ledgers/${data.ledger.id}/settings`
        : '/settings'
      : data.emptyState === 'ALLOCATE_BUDGET'
        ? '/budget'
        : undefined

  const heroBudget = data.sharedBudget ?? data.myBudget
  const heroLabel = data.sharedBudget ? '공동 예산에서 더 쓸 수 있는 돈' : '내 예산에서 더 쓸 수 있는 돈'
  const heroRatio = heroBudget ? budgetRatio(heroBudget) : 0
  const heroScope: 'shared' | 'mine' = data.sharedBudget ? 'shared' : 'mine'
  const periodLabel = data.period ? `${data.period.startDate} ~ ${data.period.endDate}` : undefined
  const currentBudgetMonth = data.budgetMonth

  const categoryTotal = data.categorySpending.reduce((sum, item) => sum + item.amount, 0)
  const categorySegments: DonutSegment[] = [...data.categorySpending]
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      name: item.categoryName,
      amount: formatWon(item.amount),
      percent: categoryTotal > 0 ? Math.round((item.amount / categoryTotal) * 100) : 0,
      color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
    }))

  const memberTotal = data.memberSpending.reduce((sum, item) => sum + item.amount, 0)

  return (
    <>
      <AppHeader
        actions={
          <>
            <Link
              aria-label="이미지로 거래 가져오기"
              className="dashboard-icon-button"
              style={{ color: 'var(--wl-color-text-secondary)', height: 40, width: 40 }}
              to="/transactions/import"
            >
              <Icon name="camera" size="md" />
            </Link>
            <button
              aria-label={`알림${unreadCount ? ` ${unreadCount}개` : ''}`}
              className="dashboard-icon-button"
              onClick={() => setNotifOpen((current) => !current)}
              style={{ height: 40, width: 40 }}
              type="button"
            >
              <Icon name="bell" size="md" />
              {unreadCount ? <span className="dashboard-notification-count">{Math.min(99, unreadCount)}</span> : null}
            </button>
            <button
              className="dashboard-primary-button"
              onClick={() => openTransactionEntry()}
              style={{ minHeight: 40 }}
              type="button"
            >
              <Icon name="plus" size="md" />
              거래 추가
            </button>
          </>
        }
        description="한 눈에 빠르게 현재 소비 현황을 파악해요"
        meta={periodLabel}
        /* 모바일에서 "거래 추가"는 화면 우하단 FAB 이 맡습니다. 헤더에 또 두지 않습니다. */
        mobileActions={
          <>
            <Link
              aria-label="이미지로 거래 가져오기"
              className="wl-icon-button wl-icon-button--subtle"
              to="/transactions/import"
            >
              <Icon name="camera" size="lg" />
            </Link>
            <button
              aria-label={`알림${unreadCount ? ` ${unreadCount}개` : ''}`}
              className="wl-icon-button wl-icon-button--subtle"
              onClick={() => setNotifOpen((current) => !current)}
              style={{ position: 'relative' }}
              type="button"
            >
              <Icon name="bell" size="lg" />
              {unreadCount ? <span className="dashboard-notification-count">{Math.min(99, unreadCount)}</span> : null}
            </button>
          </>
        }
        stepper={
          currentBudgetMonth
            ? {
                label: budgetMonthLabel(currentBudgetMonth),
                onPrev: () => setSelectedBudgetMonth(shiftBudgetMonth(currentBudgetMonth, -1)),
                onNext: () => setSelectedBudgetMonth(shiftBudgetMonth(currentBudgetMonth, 1)),
                disableNext: currentBudgetMonth >= formatBudgetMonth(new Date()),
                nextLabel: '다음 달',
                prevLabel: '이전 달',
              }
            : undefined
        }
        title={ledgerName}
      />
      <NotificationInbox onClose={() => setNotifOpen(false)} open={notifOpen} />

      <div className="dashboard-page">
        {guide ? (
          <section className="dash-guide">
            <div style={{ minWidth: 0 }}>
              <h2 className="wl-section-title" style={{ color: 'var(--wl-color-primary-dark)', margin: 0 }}>
                {guide.title}
              </h2>
              <p className="wl-body" style={{ margin: '7px 0 0', wordBreak: 'keep-all' }}>
                {guide.body}
              </p>
            </div>
            {guideHref ? (
              <Link className="dashboard-primary-button" style={{ color: '#fff', flex: 'none', minHeight: 44 }} to={guideHref}>
                {guide.cta}
              </Link>
            ) : (
              <button
                className="dashboard-primary-button"
                onClick={() => openTransactionEntry()}
                style={{ flex: 'none', minHeight: 44 }}
                type="button"
              >
                {guide.cta}
              </button>
            )}
          </section>
        ) : null}

        {heroBudget ? (
          <section className="dash-hero">
            <StatBlock
              action={{ label: `${data.sharedBudget ? '공동 예산' : '내 예산'} 상세 보기`, onClick: () => setBudgetDetailScope(heroScope) }}
              amount={formatWon(heroBudget.availableAmount)}
              label={heroLabel}
              note={paceNote(heroBudget.availableAmount, data.period?.endDate)}
              progress={{
                color: progressColor(heroRatio),
                left: `${formatWon(heroBudget.amount)} 중 ${formatWon(heroBudget.spentAmount)} 사용`,
                percent: heroRatio,
                right: `사용률 ${heroRatio}%`,
              }}
              size="hero"
            />
            <div className="dash-hero-divider" />
            <div className="dash-hero-stats">
              {data.myBudget ? (
                <StatBlock
                  action={{ label: '상세 보기', onClick: () => setBudgetDetailScope('mine') }}
                  amount={formatWon(data.myBudget.availableAmount)}
                  icon="circle-dollar-sign"
                  label="내 예산 잔액"
                  note={`${formatWon(data.myBudget.amount)} 중 ${formatWon(data.myBudget.spentAmount)} 사용`}
                />
              ) : null}
              {data.weeklyGuide ? (
                <StatBlock
                  amount={formatWon(data.weeklyGuide.recommendedAmount)}
                  icon="sliders-horizontal"
                  label="이번주 추천 남은 금액"
                  note={weeklyGuideNote(data.weeklyGuide.weekStartDate)}
                />
              ) : null}
              {data.incomeAmount != null ? (
                <StatBlock amount={formatWon(data.incomeAmount)} icon="receipt" label="기간 수입" tone="var(--wl-data-blue-ink)" />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="dash-main">
          <div>
            <div style={{ alignItems: 'baseline', display: 'flex', gap: 16, justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 className="wl-section-title" style={{ margin: 0 }}>
                최근 거래
              </h2>
              <Link className="wl-label" style={{ color: 'var(--wl-color-primary-dark)', fontWeight: 600 }} to="/transactions">
                전체 보기
              </Link>
            </div>
            {data.recentTransactions.length ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.recentTransactions.slice(0, 6).map((transaction) => (
                  <TransactionRow
                    amount={`${transaction.type === 'EXPENSE' ? '-' : transaction.type === 'INCOME' ? '+' : ''}${formatWon(transaction.amount)}`}
                    category={transaction.category?.name ?? '기타'}
                    income={transaction.type === 'INCOME'}
                    key={transaction.id}
                    meta={`${transaction.transactionDate} · ${transaction.category?.name ?? '미분류'} · ${transactionScopeLabel(transaction)}`}
                    method={paymentMethodLabel(transaction)}
                    place={transaction.merchant || transaction.memo || transaction.category?.name || '미분류 거래'}
                    spacious
                  />
                ))}
              </ul>
            ) : (
              <EmptyState description="빠른 기록이나 이미지 가져오기로 첫 거래를 남겨보세요." title="아직 거래가 없습니다." />
            )}
          </div>

          <div className="dash-side">
            <section className="dashboard-panel" style={{ padding: 20 }}>
              <h2 className="wl-section-title" style={{ margin: 0 }}>
                이번달 소비 금액
              </h2>
              <p className="wl-meta" style={{ margin: '14px 0 0' }}>
                공동 지출 합계
              </p>
              <strong
                className="wl-tabular"
                style={{ display: 'block', fontSize: 26, fontWeight: 700, letterSpacing: '-.03em', marginTop: 6 }}
              >
                {formatWon(data.totalExpenseAmount)}
              </strong>
              {data.memberSpending.length ? (
                <ul
                  style={{
                    borderTop: '1px solid var(--wl-color-border)',
                    display: 'grid',
                    gap: 12,
                    listStyle: 'none',
                    margin: '16px 0 0',
                    padding: '14px 0 0',
                  }}
                >
                  {data.memberSpending.map((member, index) => {
                    const ratio = memberTotal > 0 ? Math.round((member.amount / memberTotal) * 100) : 0
                    return (
                      <li key={member.userId}>
                        <span
                          className="wl-body"
                          style={{ alignItems: 'baseline', display: 'flex', fontSize: 13.5, justifyContent: 'space-between' }}
                        >
                          {member.nickname}
                          <strong className="wl-tabular" style={{ color: 'var(--wl-color-text-main)', fontWeight: 700 }}>
                            {formatWon(member.amount)}
                          </strong>
                        </span>
                        <span
                          style={{
                            background: 'var(--wl-color-surface-subtle)',
                            borderRadius: 'var(--wl-radius-pill)',
                            display: 'block',
                            height: 6,
                            marginTop: 6,
                          }}
                        >
                          <span
                            style={{
                              background: MEMBER_PALETTE[index % MEMBER_PALETTE.length],
                              borderRadius: 'inherit',
                              display: 'block',
                              height: '100%',
                              width: `${ratio}%`,
                            }}
                          />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>

            <section className="dashboard-panel" style={{ padding: 20 }}>
              <div style={{ alignItems: 'baseline', display: 'flex', justifyContent: 'space-between' }}>
                <h2 className="wl-section-title" style={{ margin: 0 }}>
                  카테고리별 지출
                </h2>
                <Link className="wl-label" style={{ color: 'var(--wl-color-primary-dark)', fontWeight: 600 }} to="/analysis">
                  분석
                </Link>
              </div>
              {categorySegments.length ? (
                <div style={{ marginTop: 16 }}>
                  <DonutChart onSelect={setSelectedCategory} segments={categorySegments} selected={selectedCategory} />
                </div>
              ) : (
                <EmptyState description="거래를 기록하면 카테고리별 지출을 볼 수 있어요." title="아직 지출 내역이 없습니다." />
              )}
            </section>
          </div>
        </section>
      </div>

      {budgetDetailScope && (budgetDetailScope === 'shared' ? data.sharedBudget : data.myBudget) ? (
        <BudgetDetailModal
          budget={(budgetDetailScope === 'shared' ? data.sharedBudget : data.myBudget) as DashboardBudget}
          ledgerId={data.ledger?.id ?? data.currentLedger.id}
          onClose={() => setBudgetDetailScope(null)}
          periodLabel={periodLabel}
          scheduledRecurringExpenseAmount={data.scheduledRecurringExpenseAmount}
          scope={budgetDetailScope}
          startDate={data.period?.startDate}
        />
      ) : null}
    </>
  )
}
