import { useState } from 'react'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useAnalyticsQuery } from '../features/analytics/model/analyticsQueries'
import type { AnalyticsScope } from '../features/analytics/api/analyticsApi'
import { formatWon } from '../shared/lib/money'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const colors = ['#16805d','#5275e8','#e66f70','#e99a2c','#8a6edb']
export function AnalysisPage() {
  const me = useMeQuery()
  const [scope, setScope] = useState<AnalyticsScope>('ALL')
  const query = useAnalyticsQuery(me.data?.currentLedger.id, undefined, scope)
  if (query.isLoading) return <main className="product-page"><p>분석을 계산하는 중입니다.</p></main>
  if (query.isError) return <main className="product-page"><ErrorState onRetry={() => query.refetch()}/></main>
  const data = query.data
  if (!data?.categoryDistribution.length) return <main className="product-page"><PageHeader eyebrow="ANALYSIS" title="소비 분석" description="대분류별 지출과 기간 흐름을 확인합니다."/><EmptyState title="분석할 지출이 없습니다." description="거래를 기록하면 이곳에 소비 흐름이 표시됩니다."/></main>
  const total = data.categoryDistribution.reduce((sum, item) => sum + item.amount, 0)
  return <main className="product-page product-page--standard"><PageHeader eyebrow="ANALYSIS" title="소비 분석" description={`${data.periodStart} — ${data.periodEnd} · 수입과 내 계좌 이체는 총지출에서 제외합니다.`}/>
    <div aria-label="분석 범위" className="mt-5 inline-flex rounded-xl border border-[var(--wl-color-border)] bg-white p-1" role="group">{([['ALL','전체'],['SHARED','공동 예산'],['MINE','내 예산']] as const).map(([value,label]) => <button aria-pressed={scope === value} className="min-h-11 rounded-lg px-4 text-sm font-bold aria-pressed:bg-[var(--wl-brand-100)] aria-pressed:text-[var(--wl-brand-700)]" key={value} onClick={() => setScope(value)} type="button">{label}</button>)}</div>
    <section className="mt-5 grid gap-5 lg:grid-cols-2"><SurfaceCard><span className="text-xs font-bold text-[var(--wl-color-text-secondary)]">총지출</span><strong className="mt-2 block text-3xl tabular-nums">{formatWon(data.totalExpenseAmount)}</strong>{data.changeAmount !== null ? <p className="mt-2 text-sm text-[var(--wl-color-text-secondary)]">이전 기간보다 {data.changeAmount >= 0 ? '+' : ''}{formatWon(data.changeAmount)}</p> : <p className="mt-2 text-sm text-[var(--wl-color-text-secondary)]">비교할 이전 기간이 없습니다.</p>}</SurfaceCard><SurfaceCard><h2 className="font-bold">대분류 소비</h2><div className="mt-5 flex flex-wrap gap-5"><svg aria-label="대분류 소비 비율" className="size-40 -rotate-90" role="img" viewBox="0 0 42 42">{data.categoryDistribution.map((row,index) => { const before=data.categoryDistribution.slice(0,index).reduce((sum,item)=>sum+item.amount,0)/total*100; const percent=row.amount/total*100; return <circle cx="21" cy="21" fill="none" key={row.groupCode} r="15.9" stroke={colors[index%colors.length]} strokeDasharray={`${percent} ${100-percent}`} strokeDashoffset={-before} strokeWidth="5"/> })}</svg><ul className="min-w-52 flex-1 space-y-2">{data.categoryDistribution.map((row,index) => <li className="flex justify-between gap-3 text-sm" key={row.groupCode}><span><i aria-hidden="true" className="mr-2 inline-block size-2 rounded-full" style={{background:colors[index%colors.length]}}/>{row.groupName}</span><strong>{formatWon(row.amount)}</strong></li>)}</ul></div></SurfaceCard></section>
    <SurfaceCard className="mt-5"><h2 className="font-bold">일별 누적 흐름</h2><div className="mt-4 overflow-x-auto"><svg aria-label="일별 누적 지출 흐름" className="h-44 min-w-[560px] w-full" role="img" viewBox="0 0 600 170"><polyline fill="none" points={toLinePoints(data.dailyFlow.map((item) => item.cumulativeAmount), 600, 150)} stroke="var(--wl-data-blue)" strokeWidth="3"/><line stroke="var(--wl-line)" x1="0" x2="600" y1="150" y2="150"/></svg></div></SurfaceCard>
  </main>
}

function toLinePoints(values: number[], width: number, height: number) { const max=Math.max(...values,1); return values.map((value,index)=>`${values.length===1?width/2:index/(values.length-1)*width},${height-value/max*(height-16)}`).join(' ') }
