import { FileImage, Keyboard, MessageSquareText, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeQuery } from '../../auth/model/authQueries'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import { useLedgerMembersQuery } from '../../ledger/model/ledgerQueries'
import type { PaymentMethod, TransactionType } from '../api/transactionApi'
import { useCreateTransactionMutation } from '../model/transactionQueries'
import { useCardsQuery } from '../../card/model/cardQueries'
import { formatDateInput, formatMonthlyClosingDay } from '../../../shared/lib/date'
import type { TransactionEntryPreset } from '../../../shared/ui/TransactionEntryContext'
import { DatePicker } from '../../../shared/ui/DatePicker'
import { TransactionImportPanel } from './TransactionImportPanel'

type EntryMethod = 'direct' | 'receipt' | 'text'

type TransactionEntrySheetProps = {
  open: boolean
  onClose: () => void
  preset?: TransactionEntryPreset
}

export function TransactionEntrySheet({ open, onClose, preset }: TransactionEntrySheetProps) {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('direct')
  const [type, setType] = useState<TransactionType>(preset?.type ?? 'EXPENSE')
  const [transactionDate, setTransactionDate] = useState(preset?.transactionDate ?? formatDateInput())
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState(preset?.amount ?? '')
  const [payerUserId, setPayerUserId] = useState('')
  const [memo, setMemo] = useState(preset?.memo ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [cardId, setCardId] = useState('')
  const [installmentMonths, setInstallmentMonths] = useState(1)
  const dialogRef = useRef<HTMLElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const membersQuery = useLedgerMembersQuery(ledgerId)
  const cardsQuery = useCardsQuery(ledgerId)
  const mutation = useCreateTransactionMutation(ledgerId)
  const categories = useMemo(
    () => categoriesQuery.data?.filter((category) => category.type === type) ?? [],
    [categoriesQuery.data, type],
  )
  const selectedCategoryId = categoryId || categories.find((category) => category.name === preset?.categoryName)?.id.toString() || ''

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const focusFrame = window.requestAnimationFrame(() => {
      if (entryMethod === 'direct') amountInputRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      previouslyFocused?.focus()
    }
  }, [entryMethod, open])

  if (!open) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(
      {
        type,
        transactionDate,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        amount: Number(amount),
        payerUserId: Number(payerUserId || meQuery.data?.user.id) || null,
        memo: memo || null,
        paymentMethod,
        cardId: paymentMethod === 'CARD' ? Number(cardId) || null : null,
        installmentMonths: paymentMethod === 'CARD' && installmentMonths > 1 ? installmentMonths : null,
      },
      {
        onSuccess: () => {
          setAmount('')
          setMemo('')
          setPaymentMethod('CASH')
          setCardId('')
          setInstallmentMonths(1)
          onClose()
        },
      },
    )
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
    )
    if (!focusable?.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="transaction-entry-backdrop fixed inset-0 z-50 flex items-end justify-center min-[1041px]:items-stretch min-[1041px]:justify-end" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="transaction-entry-title" aria-modal="true" className={`transaction-entry-sheet max-h-[90dvh] w-full overflow-y-auto rounded-t-[var(--wl-radius-sheet)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 sm:p-7 min-[1041px]:h-full min-[1041px]:max-h-none min-[1041px]:rounded-none min-[1041px]:border-y-0 min-[1041px]:border-r-0 ${entryMethod === 'direct' ? 'sm:max-w-xl min-[1041px]:max-w-[480px]' : 'sm:max-w-2xl min-[1041px]:max-w-[620px]'}`} onKeyDown={handleDialogKeyDown} ref={dialogRef} role="dialog">
        <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between">
          <span className="size-10" />
          <h2 className="text-2xl font-bold" id="transaction-entry-title">거래 추가</h2>
          <button aria-label="거래 입력 닫기" className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" onClick={onClose} type="button"><X aria-hidden="true" /></button>
        </div>
        <div aria-label="거래 추가 방식" className="mt-5 grid grid-cols-3 gap-2" role="tablist">
          {([
            ['direct', '직접 입력', Keyboard],
            ['receipt', '영수증', FileImage],
            ['text', '문자 내역', MessageSquareText],
          ] as const).map(([method, label, Icon]) => (
            <button
              aria-controls={`transaction-entry-${method}`}
              aria-selected={entryMethod === method}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition-colors ${entryMethod === method ? 'border-[var(--wl-color-primary)] bg-[var(--wl-color-primary-soft)] text-[var(--wl-color-primary-dark)]' : 'border-[var(--wl-color-border)] bg-white text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-color-surface-subtle)]'}`}
              id={`transaction-entry-tab-${method}`}
              key={method}
              onClick={() => setEntryMethod(method)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" size={17} />
              {label}
            </button>
          ))}
        </div>

        {entryMethod === 'direct' ? <form aria-labelledby="transaction-entry-tab-direct" className="mt-5" id="transaction-entry-direct" onSubmit={handleSubmit} role="tabpanel">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="거래 유형">
            {(['EXPENSE', 'INCOME'] as const).map((candidate) => (
              <button className={`h-12 rounded-xl text-base font-semibold ${type === candidate ? 'bg-[var(--wl-color-primary-soft)] text-[var(--wl-color-primary-dark)]' : 'text-slate-500'}`} key={candidate} onClick={() => { setType(candidate); setCategoryId(''); if (candidate === 'INCOME') { setPaymentMethod('CASH'); setCardId(''); setInstallmentMonths(1) } }} type="button">{candidate === 'EXPENSE' ? '지출' : '수입'}</button>
            ))}
          </div>
          <div className="mt-5 divide-y divide-[var(--wl-color-border)] border-y border-[var(--wl-color-border)]">
            <SheetField label="날짜"><DatePicker ariaLabel="날짜" className="w-40" onChange={setTransactionDate} value={transactionDate} /></SheetField>
            <SheetField label="카테고리"><select className="w-40 border-0 bg-transparent text-right" onChange={(event) => setCategoryId(event.target.value)} value={selectedCategoryId}><option value="">선택</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></SheetField>
            <SheetField label={installmentMonths > 1 ? '총 결제 금액' : '금액'}><input className="w-40 border-0 bg-transparent text-right" inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} placeholder="0원" ref={amountInputRef} required type="number" value={amount} /></SheetField>
            <SheetField label="결제자"><select className="w-40 border-0 bg-transparent text-right" onChange={(event) => setPayerUserId(event.target.value)} value={payerUserId || String(meQuery.data?.user.id ?? '')}>{membersQuery.data?.map((member) => <option key={member.userId} value={member.userId}>{member.nickname}</option>)}</select></SheetField>
          </div>
          {type === 'EXPENSE' ? (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-500">결제수단</legend>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="결제수단">
                <button className={`min-h-11 rounded-xl border text-sm font-bold ${paymentMethod === 'CASH' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`} onClick={() => { setPaymentMethod('CASH'); setCardId(''); setInstallmentMonths(1) }} type="button">현금</button>
                <button className={`min-h-11 rounded-xl border text-sm font-bold ${paymentMethod === 'CARD' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`} onClick={() => setPaymentMethod('CARD')} type="button">카드</button>
              </div>
              {paymentMethod === 'CARD' ? (
                <>
                  <label className="mt-3 block text-sm font-semibold text-slate-500">
                    사용 카드
                    <select aria-label="사용 카드" className="mt-2 h-12 w-full rounded-xl border border-[var(--wl-color-border)] bg-white px-4 text-base font-bold text-slate-950" onChange={(event) => setCardId(event.target.value)} required value={cardId}>
                      <option value="">카드를 선택하세요</option>
                      {cardsQuery.data?.map((card) => <option key={card.id} value={card.id}>{card.name} · {formatMonthlyClosingDay(card.statementClosingDay)} 확정</option>)}
                    </select>
                  </label>
                  {!cardsQuery.isLoading && !cardsQuery.data?.length ? <p className="mt-2 text-xs leading-5 text-amber-700">등록된 카드가 없습니다. 설정에서 카드를 먼저 추가해주세요.</p> : null}
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-500">카드 결제 방식</p>
                    <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="카드 결제 방식">
                      <button className={`min-h-11 rounded-xl border text-sm font-bold ${installmentMonths === 1 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`} onClick={() => setInstallmentMonths(1)} type="button">일시불</button>
                      <button className={`min-h-11 rounded-xl border text-sm font-bold ${installmentMonths > 1 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`} onClick={() => setInstallmentMonths(3)} type="button">할부</button>
                    </div>
                  </div>
                  {installmentMonths > 1 ? <><label className="mt-3 block text-sm font-semibold text-slate-500">할부 기간<select aria-label="할부 기간" className="mt-2 h-12 w-full rounded-xl border border-[var(--wl-color-border)] bg-white px-4 text-base font-bold text-slate-950" onChange={(event) => setInstallmentMonths(Number(event.target.value))} value={installmentMonths}>{[2, 3, 4, 5, 6, 10, 12, 18, 24].map((months) => <option key={months} value={months}>{months}개월</option>)}</select></label><p className="mt-2 text-xs leading-5 text-slate-500">총 금액을 회차별로 나누어, 선택한 날짜를 기준으로 매달 카드 거래를 자동 등록합니다.</p></> : null}
                </>
              ) : null}
            </fieldset>
          ) : null}
          <button aria-label="거래 입력에서 카테고리 관리 열기" className="mt-3 text-sm font-extrabold text-emerald-700" onClick={() => { onClose(); navigate('/categories') }} type="button">카테고리 관리</button>
          <label className="mt-5 block text-sm font-semibold text-slate-500">메모<textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--wl-color-border)] bg-[var(--wl-color-background)] p-4 text-base" onChange={(event) => setMemo(event.target.value)} placeholder="메모를 입력하세요" value={memo} /></label>
          {mutation.isError ? <p className="mt-3 text-sm text-red-600" role="alert">거래를 저장하지 못했습니다.</p> : null}
          <button className="mt-5 h-14 w-full rounded-xl bg-[var(--wl-color-primary)] text-base font-bold text-white disabled:bg-slate-300" disabled={mutation.isPending} type="submit">{mutation.isPending ? '저장 중' : '저장하기'}</button>
        </form> : (
          <div aria-labelledby={`transaction-entry-tab-${entryMethod}`} id={`transaction-entry-${entryMethod}`} role="tabpanel">
            <TransactionImportPanel
              ledgerId={ledgerId}
              method={entryMethod}
              onSaved={onClose}
              onTransactionDateChange={setTransactionDate}
              transactionDate={transactionDate}
            />
          </div>
        )}
      </section>
    </div>
  )
}

function SheetField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-h-16 items-center justify-between gap-4 text-sm font-semibold text-slate-500"><span>{label}</span>{children}</label>
}
