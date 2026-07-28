import { Save, Settings2, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useBudgetMonthQuery, useDashboardSummaryQuery, useSaveBudgetMonthMutation } from '../features/budget/model/budgetQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useCreateFixedBudgetMutation, useDeleteFixedBudgetMutation, useFixedBudgetsQuery, useUpdateFixedBudgetMutation } from '../features/fixed-budget/model/fixedBudgetQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { CardHeading, EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const colors = ['#f97316', '#0e9f6e', '#2563eb', '#9b7bd8']

export function BudgetMonthPage() {
  const params = useParams()
  const ledgerId = Number(params.ledgerId)
  const budgetMonth = params.budgetMonth ?? formatBudgetMonth()
  const meQuery = useMeQuery()
  const dashboardQuery = useDashboardSummaryQuery(budgetMonth)
  const categoriesQuery = useCategoriesQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const budgetQuery = useBudgetMonthQuery(Number.isFinite(ledgerId) ? ledgerId : undefined, budgetMonth)
  const membersQuery = useLedgerMembersQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const saveMutation = useSaveBudgetMonthMutation(ledgerId, budgetMonth)
  const fixedBudgetsQuery = useFixedBudgetsQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const createFixedBudgetMutation = useCreateFixedBudgetMutation(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const updateFixedBudgetMutation = useUpdateFixedBudgetMutation(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const deleteFixedBudgetMutation = useDeleteFixedBudgetMutation(Number.isFinite(ledgerId) ? ledgerId : undefined)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate to="/login" replace />

  const totalBudget = budgetQuery.data?.totalBudgetAmount ?? 0
  const totalExpense = dashboardQuery.data?.budgetMonth === budgetMonth ? dashboardQuery.data.totalExpenseAmount : 0
  const scheduledRecurringExpense = dashboardQuery.data?.budgetMonth === budgetMonth ? dashboardQuery.data.scheduledRecurringExpenseAmount : 0
  const committedExpense = totalExpense + scheduledRecurringExpense
  const remaining = totalBudget - committedExpense
  const usage = totalBudget ? Math.min(100, Math.round(committedExpense / totalBudget * 100)) : 0
  const supportsCategoryBudgets = meQuery.data?.currentLedger.type !== 'GROUP'
  const memberAllocations = budgetQuery.data?.memberAllocations ?? []
  const categorySpending = dashboardQuery.data?.budgetMonth === budgetMonth ? dashboardQuery.data.categorySpending : []

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    saveMutation.mutate({
      totalBudgetAmount: Number(formData.get('totalBudgetAmount') ?? 0),
      categoryBudgets: supportsCategoryBudgets ? categoriesQuery.data?.filter((item) => item.type === 'EXPENSE').map((item) => ({ categoryId: item.id, amount: Number(formData.get(`category-${item.id}`) ?? 0) })) ?? [] : [],
      memberAllocations: membersQuery.data?.map((item) => ({ userId: item.userId, amount: Number(formData.get(`member-${item.userId}`) ?? 0) })) ?? [],
    })
  }

  function handleCreateFixedBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    createFixedBudgetMutation.mutate({
      name: String(formData.get('fixedBudgetName') ?? ''),
      categoryId: Number(formData.get('fixedBudgetCategoryId')),
      amount: Number(formData.get('fixedBudgetAmount') ?? 0),
      active: true,
    }, { onSuccess: () => event.currentTarget.reset() })
  }

  const categoryAmount = (categoryId: number) => budgetQuery.data?.categoryBudgets.find((item) => item.categoryId === categoryId)?.amount ?? 0
  const memberAmount = (userId: number) => budgetQuery.data?.memberAllocations.find((item) => item.userId === userId)?.amount ?? 0

  return (
    <main className="product-page product-page--standard">
      <PageHeader eyebrow="MONTHLY PLAN" title="예산 설정" description={`${budgetMonth.replace('-', '년 ')}월 예산과 사용할 수 있는 금액을 관리합니다.`} />

      {budgetQuery.isLoading ? <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-[24px] bg-slate-100" /><div className="h-72 animate-pulse rounded-[24px] bg-slate-100" /></div> : null}
      {budgetQuery.isError || dashboardQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => { budgetQuery.refetch(); dashboardQuery.refetch() }} /></div> : null}
      {budgetQuery.isSuccess && dashboardQuery.isSuccess ? <>
        <article className="relative mt-5 overflow-hidden rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ffffff,#effbf5)] p-5 shadow-[0_16px_42px_rgba(30,74,52,0.08)] sm:p-6"><div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-100/60 blur-2xl" /><div className="relative"><p className="dashboard-eyebrow">BUDGET</p><h2 className="mt-1 text-xl font-extrabold">이번 달 사용 가능한 예산</h2><p className={`mt-5 text-4xl font-black tracking-[-0.05em] sm:text-5xl ${remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatWon(remaining)}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-slate-600"><span>총 예산 <strong className="ml-1 text-slate-950">{formatWon(totalBudget)}</strong></span><span>실제 지출 <strong className="ml-1 text-slate-950">{formatWon(totalExpense)}</strong></span><span>예정 지출 <strong className="ml-1 text-slate-950">{formatWon(scheduledRecurringExpense)}</strong></span></div><Progress value={usage} /><div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>{usage}% 사용·예정</span><span>{Math.max(100 - usage, 0)}% 남음</span></div>{!totalBudget ? <p className="mt-5 rounded-xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm font-bold text-emerald-800">이번 달 예산 계획이 아직 없습니다. 아래 예산 관리에서 첫 계획을 세워보세요.</p> : null}</div></article>

        <section className={`mt-5 grid gap-5 ${supportsCategoryBudgets ? 'lg:grid-cols-2' : ''}`}>
          {supportsCategoryBudgets ? <SurfaceCard labelledBy="category-budget-title"><CardHeading eyebrow="CATEGORY" id="category-budget-title" title="대분류별 사용 현황" /><div className="mt-5 space-y-4">{categorySpending.slice(0, 5).map((item, index) => { const limit = budgetQuery.data?.categoryBudgets.filter((budget) => budget.categoryGroupId === item.categoryGroupId).reduce((sum, budget) => sum + budget.amount, 0) ?? 0; const rate = limit ? Math.round(item.amount / limit * 100) : totalExpense ? Math.round(item.amount / totalExpense * 100) : 0; return <div key={item.categoryGroupId}><div className="flex items-center gap-3"><CategoryBadge name={item.categoryName} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-extrabold">{item.categoryName}</span><span className="shrink-0 text-xs font-bold text-slate-500">{formatWon(item.amount)} · {rate}%</span></div><div aria-label={`${item.categoryName} 사용 비율`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.min(rate, 100)} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className="h-full rounded-full" style={{ background: rate > 100 ? '#ef4444' : colors[index % colors.length], width: `${Math.min(rate, 100)}%` }} /></div></div></div></div> })}{!categorySpending.length ? <EmptyState title="대분류별 지출이 없습니다." description="거래를 기록하면 대분류 사용률이 표시됩니다." /> : null}</div></SurfaceCard> : null}

          <SurfaceCard labelledBy="allocation-title"><CardHeading eyebrow="MEMBERS" id="allocation-title" title="멤버별 예산 할당" trailing={<span className="text-xs font-bold text-slate-400">{memberAllocations.length}명</span>} /><div className="mt-5 space-y-3">{memberAllocations.map((member, index) => { const rate = totalBudget ? Math.round(member.amount / totalBudget * 100) : 0; return <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4" key={member.userId}><div className="flex items-center gap-3"><span className={`flex size-10 items-center justify-center rounded-full text-sm font-black ${index % 2 ? 'bg-[#ffe4d6] text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{member.nickname.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><strong className="truncate text-sm">{member.nickname}</strong><strong className="text-sm">{formatWon(member.amount)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(rate, 100)}%` }} /></div></div></div></div> })}{!memberAllocations.length ? <EmptyState title="할당된 예산이 없습니다." description="예산 관리에서 멤버별 금액을 설정해보세요." /> : null}</div></SurfaceCard>
        </section>

        {supportsCategoryBudgets ? <SurfaceCard className="mt-5" labelledBy="fixed-budget-title"><CardHeading eyebrow="FIXED COST" id="fixed-budget-title" title="고정비 관리" trailing={<span className="text-xs font-bold text-emerald-700">월 {formatWon(budgetQuery.data.fixedBudgetTotalAmount)}</span>} /><p className="mt-2 text-sm text-slate-500">월 예산을 처음 열면 활성 고정비가 카테고리 예산에 자동으로 미리 채워집니다. 실제 거래 기록은 반복 거래에서 관리하세요.</p><form className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]" onSubmit={handleCreateFixedBudget}><input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold" name="fixedBudgetName" placeholder="예: 월세" required /><select aria-label="고정비 카테고리" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold" name="fixedBudgetCategoryId" required><option value="">카테고리 선택</option>{categoriesQuery.data?.filter((category) => category.type === 'EXPENSE').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><input className="h-11 rounded-xl border border-slate-200 px-3 text-right text-sm font-bold" inputMode="numeric" min="1" name="fixedBudgetAmount" placeholder="금액" required type="number" /><button className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={createFixedBudgetMutation.isPending} type="submit">고정비 추가</button></form><ul className="mt-4 space-y-2">{fixedBudgetsQuery.data?.map((fixedBudget) => <li className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3" key={fixedBudget.id}><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{fixedBudget.name}</strong><span className="text-xs font-bold text-slate-500">{fixedBudget.categoryName} · {formatWon(fixedBudget.amount)}</span></span><button className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-50" disabled={updateFixedBudgetMutation.isPending} onClick={() => updateFixedBudgetMutation.mutate({ id: fixedBudget.id, request: { name: fixedBudget.name, categoryId: fixedBudget.categoryId, amount: fixedBudget.amount, active: !fixedBudget.active } })} type="button">{fixedBudget.active ? '사용 중' : '중지됨'}</button><button aria-label={`${fixedBudget.name} 삭제`} className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" disabled={deleteFixedBudgetMutation.isPending} onClick={() => deleteFixedBudgetMutation.mutate(fixedBudget.id)} type="button"><Trash2 size={16} /></button></li>)}{!fixedBudgetsQuery.data?.length ? <li className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">등록한 고정비가 없습니다.</li> : null}</ul></SurfaceCard> : null}

        <details className="mt-5 rounded-[18px] border border-slate-200 bg-white shadow-sm"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-base font-extrabold"><span className="flex items-center gap-2"><Settings2 className="text-emerald-600" size={19} />예산 관리</span><span className="text-xs font-bold text-emerald-700">수정하기</span></summary><form className="border-t border-slate-100 p-5 sm:p-6" key={`${budgetMonth}-${budgetQuery.dataUpdatedAt}`} onSubmit={handleSubmit}><label className="block text-sm font-bold text-slate-600">월 총 예산<input className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold" defaultValue={totalBudget} inputMode="numeric" min="0" name="totalBudgetAmount" type="number" /></label>{!supportsCategoryBudgets ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">공동장부는 카테고리별 한도 대신 월 총 예산과 멤버별 할당으로 관리합니다. 정기 지출 예정액은 남은 예산에 자동 반영됩니다.</p> : null}<div className={`mt-6 grid gap-6 ${supportsCategoryBudgets ? 'lg:grid-cols-2' : ''}`}>{supportsCategoryBudgets ? <section><h3 className="font-extrabold">카테고리 예산</h3><div className="mt-3 space-y-2">{categoriesQuery.data?.filter((item) => item.type === 'EXPENSE').map((item) => <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm font-bold" key={item.id}><span>{item.name}</span><input className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-right text-base" defaultValue={categoryAmount(item.id)} inputMode="numeric" min="0" name={`category-${item.id}`} type="number" /></label>)}</div></section> : null}<section><h3 className="font-extrabold">멤버별 할당</h3><div className="mt-3 space-y-2">{membersQuery.data?.map((member) => <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm font-bold" key={member.userId}><span>{member.nickname}</span><input className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-right text-base" defaultValue={memberAmount(member.userId)} inputMode="numeric" min="0" name={`member-${member.userId}`} type="number" /></label>)}</div></section></div>{saveMutation.isError ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">예산을 저장하지 못했습니다. 입력값과 월 마감 상태를 확인해주세요.</p> : null}<button className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={saveMutation.isPending || budgetQuery.data?.closed} type="submit"><Save size={18} />{saveMutation.isPending ? '저장 중...' : '예산 저장'}</button></form></details>

      </> : null}
    </main>
  )
}

function Progress({ value }: { value: number }) { return <div aria-label="이번 달 예산 사용률" aria-valuemax={100} aria-valuemin={0} aria-valuenow={value} className="mt-5 h-3 overflow-hidden rounded-full bg-emerald-100" role="progressbar"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0e9f6e,#51c993)]" style={{ width: `${value}%` }} /></div> }
