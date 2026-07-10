import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useTransactionQuery,
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

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const categoryId = String(formData.get('categoryId') ?? '')
    const memo = String(formData.get('memo') ?? '')

    updateMutation.mutate(
      {
        type: String(formData.get('type')) as TransactionType,
        amount: Number(formData.get('amount')),
        transactionDate: String(formData.get('transactionDate')),
        categoryId: categoryId ? Number(categoryId) : null,
        memo: memo || null,
        payerUserId: Number(formData.get('payerUserId')) || null,
      },
      {
        onSuccess: () => navigate('/calendar'),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-6 sm:px-8">
      <header className="border-b border-slate-200 pb-6">
        <Link className="text-sm font-medium text-emerald-700" to="/calendar">
          장부로 돌아가기
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">거래 수정</h1>
      </header>

      {transactionQuery.isLoading ? (
        <p className="py-8 text-slate-500">거래를 불러오는 중입니다.</p>
      ) : null}

      {transactionQuery.isError ? (
        <p className="py-8 text-red-700">거래를 불러오지 못했습니다.</p>
      ) : null}

      {transactionQuery.data ? (
        <form
          className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          key={transactionQuery.data.id}
          onSubmit={handleSubmit}
        >
          <label className="block text-sm font-medium text-slate-700">
            거래 유형
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              defaultValue={transactionQuery.data.type}
              name="type"
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
              defaultValue={transactionQuery.data.category?.id ?? ''}
              name="categoryId"
            >
              <option value="">선택 안 함</option>
              {categoriesQuery.data?.map((category) => (
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
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={updateMutation.isPending}
            type="submit"
          >
            <Save size={18} aria-hidden="true" />
            수정 저장
          </button>
        </form>
      ) : null}
    </main>
  )
}
