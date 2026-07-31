import { CalendarDays, CircleDollarSign, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export type SharedLedgerCreateInput = { name: string; totalBudget: number; budgetCycle: { startType: 'DAY_OF_MONTH' | 'LAST_DAY_OF_MONTH'; startDay: number | null } }
export type SharedLedgerCreatePageProps = { isLoading?: boolean; error?: string | null; onCreate?: (input: SharedLedgerCreateInput) => Promise<void> | void }

export function SharedLedgerCreatePage({ isLoading = false, error, onCreate }: SharedLedgerCreatePageProps) {
  const [name, setName] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [startType, setStartType] = useState<'DAY_OF_MONTH' | 'LAST_DAY_OF_MONTH'>('DAY_OF_MONTH')
  const [startDay, setStartDay] = useState('1')
  const [submitted, setSubmitted] = useState(false)
  const parsedBudget = Number(totalBudget.replaceAll(',', ''))
  const parsedDay = Number(startDay)
  const valid = name.trim().length >= 1 && name.trim().length <= 30 && Number.isFinite(parsedBudget) && parsedBudget >= 0 && (startType === 'LAST_DAY_OF_MONTH' || (Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 28))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitted(true)
    if (!valid || !onCreate) return
    await onCreate({ name: name.trim(), totalBudget: parsedBudget, budgetCycle: { startType, startDay: startType === 'LAST_DAY_OF_MONTH' ? null : parsedDay } })
  }

  return <main className="product-page product-page--narrow">
    <PageHeader eyebrow="SHARED LEDGER" title="함께 쓸 장부를 만들어요" description="예산 기간과 전체 예산을 먼저 정하고, 준비가 되면 링크로 한 명을 초대할 수 있어요." />
    {error ? <div className="mt-6"><ErrorState title="공동 장부를 만들지 못했습니다." description={error} /></div> : null}
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <SurfaceCard><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[var(--wl-brand-100)] text-[var(--wl-color-primary-dark)]"><UsersRound aria-hidden="true" size={21} /></span><div><h2 className="font-bold">장부 기본 정보</h2><p className="mt-1 text-sm text-[var(--wl-color-text-secondary)]">두 사람이 함께 보는 생활비 장부예요.</p></div></div>
        <label className="mt-6 block text-sm font-bold" htmlFor="shared-ledger-name">장부 이름<input className="mt-2 h-12 w-full px-4" id="shared-ledger-name" maxLength={30} onChange={(event) => setName(event.target.value)} placeholder="예: 우리 생활비" required value={name} /></label>
        <label className="mt-5 block text-sm font-bold" htmlFor="shared-ledger-budget">이번 기간 전체 예산<input className="mt-2 h-12 w-full px-4 text-right" id="shared-ledger-budget" inputMode="numeric" min="0" onChange={(event) => setTotalBudget(event.target.value)} placeholder="0" required type="number" value={totalBudget} /></label>
      </SurfaceCard>
      <SurfaceCard><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[var(--wl-data-blue-soft)] text-[var(--wl-data-blue)]"><CalendarDays aria-hidden="true" size={21} /></span><div><h2 className="font-bold">예산 기간 시작일</h2><p className="mt-1 text-sm text-[var(--wl-color-text-secondary)]">시작일 전날까지가 한 예산 기간입니다.</p></div></div>
        <fieldset className="mt-6 space-y-3"><legend className="sr-only">예산 기간 시작 기준</legend><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--wl-color-border)] px-4"><input checked={startType === 'DAY_OF_MONTH'} name="budget-cycle" onChange={() => setStartType('DAY_OF_MONTH')} type="radio" /><span className="font-bold">매월 특정 일</span></label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--wl-color-border)] px-4"><input checked={startType === 'LAST_DAY_OF_MONTH'} name="budget-cycle" onChange={() => setStartType('LAST_DAY_OF_MONTH')} type="radio" /><span className="font-bold">매월 마지막 날</span></label></fieldset>
        {startType === 'DAY_OF_MONTH' ? <label className="mt-5 block text-sm font-bold" htmlFor="shared-ledger-start-day">시작일<select className="mt-2 h-12 w-full px-4" id="shared-ledger-start-day" onChange={(event) => setStartDay(event.target.value)} value={startDay}>{Array.from({ length: 28 }, (_, index) => <option key={index + 1} value={index + 1}>매월 {index + 1}일</option>)}</select></label> : <p className="mt-5 rounded-xl bg-[var(--wl-color-surface-subtle)] px-4 py-3 text-sm font-medium">2월처럼 날짜가 짧은 달도 마지막 날에 맞춰 시작합니다.</p>}
      </SurfaceCard>
      {submitted && !valid ? <p className="rounded-xl bg-[var(--wl-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--wl-color-danger)]" role="alert">장부 이름, 예산과 시작일을 모두 확인해주세요.</p> : null}
      <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:bg-slate-300" disabled={isLoading} type="submit"><CircleDollarSign aria-hidden="true" size={18} />{isLoading ? '만드는 중...' : '공동 장부 만들기'}</button>
    </form>
  </main>
}
