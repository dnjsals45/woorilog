import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeftRight, Plus, ScanText, Wand2 } from 'lucide-react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import {
  useCreateTransactionMutation,
  useMonthTransactionsQuery,
  useQuickTransactionMutation,
} from '../features/transaction/model/transactionQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth, formatDateInput } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

export function LedgerPage() {
  const meQuery = useMeQuery()
  const [budgetMonth, setBudgetMonth] = useState(formatBudgetMonth())
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(formatDateInput())
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [payerUserId, setPayerUserId] = useState('')
  const [quickText, setQuickText] = useState('')
  const ledgerId = meQuery.data?.currentLedger.id
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const membersQuery = useLedgerMembersQuery(ledgerId)
  const transactionsQuery = useMonthTransactionsQuery(ledgerId, budgetMonth)
  const createTransactionMutation = useCreateTransactionMutation(ledgerId, budgetMonth)
  const quickTransactionMutation = useQuickTransactionMutation(ledgerId, budgetMonth)

  const filteredCategories = useMemo(
    () => categoriesQuery.data?.filter((category) => category.type === type) ?? [],
    [categoriesQuery.data, type],
  )

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    createTransactionMutation.mutate(
      {
        type,
        amount: Number(amount),
        transactionDate,
        categoryId: categoryId ? Number(categoryId) : null,
        memo: memo || null,
        payerUserId: payerUserId ? Number(payerUserId) : null,
      },
      {
        onSuccess: () => {
          setAmount('')
          setMemo('')
        },
      },
    )
  }

  function handleQuickTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    quickTransactionMutation.mutate(
      { text: quickText, transactionDate },
      {
        onSuccess: () => setQuickText(''),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-medium text-emerald-700" to="/dashboard">
            대시보드로 돌아가기
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">거래 장부</h1>
          <p className="mt-2 text-sm text-slate-500">
            {meQuery.data?.currentLedger.name ?? '현재 장부'}의 거래를 기록합니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            to="/imports"
          >
            <ScanText size={18} aria-hidden="true" />
            가져오기
          </Link>
          <label className="text-sm font-medium text-slate-700">
            조회 월
            <input
              className="mt-2 h-10 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              type="month"
              value={budgetMonth}
              onChange={(event) => setBudgetMonth(event.target.value)}
            />
          </label>
        </div>
      </header>

      <section className="grid gap-4 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <form
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={handleCreateTransaction}
          >
            <div className="flex items-center gap-2 text-slate-950">
              <Plus size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold">거래 입력</h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="거래 유형">
              {(['EXPENSE', 'INCOME'] as const).map((candidate) => (
                <button
                  className="h-10 rounded-md border border-slate-300 text-sm font-medium text-slate-700 transition data-[selected=true]:border-emerald-700 data-[selected=true]:bg-emerald-50 data-[selected=true]:text-emerald-800"
                  data-selected={type === candidate}
                  key={candidate}
                  onClick={() => {
                    setType(candidate)
                    setCategoryId('')
                  }}
                  type="button"
                >
                  {transactionTypeLabel(candidate)}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              날짜
              <input
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                type="date"
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                required
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              금액
              <input
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                min="1"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              카테고리
              <select
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">선택 안 함</option>
                {filteredCategories.map((category) => (
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
                onChange={(event) => setPayerUserId(event.target.value)}
                value={payerUserId}
              >
                <option value="">나</option>
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
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="예: 점심"
              />
            </label>

            <button
              className="mt-5 h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={createTransactionMutation.isPending}
              type="submit"
            >
              거래 저장
            </button>
          </form>

          <form
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={handleQuickTransaction}
          >
            <div className="flex items-center gap-2 text-slate-950">
              <Wand2 size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold">빠른 입력</h2>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              입력 문장
              <input
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                placeholder="예: 커피 4500"
                required
              />
            </label>
            <button
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={quickTransactionMutation.isPending}
              type="submit"
            >
              <ArrowLeftRight size={18} aria-hidden="true" />
              빠른 거래 저장
            </button>
          </form>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">월별 거래</h2>

          {transactionsQuery.isLoading ? (
            <p className="mt-6 text-slate-500">거래를 불러오는 중입니다.</p>
          ) : null}

          {transactionsQuery.isError ? (
            <p className="mt-6 text-red-700">거래를 불러오지 못했습니다.</p>
          ) : null}

          {transactionsQuery.data?.transactions.length === 0 ? (
            <div className="mt-6 flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-slate-500">
              아직 기록된 거래가 없습니다.
            </div>
          ) : null}

          <div className="mt-5 divide-y divide-slate-100">
            {transactionsQuery.data?.transactions.map((transaction) => (
              <Link
                className="flex items-center justify-between gap-4 py-4 transition hover:bg-slate-50"
                key={transaction.id}
                to={`/transactions/${transaction.id}`}
              >
                <span>
                  <span className="block font-medium text-slate-950">
                    {transaction.memo || transaction.category?.name || '거래'}
                  </span>
                  <span className="text-sm text-slate-500">
                    {transaction.transactionDate} ·{' '}
                    {transaction.category?.name ?? '미분류'} · {transaction.payer.nickname}
                  </span>
                </span>
                <span
                  className={
                    transaction.type === 'INCOME'
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-slate-950'
                  }
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatWon(transaction.amount)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

function transactionTypeLabel(type: TransactionType) {
  return type === 'INCOME' ? '수입' : '지출'
}
