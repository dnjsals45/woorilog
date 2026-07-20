import { Repeat, Settings2, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import { useLedgerMembersQuery, useLedgersQuery, useUpdateRecurringSummaryClosingDayMutation } from '../features/ledger/model/ledgerQueries'
import type { RecurringFrequency, RecurringTemplate } from '../features/recurring/api/recurringApi'
import { useCreateRecurringTemplateMutation, useDeleteRecurringTemplateMutation, useRecurringTemplatesQuery, useUpdateRecurringTemplateMutation } from '../features/recurring/model/recurringQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { addDateInputPeriod, countRecurringOccurrences, formatDateInput, getRecurringSummaryPeriod } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'
import { DatePicker } from '../shared/ui/DatePicker'

export function RecurringTransactionPage() {
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const currentLedger = ledgersQuery.data?.ledgers.find((ledger) => ledger.id === ledgersQuery.data.currentLedgerId) ?? meQuery.data?.currentLedger
  const [recurringType, setRecurringType] = useState<TransactionType>('EXPENSE')
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(formatDateInput())
  const [endDate, setEndDate] = useState('')
  const categoriesQuery = useCategoriesQuery(currentLedger?.id)
  const membersQuery = useLedgerMembersQuery(currentLedger?.id)
  const templatesQuery = useRecurringTemplatesQuery(currentLedger?.id)
  const createMutation = useCreateRecurringTemplateMutation(currentLedger?.id)
  const updateMutation = useUpdateRecurringTemplateMutation(editingTemplateId ?? undefined)
  const deleteMutation = useDeleteRecurringTemplateMutation()
  const updateClosingDayMutation = useUpdateRecurringSummaryClosingDayMutation(currentLedger?.id)
  const templates = templatesQuery.data?.filter((template) => !template.paused) ?? []
  const editingTemplate = templates.find((template) => template.id === editingTemplateId)
  const closingDay = currentLedger?.recurringSummaryClosingDay ?? 31
  const period = getRecurringSummaryPeriod(closingDay)
  const summary = summarizeRecurringTransactions(templates, period.startDate, period.endDate)
  const canManageLedger = currentLedger?.ownerId === meQuery.data?.user.id

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate replace to="/login" />
  }

  function startEdit(template: RecurringTemplate) {
    setRecurringType(template.type)
    setEditingTemplateId(template.id)
    setStartDate(template.startDate)
    setEndDate(template.endDate ?? '')
  }

  function cancelEdit() {
    setEditingTemplateId(null)
    setStartDate(formatDateInput())
    setEndDate('')
  }

  function setQuickEndDate(period: 'WEEK' | 'MONTH' | 'YEAR') {
    setEndDate(addDateInputPeriod(startDate, period))
  }

  function deleteTemplate(template: RecurringTemplate) {
    const name = template.memo || template.category?.name || '정기 거래'
    if (!window.confirm(`${name} 정기 거래를 삭제할까요?\n이미 가계부에 등록된 과거 거래는 유지됩니다.`)) return
    deleteMutation.mutate(template.id, {
      onSuccess: () => {
        if (editingTemplateId === template.id) setEditingTemplateId(null)
      },
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const request = {
      type: recurringType,
      amount: Number(formData.get('amount') ?? 0),
      categoryId: Number(formData.get('categoryId')) || null,
      memo: String(formData.get('memo') ?? '') || null,
      payerUserId: Number(formData.get('payerUserId')) || null,
      frequency: String(formData.get('frequency')) as RecurringFrequency,
      startDate: String(formData.get('startDate')),
      endDate: String(formData.get('endDate') ?? '') || null,
    }
    const onSuccess = () => {
      cancelEdit()
      form.reset()
    }

    if (editingTemplateId) updateMutation.mutate(request, { onSuccess })
    else createMutation.mutate(request, { onSuccess })
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1240px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader
        eyebrow="RECURRING"
        title="정기 거래"
        description="정기 결제와 수입을 설정하면 시작일 거래는 바로 가계부에 등록되고, 다음 발생분도 자동으로 기록합니다."
      />

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="bg-[linear-gradient(135deg,#effbf5,#ffffff)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="dashboard-eyebrow">RECURRING TOTAL</p><h2 className="mt-1 text-lg font-extrabold">이번 집계 기간의 정기 거래</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${currentLedger?.type === 'GROUP' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>{currentLedger?.type === 'GROUP' ? '공동 장부' : '개인 장부'}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500">{period.startDate.replaceAll('-', '.')} ~ {period.endDate.replaceAll('-', '.')} · 활성 정기 거래만 합산</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><SummaryAmount label="반복 지출" value={summary.expense} tone="text-orange-600" /><SummaryAmount label="반복 수입" value={summary.income} tone="text-blue-600" /></div>
          <p className="mt-4 text-xs font-bold text-slate-500">활성 정기 거래 {summary.occurrences}건이 이 기간에 발생합니다.</p>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center gap-2"><Settings2 className="text-emerald-600" size={19} /><h2 className="text-lg font-extrabold">집계 기준</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-500">매월 마감일 다음 날부터 다음 마감일까지의 반복 거래를 합산합니다.</p>
          <label className="mt-4 block text-sm font-bold text-slate-600">반복 거래 집계 마감일<select aria-label="반복 거래 집계 마감일" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold" disabled={!canManageLedger || updateClosingDayMutation.isPending} onChange={(event) => updateClosingDayMutation.mutate(Number(event.target.value))} value={closingDay}>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>매월 {day}일</option>)}</select></label>
          <p className="mt-3 text-xs leading-5 text-slate-500">{closingDay}일을 선택하면 {closingDay === 31 ? '매월 1일부터 말일까지' : `매월 ${closingDay + 1}일부터 다음 달 ${closingDay}일까지`} 표시합니다. {canManageLedger ? '' : '장부 소유자만 변경할 수 있습니다.'}</p>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard>
          <div className="flex items-center gap-2"><Repeat className="text-emerald-600" size={20} /><h2 className="text-lg font-extrabold">{editingTemplate ? '정기 거래 수정' : '정기 거래 추가'}</h2></div>
          <form className="mt-5" key={editingTemplate?.id ?? 'new'} onSubmit={handleSubmit}>
            <fieldset><legend className="text-sm font-bold text-slate-600">거래 유형</legend><div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="정기 거래 유형">{(['EXPENSE', 'INCOME'] as const).map((candidate) => <button aria-pressed={recurringType === candidate} className={`min-h-11 rounded-xl border text-sm font-extrabold ${recurringType === candidate ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`} key={candidate} onClick={() => setRecurringType(candidate)} type="button">{candidate === 'EXPENSE' ? '지출' : '수입'}</button>)}</div></fieldset>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="금액"><input defaultValue={editingTemplate?.amount ?? ''} inputMode="numeric" min="1" name="amount" placeholder="예: 13,900" required type="number" /></Field><Field label="카테고리"><select defaultValue={editingTemplate?.category?.id ?? ''} name="categoryId"><option value="">선택 안 함</option>{categoriesQuery.data?.filter((category) => category.type === recurringType).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="반복 주기"><select defaultValue={editingTemplate?.frequency ?? 'MONTHLY'} name="frequency"><option value="MONTHLY">매월</option><option value="WEEKLY">매주</option></select></Field><Field label="결제자"><select defaultValue={editingTemplate?.payer.id ?? meQuery.data?.user.id ?? ''} name="payerUserId" required>{membersQuery.data?.map((member) => <option key={member.userId} value={member.userId}>{member.nickname}</option>)}</select></Field><Field label="시작일"><DatePicker ariaLabel="시작일" name="startDate" onChange={setStartDate} value={startDate} /></Field><Field label="종료일 (선택)"><DatePicker ariaLabel="종료일" clearable name="endDate" onChange={setEndDate} value={endDate} /><div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="종료일 빠른 선택"><button className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50" onClick={() => setQuickEndDate('WEEK')} type="button">+1주</button><button className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50" onClick={() => setQuickEndDate('MONTH')} type="button">+1달</button><button className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50" onClick={() => setQuickEndDate('YEAR')} type="button">+1년</button></div><p className="mt-2 text-xs font-medium text-slate-500" id="end-date-help">비워두면 종료일 없이 계속 반복됩니다.</p></Field></div>
            <Field className="mt-4" label="메모 (선택)"><input defaultValue={editingTemplate?.memo ?? ''} name="memo" placeholder="예: 음악 스트리밍" /></Field>
            {createMutation.isError || updateMutation.isError ? <p className="mt-3 text-sm font-bold text-red-600" role="alert">정기 거래를 저장하지 못했습니다. 마감 여부와 입력값을 확인해주세요.</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{editingTemplate ? <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-600" onClick={cancelEdit} type="button">수정 취소</button> : null}<button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={createMutation.isPending || updateMutation.isPending} type="submit"><Repeat size={17} />{editingTemplate ? '수정 저장' : '설정하고 가계부에 등록'}</button></div>
          </form>
        </SurfaceCard>

        <SurfaceCard labelledBy="recurring-list-title"><div className="flex items-center justify-between"><div><p className="dashboard-eyebrow">ACTIVE RULES</p><h2 className="mt-1 text-lg font-extrabold" id="recurring-list-title">등록한 정기 거래</h2></div><span className="text-sm font-bold text-slate-400">{templates.length}개</span></div>{templatesQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => templatesQuery.refetch()} /></div> : null}{templatesQuery.isLoading ? <div className="mt-5 space-y-3">{[1, 2, 3].map((item) => <div className="h-20 animate-pulse rounded-xl bg-slate-100" key={item} />)}</div> : null}{!templatesQuery.isLoading && !templatesQuery.isError && templates.length ? <ul className="mt-4 divide-y divide-slate-100">{templates.map((template) => <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center" key={template.id}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-base font-extrabold">{template.memo || template.category?.name || '정기 거래'}</strong><span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${template.type === 'EXPENSE' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{template.type === 'EXPENSE' ? '지출' : '수입'}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{formatWon(template.amount)} · {template.frequency === 'MONTHLY' ? '매월' : '매주'} · {template.payer.nickname}</p><p className="mt-1 text-xs font-medium text-slate-500">시작 {template.startDate.replaceAll('-', '.')} {template.endDate ? `· 종료 ${template.endDate.replaceAll('-', '.')}` : ''}</p></div><div className="flex gap-2"><button className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600" onClick={() => startEdit(template)} type="button">수정</button><button aria-label={`${template.memo || template.category?.name || '정기 거래'} 삭제`} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-600 hover:bg-rose-50" disabled={deleteMutation.isPending} onClick={() => deleteTemplate(template)} type="button"><Trash2 size={15} />삭제</button></div></li>)}</ul> : null}{!templatesQuery.isLoading && !templatesQuery.isError && !templates.length ? <div className="mt-5"><EmptyState title="등록한 정기 거래가 없어요." description="월세, 구독료, 월급처럼 반복되는 거래를 먼저 추가해보세요." /></div> : null}</SurfaceCard>
      </section>
    </main>
  )
}

function summarizeRecurringTransactions(templates: RecurringTemplate[], periodStart: string, periodEnd: string) {
  return templates.filter((template) => !template.paused).reduce((summary, template) => {
    const occurrences = countRecurringOccurrences(template.startDate, template.endDate, template.frequency, periodStart, periodEnd)
    if (template.type === 'EXPENSE') summary.expense += template.amount * occurrences
    else summary.income += template.amount * occurrences
    summary.occurrences += occurrences
    return summary
  }, { expense: 0, income: 0, occurrences: 0 })
}

function SummaryAmount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-white bg-white/80 p-4"><p className="text-sm font-bold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${tone}`}>{formatWon(value)}</p></div>
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`text-sm font-bold text-slate-600 ${className}`}><p>{label}</p><div className="mt-2 [&_input]:h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-4 [&_input]:text-base [&_input]:text-slate-950 [&_select]:h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-4 [&_select]:text-base [&_select]:text-slate-950">{children}</div></div>
}
