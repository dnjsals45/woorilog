import { FileImage, Save, ScanText } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useSaveTransactionImportMutation,
  useTransactionImageImportPreviewMutation,
  useTransactionImportPreviewMutation,
} from '../features/import/model/transactionImportQueries'
import type { TransactionImportCandidate, TransactionImportPreviewResponse } from '../features/import/api/transactionImportApi'
import { useCreateTransactionMutation } from '../features/transaction/model/transactionQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import type { SaveTransactionRequest, TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { formatDateInput } from '../shared/lib/date'
import { DatePicker } from '../shared/ui/DatePicker'

type TransactionImportCandidateDraft = Pick<
  TransactionImportCandidate,
  'id' | 'type' | 'amount' | 'transactionDate' | 'categoryId' | 'memo'
> & {
  selected: boolean
}

export function TransactionImportPage() {
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [text, setText] = useState('')
  const [transactionDate, setTransactionDate] = useState(formatDateInput())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [candidateDrafts, setCandidateDrafts] = useState<Record<string, TransactionImportCandidateDraft>>({})
  const [previewResult, setPreviewResult] = useState<TransactionImportPreviewResponse>()
  const [selectedImageCount, setSelectedImageCount] = useState(0)
  const previewMutation = useTransactionImportPreviewMutation(ledgerId)
  const imagePreviewMutation = useTransactionImageImportPreviewMutation(ledgerId)
  const createTransactionMutation = useCreateTransactionMutation(ledgerId)
  const saveImportMutation = useSaveTransactionImportMutation(ledgerId)
  const categoriesQuery = useCategoriesQuery(ledgerId)

  function applyPreview(result: TransactionImportPreviewResponse) {
    setPreviewResult(result)
    setSavedIds(new Set())
    setCandidateDrafts(Object.fromEntries(result.candidates.map((candidate) => [candidate.id, {
      id: candidate.id,
      type: candidate.type,
      amount: candidate.amount,
      transactionDate: candidate.transactionDate,
      categoryId: candidate.categoryId,
      memo: candidate.memo,
      selected: true,
    }])))
  }

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    previewMutation.mutate({
      text,
      transactionDate,
    }, {
      onSuccess: applyPreview,
    })
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const images = Array.from(event.target.files ?? [])
    if (!images.length) return

    setSelectedImageCount(images.length)
    setPreviewResult(undefined)
    imagePreviewMutation.mutate(
      { images, transactionDate },
      {
        onSuccess: applyPreview,
      },
    )
  }

  function toSaveRequest(candidate: TransactionImportCandidateDraft): SaveTransactionRequest {
    return {
      type: candidate.type,
      amount: candidate.amount,
      transactionDate: candidate.transactionDate,
      categoryId: candidate.categoryId,
      memo: candidate.memo || null,
    }
  }

  function updateCandidate(candidateId: string, values: Partial<TransactionImportCandidateDraft>) {
    setCandidateDrafts((current) => ({
      ...current,
      [candidateId]: { ...current[candidateId], ...values },
    }))
  }

  function handleSaveCandidate(candidate: TransactionImportCandidateDraft, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createTransactionMutation.mutate(
      toSaveRequest(candidate),
      {
        onSuccess: () =>
          setSavedIds((current) => {
            const next = new Set(current)
            next.add(candidate.id)
            return next
          }),
      },
    )
  }

  const candidates = previewResult?.candidates.map((candidate) => candidateDrafts[candidate.id])
    .filter((candidate): candidate is TransactionImportCandidateDraft => Boolean(candidate)) ?? []
  const selectedCandidates = candidates.filter((candidate) => candidate.selected && !savedIds.has(candidate.id))

  function handleSaveSelectedCandidates() {
    if (!selectedCandidates.length) return

    const candidateIds = selectedCandidates.map((candidate) => candidate.id)
    saveImportMutation.mutate(
      selectedCandidates.map(toSaveRequest),
      {
        onSuccess: () => setSavedIds((current) => new Set([...current, ...candidateIds])),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
      <header className="border-b border-slate-200 pb-6">
        <Link className="text-sm font-medium text-emerald-700" to="/calendar">
          거래 장부로 돌아가기
        </Link>
        <p className="wl-page-header-label mt-5">Import</p>
        <div className="mt-2 flex items-center gap-2 text-slate-950">
          <ScanText size={26} className="text-[var(--wl-color-primary)]" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight">거래 가져오기</h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {meQuery.data?.currentLedger.name ?? '현재 장부'}에 저장할 후보를 확인합니다.
        </p>
      </header>

      <section className="grid gap-4 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handlePreview}
        >
          <div className="flex items-center gap-2 text-slate-950">
            <FileImage size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold">원본</h2>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            이미지 (최대 10장)
            <input
              accept="image/png,image/jpeg"
              className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:text-sm file:font-semibold file:text-white"
              multiple
              onChange={handleImageChange}
              type="file"
            />
          </label>
          {selectedImageCount > 0 ? <p className="mt-2 text-sm text-slate-500" aria-live="polite">이미지 {selectedImageCount}장 선택됨</p> : null}
          {imagePreviewMutation.isPending ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">선택한 이미지를 서버에서 순서대로 분석하고 있습니다.</p> : null}
          {imagePreviewMutation.isError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">서버에서 이미지를 읽지 못했습니다. 파일 형식과 첨부 개수를 확인하거나 텍스트를 직접 입력해주세요.</p> : null}

          <div className="mt-4"><p className="text-sm font-medium text-slate-700">기준 날짜</p><DatePicker ariaLabel="기준 날짜" className="mt-2" onChange={setTransactionDate} value={transactionDate} /></div>

          <details className="mt-5 border-t border-slate-200 pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">텍스트로 직접 입력</summary>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              거래 내역 텍스트
              <textarea
                className="mt-2 min-h-40 w-full rounded-md border border-slate-300 p-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setText(event.target.value)}
                placeholder="예: 2026-07-09 식비 점심 12,000원"
                value={text}
              />
            </label>
            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
              disabled={!text.trim() || previewMutation.isPending || imagePreviewMutation.isPending}
              type="submit"
            >
              <ScanText size={18} aria-hidden="true" />
              {previewMutation.isPending ? '텍스트 분석 중' : '텍스트 후보 만들기'}
            </button>
            {previewMutation.isError ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">거래 후보를 만들지 못했습니다. 텍스트 형식을 확인해주세요.</p> : null}
          </details>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">거래 후보</h2>
            </div>
            {candidates.length ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
                disabled={!selectedCandidates.length || saveImportMutation.isPending || createTransactionMutation.isPending}
                onClick={handleSaveSelectedCandidates}
                type="button"
              >
                <Save size={18} aria-hidden="true" />
                {saveImportMutation.isPending ? '일괄 저장 중' : `선택 ${selectedCandidates.length}건 일괄 저장`}
              </button>
            ) : null}
          </div>
          {previewResult ? (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600" aria-live="polite">
              저장할 후보를 확인·수정한 뒤 선택해서 한 번에 저장하세요.
            </p>
          ) : null}

          <div className="mt-4 divide-y divide-slate-100">
            {candidates.length ? (
              candidates.map((candidate) => (
                <form className="grid gap-3 py-4 sm:grid-cols-2" key={candidate.id} onSubmit={(event) => handleSaveCandidate(candidate, event)}>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    <input
                      checked={candidate.selected && !savedIds.has(candidate.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      disabled={savedIds.has(candidate.id) || saveImportMutation.isPending}
                      onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })}
                      type="checkbox"
                    />
                    일괄 저장에 포함
                  </label>
                  <label className="text-xs font-bold text-slate-500">유형<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" disabled={savedIds.has(candidate.id) || saveImportMutation.isPending} onChange={(event) => updateCandidate(candidate.id, { type: event.target.value as TransactionType })} value={candidate.type}><option value="EXPENSE">지출</option><option value="INCOME">수입</option></select></label>
                  <div className="text-xs font-bold text-slate-500"><p>날짜</p><DatePicker ariaLabel={`${candidate.id} 날짜`} className="mt-1" disabled={savedIds.has(candidate.id) || saveImportMutation.isPending} onChange={(transactionDate) => updateCandidate(candidate.id, { transactionDate })} value={candidate.transactionDate} /></div>
                  <label className="text-xs font-bold text-slate-500">금액<input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" disabled={savedIds.has(candidate.id) || saveImportMutation.isPending} min="1" onChange={(event) => updateCandidate(candidate.id, { amount: Number(event.target.value) })} required type="number" value={candidate.amount} /></label>
                  <label className="text-xs font-bold text-slate-500">카테고리<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" disabled={savedIds.has(candidate.id) || saveImportMutation.isPending} onChange={(event) => updateCandidate(candidate.id, { categoryId: Number(event.target.value) || null })} value={candidate.categoryId ?? ''}><option value="">미분류</option>{categoriesQuery.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500 sm:col-span-2">메모<input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" disabled={savedIds.has(candidate.id) || saveImportMutation.isPending} onChange={(event) => updateCandidate(candidate.id, { memo: event.target.value })} value={candidate.memo} /></label>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:bg-slate-300 sm:col-span-2"
                    disabled={createTransactionMutation.isPending || saveImportMutation.isPending || savedIds.has(candidate.id)}
                    type="submit"
                  >
                    <Save size={18} aria-hidden="true" />
                    {savedIds.has(candidate.id) ? '저장됨' : '저장'}
                  </button>
                </form>
              ))
            ) : (
              <p className="py-6 text-sm text-slate-500">아직 후보가 없습니다.</p>
            )}
          </div>
          {createTransactionMutation.isError ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">후보를 저장하지 못했습니다. 마감된 월인지 확인해주세요.</p> : null}
          {saveImportMutation.isError ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">선택한 후보를 저장하지 못했습니다. 금액, 카테고리와 마감된 월 여부를 확인해주세요.</p> : null}
        </section>
      </section>
    </main>
  )
}
