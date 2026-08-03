import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import type { BudgetPeriodDetail } from '../features/budget/api/budgetPeriodApi'
import {
  useBudgetPeriodQuery,
  useConfigureBudgetPeriodMutation,
  useCurrentBudgetPeriodQuery,
  useReserveTransfersQuery,
  useTransferReserveMutation,
} from '../features/budget/model/budgetPeriodQueries'
import type { LedgerMember } from '../features/ledger/api/ledgerApi'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import type { BudgetSource } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { formatWon } from '../shared/lib/money'
import { AmountInput } from '../shared/ui/AmountInput'
import { AppHeader } from '../shared/ui/AppHeader'
import { Button } from '../shared/ui/Button'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import { Progress } from '../shared/ui/Progress'
import { SaveBar } from '../shared/ui/SaveBar'
import { SegmentedControl } from '../shared/ui/SegmentedControl'
import { Skeleton } from '../shared/ui/Skeleton'
import { Toast } from '../shared/ui/Toast'

const STEP = 50_000
const won = formatWon

/** 카드·칩 색 팔레트 — 멤버 최대 2명(홍길동=파랑, 홍길순=보라) + 공동(브랜드) + 예비비(뉴트럴). */
const MEMBER_COLORS = ['var(--wl-data-blue)', 'var(--wl-data-violet)']
const SHARED_COLOR = 'var(--wl-color-primary)'
const RESERVE_COLOR = 'var(--wl-data-neutral)'

function toNumber(digits: string): number {
  return Number(digits || '0')
}

function formatKoreanDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${year.slice(2)}년 ${month}월 ${day}일`
}

function nextDayIso(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMonthDay(iso: string): string {
  const date = new Date(iso)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function describeTarget(source: BudgetSource, members: LedgerMember[]): string {
  if (source.type === 'SHARED') return '공동 예산'
  const owner = members.find((member) => member.userId === source.ownerUserId)
  return owner ? `${owner.nickname} 예산` : '개인 예산'
}

function sourceKey(source: BudgetSource): string {
  return `${source.type}:${source.ownerUserId ?? ''}`
}

type CategoryEntry = { source: BudgetSource; groupCode: string; groupName: string; amount: number; spentAmount: number; previousSpentAmount: number | null }

type InitialAllocation = {
  totalDigits: string
  personalDigits: Record<number, string>
  sharedDigits: string
  categoryDigits: Record<string, string>
}

function deriveInitial(period: BudgetPeriodDetail, members: LedgerMember[]): InitialAllocation {
  return {
    totalDigits: String(period.totalBudget),
    personalDigits: Object.fromEntries(
      members.map((member) => [
        member.userId,
        String(period.allocations.find((a) => a.source.type === 'PERSONAL' && a.source.ownerUserId === member.userId)?.amount ?? 0),
      ]),
    ),
    sharedDigits: String(period.allocations.find((a) => a.source.type === 'SHARED')?.amount ?? 0),
    categoryDigits: Object.fromEntries(period.categoryBudgets.map((item) => [item.groupCode, String(item.amount)])),
  }
}

function snapshotOf(state: InitialAllocation, members: LedgerMember[], categoryEntries: CategoryEntry[]): string {
  return JSON.stringify([
    state.totalDigits,
    members.map((member) => state.personalDigits[member.userId] ?? '0'),
    state.sharedDigits,
    categoryEntries.map((item) => state.categoryDigits[item.groupCode] ?? '0'),
  ])
}

export function BudgetPage() {
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const currentPeriod = useCurrentBudgetPeriodQuery(ledgerId)
  const membersQuery = useLedgerMembersQuery(ledgerId)
  const [periodTab, setPeriodTab] = useState<'current' | 'next'>('current')
  const nextStartDate = currentPeriod.data ? nextDayIso(currentPeriod.data.endDate) : undefined
  const nextPeriod = useBudgetPeriodQuery(ledgerId, periodTab === 'next' ? nextStartDate : undefined)

  const members = (membersQuery.data ?? []).filter((member) => member.status === 'ACTIVE')
  const meUserId = me.data?.user.id

  if (currentPeriod.isLoading) {
    return (
      <div>
        <AppHeader description="예산 정보를 불러오는 중이에요." title="예산 설정" />
        <div style={{ padding: '28px 32px', display: 'grid', gap: 14 }}>
          <Skeleton height={64} />
          <Skeleton height={220} />
          <Skeleton height={220} />
        </div>
      </div>
    )
  }
  if (currentPeriod.isError) {
    return (
      <div>
        <AppHeader title="예산 설정" />
        <div style={{ padding: '60px 32px', display: 'flex', justifyContent: 'center' }}>
          <ErrorState onRetry={() => currentPeriod.refetch()} />
        </div>
      </div>
    )
  }
  if (!currentPeriod.data) {
    return (
      <div>
        <AppHeader title="예산 설정" />
        <div style={{ padding: '60px 32px', display: 'flex', justifyContent: 'center' }}>
          <EmptyState description="현재 장부의 예산 기간을 먼저 준비해주세요." title="예산 기간이 없습니다." />
        </div>
      </div>
    )
  }

  const activePeriod = periodTab === 'current' ? currentPeriod.data : nextPeriod.data
  const activeQuery = periodTab === 'current' ? currentPeriod : nextPeriod

  return (
    <div>
      <AppHeader
        actions={
          <SegmentedControl
            label="예산 기간"
            onChange={(value) => setPeriodTab(value as 'current' | 'next')}
            options={[
              { value: 'current', label: '이번 기간' },
              { value: 'next', label: '다음 기간' },
            ]}
            value={periodTab}
          />
        }
        description={
          activePeriod
            ? `${periodTab === 'next' ? '다음' : '이번'} 예산 기간 ${formatKoreanDate(activePeriod.startDate)} ~ ${formatKoreanDate(activePeriod.endDate)}`
            : undefined
        }
        title="예산 설정"
      />

      {periodTab === 'next' && nextPeriod.isLoading ? (
        <div style={{ padding: '28px 32px' }}>
          <Skeleton height={220} />
        </div>
      ) : periodTab === 'next' && nextPeriod.isError ? (
        <div style={{ padding: '60px 32px', display: 'flex', justifyContent: 'center' }}>
          <ErrorState
            description="다음 기간이 아직 준비되지 않았을 수 있어요."
            onRetry={() => activeQuery.refetch()}
            title="다음 기간 정보를 불러오지 못했어요."
          />
        </div>
      ) : activePeriod ? (
        <BudgetConfigurationBody
          key={`${activePeriod.id}-${activePeriod.startDate}-${activePeriod.totalBudget}-${activePeriod.reserveAmount}-${activePeriod.allocations
            .map((a) => `${sourceKey(a.source)}:${a.amount}`)
            .join(',')}`}
          ledgerId={ledgerId!}
          members={members}
          meUserId={meUserId}
          period={activePeriod}
          periodTab={periodTab}
        />
      ) : null}
    </div>
  )
}

function BudgetConfigurationBody({
  ledgerId,
  period,
  members,
  meUserId,
  periodTab,
}: {
  ledgerId: number
  period: BudgetPeriodDetail
  members: LedgerMember[]
  meUserId: number | undefined
  periodTab: 'current' | 'next'
}) {
  const isSharedLedger = members.length > 1
  const categoryEntries: CategoryEntry[] = period.categoryBudgets.filter((item) =>
    isSharedLedger ? item.source.type === 'SHARED' : item.source.type === 'PERSONAL' && item.source.ownerUserId === meUserId,
  )

  const [state, setState] = useState<InitialAllocation>(() => deriveInitial(period, members))
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(deriveInitial(period, members), members, categoryEntries))
  const [scope, setScope] = useState<'once' | 'forward'>('once')
  const [raiseConfirmed, setRaiseConfirmed] = useState(false)
  const [serverConfirmRequired, setServerConfirmRequired] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)

  const firstSharedTarget: BudgetSource | null = isSharedLedger ? { type: 'SHARED', ownerUserId: null } : null
  const [moveTarget, setMoveTarget] = useState<BudgetSource | null>(
    firstSharedTarget ?? (meUserId ? { type: 'PERSONAL', ownerUserId: meUserId } : null),
  )
  const [moveAmountDigits, setMoveAmountDigits] = useState('')

  const mutation = useConfigureBudgetPeriodMutation(ledgerId, period.startDate)
  const transferMutation = useTransferReserveMutation(ledgerId, period.startDate)
  const transfersQuery = useReserveTransfersQuery(ledgerId, period.startDate)

  function showToast(text: string, tone: 'success' | 'danger' = 'success') {
    window.clearTimeout(toastTimerRef.current)
    setToast({ text, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500)
  }

  const totalBudget = toNumber(state.totalDigits)
  const personalTotal = members.reduce((sum, member) => sum + toNumber(state.personalDigits[member.userId] ?? '0'), 0)
  const sharedAmount = isSharedLedger ? toNumber(state.sharedDigits) : 0
  const sumAllocated = personalTotal + sharedAmount
  const reserveAmount = isSharedLedger ? totalBudget - sumAllocated : 0
  const localOver = isSharedLedger ? Math.max(0, sumAllocated - totalBudget) : 0
  const base = Math.max(totalBudget, sumAllocated) || 1
  const catSum = categoryEntries.reduce((sum, item) => sum + toNumber(state.categoryDigits[item.groupCode] ?? '0'), 0)
  const catBase = isSharedLedger ? sharedAmount : totalBudget

  const dirty = snapshotOf(state, members, categoryEntries) !== savedSnapshot
  const needsRaiseConfirmation = localOver > 0 || serverConfirmRequired
  const saveDisabled = needsRaiseConfirmation && !raiseConfirmed

  function updatePersonal(userId: number, digits: string) {
    setState((current) => ({ ...current, personalDigits: { ...current.personalDigits, [userId]: digits } }))
  }
  function stepPersonal(userId: number, amount: number) {
    setState((current) => ({
      ...current,
      personalDigits: {
        ...current.personalDigits,
        [userId]: String(Math.max(0, toNumber(current.personalDigits[userId] ?? '0') + amount)),
      },
    }))
  }
  function updateCategory(groupCode: string, digits: string) {
    setState((current) => ({ ...current, categoryDigits: { ...current.categoryDigits, [groupCode]: digits } }))
  }

  function buildRequest(increaseTotalBudgetIfNeeded: boolean) {
    return {
      totalBudget,
      personalAllocations: members.map((member) => ({ userId: member.userId, amount: toNumber(state.personalDigits[member.userId] ?? '0') })),
      sharedAllocation: sharedAmount,
      categoryBudgets: categoryEntries.map((item) => ({ source: item.source, groupCode: item.groupCode, amount: toNumber(state.categoryDigits[item.groupCode] ?? '0') })),
      increaseTotalBudgetIfNeeded,
      applyToFutureDefaults: scope === 'forward',
    }
  }

  function handleSave() {
    setServerConfirmRequired(false)
    mutation.mutate(buildRequest(raiseConfirmed), {
      onSuccess: () => {
        setSavedSnapshot(snapshotOf(state, members, categoryEntries))
        setRaiseConfirmed(false)
        showToast(scope === 'once' ? '이번 기간 예산을 저장했어요' : '이후 기간 기본값까지 저장했어요')
      },
      onError: (error) => {
        if (error instanceof ApiClientError && error.code === 'TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED') {
          setServerConfirmRequired(true)
        } else {
          showToast('예산을 저장하지 못했어요. 입력값을 확인해주세요.', 'danger')
        }
      },
    })
  }

  function handleReset() {
    const initial = deriveInitial(period, members)
    setState(initial)
    setSavedSnapshot(snapshotOf(initial, members, categoryEntries))
    setRaiseConfirmed(false)
    setServerConfirmRequired(false)
  }

  const moveAmount = toNumber(moveAmountDigits)
  const availableReserve = Math.max(0, reserveAmount)
  const moveHint =
    moveAmount > availableReserve
      ? `옮길 수 있는 금액은 ${won(availableReserve)}까지예요`
      : dirty
        ? '저장하지 않은 변경이 있어요. 먼저 저장하거나 되돌린 뒤 옮겨주세요.'
        : moveTarget
          ? `${describeTarget(moveTarget, members)}으로 옮기면 그 예산에서 바로 쓸 수 있어요`
          : ''
  const moveDisabled = !moveTarget || moveAmount <= 0 || moveAmount > availableReserve || dirty || transferMutation.isPending

  function handleTransfer() {
    if (!moveTarget || moveDisabled) return
    transferMutation.mutate(
      { amount: moveAmount, target: moveTarget },
      {
        onSuccess: () => {
          showToast(`예비비 ${won(moveAmount)}을 옮겼어요`)
          setMoveAmountDigits('')
        },
        onError: () => showToast('예비비를 옮기지 못했어요. 다시 시도해주세요.', 'danger'),
      },
    )
  }

  /* 상대방 개인 예산도 대상입니다. 상대가 부탁하거나 한 사람이 예산을 도맡아 관리하는 경우가 있어서
   * 본인 것만 허용하면 매번 상대에게 직접 옮기라고 해야 합니다. 이동하면 내역이 남고 두 사람 모두
   * 알림을 받습니다. */
  const moveTargetOptions: Array<{ value: string; label: string; source: BudgetSource }> = [
    ...(isSharedLedger ? [{ value: 'SHARED', label: '공동 예산', source: { type: 'SHARED', ownerUserId: null } as BudgetSource }] : []),
    ...members.map((member) => ({
      value: `PERSONAL:${member.userId}`,
      label: `${member.nickname} 예산`,
      source: { type: 'PERSONAL', ownerUserId: member.userId } as BudgetSource,
    })),
  ]
  const moveTargetValue = moveTarget ? (moveTarget.type === 'SHARED' ? 'SHARED' : `PERSONAL:${moveTarget.ownerUserId}`) : ''

  const saveNote = isSharedLedger
    ? localOver > 0
      ? raiseConfirmed
        ? `전체 예산을 ${won(sumAllocated)}으로 올려서 저장해요`
        : '배분 합계가 전체 예산을 넘어서 저장할 수 없어요'
      : `예비비는 ${won(availableReserve)}으로 저장돼요`
    : undefined

  const recentTransfers = [...(transfersQuery.data?.items ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)

  return (
    <div className="budget-page-body">
      {/* 기간 전체 예산 */}
      <section>
        <p className="wl-label" style={{ margin: 0 }}>
          기간 전체 예산
        </p>
        <div style={{ marginTop: 10, maxWidth: 320 }}>
          <AmountInput
            id="budget-total"
            label="기간 전체 예산"
            onChange={(digits) => setState((current) => ({ ...current, totalDigits: digits }))}
            value={state.totalDigits}
          />
        </div>

        <div
          style={{
            display: 'flex',
            height: 14,
            marginTop: 20,
            borderRadius: 'var(--wl-radius-pill)',
            background: 'var(--wl-color-surface-subtle)',
            overflow: 'hidden',
          }}
        >
          {members.map((member, index) => (
            <span
              key={member.userId}
              style={{
                flex: `0 0 ${Math.max(0, (toNumber(state.personalDigits[member.userId] ?? '0') / base) * 100)}%`,
                background: MEMBER_COLORS[index % MEMBER_COLORS.length],
                transition: 'flex-basis 260ms var(--wl-ease-out-strong), background-color 160ms var(--wl-ease-out-strong)',
              }}
            />
          ))}
          {isSharedLedger ? (
            <span
              style={{
                flex: `0 0 ${Math.max(0, (sharedAmount / base) * 100)}%`,
                background: SHARED_COLOR,
                transition: 'flex-basis 260ms var(--wl-ease-out-strong), background-color 160ms var(--wl-ease-out-strong)',
              }}
            />
          ) : null}
          {isSharedLedger ? (
            <span
              style={{
                flex: `0 0 ${Math.max(0, (availableReserve / base) * 100)}%`,
                background: RESERVE_COLOR,
                transition: 'flex-basis 260ms var(--wl-ease-out-strong), background-color 160ms var(--wl-ease-out-strong)',
              }}
            />
          ) : null}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
          {members.map((member, index) => (
            <span
              className="wl-tabular"
              key={member.userId}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}
            >
              <i
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: MEMBER_COLORS[index % MEMBER_COLORS.length],
                  display: 'inline-block',
                }}
              />
              {member.nickname} {won(toNumber(state.personalDigits[member.userId] ?? '0'))}
            </span>
          ))}
          {isSharedLedger ? (
            <span className="wl-tabular" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: SHARED_COLOR, display: 'inline-block' }} />
              공동 {won(sharedAmount)}
            </span>
          ) : null}
          {isSharedLedger ? (
            <span className="wl-tabular" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: RESERVE_COLOR, display: 'inline-block' }} />
              예비비 {won(availableReserve)}
            </span>
          ) : null}
        </div>

        {localOver > 0 ? (
          <div
            data-anim
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 11,
              maxWidth: 640,
              marginTop: 20,
              padding: '14px 16px',
              border: '1px solid var(--wl-warning-line)',
              borderRadius: 'var(--wl-radius-md)',
              background: 'var(--wl-warning-soft)',
              animation: 'wl-fade-up 200ms var(--wl-ease-out-strong) both',
            }}
          >
            <Icon name="circle-alert" size="md" />
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--wl-warning)' }}>
                배분 합계가 전체 예산보다 {won(localOver)} 많아요
              </strong>
              <button
                aria-checked={raiseConfirmed}
                onClick={() => setRaiseConfirmed((value) => !value)}
                role="checkbox"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  minHeight: 40,
                  marginTop: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--wl-warning)',
                }}
                type="button"
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 20,
                    height: 20,
                    flex: 'none',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: raiseConfirmed ? 'var(--wl-warning)' : 'var(--wl-warning-line)',
                    background: raiseConfirmed ? 'var(--wl-warning)' : 'var(--wl-color-surface)',
                    color: '#fff',
                    transition: 'background-color 160ms var(--wl-ease-out-strong)',
                  }}
                >
                  {raiseConfirmed ? <Icon name="check" size="sm" /> : null}
                </span>
                전체 예산을 {won(sumAllocated)}으로 올리고 저장할게요
              </button>
            </div>
          </div>
        ) : null}
        {serverConfirmRequired && localOver === 0 ? (
          <div
            style={{
              maxWidth: 640,
              marginTop: 20,
              padding: '14px 16px',
              border: '1px solid var(--wl-warning-line)',
              borderRadius: 'var(--wl-radius-md)',
              background: 'var(--wl-warning-soft)',
            }}
            role="alert"
          >
            <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--wl-warning)' }}>
              대분류 예산 합계가 배분보다 많아 전체 예산을 올려야 해요
            </strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-warning)' }}>
              <input checked={raiseConfirmed} onChange={(event) => setRaiseConfirmed(event.target.checked)} type="checkbox" />
              증액을 확인했어요
            </label>
          </div>
        ) : null}
      </section>

      {/* 예산 배분 */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
          <h2 className="wl-section-title" style={{ margin: 0 }}>
            예산 배분
          </h2>
          {isSharedLedger ? <span className="wl-meta">상대방 할당액도 함께 정할 수 있어요</span> : null}
        </div>

        <div
          className="budget-allocation-grid"
          style={{ '--budget-allocation-cols': members.length + (isSharedLedger ? 2 : 0) } as CSSProperties}
        >
          {members.map((member, index) => {
            const value = toNumber(state.personalDigits[member.userId] ?? '0')
            const share = base ? Math.round((value / base) * 100) : 0
            return (
              <div
                key={member.userId}
                style={{
                  padding: 16,
                  borderRadius: 'var(--wl-radius-lg)',
                  border: '1px solid var(--wl-color-border)',
                  background: 'var(--wl-color-surface)',
                  boxShadow: 'var(--wl-shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    style={{ width: 10, height: 10, borderRadius: '50%', background: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                  />
                  <strong style={{ fontSize: 13.5, fontWeight: 700 }}>{member.nickname}</strong>
                </div>
                <div style={{ marginTop: 14 }}>
                  <AmountInput
                    id={`allocation-${member.userId}`}
                    label={`${member.nickname} 예산`}
                    onChange={(digits) => updatePersonal(member.userId, digits)}
                    value={state.personalDigits[member.userId] ?? '0'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                  <span className="wl-tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>
                    {share}%
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <StepButton aria-label={`${member.nickname} 예산 5만원 줄이기`} onClick={() => stepPersonal(member.userId, -STEP)}>
                      -5만
                    </StepButton>
                    <StepButton aria-label={`${member.nickname} 예산 5만원 늘리기`} onClick={() => stepPersonal(member.userId, STEP)}>
                      +5만
                    </StepButton>
                  </span>
                </div>
              </div>
            )
          })}

          {isSharedLedger ? (
            <div
              style={{
                padding: 16,
                borderRadius: 'var(--wl-radius-lg)',
                border: '1px solid var(--wl-color-border)',
                background: 'var(--wl-color-surface)',
                boxShadow: 'var(--wl-shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SHARED_COLOR }} />
                <strong style={{ fontSize: 13.5, fontWeight: 700 }}>공동 예산</strong>
              </div>
              <div style={{ marginTop: 14 }}>
                <AmountInput
                  id="allocation-shared"
                  label="공동 예산"
                  onChange={(digits) => setState((current) => ({ ...current, sharedDigits: digits }))}
                  value={state.sharedDigits}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                <span className="wl-tabular" style={{ fontSize: 12, fontWeight: 600, color: 'var(--wl-color-text-secondary)' }}>
                  {base ? Math.round((sharedAmount / base) * 100) : 0}%
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <StepButton
                    aria-label="공동 예산 5만원 줄이기"
                    onClick={() => setState((current) => ({ ...current, sharedDigits: String(Math.max(0, toNumber(current.sharedDigits) - STEP)) }))}
                  >
                    -5만
                  </StepButton>
                  <StepButton
                    aria-label="공동 예산 5만원 늘리기"
                    onClick={() => setState((current) => ({ ...current, sharedDigits: String(toNumber(current.sharedDigits) + STEP) }))}
                  >
                    +5만
                  </StepButton>
                </span>
              </div>
            </div>
          ) : null}

          {isSharedLedger ? (
            <div
              style={{
                padding: 16,
                border: '1px dashed var(--wl-data-neutral-muted)',
                borderRadius: 'var(--wl-radius-lg)',
                background: 'var(--wl-color-surface-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: RESERVE_COLOR }} />
                <strong style={{ fontSize: 13.5, fontWeight: 700 }}>예비비</strong>
              </div>
              <p
                className="wl-tabular"
                style={{
                  margin: '14px 0 0',
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-.025em',
                  textAlign: 'right',
                  color: localOver > 0 ? 'var(--wl-color-danger)' : 'var(--wl-color-text-main)',
                }}
              >
                {won(availableReserve)}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--wl-color-text-secondary)' }}>
                전체 예산에서 배분하고 남은 금액이에요
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* 대분류 예산 + 예비비 옮기기 */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            padding: '20px 22px 22px',
            border: '1px solid var(--wl-color-border)',
            borderRadius: 'var(--wl-radius-lg)',
            background: 'var(--wl-color-surface)',
            boxShadow: 'var(--wl-shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <h2 className="wl-list-title" style={{ margin: 0 }}>
              {isSharedLedger ? '공동 예산의 대분류 예산' : '내 예산의 대분류 예산'}
            </h2>
            <span className="wl-tabular wl-meta">
              {isSharedLedger ? '공동 예산' : '내 예산'} {won(catBase)} 중 {won(catSum)}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <Progress
              caption={catSum > catBase ? `${isSharedLedger ? '공동 예산보다' : '내 예산보다'} ${won(catSum - catBase)} 많아요` : `아직 ${won(Math.max(0, catBase - catSum))} 남았어요`}
              value={catBase ? Math.round((catSum / catBase) * 100) : 0}
            />
          </div>

          {categoryEntries.length ? (
            <ul className="budget-category-grid">
              {categoryEntries.map((item) => (
                <li className="budget-category-row" key={item.groupCode}>
                  <CategoryBadge name={item.groupName} size="sm" />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{item.groupName}</strong>
                    {item.previousSpentAmount !== null ? (
                      <span className="wl-tabular" style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                        지난 기간 {won(item.previousSpentAmount)} 사용
                      </span>
                    ) : null}
                  </span>
                  <AmountInput
                    id={`category-${item.groupCode}`}
                    label={`${item.groupName} 예산`}
                    onChange={(digits) => updateCategory(item.groupCode, digits)}
                    value={state.categoryDigits[item.groupCode] ?? '0'}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 14 }}>
              <EmptyState description="대분류 예산이 아직 없어요." title="대분류 예산이 없어요" />
            </div>
          )}
        </div>

        {isSharedLedger ? (
          <div className="budget-reserve-grid">
            <div className="budget-reserve-left">
              <h2 className="wl-list-title" style={{ margin: 0 }}>
                예비비 옮기기
              </h2>
              <strong className="wl-tabular" style={{ display: 'block', marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-.03em' }}>
                {won(availableReserve)}
              </strong>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.6, wordBreak: 'keep-all', color: 'var(--wl-color-text-secondary)' }}>
                예비비에서는 바로 차감하지 않아요.
                <br />
                쓰려면 먼저 옮겨요.
              </p>

              <ul style={{ display: 'grid', gap: 8, margin: '14px 0 0', padding: '12px 0 0', borderTop: '1px solid var(--wl-color-border)', listStyle: 'none' }}>
                {transfersQuery.isLoading ? (
                  <>
                    <Skeleton height={14} />
                    <Skeleton height={14} />
                  </>
                ) : recentTransfers.length ? (
                  recentTransfers.map((transfer) => (
                    <li key={transfer.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatMonthDay(transfer.createdAt)} · {describeTarget(transfer.target, members)}으로
                      </span>
                      <strong className="wl-tabular" style={{ flex: 'none', fontWeight: 700, color: 'var(--wl-color-text-main)' }}>
                        {won(transfer.amount)}
                      </strong>
                    </li>
                  ))
                ) : (
                  <li style={{ fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>옮긴 기록이 없어요.</li>
                )}
              </ul>
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>어느 예산으로 옮길까요?</span>
              <div style={{ marginTop: 10 }}>
                <SegmentedControl
                  label="옮길 대상"
                  onChange={(value) => {
                    const option = moveTargetOptions.find((item) => item.value === value)
                    if (option) setMoveTarget(option.source)
                  }}
                  options={moveTargetOptions.map((item) => ({ value: item.value, label: item.label }))}
                  value={moveTargetValue}
                />
              </div>

              <span style={{ display: 'block', marginTop: 18, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>얼마나 옮길까요?</span>
              <div className="budget-move-row">
                <div className="budget-move-amount">
                  <AmountInput id="move-amount" label="옮길 금액" onChange={setMoveAmountDigits} value={moveAmountDigits} />
                </div>
                <div className="budget-move-actions">
                  <button
                    onClick={() => setMoveAmountDigits(String(availableReserve))}
                    style={{
                      minHeight: 46,
                      padding: '0 14px',
                      border: '1px solid var(--wl-color-border)',
                      borderRadius: 'var(--wl-radius-md)',
                      background: 'var(--wl-color-surface)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--wl-color-text-body)',
                      whiteSpace: 'nowrap',
                    }}
                    type="button"
                  >
                    전액
                  </button>
                  <Button disabled={moveDisabled} loading={transferMutation.isPending} onClick={handleTransfer} size="lg">
                    옮기기
                  </Button>
                </div>
              </div>
              <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>{moveHint}</p>
            </div>
          </div>
        ) : null}
      </section>

      <SaveBar note={saveNote} open={dirty}>
        <div className="budget-savebar-actions">
          <SegmentedControl
            label="적용 범위"
            onChange={(value) => setScope(value as 'once' | 'forward')}
            options={[
              { value: 'once', label: '이번 기간만' },
              { value: 'forward', label: '이후 기본값도' },
            ]}
            value={scope}
          />
          <div className="budget-savebar-buttons">
            <button
              onClick={handleReset}
              style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
              type="button"
            >
              되돌리기
            </button>
            <Button disabled={saveDisabled} loading={mutation.isPending} onClick={handleSave} size="md">
              예산 저장
            </Button>
          </div>
        </div>
      </SaveBar>

      {toast ? (
        <div
          data-anim
          style={{
            position: 'fixed',
            right: 28,
            bottom: 96,
            zIndex: 60,
            animation: 'wl-toast-in 220ms var(--wl-ease-out-strong) both',
          }}
        >
          <Toast tone={toast.tone}>{toast.text}</Toast>
        </div>
      ) : null}

      {periodTab === 'next' && !period.prepared ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
          다음 기간은 아직 준비되지 않았어요. 값을 입력하고 저장하면 다음 기간 예산으로 준비돼요.
        </p>
      ) : null}
    </div>
  )
}

function StepButton({ children, onClick, 'aria-label': ariaLabel }: { children: string; onClick: () => void; 'aria-label': string }) {
  return (
    <button
      aria-label={ariaLabel}
      className="wl-tabular"
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        minWidth: 52,
        height: 44,
        padding: '0 10px',
        borderRadius: 12,
        border: '1px solid var(--wl-color-border)',
        background: 'var(--wl-color-surface)',
        color: 'var(--wl-color-text-body)',
        fontSize: 12.5,
        fontWeight: 700,
      }}
      type="button"
    >
      {children}
    </button>
  )
}
