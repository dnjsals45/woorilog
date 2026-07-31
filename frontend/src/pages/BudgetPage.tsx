import { useState, type FormEvent } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCurrentBudgetPeriodQuery, useConfigureBudgetPeriodMutation } from '../features/budget/model/budgetPeriodQueries'
import { useLedgerMembersQuery } from '../features/ledger/model/ledgerQueries'
import type { BudgetPeriodDetail } from '../features/budget/api/budgetPeriodApi'
import { formatWon } from '../shared/lib/money'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'
import { ApiClientError } from '../shared/api/client'

export function BudgetPage() {
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const period = useCurrentBudgetPeriodQuery(ledgerId)
  const members = useLedgerMembersQuery(ledgerId)
  if (period.isLoading) return <main className="product-page"><p>예산을 불러오는 중입니다.</p></main>
  if (period.isError) return <main className="product-page"><ErrorState onRetry={() => period.refetch()}/></main>
  if (!period.data) return <main className="product-page"><EmptyState title="예산 기간이 없습니다." description="현재 장부의 예산 기간을 먼저 준비해주세요."/></main>
  return <main className="product-page product-page--standard"><PageHeader eyebrow="BUDGET PERIOD" title="예산" description={`${period.data.startDate} — ${period.data.endDate} · 실제 지출과 예정 지출을 분리해 표시합니다.`}/>
    <section className="mt-5 grid gap-3 md:grid-cols-2">{period.data.allocations.map((allocation) => <SurfaceCard key={allocation.id}><span className="text-xs font-bold text-[var(--wl-color-text-secondary)]">{allocation.source.type === 'SHARED' ? '공동 예산' : allocation.source.ownerUserId === me.data?.user.id ? '내 예산' : `${allocation.owner?.nickname ?? '멤버'} 예산`}</span><strong className={`mt-2 block text-2xl tabular-nums ${allocation.availableAmount < 0 ? 'text-[var(--wl-color-danger)]' : ''}`}>{formatWon(allocation.availableAmount)}</strong><span className="mt-1 block text-xs text-[var(--wl-color-text-secondary)]">사용 가능액{allocation.availableAmount < 0 ? ' · 예산 초과' : ''}</span><dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--wl-color-border)] pt-4 text-xs"><div><dt>전체</dt><dd className="mt-1 font-bold">{formatWon(allocation.amount)}</dd></div><div><dt>사용</dt><dd className="mt-1 font-bold">{formatWon(allocation.spentAmount)}</dd></div><div><dt>예정</dt><dd className="mt-1 font-bold">{formatWon(allocation.scheduledAmount)}</dd></div></dl></SurfaceCard>)}</section>
    <SurfaceCard className="mt-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">예비비</h2><p className="mt-1 text-sm text-[var(--wl-color-text-secondary)]">거래에 바로 쓰지 않고 필요한 예산으로 옮겨 사용합니다.</p></div><strong className="text-xl tabular-nums">{formatWon(period.data.reserveAmount ?? 0)}</strong></div></SurfaceCard>
    <BudgetConfigurationForm key={period.data.id} members={members.data ?? []} period={period.data}/>
  </main>
}

function BudgetConfigurationForm({ period, members }: { period: BudgetPeriodDetail; members: Array<{ userId: number; nickname: string }> }) {
  const mutation = useConfigureBudgetPeriodMutation(period.ledgerId, period.startDate)
  const [totalBudget, setTotalBudget] = useState(String(period.totalBudget))
  const [sharedAllocation, setSharedAllocation] = useState(String(period.allocations.find((item) => item.source.type === 'SHARED')?.amount ?? 0))
  const [personal, setPersonal] = useState<Record<number, string>>(() => Object.fromEntries(members.map((member) => [member.userId, String(period.allocations.find((item) => item.source.ownerUserId === member.userId)?.amount ?? 0)])))
  const [applyDefaults, setApplyDefaults] = useState(false)
  const [increaseConfirmationRequired, setIncreaseConfirmationRequired] = useState(false)
  const request = (increaseTotalBudgetIfNeeded: boolean) => ({ totalBudget: Number(totalBudget), sharedAllocation: Number(sharedAllocation), personalAllocations: members.map((member) => ({ userId: member.userId, amount: Number(personal[member.userId] ?? 0) })), categoryBudgets: period.categoryBudgets.map((item) => ({ source: item.source, groupCode: item.groupCode, amount: item.amount })), increaseTotalBudgetIfNeeded, applyToFutureDefaults: applyDefaults })
  function submit(event: FormEvent) {
    event.preventDefault()
    setIncreaseConfirmationRequired(false)
    mutation.mutate(request(false), { onError: (error) => setIncreaseConfirmationRequired(error instanceof ApiClientError && error.code === 'TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED') })
  }
  return <SurfaceCard className="mt-5"><h2 className="text-lg font-bold">기간 예산 설정</h2><form className="mt-5 space-y-4" onSubmit={submit}><MoneyField id="period-total" label="기간 전체 예산" onChange={setTotalBudget} value={totalBudget}/>{members.map((member) => <MoneyField id={`member-${member.userId}`} key={member.userId} label={`${member.nickname} 개인 예산`} onChange={(value) => setPersonal((current) => ({ ...current, [member.userId]: value }))} value={personal[member.userId] ?? '0'}/>)}{period.allocations.some((item) => item.source.type === 'SHARED') ? <MoneyField id="shared-allocation" label="공동 예산" onChange={setSharedAllocation} value={sharedAllocation}/> : null}<label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input checked={applyDefaults} onChange={(event) => setApplyDefaults(event.target.checked)} type="checkbox"/>이후 기간의 기본값에도 적용</label>{increaseConfirmationRequired ? <div className="rounded-xl bg-[var(--wl-warning-soft)] p-4" role="alert"><p className="text-sm font-bold">하위 예산 합계에 맞춰 전체 예산을 늘려야 합니다.</p><button className="mt-3 min-h-10 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white" onClick={() => mutation.mutate(request(true), { onSuccess: () => setIncreaseConfirmationRequired(false) })} type="button">증액하고 저장</button></div> : mutation.isError ? <p className="text-sm text-[var(--wl-color-danger)]" role="alert">예산을 저장하지 못했습니다. 입력값을 확인해주세요.</p> : null}<button className="min-h-11 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:bg-slate-300" disabled={mutation.isPending} type="submit">{mutation.isPending ? '저장 중...' : '예산 저장'}</button></form></SurfaceCard>
}

function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-bold" htmlFor={id}>{label}<input className="mt-2 h-12 w-full px-4 text-right tabular-nums" id={id} min="0" onChange={(event) => onChange(event.target.value)} required type="number" value={value}/></label> }
