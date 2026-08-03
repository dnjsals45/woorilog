import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { BudgetCycle } from '../features/ledger/api/ledgerApi'
import { AmountInput } from '../shared/ui/AmountInput'
import { AppHeader } from '../shared/ui/AppHeader'
import { Button } from '../shared/ui/Button'
import { Icon } from '../shared/ui/Icon'
import { Input } from '../shared/ui/Input'
import { Toast } from '../shared/ui/Toast'

export type SharedLedgerCreateInput = { name: string; totalBudget: number; budgetCycle: BudgetCycle }
export type CreatedSharedLedger = { id: number; name: string }
export type SharedLedgerInvitation = { url: string; expiresAt: string }

export type SharedLedgerCreatePageProps = {
  /** 장부가 만들어지면 초대 링크 단계로 전환합니다. */
  ledger?: CreatedSharedLedger | null
  isCreating?: boolean
  createError?: string | null
  onCreate?: (input: SharedLedgerCreateInput) => void | Promise<void>
  invitation?: SharedLedgerInvitation | null
  isCreatingInvitation?: boolean
  invitationError?: string | null
  onRegenerateInvitation?: () => void | Promise<void>
  /** 복사 성공 여부를 돌려줍니다. false면 "길게 눌러 복사하세요" 안내를 띄웁니다. */
  onCopyInvitation?: (url: string) => boolean | Promise<boolean>
  /** '장부로 이동' 클릭 시 호출합니다. */
  onDone?: () => void
}

const AMOUNT_STEPS = [
  { label: '+10만', amount: 100_000 },
  { label: '+50만', amount: 500_000 },
  { label: '+100만', amount: 1_000_000 },
]
const DAYS: Array<number | 'LAST'> = [...Array.from({ length: 28 }, (_, index) => index + 1), 'LAST']

/** 시작일 기준으로 오늘이 속한 예산 기간의 시작일을 구합니다. */
function budgetPeriodStart(day: number | 'LAST', today: Date): Date {
  if (day === 'LAST') {
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const todayIsLastDay = today.getDate() === endOfThisMonth.getDate()
    return todayIsLastDay ? endOfThisMonth : new Date(today.getFullYear(), today.getMonth(), 0)
  }
  const startThisMonth = new Date(today.getFullYear(), today.getMonth(), day)
  return today.getDate() >= day ? startThisMonth : new Date(today.getFullYear(), today.getMonth() - 1, day)
}

/** '이번 기간' 미리보기 — 서버 계산 없이 시작일 선택만으로 바로 갱신됩니다.
 * 다음 시작일 하루 전까지를 이번 기간 종료일로 봅니다(말일 기준은 다음 달 말일 하루 전). */
function budgetPeriodPreview(day: number | 'LAST', today = new Date()) {
  const start = budgetPeriodStart(day, today)
  const nextStart =
    day === 'LAST'
      ? new Date(start.getFullYear(), start.getMonth() + 2, 0)
      : new Date(start.getFullYear(), start.getMonth() + 1, day)
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1)
  const format = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`
  return `${format(start)}부터 ${format(end)}까지`
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '만료됨'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

function computeCountdown(expiresAt: string | undefined) {
  return expiresAt ? formatCountdown(new Date(expiresAt).getTime() - Date.now()) : ''
}

/** expiresAt이 바뀌면(재생성) 렌더 중에 바로 갱신하고, 그 뒤로는 1초마다 남은 시간을 다시 계산합니다. */
function useCountdownLabel(expiresAt: string | undefined) {
  const [state, setState] = useState(() => ({ expiresAt, label: computeCountdown(expiresAt) }))

  if (state.expiresAt !== expiresAt) {
    setState({ expiresAt, label: computeCountdown(expiresAt) })
  }

  useEffect(() => {
    if (!expiresAt) return undefined
    const interval = window.setInterval(() => {
      setState((current) => ({ ...current, label: computeCountdown(expiresAt) }))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  return state.label
}

const dayChipStyle = (selected: boolean): CSSProperties => ({
  minWidth: 44,
  minHeight: 44,
  padding: '0 10px',
  border: '1px solid',
  borderColor: selected ? 'var(--wl-color-primary)' : 'var(--wl-color-border)',
  borderRadius: 12,
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: selected ? 700 : 600,
  background: selected ? 'var(--wl-brand-100)' : 'var(--wl-color-surface)',
  color: selected ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-body)',
})

function FormStep({
  name,
  onNameChange,
  totalBudgetDigits,
  onTotalBudgetChange,
  onStep,
  day,
  onDayChange,
  periodLabel,
  createError,
  isCreating,
  disabled,
  onSubmit,
}: {
  name: string
  onNameChange: (value: string) => void
  totalBudgetDigits: string
  onTotalBudgetChange: (digits: string) => void
  onStep: (amount: number) => void
  day: number | 'LAST'
  onDayChange: (day: number | 'LAST') => void
  periodLabel: string
  createError?: string | null
  isCreating: boolean
  disabled: boolean
  onSubmit: () => void
}) {
  return (
    <div>
      <h1 className="wl-page-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.03em' }}>
        공동 장부 만들기
      </h1>
      <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
        한 기간에 함께 쓸 전체 예산과 예산 기간을 먼저 정해요. 배분은 상대방이 참여한 뒤 함께 정합니다.
      </p>

      <div style={{ display: 'grid', gap: 22, marginTop: 26 }}>
        <Input
          hint="둘이 함께 볼 이름이에요. 나중에 설정에서 바꿀 수 있어요."
          id="shared-ledger-name"
          label="장부 이름"
          maxLength={30}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="예: 우리 생활비"
          value={name}
        />

        <div>
          <AmountInput
            id="shared-ledger-budget"
            label="기간 전체 예산"
            onChange={onTotalBudgetChange}
            value={totalBudgetDigits}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {AMOUNT_STEPS.map((step) => (
              <button
                className="wl-body"
                key={step.label}
                onClick={() => onStep(step.amount)}
                style={{
                  minHeight: 40,
                  padding: '0 12px',
                  border: '1px solid var(--wl-color-border)',
                  borderRadius: 'var(--wl-radius-pill)',
                  background: 'var(--wl-color-surface)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--wl-color-text-body)',
                }}
                type="button"
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="wl-field-label" style={{ display: 'block', marginBottom: 9 }}>
            예산 기간 시작일
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 132, overflow: 'auto', padding: 2 }}>
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => onDayChange(d)}
                style={dayChipStyle(d === day)}
                type="button"
              >
                {d === 'LAST' ? '말일' : d}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 14,
              padding: '14px 16px',
              borderRadius: 'var(--wl-radius-md)',
              background: 'var(--wl-brand-50)',
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-primary-dark)' }}>이번 기간</span>
            <strong className="wl-tabular" style={{ fontSize: 14, fontWeight: 700, color: 'var(--wl-color-primary-dark)' }}>
              {periodLabel}
            </strong>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
            기간 중간에 만들어도 남은 날짜에 맞춰 줄이지 않고 이번 기간의 전체 금액으로 저장해요.
          </p>
        </div>
      </div>

      {createError ? (
        <p className="wl-field-error" role="alert" style={{ marginTop: 20 }}>
          <Icon name="circle-alert" size="sm" />
          {createError}
        </p>
      ) : null}

      <div className="ledger-create-footer">
        <Link
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--wl-color-text-secondary)',
          }}
          to="/dashboard"
        >
          취소
        </Link>
        <Button disabled={disabled || isCreating} loading={isCreating} onClick={onSubmit} size="lg">
          장부 만들고 초대하기
        </Button>
      </div>
    </div>
  )
}

function DoneStep({
  ledgerName,
  invitation,
  isCreatingInvitation,
  invitationError,
  copyState,
  onCopy,
  onRegenerate,
  onDone,
}: {
  ledgerName: string
  invitation: SharedLedgerInvitation | null
  isCreatingInvitation: boolean
  invitationError?: string | null
  copyState: 'idle' | 'copied' | 'failed'
  onCopy: () => void
  onRegenerate: () => void
  onDone: () => void
}) {
  const countdown = useCountdownLabel(invitation?.expiresAt)

  return (
    <div>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--wl-brand-100)',
          color: 'var(--wl-color-primary-dark)',
        }}
      >
        <Icon name="check" size="lg" />
      </span>
      <h1 className="wl-page-title" style={{ margin: '18px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-.03em' }}>
        {ledgerName} 장부를 만들었어요
      </h1>
      <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
        이제 함께 쓸 상대방을 초대하세요. 링크는 만든 뒤 30분 동안만 쓸 수 있어요.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {invitation ? (
          <>
            {/* min-width:0 이 없으면 이 행이 그리드 아이템의 자동 최소 크기(min-content) 아래로
                줄어들지 못해 트랙을 밀어냅니다. 카드는 overflow:visible 이라 그대로 새어나가고,
                오른쪽에 있는 복사 버튼이 화면 밖으로 사라집니다. */}
            <div className="invite-link-row">
              <span className="invite-link-url">{invitation.url}</span>
              <button className="invite-link-copy" onClick={onCopy} type="button">
                {copyState === 'copied' ? '복사했어요' : copyState === 'failed' ? '복사 실패' : '링크 복사'}
              </button>
            </div>
            {copyState === 'failed' ? (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                자동 복사가 막혔어요. 위 주소를 길게 눌러 직접 복사해 주세요.
              </p>
            ) : null}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 12.5,
                color: 'var(--wl-color-text-secondary)',
              }}
            >
              <span>남은 유효 시간</span>
              <strong className="wl-tabular" style={{ fontWeight: 700, color: 'var(--wl-color-text-main)' }}>
                {countdown}
              </strong>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>
            {isCreatingInvitation ? '초대 링크를 만드는 중이에요...' : '초대 링크를 아직 만들지 못했어요.'}
          </p>
        )}
        {invitationError ? (
          <p className="wl-field-error" role="alert">
            <Icon name="circle-alert" size="sm" />
            {invitationError}
          </p>
        ) : null}
      </div>

      <ul
        style={{
          display: 'grid',
          gap: 9,
          margin: '22px 0 0',
          padding: 0,
          listStyle: 'none',
          fontSize: 12.5,
          lineHeight: 1.6,
          color: 'var(--wl-color-text-secondary)',
        }}
      >
        <li>새 링크를 만들면 이전 링크는 바로 쓸 수 없게 돼요.</li>
        <li>상대방이 수락하면 링크가 즉시 만료돼요.</li>
        <li>예산 배분은 두 사람이 모두 참여한 뒤에 함께 정해요.</li>
      </ul>

      <div className="ledger-create-footer ledger-create-footer--between">
        <button
          disabled={isCreatingInvitation}
          onClick={onRegenerate}
          style={{
            minHeight: 44,
            padding: '0 14px',
            marginLeft: -14,
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--wl-color-text-secondary)',
          }}
          type="button"
        >
          링크 다시 만들기
        </button>
        <Button onClick={onDone} size="lg">
          장부로 이동
        </Button>
      </div>
    </div>
  )
}

export function SharedLedgerCreatePage({
  ledger = null,
  isCreating = false,
  createError,
  onCreate,
  invitation = null,
  isCreatingInvitation = false,
  invitationError,
  onRegenerateInvitation,
  onCopyInvitation,
  onDone,
}: SharedLedgerCreatePageProps) {
  const [name, setName] = useState('')
  const [totalBudgetDigits, setTotalBudgetDigits] = useState('1000000')
  const [day, setDay] = useState<number | 'LAST'>(1)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [toast, setToast] = useState('')
  const copyTimerRef = useRef<number | undefined>(undefined)
  const toastTimerRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(copyTimerRef.current)
      window.clearTimeout(toastTimerRef.current)
    },
    [],
  )

  const totalBudget = Number(totalBudgetDigits || '0')
  const trimmedName = name.trim()
  const valid = trimmedName.length > 0 && trimmedName.length <= 30 && totalBudget > 0
  const isDone = Boolean(ledger)

  function handleSubmit() {
    if (!valid || !onCreate) return
    onCreate({
      name: trimmedName,
      totalBudget,
      budgetCycle:
        day === 'LAST' ? { startType: 'LAST_DAY_OF_MONTH', startDay: null } : { startType: 'DAY_OF_MONTH', startDay: day },
    })
  }

  async function handleCopy() {
    if (!invitation) return
    // http 로 여는 홈 배포에서는 클립보드 API 가 없어 폴백도 실패할 수 있습니다.
    // 실패했는데 "복사했어요"라고 말하면 링크가 없는 채로 넘어가게 됩니다.
    const ok = (await onCopyInvitation?.(invitation.url)) ?? false
    setCopyState(ok ? 'copied' : 'failed')
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), ok ? 2000 : 6000)
  }

  async function handleRegenerate() {
    if (!onRegenerateInvitation) return
    await onRegenerateInvitation()
    window.clearTimeout(toastTimerRef.current)
    setToast('새 링크를 만들었어요. 이전 링크는 만료됐어요.')
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3500)
  }

  return (
    <div>
      <AppHeader
        description={
          isDone ? '이제 함께 쓸 상대방을 초대해요.' : '예산 기간과 전체 예산을 먼저 정하고, 배분은 나중에 함께 정해요.'
        }
        title="공동 장부 만들기"
      />
      <div className="ledger-create-shell">
        <div
          className="ledger-create-card"
          style={{
            width: 'min(560px, 100%)',
            border: '1px solid var(--wl-color-border)',
            borderRadius: 'var(--wl-radius-lg)',
            background: 'var(--wl-color-surface)',
            boxShadow: 'var(--wl-shadow-card)',
          }}
        >
          {isDone ? (
            <DoneStep
              copyState={copyState}
              invitation={invitation}
              invitationError={invitationError}
              isCreatingInvitation={isCreatingInvitation}
              ledgerName={ledger!.name}
              onCopy={handleCopy}
              onDone={() => onDone?.()}
              onRegenerate={() => void handleRegenerate()}
            />
          ) : (
            <FormStep
              createError={createError}
              day={day}
              disabled={!valid}
              isCreating={isCreating}
              name={name}
              onDayChange={setDay}
              onNameChange={setName}
              onStep={(amount) => setTotalBudgetDigits((current) => String(Number(current || '0') + amount))}
              onSubmit={handleSubmit}
              onTotalBudgetChange={setTotalBudgetDigits}
              periodLabel={budgetPeriodPreview(day)}
              totalBudgetDigits={totalBudgetDigits}
            />
          )}
        </div>
      </div>

      {toast ? (
        <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 60 }}>
          <Toast tone="success">{toast}</Toast>
        </div>
      ) : null}
    </div>
  )
}
