import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Lock, Save, Unlock } from 'lucide-react'
import { useBudgetMonthQuery, useCloseBudgetMonthMutation, useReopenBudgetMonthMutation, useSaveBudgetMonthMutation } from '../features/budget/model/budgetQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

export function BudgetMonthPage() {
  const params = useParams()
  const ledgerId = Number(params.ledgerId)
  const budgetMonth = params.budgetMonth ?? formatBudgetMonth()
  const meQuery = useMeQuery()
  const categoriesQuery = useCategoriesQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const budgetQuery = useBudgetMonthQuery(Number.isFinite(ledgerId) ? ledgerId : undefined, budgetMonth)
  const membersQuery = useLedgerMembersQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const saveMutation = useSaveBudgetMonthMutation(ledgerId, budgetMonth)
  const closeMutation = useCloseBudgetMonthMutation(ledgerId, budgetMonth)
  const reopenMutation = useReopenBudgetMonthMutation(ledgerId, budgetMonth)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const totalBudgetAmount = Number(formData.get('totalBudgetAmount') ?? 0)
    const categoryBudgets =
      categoriesQuery.data
        ?.filter((category) => category.type === 'EXPENSE')
        .map((category) => ({
          categoryId: category.id,
          amount: Number(formData.get(`category-${category.id}`) ?? 0),
        })) ?? []
    const memberAllocations =
      membersQuery.data?.map((member) => ({
        userId: member.userId,
        amount: Number(formData.get(`member-${member.userId}`) ?? 0),
      })) ?? []

    saveMutation.mutate({
      totalBudgetAmount,
      categoryBudgets,
      memberAllocations,
    })
  }

  const categoryAmount = (categoryId: number) =>
    budgetQuery.data?.categoryBudgets.find((item) => item.categoryId === categoryId)?.amount ?? 0
  const memberAmount = (userId: number) =>
    budgetQuery.data?.memberAllocations.find((item) => item.userId === userId)?.amount ?? 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-6 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-medium text-emerald-700" to="/dashboard">
            대시보드로 돌아가기
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">월 예산 설정</h1>
          <p className="mt-2 text-sm text-slate-500">{budgetMonth}</p>
        </div>
        <div className="flex gap-2">
          {budgetQuery.data?.closed ? (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700"
              onClick={() => reopenMutation.mutate()}
              type="button"
            >
              <Unlock size={18} aria-hidden="true" />
              재오픈
            </button>
          ) : (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700"
              onClick={() => closeMutation.mutate()}
              type="button"
            >
              <Lock size={18} aria-hidden="true" />
              마감
            </button>
          )}
        </div>
      </header>

      {budgetQuery.isLoading ? <p className="py-8 text-slate-500">예산을 불러오는 중입니다.</p> : null}

      <form
        className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        key={`${budgetMonth}-${budgetQuery.dataUpdatedAt}`}
        onSubmit={handleSubmit}
      >
        <label className="block text-sm font-medium text-slate-700">
          월 총 예산
          <input
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            defaultValue={budgetQuery.data?.totalBudgetAmount ?? 0}
            min="0"
            name="totalBudgetAmount"
            type="number"
          />
        </label>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-950">카테고리 예산</h2>
          <div className="mt-3 space-y-3">
            {categoriesQuery.data
              ?.filter((category) => category.type === 'EXPENSE')
              .map((category) => (
                <label className="grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-[1fr_180px] sm:items-center" key={category.id}>
                  <span>{category.name}</span>
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    defaultValue={categoryAmount(category.id)}
                    min="0"
                    name={`category-${category.id}`}
                    type="number"
                  />
                </label>
              ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-950">멤버별 할당</h2>
          <div className="mt-3 space-y-3">
            {membersQuery.data?.map((member) => (
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-[1fr_180px] sm:items-center" key={member.userId}>
                <span>{member.nickname}</span>
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  defaultValue={memberAmount(member.userId)}
                  min="0"
                  name={`member-${member.userId}`}
                  type="number"
                />
              </label>
            ))}
          </div>
        </section>

        {budgetQuery.data ? (
          <p className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
            현재 총 예산은 {formatWon(budgetQuery.data.totalBudgetAmount)}이고 월 상태는{' '}
            {budgetQuery.data.closed ? '마감' : '진행 중'}입니다.
          </p>
        ) : null}

        <button
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={saveMutation.isPending || membersQuery.isLoading || budgetQuery.data?.closed}
          type="submit"
        >
          <Save size={18} aria-hidden="true" />
          예산 저장
        </button>
      </form>
    </main>
  )
}
