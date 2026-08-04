import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useCardsQuery } from '../../card/model/cardQueries'
import { AmountInput } from '../../../shared/ui/AmountInput'
import { CategoryBadge } from '../../../shared/ui/CategoryBadge'
import { DatePicker } from '../../../shared/ui/DatePicker'
import { Icon } from '../../../shared/ui/Icon'
import { Input } from '../../../shared/ui/Input'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import type { PaymentMethod, TransactionType } from '../api/transactionApi'
import { useMerchantSuggestionsQuery } from '../model/transactionQueries'

/** '거래 추가'와 '거래 상세' 모달이 함께 쓰는 결제 수단 갈래.
 * API의 PaymentMethod('CASH'|'CARD'|'OTHER')와 달리 '계좌이체'를 하나 더 둬서
 * 선택 시 거래 종류를 TRANSFER로 밀어 올립니다(아래 effectiveType 참고). */
export type TransactionFormPaymentKind = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
export type TransactionFormTransferKind = 'OWN_ACCOUNTS' | 'OUTBOUND' | 'INBOUND'
export type TransactionFormBudgetSourceType = 'PERSONAL' | 'SHARED'

export interface TransactionFormCategory {
  id: number
  name: string
  type: TransactionType
}

/** onSubmit으로 넘어가는 값. API 요청 형태(V1TransactionRequest)와 1:1은 아니고,
 * 화면이 다루는 입력 단위입니다 — 저장 방식(일반 거래 vs 반복 계획)은 호출부가 결정합니다. */
export interface TransactionFormValues {
  /** 결제 수단으로 '계좌이체'를 고르면 탭 선택과 무관하게 TRANSFER로 계산됩니다. */
  type: TransactionType
  transferType: TransactionFormTransferKind | null
  amount: number
  merchant: string
  categoryId: number | null
  occurredOn: string
  budgetSourceType: TransactionFormBudgetSourceType
  paymentMethod: { type: PaymentMethod; displayName: string | null }
  /** 저장된 카드를 고른 경우에만 채웁니다. 이 값이 있어야 대시보드 카드 결제 예정 금액에 잡힙니다. */
  cardId: number | null
  installment: { months: number; monthlyInterest: number } | null
  memo: string
  /** 매달 반복 여부. 지출에서만 의미가 있습니다(V1은 반복 수입을 지원하지 않음). */
  repeat: boolean
  fixedCost: boolean
}

export type TransactionFormInitialValues = Partial<Omit<TransactionFormValues, 'paymentMethod' | 'installment'>> & {
  paymentMethod?: Partial<TransactionFormValues['paymentMethod']>
  installment?: TransactionFormValues['installment']
}

/** renderFooter로 넘어가는 값 — 거래 상세 모달처럼 기본 취소/저장 푸터 대신
 * SaveBar 형태를 그리고 싶을 때, 폼 내부 상태(더티 여부·제출 함수)에 접근하는 용도입니다. */
export interface TransactionFormFooterContext {
  /** 마운트 시점 initialValues 대비 무엇이든 바뀌었으면 true. */
  dirty: boolean
  submitting: boolean
  /** 유효성 검사를 통과하면 onSubmit을 호출합니다(keepOpen: false 고정). */
  submit: () => void
  /** 모든 입력을 마운트 시점 initialValues로 되돌립니다. */
  reset: () => void
}

export interface TransactionFormProps {
  /** 'edit'은 거래 상세 모달에서 씁니다 — 라벨 기본값과 showKeepOpen 기본값이 갈립니다. */
  mode: 'create' | 'edit'
  categories: TransactionFormCategory[]
  isSharedLedger: boolean
  initialValues?: TransactionFormInitialValues
  /** 사용처 자동완성과 저장된 카드 목록 조회에 씁니다. 없으면 두 기능 모두 비활성화됩니다. */
  ledgerId?: number
  submitting?: boolean
  submitError?: string | null
  /** 'create'에서만 기본 true — 편집 화면은 이어서 입력할 대상이 없습니다. */
  showKeepOpen?: boolean
  submitLabel?: string
  onCancel?: () => void
  onSubmit: (values: TransactionFormValues, meta: { keepOpen: boolean }) => void
  /** 저장 성공 후 "계속 입력"일 때 금액·사용처·메모를 비우기 위해 값을 바꿔 신호를 보냅니다. */
  resetSignal?: number | string
  /** 넘기면 기본 취소/저장 푸터 대신 이 함수가 그린 내용을 씁니다.
   * 거래 상세 모달의 "미저장 변경 SaveBar + 별도 삭제 버튼" 처럼 푸터 모양이 아예 다를 때만 씁니다. */
  renderFooter?: (context: TransactionFormFooterContext) => ReactNode
}

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: '지출' },
  { value: 'INCOME', label: '수입' },
] as const

const BUDGET_OPTIONS = [
  { value: 'SHARED', label: '공동' },
  { value: 'PERSONAL', label: '내 예산' },
]

const PAYMENT_KINDS: { value: TransactionFormPaymentKind; label: string }[] = [
  { value: 'CASH', label: '현금' },
  { value: 'CARD', label: '카드' },
  { value: 'TRANSFER', label: '계좌이체' },
  { value: 'OTHER', label: '기타' },
]

const TRANSFER_KINDS: { value: TransactionFormTransferKind; label: string }[] = [
  { value: 'OWN_ACCOUNTS', label: '내 계좌 간 이체' },
  { value: 'OUTBOUND', label: '다른 곳으로 송금' },
  { value: 'INBOUND', label: '외부에서 입금' },
]

const INSTALLMENT_MONTHS = [2, 3, 6, 10, 12, 18, 24]

function chipStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    padding: '0 13px',
    borderRadius: 'var(--wl-radius-pill)',
    fontSize: 13.5,
    fontWeight: 600,
    border: '1px solid',
    borderColor: active ? 'var(--wl-color-primary)' : 'var(--wl-color-border)',
    background: active ? 'var(--wl-brand-50)' : 'var(--wl-color-surface)',
    color: active ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-body)',
  }
}

function switchTrackStyle(on: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    flex: 'none',
    width: 44,
    height: 26,
    padding: 3,
    borderRadius: 'var(--wl-radius-pill)',
    transition: 'background-color 160ms var(--wl-ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1))',
    background: on ? 'var(--wl-color-primary)' : 'var(--wl-data-neutral-muted)',
    justifyContent: on ? 'flex-end' : 'flex-start',
  }
}

const switchThumbStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 3px rgb(0 0 0 / 20%)',
}

const sectionLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 9,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--wl-color-text-body)',
}

const fieldGroupStyle: CSSProperties = {
  padding: 14,
  border: '1px solid var(--wl-color-border)',
  borderRadius: 'var(--wl-radius-md)',
  background: 'var(--wl-color-surface-subtle)',
}

function toDigits(value: string) {
  return value.replace(/[^0-9]/g, '')
}

/** 초기값에서 결제 수단 갈래를 되짚습니다 — TRANSFER는 type으로만 구분되고 paymentMethod엔 별도 값이 없어서요. */
function paymentKindFromInitial(initial?: TransactionFormInitialValues): TransactionFormPaymentKind {
  if (initial?.type === 'TRANSFER') return 'TRANSFER'
  return initial?.paymentMethod?.type ?? 'CASH'
}

export function TransactionForm({
  mode,
  categories,
  isSharedLedger,
  initialValues,
  ledgerId,
  submitting = false,
  submitError,
  showKeepOpen = mode === 'create',
  submitLabel,
  onCancel,
  onSubmit,
  resetSignal,
  renderFooter,
}: TransactionFormProps) {
  const [type, setType] = useState<Extract<TransactionType, 'EXPENSE' | 'INCOME'>>(
    initialValues?.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
  )
  const [paymentKind, setPaymentKind] = useState<TransactionFormPaymentKind>(paymentKindFromInitial(initialValues))
  const [transferKind, setTransferKind] = useState<TransactionFormTransferKind>(
    initialValues?.transferType ?? 'OWN_ACCOUNTS',
  )
  const [amountDigits, setAmountDigits] = useState(String(initialValues?.amount ?? ''))
  const [merchant, setMerchant] = useState(initialValues?.merchant ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.categoryId ?? null)
  const [occurredOn, setOccurredOn] = useState(initialValues?.occurredOn ?? '')
  const [budgetSourceType, setBudgetSourceType] = useState<TransactionFormBudgetSourceType>(
    initialValues?.budgetSourceType ?? 'SHARED',
  )
  const [paymentDisplayName, setPaymentDisplayName] = useState(initialValues?.paymentMethod?.displayName ?? '')
  const [payPlan, setPayPlan] = useState<'once' | 'installment'>(
    initialValues?.installment ? 'installment' : 'once',
  )
  const [months, setMonths] = useState(String(initialValues?.installment?.months ?? 12))
  const [interestDigits, setInterestDigits] = useState(String(initialValues?.installment?.monthlyInterest ?? 0))
  const [memo, setMemo] = useState(initialValues?.memo ?? '')
  const [moreOpen, setMoreOpen] = useState(false)
  const [repeat, setRepeat] = useState(initialValues?.repeat ?? false)
  const [fixedCost, setFixedCost] = useState(initialValues?.fixedCost ?? false)
  const [keepOpen, setKeepOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const amountInputRef = useRef<HTMLDivElement>(null)

  // renderFooter(dirty)와 reset()의 기준점 — 마운트 시점 값 그대로 한 번만 잡아둡니다.
  // (렌더 중에 읽어도 안전하도록 ref 대신 절대 갱신하지 않는 state를 씁니다.)
  const [initialSnapshot] = useState(() => ({
    type: initialValues?.type === 'INCOME' ? 'INCOME' : ('EXPENSE' as Extract<TransactionType, 'EXPENSE' | 'INCOME'>),
    paymentKind: paymentKindFromInitial(initialValues),
    transferKind: initialValues?.transferType ?? ('OWN_ACCOUNTS' as TransactionFormTransferKind),
    amountDigits: String(initialValues?.amount ?? ''),
    merchant: initialValues?.merchant ?? '',
    categoryId: initialValues?.categoryId ?? null,
    occurredOn: initialValues?.occurredOn ?? '',
    budgetSourceType: initialValues?.budgetSourceType ?? ('SHARED' as TransactionFormBudgetSourceType),
    paymentDisplayName: initialValues?.paymentMethod?.displayName ?? '',
    payPlan: (initialValues?.installment ? 'installment' : 'once') as 'once' | 'installment',
    months: String(initialValues?.installment?.months ?? 12),
    interestDigits: String(initialValues?.installment?.monthlyInterest ?? 0),
    memo: initialValues?.memo ?? '',
    repeat: initialValues?.repeat ?? false,
    fixedCost: initialValues?.fixedCost ?? false,
  }))
  const dirty =
    renderFooter !== undefined &&
    (type !== initialSnapshot.type ||
      paymentKind !== initialSnapshot.paymentKind ||
      transferKind !== initialSnapshot.transferKind ||
      amountDigits !== initialSnapshot.amountDigits ||
      merchant !== initialSnapshot.merchant ||
      categoryId !== initialSnapshot.categoryId ||
      occurredOn !== initialSnapshot.occurredOn ||
      budgetSourceType !== initialSnapshot.budgetSourceType ||
      paymentDisplayName !== initialSnapshot.paymentDisplayName ||
      payPlan !== initialSnapshot.payPlan ||
      months !== initialSnapshot.months ||
      interestDigits !== initialSnapshot.interestDigits ||
      memo !== initialSnapshot.memo ||
      repeat !== initialSnapshot.repeat ||
      fixedCost !== initialSnapshot.fixedCost)
  function resetToInitial() {
    const initial = initialSnapshot
    setType(initial.type)
    setPaymentKind(initial.paymentKind)
    setTransferKind(initial.transferKind)
    setAmountDigits(initial.amountDigits)
    setMerchant(initial.merchant)
    setCategoryId(initial.categoryId)
    setOccurredOn(initial.occurredOn)
    setBudgetSourceType(initial.budgetSourceType)
    setPaymentDisplayName(initial.paymentDisplayName)
    setPayPlan(initial.payPlan)
    setMonths(initial.months)
    setInterestDigits(initial.interestDigits)
    setMemo(initial.memo)
    setRepeat(initial.repeat)
    setFixedCost(initial.fixedCost)
  }

  // "저장 후 계속 입력하기"로 저장한 다음: 금액·사용처·메모만 비우고 카테고리·날짜·예산·결제 수단은 유지합니다.
  const resetSignalRef = useRef(resetSignal)
  useEffect(() => {
    if (resetSignal === undefined || resetSignal === resetSignalRef.current) return
    resetSignalRef.current = resetSignal
    setAmountDigits('')
    setMerchant('')
    setMemo('')
    setTouched(false)
    amountInputRef.current?.querySelector('input')?.focus()
  }, [resetSignal])

  const effectiveType: TransactionType = paymentKind === 'TRANSFER' ? 'TRANSFER' : type
  const deductsBudget = effectiveType === 'EXPENSE' || (effectiveType === 'TRANSFER' && transferKind === 'OUTBOUND')
  const isCard = paymentKind === 'CARD'
  const isTransfer = paymentKind === 'TRANSFER'
  const isInstallment = isCard && payPlan === 'installment'
  // V1은 반복 수입을 지원하지 않습니다 (docs/engineering/scheduled-transactions.md).
  const repeatAvailable = effectiveType === 'EXPENSE'

  const amount = Number(amountDigits || '0')
  const selectableCategories = useMemo(
    () => categories.filter((category) => category.type === effectiveType),
    [categories, effectiveType],
  )
  const deferredMerchant = useDeferredValue(merchant.trim())
  const merchantSuggestionsQuery = useMerchantSuggestionsQuery(ledgerId, deferredMerchant)
  const suggestions = useMemo(() => {
    const trimmed = merchant.trim()
    if (!trimmed) return []
    return (merchantSuggestionsQuery.data?.items ?? [])
      .map((item) => item.merchant)
      .filter((place) => place !== trimmed)
  }, [merchant, merchantSuggestionsQuery.data])

  const cardsQuery = useCardsQuery(ledgerId)
  const cards = cardsQuery.data ?? []

  let amountHint = isSharedLedger ? '공동 예산에서 빠지고, 두 사람 모두에게 보여요' : ''
  if (isTransfer && transferKind === 'OWN_ACCOUNTS') amountHint = '내 계좌 간 이체는 예산과 통계에서 빼고 기록해요'
  else if (isTransfer && transferKind === 'INBOUND') amountHint = '외부 입금은 수입으로 기록하고 예산은 그대로예요'
  else if (effectiveType === 'INCOME') amountHint = '수입은 통계에만 반영되고 예산은 자동으로 늘지 않아요'
  else if (deductsBudget && isSharedLedger && budgetSourceType === 'PERSONAL') amountHint = '내 예산에서만 차감돼요'

  const transferNote =
    transferKind === 'OWN_ACCOUNTS'
      ? '내 계좌 간 이체는 예산 사용액과 수입·지출 통계에서 빼고 기록해요.'
      : transferKind === 'OUTBOUND'
        ? '다른 곳으로 송금은 지출로 기록하고 선택한 예산에서 차감해요.'
        : '외부에서 입금은 수입으로 기록하고 전체 예산은 그대로 둬요.'

  const principal = Math.round(amount / Math.max(1, Number(months || '1')))
  const installmentNote = amount
    ? `회차마다 원금 ${principal.toLocaleString('ko-KR')}원에 월 이자 ${Number(interestDigits || '0').toLocaleString('ko-KR')}원을 더해 결제일이 속한 기간에 반영해요.`
    : '금액을 입력하면 회차별 반영 금액을 보여드려요.'

  const amountError = touched && amount <= 0 ? '금액을 입력해 주세요' : ''
  const merchantError = touched && !merchant.trim() ? '사용처를 입력해 주세요' : ''
  const categoryError = touched && !categoryId ? '카테고리를 선택해 주세요' : ''

  function handleSubmit() {
    if (amount <= 0 || !merchant.trim() || !categoryId) {
      setTouched(true)
      return
    }
    const values: TransactionFormValues = {
      type: effectiveType,
      transferType: isTransfer ? transferKind : null,
      amount,
      merchant: merchant.trim(),
      categoryId,
      occurredOn,
      budgetSourceType,
      paymentMethod: {
        type: isTransfer ? 'OTHER' : (paymentKind as PaymentMethod),
        displayName: isTransfer ? '계좌이체' : paymentDisplayName.trim() || null,
      },
      // 카드 칩을 고르면 이름이 그대로 들어오므로 이름으로 되짚습니다. 직접 입력한 이름이면 매칭되지 않고 null 입니다.
      cardId: isCard ? (cards.find((card) => card.name === paymentDisplayName.trim())?.id ?? null) : null,
      installment:
        isCard && isInstallment && Number(months) > 1
          ? { months: Number(months), monthlyInterest: Number(interestDigits || '0') }
          : null,
      memo: memo.trim(),
      repeat: repeatAvailable && repeat,
      fixedCost: repeatAvailable && repeat && fixedCost,
    }
    onSubmit(values, { keepOpen })
  }

  return (
    <div>
      <div
        style={{
          padding: '20px 20px 22px',
          background: 'var(--wl-color-surface-subtle)',
          borderBottom: '1px solid var(--wl-color-border)',
        }}
      >
        <SegmentedControl label="거래 종류" onChange={(value) => setType(value as typeof type)} options={[...TYPE_OPTIONS]} value={type} />
        <div ref={amountInputRef} style={{ marginTop: 16 }}>
          <AmountInput error={amountError} hint={amountHint} label="금액" onChange={setAmountDigits} value={amountDigits} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, padding: '22px 20px' }}>
        <div>
          <Input
            error={merchantError}
            hint={isTransfer ? '상대 계좌나 상대방 이름을 적어요' : undefined}
            label="사용처"
            maxLength={100}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="예: 이마트 성수점"
            value={merchant}
          />
          {suggestions.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {suggestions.map((place) => (
                <button
                  key={place}
                  onClick={() => setMerchant(place)}
                  style={{
                    minHeight: 32,
                    padding: '0 10px',
                    border: '1px solid var(--wl-color-border)',
                    borderRadius: 'var(--wl-radius-pill)',
                    background: 'var(--wl-color-surface)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--wl-color-text-secondary)',
                  }}
                  type="button"
                >
                  {place}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <fieldset>
          <legend style={sectionLabelStyle}>카테고리</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectableCategories.map((category) => (
              <button
                aria-pressed={category.id === categoryId}
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                style={chipStyle(category.id === categoryId)}
                type="button"
              >
                <CategoryBadge name={category.name} size="sm" />
                {category.name}
              </button>
            ))}
            {selectableCategories.length === 0 ? (
              <p className="wl-body" style={{ margin: 0, color: 'var(--wl-color-text-secondary)' }}>
                등록된 카테고리가 없어요. 설정에서 먼저 만들어 주세요.
              </p>
            ) : null}
          </div>
          {categoryError ? (
            <p className="wl-field-error" role="alert" style={{ marginTop: 8 }}>
              <Icon name="circle-alert" size="sm" />
              {categoryError}
            </p>
          ) : null}
        </fieldset>

        <div className={`tx-form-date-budget${deductsBudget && isSharedLedger ? ' tx-form-date-budget--split' : ''}`}>
          <div>
            <span style={sectionLabelStyle}>날짜</span>
            <DatePicker ariaLabel="거래 날짜" onChange={setOccurredOn} value={occurredOn} />
          </div>
          {deductsBudget && isSharedLedger ? (
            <div>
              <span style={sectionLabelStyle}>차감 예산</span>
              <SegmentedControl
                label="차감 예산"
                onChange={(value) => setBudgetSourceType(value as TransactionFormBudgetSourceType)}
                options={BUDGET_OPTIONS}
                value={budgetSourceType}
              />
            </div>
          ) : null}
        </div>

        <div>
          <span style={sectionLabelStyle}>결제 수단</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PAYMENT_KINDS.map((kind) => (
              <button
                aria-pressed={kind.value === paymentKind}
                key={kind.value}
                onClick={() => setPaymentKind(kind.value)}
                style={chipStyle(kind.value === paymentKind)}
                type="button"
              >
                {kind.label}
              </button>
            ))}
          </div>

          {isCard && cards.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <span style={sectionLabelStyle}>등록한 카드</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cards.map((card) => (
                  <button
                    aria-pressed={card.name === paymentDisplayName}
                    key={card.id}
                    onClick={() => setPaymentDisplayName(card.name)}
                    style={chipStyle(card.name === paymentDisplayName)}
                    type="button"
                  >
                    {card.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {paymentKind !== 'TRANSFER' ? (
            <div style={{ marginTop: 12 }}>
              <Input
                label="결제 수단 이름 (선택)"
                onChange={(event) => setPaymentDisplayName(event.target.value)}
                placeholder="예: 생활비 카드"
                value={paymentDisplayName}
              />
            </div>
          ) : null}

          {isTransfer ? (
            <div data-anim style={{ marginTop: 14, ...fieldGroupStyle }}>
              <span style={sectionLabelStyle}>이체 유형</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRANSFER_KINDS.map((kind) => (
                  <button
                    aria-pressed={kind.value === transferKind}
                    key={kind.value}
                    onClick={() => setTransferKind(kind.value)}
                    style={chipStyle(kind.value === transferKind)}
                    type="button"
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.55, color: 'var(--wl-color-text-secondary)' }}>
                {transferNote}
              </p>
            </div>
          ) : null}

          {isCard ? (
            <div data-anim style={{ marginTop: 14, ...fieldGroupStyle }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    { value: 'once', label: '일시불' },
                    { value: 'installment', label: '할부' },
                  ] as const
                ).map((plan) => (
                  <button
                    aria-pressed={plan.value === payPlan}
                    key={plan.value}
                    onClick={() => setPayPlan(plan.value)}
                    style={chipStyle(plan.value === payPlan)}
                    type="button"
                  >
                    {plan.label}
                  </button>
                ))}
              </div>
              {isInstallment ? (
                <>
                  <div className="tx-form-installment-grid">
                    <label>
                      <span style={{ display: 'block', marginBottom: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--wl-color-text-body)' }}>
                        할부 개월
                      </span>
                      <select
                        className="wl-input"
                        onChange={(event) => setMonths(event.target.value)}
                        style={{ height: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        value={months}
                      >
                        {INSTALLMENT_MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}개월
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span style={{ display: 'block', marginBottom: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--wl-color-text-body)' }}>
                        월 이자
                      </span>
                      <input
                        className="wl-input"
                        inputMode="numeric"
                        onChange={(event) => setInterestDigits(toDigits(event.target.value))}
                        style={{ height: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        value={interestDigits}
                      />
                    </label>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.55, color: 'var(--wl-color-text-secondary)' }}>
                    {installmentNote}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--wl-color-border)' }}>
        <button
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((current) => !current)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            minHeight: 56,
            padding: '0 20px',
            textAlign: 'left',
          }}
          type="button"
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wl-color-text-body)' }}>메모와 반복 설정</span>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              color: 'var(--wl-color-text-secondary)',
              transition: 'transform 220ms var(--wl-ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1))',
              transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <Icon name="chevron-down" size="md" />
          </span>
        </button>

        <div
          inert={!moreOpen ? true : undefined}
          style={{
            display: 'grid',
            gridTemplateRows: moreOpen ? '1fr' : '0fr',
            opacity: moreOpen ? 1 : 0,
            transition: 'grid-template-rows 240ms var(--wl-ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1)), opacity 180ms ease',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gap: 18, padding: '4px 20px 22px' }}>
              <label>
                <span style={sectionLabelStyle}>메모</span>
                <textarea
                  className="wl-input"
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="같이 기억해 두고 싶은 내용을 적어요"
                  rows={2}
                  style={{ height: 'auto', minHeight: 80, padding: 12, lineHeight: 1.6, resize: 'vertical' }}
                  value={memo}
                />
              </label>

              {repeatAvailable ? (
                <>
                  <button
                    onClick={() => setRepeat((current) => !current)}
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
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>매달 반복되는 거래예요</strong>
                      <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                        {repeat && occurredOn ? `매달 이 날짜에 자동으로 기록해요` : '켜면 매달 같은 날에 자동으로 기록해요'}
                      </span>
                    </span>
                    <span style={switchTrackStyle(repeat)}>
                      <i style={switchThumbStyle} />
                    </span>
                  </button>

                  {repeat ? (
                    <button
                      onClick={() => setFixedCost((current) => !current)}
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
                        <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>고정비로 관리할게요</strong>
                        <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                          고정비끼리 따로 모아 합계를 볼 수 있어요
                        </span>
                      </span>
                      <span style={switchTrackStyle(fixedCost)}>
                        <i style={switchThumbStyle} />
                      </span>
                    </button>
                  ) : null}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                  {/* TODO(api): 반복 수입·반복 이체 생성 API가 없어요 (V1은 반복 지출만 지원합니다). */}
                  반복 등록은 지출에서만 할 수 있어요.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {submitError ? (
        <p className="wl-field-error" role="alert" style={{ margin: '0 20px 16px' }}>
          <Icon name="circle-alert" size="sm" />
          {submitError}
        </p>
      ) : null}

      {renderFooter ? (
        renderFooter({ dirty, submitting, submit: handleSubmit, reset: resetToInitial })
      ) : (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '14px 20px',
            borderTop: '1px solid var(--wl-color-border)',
            background: 'var(--wl-color-surface)',
          }}
        >
          {showKeepOpen ? (
            <button
              onClick={() => setKeepOpen((current) => !current)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                minHeight: 36,
                marginBottom: 10,
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--wl-color-text-secondary)',
              }}
              type="button"
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: keepOpen ? 'var(--wl-color-primary)' : 'var(--wl-color-border)',
                  background: keepOpen ? 'var(--wl-color-primary)' : 'var(--wl-color-surface)',
                  color: '#fff',
                }}
              >
                {keepOpen ? <Icon name="check" size="sm" /> : null}
              </span>
              저장 후 계속 입력하기
            </button>
          ) : null}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="wl-button wl-button--secondary wl-button--lg wl-button--full"
              onClick={onCancel}
              type="button"
            >
              취소
            </button>
            <button
              className="wl-button wl-button--primary wl-button--lg wl-button--full"
              disabled={submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? '저장 중...' : submitLabel ?? (mode === 'edit' ? '변경 저장' : '저장')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
