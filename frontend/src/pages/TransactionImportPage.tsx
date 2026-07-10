import { FileImage, Save, ScanText } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useTransactionImportPreviewMutation } from '../features/import/model/transactionImportQueries'
import type { TransactionImportCandidate } from '../features/import/api/transactionImportApi'
import { useCreateTransactionMutation } from '../features/transaction/model/transactionQueries'
import { ApiClientError } from '../shared/api/client'
import { formatBudgetMonth, formatDateInput } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

export function TransactionImportPage() {
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const [text, setText] = useState('')
  const [transactionDate, setTransactionDate] = useState(formatDateInput())
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const previewMutation = useTransactionImportPreviewMutation(ledgerId)
  const createTransactionMutation = useCreateTransactionMutation(
    ledgerId,
    formatBudgetMonth(new Date(transactionDate)),
  )

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
    try {
      const tesseract = await import('tesseract.js')
      const result = await tesseract.recognize(file, 'kor+eng')
      setText(result.data.text.trim())
    } finally {
      setIsOcrRunning(false)
    }
  }

  function handleSaveCandidate(candidate: TransactionImportCandidate) {
    createTransactionMutation.mutate(
      {
        type: candidate.type,
        amount: candidate.amount,
        transactionDate: candidate.transactionDate,
        categoryId: candidate.categoryId,
        memo: candidate.memo,
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
        <div className="mt-2 flex items-center gap-2 text-slate-950">
          <ScanText size={26} aria-hidden="true" />
          <h1 className="text-3xl font-semibold">거래 가져오기</h1>
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

          <label className="mt-4 block text-sm font-medium text-slate-700">
            기준 날짜
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setTransactionDate(event.target.value)}
              type="date"
              value={transactionDate}
            />
          </label>

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
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" key={candidate.id}>
                  <span>
                    <span className="block font-medium text-slate-950">
                      {candidate.memo}
                    </span>
                    <span className="text-sm text-slate-500">
                      {candidate.transactionDate} · {candidate.categoryName ?? '미분류'} ·{' '}
                      {formatWon(candidate.amount)}
                    </span>
                  </span>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
                    disabled={createTransactionMutation.isPending || savedIds.has(candidate.id)}
                    onClick={() => handleSaveCandidate(candidate)}
                    type="button"
                  >
                    <Save size={18} aria-hidden="true" />
                    {savedIds.has(candidate.id) ? '저장됨' : '저장'}
                  </button>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-slate-500">아직 후보가 없습니다.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
