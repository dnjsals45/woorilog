import { ArrowRight, CheckCircle2, Lock, Save, Settings2, Unlock } from 'lucide-react'
import type { FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useBudgetMonthQuery, useCloseBudgetMonthMutation, useDashboardSummaryQuery, useReopenBudgetMonthMutation, useSaveBudgetMonthMutation } from '../features/budget/model/budgetQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { CategoryBadge } from '../shared/ui/CategoryBadge'
import { CardHeading, EmptyState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const colors = ['#f97316', '#0e9f6e', '#2563eb', '#9b7bd8']

export function BudgetMonthPage() {
  const params = useParams()
  const ledgerId = Number(params.ledgerId)
  const budgetMonth = params.budgetMonth ?? formatBudgetMonth()
  const meQuery = useMeQuery()
  const dashboardQuery = useDashboardSummaryQuery()
  const categoriesQuery = useCategoriesQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const budgetQuery = useBudgetMonthQuery(Number.isFinite(ledgerId) ? ledgerId : undefined, budgetMonth)
  const membersQuery = useLedgerMembersQuery(Number.isFinite(ledgerId) ? ledgerId : undefined)
  const saveMutation = useSaveBudgetMonthMutation(ledgerId, budgetMonth)
  const closeMutation = useCloseBudgetMonthMutation(ledgerId, budgetMonth)
  const reopenMutation = useReopenBudgetMonthMutation(ledgerId, budgetMonth)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate to="/login" replace />

  const totalBudget = budgetQuery.data?.totalBudgetAmount ?? 0
  const totalExpense = dashboardQuery.data?.budgetMonth === budgetMonth ? dashboardQuery.data.totalExpenseAmount : 0
  const remaining = totalBudget - totalExpense
  const usage = totalBudget ? Math.min(100, Math.round(totalExpense / totalBudget * 100)) : 0
  const memberAllocations = budgetQuery.data?.memberAllocations ?? []
  const categorySpending = dashboardQuery.data?.budgetMonth === budgetMonth ? dashboardQuery.data.categorySpending : []
  const settlementAmount = memberAllocations.length > 1 ? Math.abs(memberAllocations[0].amount - memberAllocations[1].amount) : 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    saveMutation.mutate({
      totalBudgetAmount: Number(formData.get('totalBudgetAmount') ?? 0),
      categoryBudgets: categoriesQuery.data?.filter((item) => item.type === 'EXPENSE').map((item) => ({ categoryId: item.id, amount: Number(formData.get(`category-${item.id}`) ?? 0) })) ?? [],
      memberAllocations: membersQuery.data?.map((item) => ({ userId: item.userId, amount: Number(formData.get(`member-${item.userId}`) ?? 0) })) ?? [],
    })
  }

  const categoryAmount = (categoryId: number) => budgetQuery.data?.categoryBudgets.find((item) => item.categoryId === categoryId)?.amount ?? 0
  const memberAmount = (userId: number) => budgetQuery.data?.memberAllocations.find((item) => item.userId === userId)?.amount ?? 0

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1200px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader eyebrow="MONTHLY PLAN" title="예산·정산" description={`${budgetMonth.replace('-', '년 ')}월 예산을 관리하고 공동 지출을 정산합니다.`} actions={<span className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-extrabold ${budgetQuery.data?.closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{budgetQuery.data?.closed ? <Lock size={15} /> : <CheckCircle2 size={15} />}{budgetQuery.data?.closed ? '마감된 월' : '운영 중'}</span>} />

      {budgetQuery.isLoading ? <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-[24px] bg-slate-100" /><div className="h-72 animate-pulse rounded-[24px] bg-slate-100" /></div> : null}
      {!budgetQuery.isLoading ? <>
        <section className="mt-5 grid gap-5 xl:grid-cols-12">
          <article className="relative overflow-hidden rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ffffff,#effbf5)] p-5 shadow-[0_16px_42px_rgba(30,74,52,0.08)] sm:p-6 xl:col-span-8"><div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-100/60 blur-2xl" /><div className="relative"><p className="dashboard-eyebrow">BUDGET</p><h2 className="mt-1 text-xl font-extrabold">이번 달 남은 예산</h2><p className={`mt-5 text-4xl font-black tracking-[-0.05em] sm:text-5xl ${remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatWon(remaining)}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-slate-600"><span>총 예산 <strong className="ml-1 text-slate-950">{formatWon(totalBudget)}</strong></span><span>사용 <strong className="ml-1 text-slate-950">{formatWon(totalExpense)}</strong></span></div><Progress value={usage} /><div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>{usage}% 사용</span><span>{Math.max(100 - usage, 0)}% 남음</span></div>{!totalBudget ? <p className="mt-5 rounded-xl border border-emerald-100 bg-white/70 px-4 py-3 text-sm font-bold text-emerald-800">이번 달 예산 계획이 아직 없습니다. 아래 예산 관리에서 첫 계획을 세워보세요.</p> : null}</div></article>

          <SurfaceCard className="bg-[linear-gradient(135deg,#ffffff,#fff8ef)] xl:col-span-4" labelledBy="settlement-title"><CardHeading eyebrow="SETTLEMENT" id="settlement-title" title="정산 요약" trailing={<span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-700">{settlementAmount ? '확인 필요' : '정산 완료'}</span>} /><div className="mt-6 flex items-center justify-center gap-5"><Avatar index={0} label={memberAllocations[0]?.nickname ?? '나'} /><ArrowRight className="text-orange-400" /><Avatar index={1} label={memberAllocations[1]?.nickname ?? '상대'} /></div><p className={`mt-5 text-center text-3xl font-black tracking-[-0.04em] ${settlementAmount ? 'text-orange-600' : 'text-emerald-700'}`}>{formatWon(settlementAmount)}</p><button className={`mt-5 min-h-11 w-full rounded-xl text-sm font-extrabold text-white ${settlementAmount ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'}`} type="button">{settlementAmount ? '정산하기' : '정산 내역 보기'}</button></SurfaceCard>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <SurfaceCard labelledBy="category-budget-title"><CardHeading eyebrow="CATEGORY" id="category-budget-title" title="카테고리별 사용 현황" /><div className="mt-5 space-y-4">{categorySpending.slice(0, 5).map((item, index) => { const limit = budgetQuery.data?.categoryBudgets.find((budget) => budget.categoryName === item.categoryName)?.amount ?? 0; const rate = limit ? Math.round(item.amount / limit * 100) : totalExpense ? Math.round(item.amount / totalExpense * 100) : 0; return <div key={item.categoryName}><div className="flex items-center gap-3"><CategoryBadge name={item.categoryName} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-extrabold">{item.categoryName}</span><span className="shrink-0 text-xs font-bold text-slate-500">{formatWon(item.amount)} · {rate}%</span></div><div aria-label={`${item.categoryName} 사용 비율`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.min(rate, 100)} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className="h-full rounded-full" style={{ background: rate > 100 ? '#ef4444' : colors[index % colors.length], width: `${Math.min(rate, 100)}%` }} /></div></div></div></div> })}{!categorySpending.length ? <EmptyState title="카테고리 지출이 없습니다." description="거래를 기록하면 카테고리별 예산 사용률이 표시됩니다." /> : null}</div></SurfaceCard>

          <SurfaceCard labelledBy="allocation-title"><CardHeading eyebrow="MEMBERS" id="allocation-title" title="멤버별 예산 할당" trailing={<span className="text-xs font-bold text-slate-400">{memberAllocations.length}명</span>} /><div className="mt-5 space-y-3">{memberAllocations.map((member, index) => { const rate = totalBudget ? Math.round(member.amount / totalBudget * 100) : 0; return <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4" key={member.userId}><div className="flex items-center gap-3"><span className={`flex size-10 items-center justify-center rounded-full text-sm font-black ${index % 2 ? 'bg-[#ffe4d6] text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{member.nickname.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><strong className="truncate text-sm">{member.nickname}</strong><strong className="text-sm">{formatWon(member.amount)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(rate, 100)}%` }} /></div></div></div></div> })}{!memberAllocations.length ? <EmptyState title="할당된 예산이 없습니다." description="예산 관리에서 멤버별 금액을 설정해보세요." /> : null}</div></SurfaceCard>
        </section>

        <details className="mt-5 rounded-[18px] border border-slate-200 bg-white shadow-sm"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-base font-extrabold"><span className="flex items-center gap-2"><Settings2 className="text-emerald-600" size={19} />예산 관리</span><span className="text-xs font-bold text-emerald-700">수정하기</span></summary><form className="border-t border-slate-100 p-5 sm:p-6" key={`${budgetMonth}-${budgetQuery.dataUpdatedAt}`} onSubmit={handleSubmit}><label className="block text-sm font-bold text-slate-600">월 총 예산<input className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold" defaultValue={totalBudget} inputMode="numeric" min="0" name="totalBudgetAmount" type="number" /></label><div className="mt-6 grid gap-6 lg:grid-cols-2"><section><h3 className="font-extrabold">카테고리 예산</h3><div className="mt-3 space-y-2">{categoriesQuery.data?.filter((item) => item.type === 'EXPENSE').map((item) => <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm font-bold" key={item.id}><span>{item.name}</span><input className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-right text-base" defaultValue={categoryAmount(item.id)} inputMode="numeric" min="0" name={`category-${item.id}`} type="number" /></label>)}</div></section><section><h3 className="font-extrabold">멤버별 할당</h3><div className="mt-3 space-y-2">{membersQuery.data?.map((member) => <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm font-bold" key={member.userId}><span>{member.nickname}</span><input className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-right text-base" defaultValue={memberAmount(member.userId)} inputMode="numeric" min="0" name={`member-${member.userId}`} type="number" /></label>)}</div></section></div><button className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={saveMutation.isPending || budgetQuery.data?.closed} type="submit"><Save size={18} />{saveMutation.isPending ? '저장 중...' : '예산 저장'}</button></form></details>

        <section className={`mt-5 flex flex-col gap-4 rounded-[18px] border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${budgetQuery.data?.closed ? 'border-slate-200 bg-slate-100' : 'border-amber-100 bg-amber-50'}`}><div><p className="dashboard-eyebrow">MONTH CLOSING</p><h2 className="mt-1 text-lg font-extrabold">{budgetQuery.data?.closed ? '이 달은 마감되었습니다.' : '월 마감'}</h2><p className="mt-1 text-sm font-medium text-slate-500">{budgetQuery.data?.closed ? '현재 거래와 예산은 읽기 전용 상태입니다.' : `최종 잔액 ${formatWon(remaining)}을 확인하고 월을 마감합니다.`}</p></div><button className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white ${budgetQuery.data?.closed ? 'bg-slate-700' : 'bg-amber-500'}`} disabled={closeMutation.isPending || reopenMutation.isPending} onClick={() => budgetQuery.data?.closed ? reopenMutation.mutate() : closeMutation.mutate()} type="button">{budgetQuery.data?.closed ? <Unlock size={17} /> : <Lock size={17} />}{budgetQuery.data?.closed ? '월 다시 열기' : '월 마감하기'}</button></section>
      </> : null}
    </main>
  )
}

function Progress({ value }: { value: number }) { return <div aria-label="이번 달 예산 사용률" aria-valuemax={100} aria-valuemin={0} aria-valuenow={value} className="mt-5 h-3 overflow-hidden rounded-full bg-emerald-100" role="progressbar"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0e9f6e,#51c993)]" style={{ width: `${value}%` }} /></div> }
function Avatar({ label, index }: { label: string; index: number }) { return <div aria-label={label} className="text-center"><span className={`mx-auto flex size-14 items-center justify-center rounded-full text-sm font-black ${index ? 'bg-[#ffe4d6] text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{label.slice(0, 1)}</span><span className="mt-2 block max-w-20 truncate text-xs font-bold">{label}</span></div> }
