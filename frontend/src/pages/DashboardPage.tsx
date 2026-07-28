import {
  ArrowLeftRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Repeat2,
  Wallet,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useDashboardSummaryQuery } from '../features/budget/model/budgetQueries'
import { useLedgersQuery } from '../features/ledger/model/ledgerQueries'
import { useNotificationsQuery } from '../features/notification/model/notificationQueries'
import { useSettlementSummaryQuery } from '../features/settlement/model/settlementQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { EmptyState, ErrorState } from '../shared/ui/DesignPrimitives'
import { useTransactionEntry } from '../shared/ui/TransactionEntryContext'

const categoryColors = [
  'var(--wl-data-coral)',
  'var(--wl-data-blue)',
  'var(--wl-data-violet)',
  'var(--wl-data-amber)',
  'var(--wl-data-neutral)',
]

type CategoryChartItem = {
  amount: number
  color: string
  key: string
  label: string
}

export function DashboardPage() {
  const { openTransactionEntry } = useTransactionEntry()
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const [budgetMonth, setBudgetMonth] = useState(formatBudgetMonth())
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null)
  const [previewCategoryKey, setPreviewCategoryKey] = useState<string | null>(null)
  const dashboardQuery = useDashboardSummaryQuery(budgetMonth)

  const currentLedger = dashboardQuery.data?.currentLedger
    ?? ledgersQuery.data?.ledgers?.find((ledger) => ledger.id === ledgersQuery.data?.currentLedgerId)
    ?? meQuery.data?.currentLedger
  const currentBudgetMonth = dashboardQuery.data?.budgetMonth ?? budgetMonth
  const notificationsQuery = useNotificationsQuery()
  const settlementQuery = useSettlementSummaryQuery(currentLedger?.id, currentBudgetMonth)
  const totalBudget = dashboardQuery.data?.totalBudgetAmount ?? 0
  const totalExpense = dashboardQuery.data?.totalExpenseAmount ?? 0
  const scheduledRecurringExpense = dashboardQuery.data?.scheduledRecurringExpenseAmount ?? 0
  const remainingBudget = dashboardQuery.data?.remainingBudgetAmount ?? 0
  const committedExpense = totalExpense + scheduledRecurringExpense
  const usage = totalBudget ? Math.min(100, Math.round((committedExpense / totalBudget) * 100)) : 0
  const memberSpending = dashboardQuery.data?.memberSpending ?? []
  const memberTotal = memberSpending.reduce((sum, member) => sum + member.amount, 0)
  const categoryItems = toCategoryChartItems(dashboardQuery.data?.categorySpending ?? [])
  const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0)
  const activeCategoryKey = previewCategoryKey ?? selectedCategoryKey
  const settlementAmount = settlementQuery.data?.transfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0,
  ) ?? 0
  const firstTransfer = settlementQuery.data?.transfers[0]
  const isGroupLedger = currentLedger?.type === 'GROUP'

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate replace to="/login" />
  }

  function moveMonth(offset: number) {
    const [year, month] = budgetMonth.split('-').map(Number)
    setBudgetMonth(formatBudgetMonth(new Date(year, month - 1 + offset, 1)))
    setSelectedCategoryKey(null)
    setPreviewCategoryKey(null)
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-page-header">
        <div className="dashboard-page-heading">
          <p className="dashboard-greeting">
            안녕하세요, {meQuery.data?.user.nickname ?? '사용자'}님
          </p>
          <div className="dashboard-ledger-title-row">
            <h1>{currentLedger?.name ?? '현재 장부'}</h1>
            <span className="dashboard-context-pill">
              {isGroupLedger ? '공동 장부' : '개인 장부'}
            </span>
          </div>
          <p className="dashboard-page-description">
            {currentBudgetMonth.replace('-', '년 ')}월도 예산과 지출을 확인하세요.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <div
            aria-label={`조회 월 선택, ${currentBudgetMonth.replace('-', '년 ')}월`}
            className="dashboard-month-picker"
            role="group"
          >
            <button aria-label="이전 달 보기" onClick={() => moveMonth(-1)} type="button">
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <strong>{currentBudgetMonth.replace('-', '. ')}</strong>
            <button aria-label="다음 달 보기" onClick={() => moveMonth(1)} type="button">
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
          <button
            aria-label={`알림 보기${notificationsQuery.data?.unreadCount ? `, 읽지 않은 알림 ${notificationsQuery.data.unreadCount}개` : ''}`}
            className="dashboard-icon-button"
            onClick={() => navigate('/notifications')}
            type="button"
          >
            <Bell aria-hidden="true" size={19} />
            {notificationsQuery.data?.unreadCount ? (
              <span className="dashboard-notification-count">
                {Math.min(notificationsQuery.data.unreadCount, 99)}
              </span>
            ) : null}
          </button>
          <button
            className="dashboard-primary-button"
            onClick={() => openTransactionEntry()}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            거래 추가
          </button>
        </div>
      </header>

      {meQuery.isLoading || dashboardQuery.isLoading ? <DashboardSkeleton /> : null}
      {dashboardQuery.isError ? (
        <div className="dashboard-query-state">
          <ErrorState onRetry={() => dashboardQuery.refetch()} />
        </div>
      ) : null}

      {meQuery.isSuccess && dashboardQuery.isSuccess ? (
        <>
          <section aria-labelledby="dashboard-summary-title" className="dashboard-summary">
            <header className="dashboard-summary-header">
              <h2 id="dashboard-summary-title">이번 달 요약</h2>
              {currentLedger ? (
                <Link to={`/ledgers/${currentLedger.id}/months/${currentBudgetMonth}`}>
                  예산 설정
                </Link>
              ) : null}
            </header>
            <div className="dashboard-summary-body">
              <article className="dashboard-primary-metric">
                <p className="dashboard-metric-label">이번 달 지출</p>
                <p className="dashboard-primary-amount">{formatWon(totalExpense)}</p>
                <p className="dashboard-primary-note">
                  총 예산 {formatWon(totalBudget)}
                  {scheduledRecurringExpense ? ` · 예정 ${formatWon(scheduledRecurringExpense)}` : ''}
                </p>
                <BudgetProgress value={usage} />
                <div className="dashboard-progress-caption">
                  <span>{totalBudget ? `예산 사용·예정 ${usage}%` : '예산을 설정해 주세요'}</span>
                  <span>
                    {remainingBudget < 0
                      ? `${formatWon(Math.abs(remainingBudget))} 초과`
                      : `${formatWon(remainingBudget)} 남음`}
                  </span>
                </div>
              </article>

              <div className="dashboard-metric-group">
                <SummaryMetric
                  icon={<Wallet aria-hidden="true" size={18} />}
                  label="남은 예산"
                  note={remainingBudget < 0 ? '예산 초과' : `전체 예산의 ${totalBudget ? Math.max(0, 100 - usage) : 0}%`}
                  tone={remainingBudget < 0 ? 'danger' : 'blue'}
                  value={formatWon(remainingBudget)}
                />
                <SummaryMetric
                  icon={<Repeat2 aria-hidden="true" size={18} />}
                  label="예정 정기비"
                  note={scheduledRecurringExpense ? '남은 예산에 반영됨' : '예정된 정기 지출 없음'}
                  tone="amber"
                  value={formatWon(scheduledRecurringExpense)}
                />
                <SummaryMetric
                  icon={<ArrowLeftRight aria-hidden="true" size={18} />}
                  label="정산 금액"
                  note={
                    settlementQuery.isLoading
                      ? '정산 정보를 확인하는 중'
                      : firstTransfer
                        ? `${firstTransfer.fromNickname} → ${firstTransfer.toNickname}`
                        : '정산 완료'
                  }
                  tone="violet"
                  value={settlementQuery.isLoading ? '—' : formatWon(settlementAmount)}
                />
              </div>
            </div>
          </section>

          <div className="dashboard-main-grid">
            <DashboardPanel
              action={<Link to="/calendar">전체 보기</Link>}
              description="가장 최근에 기록한 4건"
              title="최근 거래"
            >
              {dashboardQuery.data.recentTransactions.length ? (
                <ul className="dashboard-transaction-list">
                  {dashboardQuery.data.recentTransactions.slice(0, 4).map((transaction) => (
                    <li key={transaction.id}>
                      <Link
                        className="dashboard-transaction-row"
                        to={`/transactions/${transaction.id}`}
                      >
                        <CategoryBadge name={transaction.category?.name} size="sm" />
                        <span className="dashboard-transaction-copy">
                          <strong>
                            {transaction.memo || transaction.category?.name || '거래'}
                          </strong>
                          <span>
                            {transaction.transactionDate.replaceAll('-', '.')} ·{' '}
                            {transaction.payer.nickname} ·{' '}
                            {transaction.card?.name
                              ?? (transaction.paymentMethod === 'CARD' ? '카드' : '현금')}
                          </span>
                        </span>
                        <strong
                          className={`dashboard-transaction-amount ${transaction.type === 'INCOME' ? 'is-income' : ''}`}
                        >
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatWon(transaction.amount)}
                          <span>{transaction.type === 'INCOME' ? '수입' : '지출'}</span>
                        </strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-panel-empty">
                  <EmptyState
                    action={(
                      <button
                        className="dashboard-empty-action"
                        onClick={() => openTransactionEntry()}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={16} />
                        거래 기록
                      </button>
                    )}
                    description="첫 거래를 기록하면 이곳에서 바로 확인할 수 있어요."
                    title="최근 등록된 거래가 없어요."
                  />
                </div>
              )}
            </DashboardPanel>

            <div className="dashboard-side-column">
              <DashboardPanel
                action={<Link to="/stats">분석 보기</Link>}
                description="금액이 큰 순서로 표시"
                title="카테고리별 지출"
              >
                {categoryItems.length ? (
                  <CategoryDonut
                    activeKey={activeCategoryKey}
                    items={categoryItems}
                    onPreview={setPreviewCategoryKey}
                    onSelect={(key) => setSelectedCategoryKey((current) => current === key ? null : key)}
                    selectedKey={selectedCategoryKey}
                    total={categoryTotal}
                  />
                ) : (
                  <div className="dashboard-panel-empty">
                    <EmptyState
                      description="지출을 기록하면 카테고리별 비중을 확인할 수 있어요."
                      title="표시할 카테고리 지출이 없어요."
                    />
                  </div>
                )}
              </DashboardPanel>

              <DashboardPanel
                action={
                  currentLedger ? (
                    <Link to={`/ledgers/${currentLedger.id}/months/${currentBudgetMonth}`}>
                      예산 보기
                    </Link>
                  ) : null
                }
                description={isGroupLedger ? '멤버별 결제 금액' : '이번 달 결제 금액'}
                title={isGroupLedger ? '함께 쓴 비용' : '내 지출 기록'}
              >
                {memberSpending.length ? (
                  <div className="dashboard-shared-body">
                    <div className="dashboard-shared-total">
                      <div>
                        <p>{isGroupLedger ? '공동 비용 합계' : '결제 합계'}</p>
                        <strong>{formatWon(memberTotal)}</strong>
                      </div>
                      <span className={settlementAmount ? 'needs-settlement' : ''}>
                        {settlementQuery.isLoading
                          ? '확인 중'
                          : settlementAmount
                            ? '정산 필요'
                            : '정산할 금액 없음'}
                      </span>
                    </div>
                    <ul className="dashboard-member-list">
                      {memberSpending.map((member, index) => (
                        <li key={member.userId}>
                          <span>
                            <i style={{ background: categoryColors[index % categoryColors.length] }} />
                            {member.nickname}님이 결제
                          </span>
                          <strong>{formatWon(member.amount)}</strong>
                        </li>
                      ))}
                    </ul>
                    <p className="dashboard-shared-note">
                      {firstTransfer
                        ? `${firstTransfer.fromNickname}님이 ${firstTransfer.toNickname}님에게 ${formatWon(firstTransfer.amount)}을 보내면 정산됩니다.`
                        : '현재 정산할 금액이 없습니다.'}
                    </p>
                  </div>
                ) : (
                  <div className="dashboard-panel-empty">
                    <EmptyState
                      description="거래를 기록하면 결제자별 금액을 확인할 수 있어요."
                      title="이번 달 결제 기록이 없어요."
                    />
                  </div>
                )}
              </DashboardPanel>
            </div>
          </div>

          <section aria-label="대시보드 보조 기능" className="dashboard-support-grid">
            <DashboardPanel description="자주 쓰는 항목으로 바로 시작" title="빠른 기록">
              <div className="dashboard-quick-actions">
                {[
                  { label: '커피', categoryName: '카페' },
                  { label: '식비', categoryName: '식비' },
                  { label: '마트', categoryName: '생활' },
                  { label: '교통', categoryName: '교통' },
                ].map(({ label, categoryName }) => (
                  <button
                    aria-label={label}
                    key={label}
                    onClick={() => openTransactionEntry({ categoryName, memo: label })}
                    type="button"
                  >
                    <CategoryBadge name={label} size="sm" />
                    <span>{label}</span>
                  </button>
                ))}
                <button
                  className="dashboard-quick-more"
                  onClick={() => openTransactionEntry()}
                  type="button"
                >
                  <Plus aria-hidden="true" size={17} />
                  직접 입력
                </button>
              </div>
            </DashboardPanel>

            <DashboardPanel
              action={<Link to="/cards">카드 관리</Link>}
              description="등록한 카드의 다음 예상 금액"
              title="다음 카드값"
            >
              {dashboardQuery.data.cardPaymentSummaries?.length ? (
                <ul className="dashboard-card-payment-list">
                  {dashboardQuery.data.cardPaymentSummaries.slice(0, 3).map((summary) => (
                    <li key={summary.cardId}>
                      <span className="dashboard-card-payment-icon">
                        <CreditCard aria-hidden="true" size={18} />
                      </span>
                      <span>
                        <strong>{summary.cardName}</strong>
                        <small>{summary.expectedPaymentMonth.replace('-', '년 ')}월 예상 결제</small>
                      </span>
                      <strong>{formatWon(summary.totalAmount)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-panel-empty">
                  <EmptyState
                    description="카드를 등록하면 다음 예상 금액을 확인할 수 있어요."
                    title="등록된 카드가 없어요."
                  />
                </div>
              )}
            </DashboardPanel>
          </section>
        </>
      ) : null}
    </main>
  )
}

function DashboardPanel({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action ? <div className="dashboard-panel-action">{action}</div> : null}
      </header>
      {children}
    </section>
  )
}

function SummaryMetric({
  icon,
  label,
  note,
  tone,
  value,
}: {
  icon: ReactNode
  label: string
  note: string
  tone: 'amber' | 'blue' | 'danger' | 'violet'
  value: string
}) {
  return (
    <article className={`dashboard-secondary-metric is-${tone}`}>
      <span className="dashboard-secondary-icon">{icon}</span>
      <div>
        <p className="dashboard-metric-label">{label}</p>
        <p className="dashboard-secondary-amount">{value}</p>
        <p className="dashboard-secondary-note">{note}</p>
      </div>
    </article>
  )
}

function BudgetProgress({ value }: { value: number }) {
  return (
    <div
      aria-label="이번 달 예산 사용률"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="dashboard-budget-progress"
      role="progressbar"
    >
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

function CategoryDonut({
  activeKey,
  items,
  onPreview,
  onSelect,
  selectedKey,
  total,
}: {
  activeKey: string | null
  items: CategoryChartItem[]
  onPreview: (key: string | null) => void
  onSelect: (key: string) => void
  selectedKey: string | null
  total: number
}) {
  const activeItem = items.find((item) => item.key === activeKey)
  const segments = items.map((item, index) => {
    const percentage = total ? (item.amount / total) * 100 : 0
    const offset = items
      .slice(0, index)
      .reduce((sum, previousItem) => sum + (total ? (previousItem.amount / total) * 100 : 0), 0)

    return { ...item, offset, percentage }
  })
  const chartLabel = items
    .map((item) => `${item.label} ${total ? Math.round((item.amount / total) * 100) : 0}%`)
    .join(', ')

  return (
    <div className="dashboard-category-chart">
      <div className="dashboard-donut">
        <svg
          aria-label={`카테고리 지출 비율: ${chartLabel}`}
          className="dashboard-donut-svg"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle className="dashboard-donut-track" cx="60" cy="60" r="46" />
          {segments.map((segment) => (
            <circle
              aria-hidden="true"
              className={`dashboard-donut-segment ${activeKey === segment.key ? 'is-active' : ''} ${activeKey && activeKey !== segment.key ? 'is-muted' : ''}`}
              cx="60"
              cy="60"
              key={segment.key}
              onClick={() => onSelect(segment.key)}
              onMouseEnter={() => onPreview(segment.key)}
              onMouseLeave={() => onPreview(null)}
              pathLength="100"
              r="46"
              style={{
                '--segment-color': segment.color,
                strokeDasharray: `${segment.percentage} ${100 - segment.percentage}`,
                strokeDashoffset: -segment.offset,
              } as CSSProperties}
              transform="rotate(-90 60 60)"
            />
          ))}
        </svg>
        <div className="dashboard-donut-center">
          <span>{activeItem ? activeItem.label : '총 지출'}</span>
          <strong>{formatWon(activeItem?.amount ?? total)}</strong>
        </div>
      </div>

      <div className="dashboard-category-list">
        {items.map((item) => {
          const percentage = total ? Math.round((item.amount / total) * 100) : 0
          return (
            <button
              aria-label={`${item.label} 카테고리, ${formatWon(item.amount)}, ${percentage}%`}
              aria-pressed={selectedKey === item.key}
              className={`${activeKey === item.key ? 'is-active' : ''} ${activeKey && activeKey !== item.key ? 'is-muted' : ''}`}
              key={item.key}
              onBlur={() => onPreview(null)}
              onClick={() => onSelect(item.key)}
              onFocus={() => onPreview(item.key)}
              onMouseEnter={() => onPreview(item.key)}
              onMouseLeave={() => onPreview(null)}
              type="button"
            >
              <CategoryBadge name={item.label} size="sm" />
              <span>{item.label}</span>
              <strong>
                {formatWon(item.amount)}
                <small>{percentage}%</small>
              </strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-label="대시보드를 불러오는 중입니다." className="dashboard-skeleton" role="status">
      <span />
      <div>
        <span />
        <span />
      </div>
    </div>
  )
}

function toCategoryChartItems(
  items: Array<{ amount: number; categoryGroupId: number; categoryName: string }>,
): CategoryChartItem[] {
  const sorted = items.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
  const visible = sorted.length > 5 ? sorted.slice(0, 4) : sorted
  const result = visible.map((item, index) => ({
    amount: item.amount,
    color: categoryColors[index],
    key: String(item.categoryGroupId),
    label: item.categoryName,
  }))

  if (sorted.length > 5) {
    result.push({
      amount: sorted.slice(4).reduce((sum, item) => sum + item.amount, 0),
      color: categoryColors[4],
      key: 'other',
      label: '기타',
    })
  }

  return result
}
