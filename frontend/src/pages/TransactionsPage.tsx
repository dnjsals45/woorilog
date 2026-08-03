import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useDashboardSummaryQuery } from '../features/budget/model/budgetQueries'
import { useTransactionsQuery } from '../features/transaction/model/transactionQueries'
import type { TransactionSummary } from '../features/transaction/api/transactionApi'
import { TransactionImportModal } from '../features/import/ui/TransactionImportModal'
import { TransactionDetailModal } from '../features/transaction/ui/TransactionDetailModal'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { AppHeader } from '../shared/ui/AppHeader'
import { CalendarGrid } from '../shared/ui/CalendarGrid'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import type { IconName } from '../shared/ui/Icon'
import { Toast } from '../shared/ui/Toast'
import { TransactionRow } from '../shared/ui/TransactionRow'
import { useTransactionEntry } from '../shared/ui/TransactionEntryContext'

type TypeFilter = 'ALL' | 'EXPENSE' | 'INCOME'
type BudgetFilter = 'ALL' | 'SHARED' | 'PERSONAL'

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EXPENSE', label: '지출' },
  { value: 'INCOME', label: '수입' },
]

const BUDGET_FILTERS: { value: BudgetFilter; label: string }[] = [
  { value: 'ALL', label: '예산 전체' },
  { value: 'SHARED', label: '공동' },
  { value: 'PERSONAL', label: '내 예산' },
]

const UNCLASSIFIED_FILTER_LABEL = '미분류'

// 목록 박스가 달력 박스 높이를 따라가고, 그 안에서 자연 행 높이만큼 페이지를 나눕니다(가계부.dc.html fitRows 이식).
const LIST_HEADER_HEIGHT = 70
const LIST_FOOTER_HEIGHT = 53
const ROW_HEIGHT = 56
const MIN_PER_PAGE = 3
const FALLBACK_PER_PAGE = 6

function chipStyle(active: boolean) {
  return {
    minHeight: 40,
    padding: '0 13px',
    borderRadius: 'var(--wl-radius-pill)',
    border: '1px solid',
    borderColor: active ? 'var(--wl-color-primary)' : 'var(--wl-color-border)',
    background: active ? 'var(--wl-brand-50)' : 'var(--wl-color-surface)',
    color: active ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-body)',
    fontSize: 12.5,
    fontWeight: 600,
  } as const
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

function budgetChipLabel(transaction: TransactionSummary): string {
  const scopeType = transaction.scope?.type ?? transaction.budgetSource?.type
  return scopeType === 'SHARED' ? '공동' : '내 예산'
}

export function TransactionsPage() {
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id

  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState<string | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('ALL')
  const [unclassifiedOnly, setUnclassifiedOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<number | undefined>(undefined)
  const calendarBoxRef = useRef<HTMLDivElement>(null)
  const [boxHeight, setBoxHeight] = useState(0)

  const deferredQuery = useDeferredValue(query.trim())
  const { openTransactionEntry } = useTransactionEntry()

  const dashboardQuery = useDashboardSummaryQuery(selectedBudgetMonth)
  const budgetMonth = dashboardQuery.data?.budgetMonth ?? selectedBudgetMonth ?? formatBudgetMonth(new Date())
  const period = dashboardQuery.data?.period ?? null
  const monthNumber = Number(budgetMonth.slice(5, 7))

  const transactionsQuery = useTransactionsQuery(period ? ledgerId : undefined, {
    periodStart: period?.startDate,
    limit: 100,
    query: deferredQuery || undefined,
    types: typeFilter === 'ALL' ? undefined : [typeFilter],
    scopes: budgetFilter === 'ALL' ? undefined : [budgetFilter],
    unclassified: unclassifiedOnly || undefined,
  })
  const monthItems = useMemo(() => transactionsQuery.data?.items ?? [], [transactionsQuery.data])

  useEffect(() => {
    const el = calendarBoxRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver((entries) => {
      const height = Math.round(entries[0]?.contentRect.height ?? 0)
      if (height) setBoxHeight(height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

  function showToast(text: string) {
    window.clearTimeout(toastTimerRef.current)
    setToast(text)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3500)
  }

  function resetPage() {
    setPage(0)
  }

  // 유형·예산·미분류·검색어는 서버(GET /transactions)가 이미 걸러서 내려줍니다.
  // 날짜별 보기는 서버 파라미터가 없어(달만 있고 특정 일자는 없음) 달 전체를 받아 여기서 고릅니다.
  const shown = useMemo(
    () => monthItems.filter((item) => !selectedDate || item.transactionDate === selectedDate),
    [monthItems, selectedDate],
  )

  const shownExpense = shown.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0)
  const shownIncome = shown.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0)

  const perPage = boxHeight
    ? Math.max(MIN_PER_PAGE, Math.floor((boxHeight - LIST_HEADER_HEIGHT - LIST_FOOTER_HEIGHT) / ROW_HEIGHT))
    : FALLBACK_PER_PAGE
  const pageCount = Math.max(1, Math.ceil(shown.length / perPage))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * perPage
  const pageItems = shown.slice(pageStart, pageStart + perPage)

  const transactionDates = useMemo(() => monthItems.map((item) => item.transactionDate), [monthItems])

  const dataLoading = meQuery.isLoading || dashboardQuery.isLoading
  const dataError = dashboardQuery.isError || transactionsQuery.isError

  return (
    <>
      <AppHeader
        actions={
          <>
            {/* 디자인상 이미지 업로드는 별도 화면이 아니라 중앙 모달이다. */}
            <button
              aria-label="이미지로 거래 가져오기"
              className="dashboard-icon-button"
              onClick={() => setImportOpen(true)}
              style={{ color: 'var(--wl-color-text-secondary)', height: 40, width: 40 }}
              type="button"
            >
              <Icon name="camera" size="md" />
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
        description="달력에서 날짜를 고르면 그날의 거래만 볼 수 있어요"
        mobileActions={
          <button
            aria-label="이미지로 거래 가져오기"
            className="wl-icon-button wl-icon-button--subtle"
            onClick={() => setImportOpen(true)}
            type="button"
          >
            <Icon name="camera" size="lg" />
          </button>
        }
        title="가계부"
      />

      <div className="tx-filter-bar">
        <label className="tx-search">
          <Icon name="search" size="sm" />
          <input
            aria-label="거래 검색"
            className="tx-search-input"
            onChange={(event) => {
              setQuery(event.target.value)
              resetPage()
            }}
            placeholder="사용처나 카테고리로 찾기"
            type="text"
            value={query}
          />
          {query ? (
            <button
              aria-label="검색어 지우기"
              onClick={() => {
                setQuery('')
                resetPage()
              }}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 26,
                height: 26,
                flex: 'none',
                borderRadius: '50%',
                background: 'var(--wl-color-surface-subtle)',
                color: 'var(--wl-color-text-secondary)',
              }}
              type="button"
            >
              <Icon name="x" size="sm" />
            </button>
          ) : null}
        </label>

        <div className="tx-chip-group">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setTypeFilter(filter.value)
                resetPage()
              }}
              style={chipStyle(typeFilter === filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <span className="tx-divider" />

        <div className="tx-chip-group">
          {BUDGET_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setBudgetFilter(filter.value)
                resetPage()
              }}
              style={chipStyle(budgetFilter === filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <span className="tx-divider" />

        <button
          aria-pressed={unclassifiedOnly}
          onClick={() => {
            setUnclassifiedOnly((current) => !current)
            resetPage()
          }}
          style={chipStyle(unclassifiedOnly)}
          type="button"
        >
          {UNCLASSIFIED_FILTER_LABEL}
        </button>
      </div>

      {dataError ? (
        <div style={{ padding: '24px 32px' }}>
          <ErrorState onRetry={() => { dashboardQuery.refetch(); transactionsQuery.refetch() }} />
        </div>
      ) : (
        <div className="tx-main-grid">
          <section
            className="dashboard-panel"
            ref={calendarBoxRef}
            style={{ padding: '18px 20px 20px' }}
          >
            <div style={{ minHeight: 340 }}>
              <CalendarGrid
                budgetMonth={budgetMonth}
                onMonthChange={(next) => {
                  setSelectedBudgetMonth(next)
                  setSelectedDate(null)
                  resetPage()
                }}
                onSelectDate={(date) => {
                  setSelectedDate((current) => (current === date ? null : date))
                  resetPage()
                }}
                selectedDate={selectedDate}
                transactionDates={transactionDates}
              />
            </div>
          </section>

          <section
            className="dashboard-panel"
            style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: boxHeight ? boxHeight : undefined, minHeight: boxHeight ? undefined : 480 }}
          >
            <div
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '16px 18px',
                borderBottom: '1px solid var(--wl-color-border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-.015em' }}>
                  {selectedDate === null ? `${monthNumber}월 전체` : `${monthNumber}월 ${Number(selectedDate.slice(-2))}일`}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 7 }}>
                  <span className="wl-tabular" style={{ fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                    {shown.length}건
                  </span>
                  <span className="wl-tabular" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                    <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--wl-color-expense-fill)' }} />
                    지출 {formatWon(shownExpense)}
                  </span>
                  <span className="wl-tabular" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                    <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--wl-color-income-fill)' }} />
                    수입 {formatWon(shownIncome)}
                  </span>
                </div>
              </div>
              {selectedDate !== null ? (
                <button
                  onClick={() => {
                    setSelectedDate(null)
                    resetPage()
                  }}
                  style={chipStyle(false)}
                  type="button"
                >
                  이번 달 전체
                </button>
              ) : null}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {dataLoading ? (
                <p className="wl-body" style={{ padding: 18 }}>
                  거래를 불러오는 중입니다.
                </p>
              ) : pageItems.length ? (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {pageItems.map((item, index) => (
                    <TransactionRow
                      amount={`${item.type === 'EXPENSE' ? '-' : item.type === 'INCOME' ? '+' : ''}${formatWon(item.amount)}`}
                      budget={budgetChipLabel(item)}
                      category={item.category?.name ?? '기타'}
                      divider={index !== 0}
                      income={item.type === 'INCOME'}
                      key={item.id}
                      meta={
                        selectedDate === null
                          ? `${monthNumber}월 ${Number(item.transactionDate.slice(-2))}일 · ${item.category?.name ?? '미분류'} · ${paymentMethodLabel(item) ?? ''}`
                          : `${item.category?.name ?? '미분류'} · ${paymentMethodLabel(item) ?? ''}`
                      }
                      onClick={() => setDetailId(item.id)}
                      place={item.merchant || item.memo || item.category?.name || '미분류 거래'}
                    />
                  ))}
                </ul>
              ) : (
                <div style={{ padding: 18 }}>
                  <EmptyState description="다른 날짜를 고르거나 검색어와 필터를 바꿔 보세요." title="조건에 맞는 거래가 없어요" />
                </div>
              )}
            </div>

            <div
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 'auto',
                padding: '12px 18px',
                borderTop: '1px solid var(--wl-color-border)',
                background: 'var(--wl-color-surface-subtle)',
              }}
            >
              <span className="wl-tabular" style={{ fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                {shown.length ? `${shown.length}건 중 ${pageStart + 1}-${Math.min(pageStart + perPage, shown.length)}` : '0건'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PagerButton
                  disabled={currentPage === 0}
                  icon="chevron-left"
                  label="이전 페이지"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                />
                <span className="wl-tabular" style={{ minWidth: 56, textAlign: 'center', fontSize: 12.5, fontWeight: 700 }}>
                  {currentPage + 1} / {pageCount}
                </span>
                <PagerButton
                  disabled={currentPage >= pageCount - 1}
                  icon="chevron-right"
                  label="다음 페이지"
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <TransactionImportModal onClose={() => setImportOpen(false)} open={importOpen} />

      {detailId !== null ? (
        <TransactionDetailModal
          onClose={() => setDetailId(null)}
          onDeleted={() => {
            setDetailId(null)
            showToast('거래를 삭제했어요. 예산 사용액도 되돌렸어요')
          }}
          onSaved={() => {
            setDetailId(null)
            showToast('거래를 수정했어요')
          }}
          transactionId={detailId}
        />
      ) : null}

      {toast ? (
        <div style={{ position: 'fixed', right: 28, bottom: 28, zIndex: 90 }}>
          <Toast tone="success">{toast}</Toast>
        </div>
      ) : null}
    </>
  )
}

function PagerButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 34,
        height: 34,
        borderRadius: 10,
        border: '1px solid var(--wl-color-border)',
        background: 'var(--wl-color-surface)',
        color: disabled ? 'var(--wl-color-text-disabled)' : 'var(--wl-color-text-body)',
        opacity: disabled ? 0.5 : 1,
      }}
      type="button"
    >
      <Icon name={icon} size="sm" />
    </button>
  )
}
