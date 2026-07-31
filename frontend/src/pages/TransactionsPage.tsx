import { Filter, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useTransactionsQuery } from '../features/transaction/model/transactionQueries'
import { formatWon } from '../shared/lib/money'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export function TransactionsPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL')
  const location = useLocation()
  const deferredQuery = useDeferredValue(query)
  const me = useMeQuery(); const ledgerId = me.data?.currentLedger.id
  const transactions = useTransactionsQuery(ledgerId, { query: deferredQuery || undefined, types: type === 'ALL' ? undefined : [type], unclassified: location.pathname.endsWith('/uncategorized'), limit: 100 })
  const items = transactions.data?.items ?? []
  return <main className="product-page product-page--standard">
    <PageHeader eyebrow="TRANSACTIONS" title="거래 내역" description="달력 대신 날짜순으로 소비 흐름을 확인합니다." />
    <SurfaceCard className="mt-5"><div className="flex flex-wrap gap-2"><label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[var(--wl-color-border)] px-3"><Search size={17}/><input aria-label="거래 검색" className="min-w-0 flex-1 bg-transparent outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사용처 또는 메모 검색"/></label><Filter aria-hidden="true" className="mt-3" size={18}/>{(['ALL','EXPENSE','INCOME','TRANSFER'] as const).map((value) => <button key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value} className="min-h-11 rounded-lg px-3 text-sm font-bold aria-pressed:bg-[var(--wl-brand-100)]">{value === 'ALL' ? '전체' : value === 'EXPENSE' ? '지출' : value === 'INCOME' ? '수입' : '이체'}</button>)}</div></SurfaceCard>
    {transactions.isLoading ? <p className="mt-6 text-sm">거래를 불러오는 중입니다.</p> : null}{transactions.isError ? <div className="mt-6"><ErrorState onRetry={() => transactions.refetch()}/></div> : null}
    {transactions.isSuccess && !items.length ? <div className="mt-6"><EmptyState title="표시할 거래가 없습니다." description="검색어나 필터를 바꾸거나 새 거래를 기록해보세요."/></div> : null}
    {transactions.data?.unclassifiedCount ? <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[var(--wl-color-primary-dark)]" to="/transactions/uncategorized">미분류 {transactions.data.unclassifiedCount}건 정리하기</Link> : null}
    <ol className="mt-5 space-y-2">{items.map((item) => <li key={item.id}><Link className="flex min-h-[58px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--wl-color-border)] bg-white p-4 transition-colors hover:border-[var(--wl-color-border-strong)] hover:bg-[var(--wl-color-surface-subtle)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-700/30" to={`/transactions/${item.id}`}><span className="min-w-0 flex-1"><strong className="block truncate">{item.merchant || item.memo || item.category?.name || '미분류 거래'}</strong><span className="mt-1 block text-xs text-[var(--wl-color-text-secondary)]">{item.transactionDate} · {item.category?.name ?? '미분류'} · {item.scope?.type === 'SHARED' ? '공동 예산' : '내 예산'}</span></span><strong className="whitespace-nowrap tabular-nums">{item.type === 'EXPENSE' ? '-' : item.type === 'INCOME' ? '+' : ''}{formatWon(item.amount)}</strong></Link></li>)}</ol>
  </main>
}
