import { CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCardsQuery, useCreateCardMutation, useDeleteCardMutation, useUpdateCardMutation } from '../features/card/model/cardQueries'
import { useLedgersQuery } from '../features/ledger/model/ledgerQueries'
import { ApiClientError } from '../shared/api/client'
import { formatMonthlyClosingDay } from '../shared/lib/date'
import { EmptyState, ErrorState } from '../shared/ui/DesignPrimitives'

export function CardManagementPage() {
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const currentLedger = ledgersQuery.data?.ledgers.find((ledger) => ledger.id === ledgersQuery.data.currentLedgerId) ?? meQuery.data?.currentLedger
  const cardsQuery = useCardsQuery(currentLedger?.id)
  const createCardMutation = useCreateCardMutation(currentLedger?.id)
  const updateCardMutation = useUpdateCardMutation(currentLedger?.id)
  const deleteCardMutation = useDeleteCardMutation(currentLedger?.id)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [cardName, setCardName] = useState('')
  const [statementClosingDay, setStatementClosingDay] = useState(25)
  const editingCard = cardsQuery.data?.find((card) => card.id === editingCardId)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate replace to="/login" />

  function resetCardForm() {
    setEditingCardId(null)
    setCardName('')
    setStatementClosingDay(25)
  }

  function beginEdit(cardId: number) {
    const card = cardsQuery.data?.find((item) => item.id === cardId)
    if (!card) return
    setEditingCardId(card.id)
    setCardName(card.name)
    setStatementClosingDay(card.statementClosingDay)
  }

  function handleSaveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = { name: cardName, statementClosingDay }
    if (editingCard) {
      updateCardMutation.mutate({ id: editingCard.id, request }, { onSuccess: resetCardForm })
      return
    }
    createCardMutation.mutate(request, { onSuccess: resetCardForm })
  }

  function handleDeleteCard(cardId: number, name: string) {
    if (!window.confirm(`${name} 카드를 삭제할까요? 등록된 거래가 있는 카드는 삭제할 수 없습니다.`)) return
    deleteCardMutation.mutate(cardId)
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-4 sm:px-6 md:p-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="wl-page-header-label">Payment</p><div className="mt-2 flex items-center gap-2 text-slate-950"><CreditCard aria-hidden="true" className="text-[var(--wl-color-primary)]" size={26} /><h1 className="text-3xl font-bold tracking-tight">카드 관리</h1></div><p className="mt-2 text-sm text-slate-500">{currentLedger?.name ?? '현재 장부'}에서 사용할 카드와 결제금액 확정일을 관리합니다.</p></div>
        <Link className="text-sm font-bold text-[var(--wl-color-primary-dark)]" to="/dashboard">대시보드로 돌아가기</Link>
      </header>

      <section className="mt-6 rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-5 shadow-[var(--wl-shadow-card)] sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">{editingCard ? '카드 수정' : '새 카드 등록'}</h2><p className="mt-1 text-sm text-slate-500">확정일을 기준으로 다음 카드값 예상 금액을 계산합니다.</p>
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={handleSaveCard}>
          <label className="sr-only" htmlFor="card-name">카드 이름</label><input className="h-11 rounded-xl border border-slate-200 px-3 text-base" id="card-name" maxLength={100} onChange={(event) => setCardName(event.target.value)} placeholder="예: 우리카드" required value={cardName} />
          <label className="sr-only" htmlFor="statement-closing-day">결제금액 확정일</label><select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900" id="statement-closing-day" onChange={(event) => setStatementClosingDay(Number(event.target.value))} value={statementClosingDay}>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{formatMonthlyClosingDay(day)} 확정</option>)}</select>
          <div className="flex gap-2"><button className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white disabled:bg-slate-300" disabled={createCardMutation.isPending || updateCardMutation.isPending} type="submit">{editingCard ? <Pencil size={17} /> : <Plus size={17} />}{createCardMutation.isPending || updateCardMutation.isPending ? '저장 중...' : editingCard ? '카드 저장' : '카드 추가'}</button>{editingCard ? <button aria-label="카드 수정 취소" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600" onClick={resetCardForm} type="button"><X size={17} /></button> : null}</div>
        </form>
        {createCardMutation.isError || updateCardMutation.isError ? <p className="mt-3 text-sm font-bold text-red-600" role="alert">카드를 저장하지 못했습니다. 이름과 확정일을 확인해주세요.</p> : null}
      </section>

      <section className="mt-5 rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-5 shadow-[var(--wl-shadow-card)] sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-950">등록한 카드</h2><span className="text-sm font-bold text-slate-400">{cardsQuery.data?.length ?? 0}개</span></div>
        {cardsQuery.isLoading ? <p className="py-8 text-sm text-slate-500">카드를 불러오는 중입니다.</p> : null}
        {cardsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => cardsQuery.refetch()} /></div> : null}
        {!cardsQuery.isLoading && !cardsQuery.isError && !cardsQuery.data?.length ? <div className="mt-5"><EmptyState title="등록된 카드가 없어요." description="카드를 추가하면 거래에서 선택하고 다음 카드값을 확인할 수 있어요." /></div> : null}
        {cardsQuery.data?.length ? <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">{cardsQuery.data.map((card) => <li className="flex min-h-16 items-center justify-between gap-3 py-3" key={card.id}><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-950">{card.name}</strong><span className="text-xs font-medium text-slate-500">{formatMonthlyClosingDay(card.statementClosingDay)} 결제금액 확정</span></span><div className="flex shrink-0 items-center gap-1"><button aria-label={`${card.name} 수정`} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => beginEdit(card.id)} type="button"><Pencil size={15} />수정</button><button aria-label={`${card.name} 삭제`} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" disabled={deleteCardMutation.isPending} onClick={() => handleDeleteCard(card.id, card.name)} type="button"><Trash2 size={17} /></button></div></li>)}</ul> : null}
        {deleteCardMutation.isError ? <p className="mt-3 text-sm font-bold text-red-600" role="alert">거래에 사용된 카드는 삭제할 수 없습니다.</p> : null}
      </section>
    </main>
  )
}
