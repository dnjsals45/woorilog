import { X } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeQuery } from '../../auth/model/authQueries'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import { useLedgerMembersQuery } from '../../ledger/model/ledgerQueries'
import type { TransactionType } from '../api/transactionApi'
import { useCreateTransactionMutation } from '../model/transactionQueries'
import { formatBudgetMonth, formatDateInput } from '../../../shared/lib/date'
import type { TransactionEntryPreset } from '../../../shared/ui/TransactionEntryContext'

type TransactionEntrySheetProps = {
  open: boolean
  onClose: () => void
  preset?: TransactionEntryPreset
}

export function TransactionEntrySheet({ open, onClose, preset }: TransactionEntrySheetProps) {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [type, setType] = useState<TransactionType>(preset?.type ?? 'EXPENSE')
  const [transactionDate, setTransactionDate] = useState(formatDateInput())
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState(preset?.amount ?? '')
  const [payerUserId, setPayerUserId] = useState('')
  const [memo, setMemo] = useState(preset?.memo ?? '')
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const membersQuery = useLedgerMembersQuery(ledgerId)
  const mutation = useCreateTransactionMutation(ledgerId, formatBudgetMonth(new Date(transactionDate)))
  const categories = useMemo(
    () => categoriesQuery.data?.filter((category) => category.type === type) ?? [],
    [categoriesQuery.data, type],
  )
  const selectedCategoryId = categoryId || categories.find((category) => category.name === preset?.categoryName)?.id.toString() || ''

  if (!open) return null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(
      {
        type,
        transactionDate,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        amount: Number(amount),
        payerUserId: payerUserId ? Number(payerUserId) : null,
        memo: memo || null,
      },
      {
        onSuccess: () => {
          setAmount('')
          setMemo('')
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="transaction-entry-title" aria-modal="true" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-8 lg:mb-8" role="dialog">
        <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between">
          <span className="size-10" />
          <h2 className="text-2xl font-bold" id="transaction-entry-title">거래 추가</h2>
          <button aria-label="거래 입력 닫기" className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" onClick={onClose} type="button"><X aria-hidden="true" /></button>
        </div>
        <form className="mt-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="거래 유형">
            {(['EXPENSE', 'INCOME'] as const).map((candidate) => (
              <button className={`h-12 rounded-xl text-base font-semibold ${type === candidate ? 'bg-[var(--wl-color-primary-soft)] text-[var(--wl-color-primary-dark)]' : 'text-slate-500'}`} key={candidate} onClick={() => { setType(candidate); setCategoryId('') }} type="button">{candidate === 'EXPENSE' ? '지출' : '수입'}</button>
            ))}
          </div>
          <div className="mt-5 divide-y divide-[var(--wl-color-border)] border-y border-[var(--wl-color-border)]">
            <SheetField label="날짜"><input className="w-40 border-0 bg-transparent text-right" onChange={(event) => setTransactionDate(event.target.value)} required type="date" value={transactionDate} /></SheetField>
            <SheetField label="카테고리"><select className="w-40 border-0 bg-transparent text-right" onChange={(event) => setCategoryId(event.target.value)} value={selectedCategoryId}><option value="">선택</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></SheetField>
            <SheetField label="금액"><input className="w-40 border-0 bg-transparent text-right" inputMode="numeric" min="1" onChange={(event) => setAmount(event.target.value)} placeholder="0원" required type="number" value={amount} /></SheetField>
            <SheetField label="결제자"><select className="w-40 border-0 bg-transparent text-right" onChange={(event) => setPayerUserId(event.target.value)} value={payerUserId}><option value="">나</option>{membersQuery.data?.map((member) => <option key={member.userId} value={member.userId}>{member.nickname}</option>)}</select></SheetField>
          </div>
          <button aria-label="거래 입력에서 카테고리 관리 열기" className="mt-3 text-sm font-extrabold text-emerald-700" onClick={() => { onClose(); navigate('/categories') }} type="button">카테고리 관리</button>
          <label className="mt-5 block text-sm font-semibold text-slate-500">메모<textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--wl-color-border)] bg-[var(--wl-color-background)] p-4 text-base" onChange={(event) => setMemo(event.target.value)} placeholder="메모를 입력하세요" value={memo} /></label>
          {mutation.isError ? <p className="mt-3 text-sm text-red-600">거래를 저장하지 못했습니다.</p> : null}
          <button className="mt-5 h-14 w-full rounded-xl bg-[var(--wl-color-primary)] text-base font-bold text-white disabled:bg-slate-300" disabled={mutation.isPending} type="submit">{mutation.isPending ? '저장 중' : '저장하기'}</button>
        </form>
      </section>
    </div>
  )
}

function SheetField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-h-16 items-center justify-between gap-4 text-sm font-semibold text-slate-500"><span>{label}</span>{children}</label>
}
