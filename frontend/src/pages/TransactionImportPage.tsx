import { FileImage, Save, ScanText } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useTransactionImportPreviewMutation } from '../features/import/model/transactionImportQueries'
import type { TransactionImportCandidate } from '../features/import/api/transactionImportApi'
import { useCreateTransactionMutation } from '../features/transaction/model/transactionQueries'
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { formatDateInput } from '../shared/lib/date'
import { DatePicker } from '../shared/ui/DatePicker'

export function TransactionImportPage() {
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [text, setText] = useState('')
  const [transactionDate, setTransactionDate] = useState(formatDateInput())
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [ocrError, setOcrError] = useState(false)
  const [candidateDates, setCandidateDates] = useState<Record<string, string>>({})
  const previewMutation = useTransactionImportPreviewMutation(ledgerId)
  const createTransactionMutation = useCreateTransactionMutation(ledgerId)
  const categoriesQuery = useCategoriesQuery(ledgerId)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    previewMutation.mutate({
      text,
      transactionDate,
      ocrEngine: 'tesseract.js',
    })
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsOcrRunning(true)
    setOcrError(false)
    try {
      const tesseract = await import('tesseract.js')
      const result = await tesseract.recognize(file, 'kor+eng')
      setText(result.data.text.trim())
    } catch {
      setOcrError(true)
    } finally {
      setIsOcrRunning(false)
    }
  }

  function handleSaveCandidate(candidate: TransactionImportCandidate, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const categoryId = Number(formData.get('categoryId'))
    createTransactionMutation.mutate(
      {
        type: String(formData.get('type')) as TransactionType,
        amount: Number(formData.get('amount')),
        transactionDate: candidateDates[candidate.id] ?? candidate.transactionDate,
        categoryId: categoryId || null,
        memo: String(formData.get('memo')) || null,
      },
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
            이미지
            <input
              accept="image/*"
              className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:text-sm file:font-semibold file:text-white"
              onChange={handleImageChange}
              type="file"
            />
          </label>
          {ocrError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">이미지에서 글자를 읽지 못했습니다. 다른 이미지를 선택하거나 텍스트를 직접 입력해주세요.</p> : null}

          <div className="mt-4"><p className="text-sm font-medium text-slate-700">기준 날짜</p><DatePicker ariaLabel="기준 날짜" className="mt-2" onChange={setTransactionDate} value={transactionDate} /></div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            추출 텍스트
            <textarea
              className="mt-2 min-h-64 w-full rounded-md border border-slate-300 p-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setText(event.target.value)}
              placeholder="예: 2026-07-09 식비 점심 12,000원"
              required
              value={text}
            />
          </label>

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
            disabled={previewMutation.isPending || isOcrRunning}
            type="submit"
          >
            <ScanText size={18} aria-hidden="true" />
            {isOcrRunning ? 'OCR 실행 중' : '후보 만들기'}
          </button>
          {previewMutation.isError ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">거래 후보를 만들지 못했습니다. 텍스트 형식을 확인해주세요.</p> : null}
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">거래 후보</h2>
          {previewMutation.data ? (
            <p className="mt-2 text-sm text-slate-500">
              제외된 줄 {previewMutation.data.rejectedLines}건
            </p>
          ) : null}

          <div className="mt-4 divide-y divide-slate-100">
            {previewMutation.data?.candidates.length ? (
              previewMutation.data.candidates.map((candidate) => (
                <form className="grid gap-3 py-4 sm:grid-cols-2" key={candidate.id} onSubmit={(event) => handleSaveCandidate(candidate, event)}>
                  <label className="text-xs font-bold text-slate-500">유형<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={candidate.type} name="type"><option value="EXPENSE">지출</option><option value="INCOME">수입</option></select></label>
                  <div className="text-xs font-bold text-slate-500"><p>날짜</p><DatePicker ariaLabel={`${candidate.id} 날짜`} className="mt-1" onChange={(date) => setCandidateDates((current) => ({ ...current, [candidate.id]: date }))} value={candidateDates[candidate.id] ?? candidate.transactionDate} /></div>
                  <label className="text-xs font-bold text-slate-500">금액<input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={candidate.amount} min="1" name="amount" required type="number" /></label>
                  <label className="text-xs font-bold text-slate-500">카테고리<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={candidate.categoryId ?? ''} name="categoryId"><option value="">미분류</option>{categoriesQuery.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-500 sm:col-span-2">메모<input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={candidate.memo} name="memo" /></label>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:bg-slate-300 sm:col-span-2"
                    disabled={createTransactionMutation.isPending || savedIds.has(candidate.id)}
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
        </section>
      </section>
    </main>
  )
}
