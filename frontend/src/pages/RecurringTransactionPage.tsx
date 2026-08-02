import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCurrentBudgetPeriodQuery } from '../features/budget/model/budgetPeriodQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import {
  useCreateRecurringExpensePlanMutation,
  useScheduledPlanActionMutation,
  useScheduledPlansQuery,
  useUpdateScheduledPlanMutation,
} from '../features/scheduled/model/scheduledPlanQueries'
import type { ScheduledPlan } from '../features/scheduled/api/scheduledPlanApi'
import { formatDateInput } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { AmountInput } from '../shared/ui/AmountInput'
import { AppHeader } from '../shared/ui/AppHeader'
import { Badge } from '../shared/ui/Badge'
import { Button } from '../shared/ui/Button'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { DatePicker } from '../shared/ui/DatePicker'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import { Input } from '../shared/ui/Input'
import { Modal } from '../shared/ui/Modal'
import { SaveBar } from '../shared/ui/SaveBar'
import { SegmentedControl } from '../shared/ui/SegmentedControl'
import { Skeleton } from '../shared/ui/Skeleton'
import { Toast } from '../shared/ui/Toast'

/* 화면 전용 인터랙션(css)만 여기에 둡니다. 다른 화면과 공유하는 patterns/*.css는
 * 동시에 다른 작업자가 편집 중이라 건드리지 않습니다. README 규칙:
 * 목록 선택은 애니메이션 없음, 우측 상세만 180ms 페이드. */
function RecurringPageStyle() {
  return (
    <style>{`
      .wl-recurring-detail { animation: wl-recurring-detail-in 180ms var(--wl-ease-out-strong, cubic-bezier(.23,1,.32,1)) both; }
      @keyframes wl-recurring-detail-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      @media (prefers-reduced-motion: reduce) { .wl-recurring-detail { animation-duration: 1ms; } }
    `}</style>
  )
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: '매주' },
  { value: 'MONTHLY', label: '매월' },
  { value: 'YEARLY', label: '매년' },
]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
type Filter = 'all' | 'fixed' | 'normal' | 'installment'

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** 다음 발생일들을 nextDueDate에서 파생합니다. 월말 보정은 scheduled-transactions.md 규칙을 따릅니다. */
function upcomingOccurrences(plan: ScheduledPlan, count: number): Date[] {
  const base = parseDate(plan.nextDueDate)
  const day = base.getDate()
  const results: Date[] = []
  for (let index = 0; index < count; index += 1) {
    if (plan.frequency === 'WEEKLY') {
      const date = new Date(base)
      date.setDate(date.getDate() + index * 7)
      results.push(date)
    } else if (plan.frequency === 'YEARLY') {
      const year = base.getFullYear() + index
      const clampedDay = Math.min(day, lastDayOfMonth(year, base.getMonth()))
      results.push(new Date(year, base.getMonth(), clampedDay))
    } else {
      const monthIndex = base.getMonth() + index
      const year = base.getFullYear() + Math.floor(monthIndex / 12)
      const month = ((monthIndex % 12) + 12) % 12
      const clampedDay = Math.min(day, lastDayOfMonth(year, month))
      results.push(new Date(year, month, clampedDay))
    }
  }
  return results
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

/** 차감 예산 칩 문구. 상대방 개인 예산은 소유자를 특정하지 않고 '개인 예산'으로만 표시합니다. */
function budgetSourceLabel(source: ScheduledPlan['budgetSource'], meUserId: number | undefined): string {
  if (!source) return '확인 불가'
  if (source.type === 'SHARED') return '공동 예산'
  return source.ownerUserId === meUserId ? '내 예산' : '개인 예산'
}

function scheduleText(plan: ScheduledPlan): string {
  const date = parseDate(plan.nextDueDate)
  if (plan.frequency === 'WEEKLY') return `매주 ${WEEKDAYS[date.getDay()]}요일`
  if (plan.frequency === 'YEARLY') return `매년 이맘때 ${date.getDate()}일`
  return `매월 ${date.getDate()}일`
}

function planKind(plan: ScheduledPlan): Exclude<Filter, 'all'> {
  if (plan.type === 'INSTALLMENT') return 'installment'
  if (plan.isFixedExpense) return 'fixed'
  return 'normal'
}

/** 저장 바에 표시할 '이후 예정 거래만 / 이번 거래와 이후 모두' 선택. 로컬 편집 상태를 정리합니다. */
interface RuleEdit {
  frequency: ScheduledPlan['frequency']
  fixedExpense: boolean
}

function editSnapshot(plan: ScheduledPlan): RuleEdit {
  return { frequency: plan.frequency, fixedExpense: plan.isFixedExpense }
}

export function RecurringTransactionPage() {
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const plans = useScheduledPlansQuery(ledgerId)
  const categories = useCategoriesQuery(ledgerId)
  const period = useCurrentBudgetPeriodQuery(ledgerId)
  const create = useCreateRecurringExpensePlanMutation(ledgerId)
  const pause = useScheduledPlanActionMutation('pause')
  const resume = useScheduledPlanActionMutation('resume')
  const remove = useScheduledPlanActionMutation('delete')
  const update = useUpdateScheduledPlanMutation()

  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<RuleEdit | null>(null)
  const [savedEdit, setSavedEdit] = useState<RuleEdit | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const list = useMemo(() => plans.data ?? [], [plans.data])
  // 선택된 계획이 목록에서 사라지면(삭제·필터 변경) 첫 항목으로 자동 대체합니다. 별도 state 동기화 없이 렌더마다 계산합니다.
  const selected = list.find((item) => item.id === selectedId) ?? list[0] ?? null
  const activeId = selected?.id ?? null

  /* 선택이 바뀔 때만 편집 스냅샷을 새로 잡습니다 — effect의 setState 대신
   * React가 권장하는 "렌더링 중 상태 조정" 패턴을 씁니다(리스트 재조회로 effect가
   * 반복 실행되며 편집 중인 값을 덮어쓰는 문제를 피하기 위함). */
  const [trackedSelectionId, setTrackedSelectionId] = useState<number | null>(activeId)
  if (trackedSelectionId !== activeId) {
    setTrackedSelectionId(activeId)
    const snapshot = selected ? editSnapshot(selected) : null
    setEdit(snapshot)
    setSavedEdit(snapshot)
  }

  function showToast(text: string) {
    clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const filtered = useMemo(() => {
    if (filter === 'all') return list
    return list.filter((item) => planKind(item) === filter)
  }, [list, filter])

  const fixedCount = list.filter((item) => item.isFixedExpense).length
  const normalCount = list.filter((item) => planKind(item) === 'normal').length
  const installmentCount = list.filter((item) => item.type === 'INSTALLMENT').length
  const monthlyFixedTotal = list
    .filter((item) => item.isFixedExpense && item.status === 'ACTIVE' && item.frequency === 'MONTHLY')
    .reduce((sum, item) => sum + item.amount, 0)
  const nextRunPlan = [...list]
    .filter((item) => item.status === 'ACTIVE')
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0]

  const dirty = Boolean(edit && savedEdit && (edit.frequency !== savedEdit.frequency || edit.fixedExpense !== savedEdit.fixedExpense))

  function patchEdit(next: Partial<RuleEdit>) {
    setEdit((current) => (current ? { ...current, ...next } : current))
  }

  function saveEdit() {
    if (!selected || !edit) return
    update.mutate(
      { planId: selected.id, scope: 'FUTURE', frequency: edit.frequency ?? undefined, isFixedExpense: edit.fixedExpense },
      {
        onSuccess: () => {
          setSavedEdit(edit)
          showToast('이후 예정 거래부터 적용했어요')
        },
        onError: () => showToast('변경을 저장하지 못했어요. 다시 시도해주세요.'),
      },
    )
  }

  function resetEdit() {
    if (!selected) return
    const snapshot = editSnapshot(selected)
    setEdit(snapshot)
    setSavedEdit(snapshot)
  }

  function toggleActive(plan: ScheduledPlan) {
    if (plan.status === 'PAUSED') {
      resume.mutate(
        { planId: plan.id, nextDueDate: plan.nextDueDate },
        { onSuccess: () => showToast('자동 등록을 다시 켰어요') },
      )
    } else {
      pause.mutate({ planId: plan.id }, { onSuccess: () => showToast('자동 등록을 껐어요') })
    }
  }

  function removeSelected() {
    if (!selected) return
    remove.mutate(
      { planId: selected.id },
      { onSuccess: () => showToast('반복 거래를 삭제했어요. 기록된 거래는 그대로예요') },
    )
  }

  if (plans.isError) {
    return (
      <>
        <AppHeader description="예정일이 되면 자동으로 기록되는 지출이에요" title="반복 거래" />
        <div className="product-page product-page--wide">
          <ErrorState onRetry={() => plans.refetch()} />
        </div>
      </>
    )
  }

  return (
    <>
      <RecurringPageStyle />
      <AppHeader
        actions={
          <button
            className="dashboard-primary-button"
            onClick={() => setCreateOpen(true)}
            style={{ color: '#fff', minHeight: 40 }}
            type="button"
          >
            <Icon name="plus" size="md" />
            반복 거래 추가
          </button>
        }
        description="예정일이 되면 자동으로 기록되는 지출이에요"
        title="반복 거래"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, padding: '28px 32px 140px' }}>
        {plans.isLoading ? (
          <Skeleton height={92} radius={18} />
        ) : (
          <section
            style={{
              alignItems: 'center',
              display: 'grid',
              gap: 32,
              gridTemplateColumns: 'minmax(280px,1fr) 1px minmax(0,1.4fr)',
              paddingBottom: 24,
              borderBottom: '1px solid var(--wl-color-border)',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>
                이번 달 고정비 합계
              </p>
              <p
                className="wl-tabular"
                style={{ margin: '8px 0 0', fontSize: 38, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1.1 }}
              >
                {formatWon(monthlyFixedTotal)}
              </p>
            </div>
            <div style={{ alignSelf: 'stretch', background: 'var(--wl-color-border)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>고정비</p>
                <p className="wl-tabular" style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}>
                  {fixedCount}건
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>일반 반복</p>
                <p className="wl-tabular" style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}>
                  {normalCount}건
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>
                  다음 자동 등록
                </p>
                <p className="wl-tabular" style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}>
                  {nextRunPlan ? formatShortDate(parseDate(nextRunPlan.nextDueDate)) : '-'}
                </p>
              </div>
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px,1fr) minmax(400px,0.85fr)', gap: 20, alignItems: 'start' }}>
          <section style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 14 }}>
              <SegmentedControl
                label="반복 거래 필터"
                onChange={(value) => setFilter(value as Filter)}
                options={[
                  { value: 'all', label: `전체 ${list.length}` },
                  { value: 'fixed', label: `고정비 ${fixedCount}` },
                  { value: 'normal', label: `일반 반복 ${normalCount}` },
                  { value: 'installment', label: `할부 ${installmentCount}` },
                ]}
                value={filter}
              />
            </div>

            {plans.isLoading ? (
              <Skeleton height={280} radius={18} />
            ) : filtered.length ? (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  border: '1px solid var(--wl-color-border)',
                  borderRadius: 'var(--wl-radius-lg)',
                  background: 'var(--wl-color-surface)',
                  boxShadow: 'var(--wl-shadow-card)',
                  overflow: 'hidden',
                }}
              >
                {filtered.map((plan, index) => {
                  const on = plan.id === activeId
                  const paused = plan.status === 'PAUSED'
                  return (
                    <li
                      key={plan.id}
                      style={{
                        borderTop: index === 0 ? 'none' : '1px solid var(--wl-color-border)',
                        background: on ? 'var(--wl-brand-50)' : undefined,
                        boxShadow: on ? 'inset 3px 0 0 var(--wl-color-primary)' : undefined,
                      }}
                    >
                      <button
                        onClick={() => setSelectedId(plan.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '36px minmax(0,1fr) auto',
                          alignItems: 'center',
                          gap: 13,
                          width: '100%',
                          padding: '15px 18px',
                          textAlign: 'left',
                        }}
                        type="button"
                      >
                        <CategoryBadge name={plan.categoryName} size="sm" />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <strong
                              style={{
                                fontSize: 15,
                                fontWeight: on ? 700 : 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: plan.status === 'ACTIVE' ? undefined : 'var(--wl-color-text-secondary)',
                              }}
                            >
                              {plan.name}
                            </strong>
                            {plan.isFixedExpense ? <Badge tone="brand">고정비</Badge> : null}
                            {plan.type === 'INSTALLMENT' ? <Badge tone="income">할부</Badge> : null}
                            {paused ? <Badge tone="neutral">중단</Badge> : null}
                          </span>
                          <span style={{ display: 'block', marginTop: 5, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                            {scheduleText(plan)}
                          </span>
                        </span>
                        <strong
                          className="wl-tabular"
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            color: plan.status === 'ACTIVE' ? 'var(--wl-color-text-main)' : 'var(--wl-color-text-secondary)',
                          }}
                        >
                          -{formatWon(plan.amount)}
                        </strong>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div style={{ marginTop: 16 }}>
                <EmptyState
                  description="다른 조건을 선택하거나 새 반복 거래를 추가해 보세요."
                  title="해당하는 반복 거래가 없어요"
                />
              </div>
            )}

            <p style={{ margin: '14px 2px 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
              매월 반복일이 없는 달에는 그 달의 말일에 기록해요. 31일 거래는 2월이면 28일이나 29일에 등록돼요.
            </p>
          </section>

          <section
            className="wl-recurring-detail"
            key={selected?.id ?? 'empty'}
            style={{
              minWidth: 0,
              padding: '20px 22px 22px',
              border: '1px solid var(--wl-color-border)',
              borderRadius: 'var(--wl-radius-lg)',
              background: 'var(--wl-color-surface)',
              boxShadow: 'var(--wl-shadow-card)',
            }}
          >
            {plans.isLoading ? (
              <Skeleton height={420} radius={18} />
            ) : selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-.015em' }}>{selected.name}</h2>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                      {scheduleText(selected)}
                    </p>
                  </div>
                  <strong className="wl-tabular" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em' }}>
                    -{formatWon(selected.amount)}
                  </strong>
                </div>

                <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
                  {selected.type === 'INSTALLMENT' ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                        gap: 14,
                        padding: 16,
                        border: '1px solid var(--wl-color-border)',
                        borderRadius: 'var(--wl-radius-md)',
                        background: 'var(--wl-color-surface-subtle)',
                      }}
                    >
                      <InstallmentStat label="전체 결제 금액" value={selected.totalAmount === null ? '-' : formatWon(selected.totalAmount)} />
                      <InstallmentStat
                        label="현재 회차"
                        value={selected.round === null || selected.totalRounds === null ? '-' : `${selected.round}/${selected.totalRounds}회차`}
                      />
                      <InstallmentStat label="회차 원금" value={selected.principalAmount === null ? '-' : formatWon(selected.principalAmount)} />
                      <InstallmentStat label="월 이자" value={selected.monthlyInterest === null ? '-' : formatWon(selected.monthlyInterest)} />
                    </div>
                  ) : null}

                  <div>
                    <span style={{ display: 'block', marginBottom: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>
                      반복 주기
                    </span>
                    <SegmentedControl
                      label="반복 주기"
                      onChange={(value) => patchEdit({ frequency: value as ScheduledPlan['frequency'] })}
                      options={FREQUENCY_OPTIONS}
                      value={edit?.frequency ?? selected.frequency ?? 'MONTHLY'}
                    />
                    <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                      {(edit?.frequency ?? selected.frequency) === 'MONTHLY'
                        ? '반복일이 없는 달에는 그 달의 말일에 등록해요.'
                        : (edit?.frequency ?? selected.frequency) === 'WEEKLY'
                          ? '매주 같은 요일에 등록해요.'
                          : '매년 같은 날짜에 등록해요.'}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>
                        반복일
                      </span>
                      {/* TODO(api): 반복일 자체를 수정하는 PUT /api/scheduled-plans/{planId}가 아직 훅으로
                          연결되지 않아, 다음 예정일(nextDueDate)에서 읽기 전용으로 파생한 값만 보여줍니다. */}
                      <div
                        style={{
                          height: 44,
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          border: '1px solid var(--wl-color-border)',
                          borderRadius: 'var(--wl-radius-md)',
                          background: 'var(--wl-color-surface-subtle)',
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--wl-color-text-secondary)',
                        }}
                        className="wl-tabular"
                      >
                        {selected.frequency === 'WEEKLY'
                          ? `${WEEKDAYS[parseDate(selected.nextDueDate).getDay()]}요일`
                          : `${parseDate(selected.nextDueDate).getDate()}일`}
                      </div>
                    </div>
                    <div>
                      <span style={{ display: 'block', marginBottom: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>
                        차감 예산
                      </span>
                      <div
                        style={{
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 13px',
                          border: '1px solid var(--wl-color-border)',
                          borderRadius: 'var(--wl-radius-pill)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--wl-color-text-body)',
                        }}
                      >
                        {budgetSourceLabel(selected.budgetSource, me.data?.user.id)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => patchEdit({ fixedExpense: !(edit?.fixedExpense ?? selected.isFixedExpense) })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      width: '100%',
                      padding: 14,
                      border: '1px solid var(--wl-color-border)',
                      borderRadius: 'var(--wl-radius-md)',
                      textAlign: 'left',
                    }}
                    type="button"
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>고정비로 관리해요</strong>
                      <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                        고정비끼리 따로 모아 합계를 볼 수 있어요
                      </span>
                    </span>
                    <SwitchTrack on={edit?.fixedExpense ?? selected.isFixedExpense} />
                  </button>

                  <button
                    disabled={pause.isPending || resume.isPending}
                    onClick={() => toggleActive(selected)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      width: '100%',
                      padding: 14,
                      border: '1px solid var(--wl-color-border)',
                      borderRadius: 'var(--wl-radius-md)',
                      textAlign: 'left',
                    }}
                    type="button"
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>자동 등록 켜기</strong>
                      <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                        {selected.status === 'ACTIVE' ? '예정일이 되면 자동으로 기록해요' : '지금은 자동으로 기록하지 않아요'}
                      </span>
                    </span>
                    <SwitchTrack on={selected.status === 'ACTIVE'} />
                  </button>
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--wl-color-border)' }}>
                  <span style={{ display: 'block', marginBottom: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>
                    앞으로 등록될 날짜
                  </span>
                  {selected.status === 'ACTIVE' ? (
                    <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
                      {upcomingOccurrences(selected, 3).map((date, index) => (
                        <li
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 12,
                            fontSize: 12.5,
                            color: 'var(--wl-color-text-secondary)',
                          }}
                        >
                          <span>{formatShortDate(date)}</span>
                          <strong className="wl-tabular" style={{ fontWeight: 700, color: 'var(--wl-color-text-main)' }}>
                            -{formatWon(selected.amount)}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                      자동 등록이 꺼져 있어 앞으로 등록될 날짜가 없어요.
                    </p>
                  )}
                  <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                    자동 등록을 끄거나 삭제해도 이미 기록된 거래는 그대로 남아요.
                  </p>
                  <button
                    disabled={remove.isPending}
                    onClick={removeSelected}
                    style={{
                      minHeight: 44,
                      marginTop: 6,
                      marginLeft: -12,
                      padding: '0 12px',
                      borderRadius: 12,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--wl-color-danger)',
                    }}
                    type="button"
                  >
                    반복 거래 삭제
                  </button>
                </div>
              </>
            ) : (
              <EmptyState description="반복 거래를 추가하면 여기에서 관리할 수 있어요." title="선택된 반복 거래가 없어요" />
            )}
          </section>
        </div>
      </div>

      <SaveBar note="이미 기록된 과거 거래는 바뀌지 않아요." offset={232} open={dirty} title="이후 예정 거래부터 적용돼요">
        <button
          onClick={resetEdit}
          style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
          type="button"
        >
          되돌리기
        </button>
        <Button onClick={saveEdit}>변경 저장</Button>
      </SaveBar>

      {toast ? (
        <div style={{ position: 'fixed', right: 28, bottom: dirty ? 96 : 28, zIndex: 60 }}>
          <Toast tone="success">{toast}</Toast>
        </div>
      ) : null}

      <CreateRecurringPlanModal
        categories={categories.data ?? []}
        me={me.data}
        onClose={() => setCreateOpen(false)}
        onCreated={(planId) => {
          setCreateOpen(false)
          setSelectedId(planId)
          showToast('반복 거래를 추가했어요')
        }}
        open={createOpen}
        period={period.data}
        pending={create.isPending}
        submit={create.mutateAsync}
      />
    </>
  )
}

function InstallmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>{label}</p>
      <p className="wl-tabular" style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700, letterSpacing: '-.02em' }}>
        {value}
      </p>
    </div>
  )
}

function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: 'none',
        width: 44,
        height: 26,
        padding: 3,
        borderRadius: 'var(--wl-radius-pill)',
        background: on ? 'var(--wl-color-primary)' : 'var(--wl-data-neutral-muted)',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background-color 160ms var(--wl-ease-out-strong, cubic-bezier(.23,1,.32,1))',
      }}
    >
      <i style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgb(0 0 0 / 20%)' }} />
    </span>
  )
}

interface CreateRecurringPlanModalProps {
  open: boolean
  onClose: () => void
  onCreated: (planId: number) => void
  categories: Array<{ id: number; name: string; type: string }>
  period: { allocations: Array<{ id: number; source: { type: 'PERSONAL' | 'SHARED'; ownerUserId: number | null } }> } | undefined
  me: { user: { id: number } } | undefined
  pending: boolean
  submit: (request: {
    name: string
    amount: number
    merchant: string | null
    memo: string | null
    categoryId: number
    budgetSource: { type: 'PERSONAL' | 'SHARED'; ownerUserId: number | null }
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    startDate: string
    endDate: string | null
    isFixedExpense: boolean
    paymentMethod: null
  }) => Promise<ScheduledPlan>
}

function CreateRecurringPlanModal({ open, onClose, onCreated, categories, period, me, pending, submit }: CreateRecurringPlanModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [categoryId, setCategoryId] = useState('')
  const [allocationId, setAllocationId] = useState('')
  const [startDate, setStartDate] = useState(formatDateInput())
  const [endDate, setEndDate] = useState('')
  const [fixed, setFixed] = useState(false)
  const [error, setError] = useState(false)

  const expenseCategories = categories.filter((item) => item.type === 'EXPENSE')
  const allocations =
    period?.allocations.filter((item) => item.source.type === 'SHARED' || item.source.ownerUserId === me?.user.id) ?? []

  function reset() {
    setName('')
    setAmount('')
    setFrequency('MONTHLY')
    setCategoryId('')
    setAllocationId('')
    setStartDate(formatDateInput())
    setEndDate('')
    setFixed(false)
    setError(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const allocation = allocations.find((item) => String(item.id) === allocationId)
    if (!allocation || !categoryId || !amount || !name) {
      setError(true)
      return
    }
    try {
      const plan = await submit({
        name,
        amount: Number(amount),
        merchant: null,
        memo: null,
        categoryId: Number(categoryId),
        budgetSource: allocation.source,
        frequency,
        startDate,
        endDate: endDate || null,
        isFixedExpense: fixed,
        paymentMethod: null,
      })
      reset()
      onCreated(plan.id)
    } catch {
      setError(true)
    }
  }

  return (
    <Modal onClose={() => { reset(); onClose() }} open={open} title="반복 거래 추가" width={480}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
        <Input label="이름" onChange={(event) => setName(event.target.value)} placeholder="예: 월세" required value={name} />
        <AmountInput label="금액" onChange={setAmount} value={amount} />
        <div>
          <span className="wl-field-label" style={{ display: 'block', marginBottom: 9 }}>
            반복 주기
          </span>
          <SegmentedControl label="반복 주기" onChange={(value) => setFrequency(value as typeof frequency)} options={FREQUENCY_OPTIONS} value={frequency} />
        </div>
        <label className="wl-field">
          <span className="wl-field-label">카테고리</span>
          <select className="wl-input" onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
            <option value="">선택</option>
            {expenseCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wl-field">
          <span className="wl-field-label">차감 예산</span>
          <select className="wl-input" onChange={(event) => setAllocationId(event.target.value)} required value={allocationId}>
            <option value="">선택</option>
            {allocations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.source.type === 'SHARED' ? '공동 예산' : '내 예산'}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span className="wl-field-label" style={{ display: 'block', marginBottom: 9 }}>
              시작일
            </span>
            <DatePicker ariaLabel="시작일" onChange={setStartDate} value={startDate} />
          </div>
          <div>
            <span className="wl-field-label" style={{ display: 'block', marginBottom: 9 }}>
              종료일 (선택)
            </span>
            <DatePicker ariaLabel="종료일" clearable onChange={setEndDate} value={endDate} />
          </div>
        </div>
        <button
          onClick={() => setFixed((current) => !current)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            padding: 14,
            border: '1px solid var(--wl-color-border)',
            borderRadius: 'var(--wl-radius-md)',
            textAlign: 'left',
          }}
          type="button"
        >
          <strong style={{ fontSize: 14, fontWeight: 600 }}>고정비로 관리해요</strong>
          <SwitchTrack on={fixed} />
        </button>
        {error ? (
          <p className="wl-field-error" role="alert">
            <Icon name="circle-alert" size="sm" />
            입력값과 차감 예산을 확인해주세요.
          </p>
        ) : null}
        <Button disabled={pending} fullWidth loading={pending} type="submit">
          반복 거래 저장
        </Button>
      </form>
    </Modal>
  )
}
