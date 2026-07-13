import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useTransactionQuery,
  useDeleteTransactionMutation,
  useUpdateTransactionMutation,
} from '../features/transaction/model/transactionQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'

export function TransactionEditPage() {
  const navigate = useNavigate()
  const params = useParams()
  const transactionId = Number(params.transactionId)
  const meQuery = useMeQuery()
  const transactionQuery = useTransactionQuery(
    Number.isFinite(transactionId) ? transactionId : undefined,
  )
  const ledgerId = transactionQuery.data?.ledgerId ?? meQuery.data?.currentLedger.id
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const membersQuery = useLedgerMembersQuery(ledgerId)
  const updateMutation = useUpdateTransactionMutation(transactionId)
  const deleteMutation = useDeleteTransactionMutation(transactionId)
  const [editedType, setEditedType] = useState<TransactionType | null>(null)
  const [editedCategoryId, setEditedCategoryId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const type = editedType ?? transactionQuery.data?.type ?? 'EXPENSE'
  const categoryId = editedCategoryId ?? transactionQuery.data?.category?.id.toString() ?? ''
  const visibleCategories = categoriesQuery.data?.filter((category) => category.type === type) ?? []

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const submittedCategoryId = String(formData.get('categoryId') ?? '')
    const memo = String(formData.get('memo') ?? '')

    updateMutation.mutate(
      {
        type,
        amount: Number(formData.get('amount')),
        transactionDate: String(formData.get('transactionDate')),
        categoryId: submittedCategoryId ? Number(submittedCategoryId) : null,
        memo: memo || null,
        payerUserId: Number(formData.get('payerUserId')) || null,
      },
      {
        onSuccess: () => navigate('/calendar'),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-10 pt-8 sm:px-8 lg:justify-center lg:py-12">
      <header className="mb-5 flex items-center gap-4">
        <Link aria-label="장부로 돌아가기" className="flex size-11 items-center justify-center rounded-full border border-[var(--wl-color-border)] bg-white text-slate-600" to="/calendar"><ArrowLeft size={19} /></Link>
        <div><p className="wl-page-header-label">Transaction</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">거래 상세</h1></div>
      </header>

      {transactionQuery.isLoading ? (
        <p className="py-8 text-slate-500">거래를 불러오는 중입니다.</p>
      ) : null}

      {transactionQuery.isError ? (
        <p className="py-8 text-red-700">거래를 불러오지 못했습니다.</p>
      ) : null}

      {transactionQuery.data ? (
        <form
          className="rounded-[1.75rem] border border-[var(--wl-color-border)] bg-white p-6 shadow-[var(--wl-shadow-card)] sm:p-8"
          key={transactionQuery.data.id}
          onSubmit={handleSubmit}
        >
          <div className="mb-8 border-b border-slate-100 pb-7 text-center"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${transactionQuery.data.type === 'EXPENSE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{transactionQuery.data.type === 'EXPENSE' ? '지출' : '수입'}</span><p className="mt-4 text-lg font-bold">{transactionQuery.data.memo || transactionQuery.data.category?.name || '거래 내역'}</p><p className="mt-2 text-4xl font-bold tracking-tight text-[var(--wl-color-primary-dark)]">{transactionQuery.data.amount.toLocaleString('ko-KR')}원</p></div>

          <label className="block text-sm font-medium text-slate-700">
            거래 유형
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              name="type"
              onChange={(event) => {
                setEditedType(event.target.value as TransactionType)
                setEditedCategoryId('')
              }}
              value={type}
            >
              <option value="EXPENSE">지출</option>
              <option value="INCOME">수입</option>
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            날짜
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              defaultValue={transactionQuery.data.transactionDate}
              name="transactionDate"
              type="date"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            금액
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              defaultValue={transactionQuery.data.amount}
              min="1"
              name="amount"
              type="number"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            카테고리
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              name="categoryId"
              onChange={(event) => setEditedCategoryId(event.target.value)}
              value={categoryId}
            >
              <option value="">선택 안 함</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            결제자
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              defaultValue={transactionQuery.data.payer.id}
              name="payerUserId"
            >
              {membersQuery.data?.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.nickname}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            메모
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              defaultValue={transactionQuery.data.memo ?? ''}
              name="memo"
            />
          </label>

          <button
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--wl-color-primary-dark)] disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={updateMutation.isPending}
            type="submit"
          >
            <Save size={18} aria-hidden="true" />
            수정 저장
          </button>
          {updateMutation.isError ? <p className="mt-3 text-center text-sm font-medium text-red-600" role="alert">거래를 수정하지 못했습니다. 마감 여부와 입력값을 확인해주세요.</p> : null}
          <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirmOpen(true)} type="button"><Trash2 size={17} />거래 삭제</button>
          {deleteConfirmOpen ? <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-sm font-bold text-red-800">이 거래를 삭제할까요?</p><p className="mt-1 text-xs text-red-600">삭제한 거래는 복구할 수 없습니다.</p><div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-10 rounded-lg border border-red-200 bg-white text-sm font-bold text-red-700" onClick={() => setDeleteConfirmOpen(false)} type="button">취소</button><button className="min-h-10 rounded-lg bg-red-600 text-sm font-bold text-white disabled:bg-slate-300" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(undefined, { onSuccess: () => navigate('/calendar', { replace: true }) })} type="button">{deleteMutation.isPending ? '삭제 중' : '삭제'}</button></div>{deleteMutation.isError ? <p className="mt-2 text-xs font-bold text-red-700" role="alert">거래를 삭제하지 못했습니다.</p> : null}</div> : null}
        </form>
      ) : null}
    </main>
  )
}
