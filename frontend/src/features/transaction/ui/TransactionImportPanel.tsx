import { FileImage, Save, ScanText } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import {
  useSaveTransactionImportMutation,
  useTransactionImageImportPreviewMutation,
  useTransactionImportPreviewMutation,
} from '../../import/model/transactionImportQueries'
import type {
  TransactionImportCandidate,
  TransactionImportPreviewResponse,
} from '../../import/api/transactionImportApi'
import type {
  SaveTransactionRequest,
  TransactionType,
} from '../api/transactionApi'
import { DatePicker } from '../../../shared/ui/DatePicker'

type TransactionImportPanelProps = {
  ledgerId: number | undefined
  method: 'receipt' | 'text'
  transactionDate: string
  onTransactionDateChange: (date: string) => void
  onSaved: () => void
}

type TransactionImportCandidateDraft = Pick<
  TransactionImportCandidate,
  'id' | 'type' | 'amount' | 'transactionDate' | 'categoryId' | 'memo'
> & {
  selected: boolean
}

export function TransactionImportPanel({
  ledgerId,
  method,
  transactionDate,
  onTransactionDateChange,
  onSaved,
}: TransactionImportPanelProps) {
  const [text, setText] = useState('')
  const [selectedImageCount, setSelectedImageCount] = useState(0)
  const [previewResult, setPreviewResult] = useState<TransactionImportPreviewResponse>()
  const [candidateDrafts, setCandidateDrafts] = useState<Record<string, TransactionImportCandidateDraft>>({})
  const previewMutation = useTransactionImportPreviewMutation(ledgerId)
  const imagePreviewMutation = useTransactionImageImportPreviewMutation(ledgerId)
  const saveImportMutation = useSaveTransactionImportMutation(ledgerId)
  const categoriesQuery = useCategoriesQuery(ledgerId)

  function applyPreview(result: TransactionImportPreviewResponse) {
    setPreviewResult(result)
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

  function handleTextPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    previewMutation.mutate({ text, transactionDate }, { onSuccess: applyPreview })
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const images = Array.from(event.target.files ?? [])
    if (!images.length) return

    setSelectedImageCount(images.length)
    setPreviewResult(undefined)
    imagePreviewMutation.mutate(
      { images, transactionDate },
      { onSuccess: applyPreview },
    )
  }

  function updateCandidate(candidateId: string, values: Partial<TransactionImportCandidateDraft>) {
    setCandidateDrafts((current) => ({
      ...current,
      [candidateId]: { ...current[candidateId], ...values },
    }))
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

  const candidates = previewResult?.candidates
    .map((candidate) => candidateDrafts[candidate.id])
    .filter((candidate): candidate is TransactionImportCandidateDraft => Boolean(candidate)) ?? []
  const selectedCandidates = candidates.filter((candidate) => candidate.selected)

  function handleSaveSelected() {
    if (!selectedCandidates.length) return
    saveImportMutation.mutate(
      selectedCandidates.map(toSaveRequest),
      { onSuccess: onSaved },
    )
  }

  const previewPending = previewMutation.isPending || imagePreviewMutation.isPending
  const previewError = previewMutation.isError || imagePreviewMutation.isError

  return (
    <div className="mt-5">
      <div className="rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-surface-subtle)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--wl-color-primary-dark)]">
            {method === 'receipt' ? <FileImage aria-hidden="true" size={19} /> : <ScanText aria-hidden="true" size={19} />}
          </span>
          <div>
            <h3 className="text-base font-bold text-[var(--wl-color-text-main)]">
              {method === 'receipt' ? '영수증에서 거래 불러오기' : '문자 내역에서 거래 불러오기'}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--wl-color-text-secondary)]">
              {method === 'receipt'
                ? '사진을 분석한 뒤 저장할 거래 후보를 먼저 확인합니다.'
                : '카드 문자나 거래 내역을 붙여 넣고 후보를 확인합니다.'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-[var(--wl-color-text-body)]">기준 날짜</p>
          <DatePicker
            ariaLabel="가져오기 기준 날짜"
            className="mt-2 w-full"
            onChange={onTransactionDateChange}
            value={transactionDate}
          />
        </div>

        {method === 'receipt' ? (
          <label className="mt-4 block text-sm font-semibold text-[var(--wl-color-text-body)]">
            영수증 사진
            <input
              accept="image/png,image/jpeg"
              className="mt-2 block w-full text-sm text-[var(--wl-color-text-secondary)] file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[var(--wl-color-primary)] file:px-4 file:text-sm file:font-bold file:text-white"
              multiple
              onChange={handleImageChange}
              type="file"
            />
            <span className="mt-2 block text-xs font-medium text-[var(--wl-color-text-secondary)]">
              PNG·JPG, 최대 10장{selectedImageCount ? ` · ${selectedImageCount}장 선택됨` : ''}
            </span>
          </label>
        ) : (
          <form className="mt-4" onSubmit={handleTextPreview}>
            <label className="block text-sm font-semibold text-[var(--wl-color-text-body)]">
              거래 내역 텍스트
              <textarea
                className="mt-2 min-h-36 w-full rounded-xl border p-3 text-base"
                onChange={(event) => setText(event.target.value)}
                placeholder={'예: 07/23 스타벅스 5,500원\n07/24 마트 38,000원'}
                value={text}
              />
            </label>
            <button
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:bg-slate-300"
              disabled={!text.trim() || previewPending}
              type="submit"
            >
              <ScanText aria-hidden="true" size={18} />
              {previewMutation.isPending ? '분석 중' : '거래 후보 확인'}
            </button>
          </form>
        )}

        {imagePreviewMutation.isPending ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[var(--wl-color-primary-dark)]" role="status">
            선택한 이미지를 분석하고 있습니다.
          </p>
        ) : null}
        {previewError ? (
          <p className="mt-3 rounded-xl bg-[var(--wl-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--wl-color-danger)]" role="alert">
            거래 후보를 만들지 못했습니다. 입력 내용과 파일 형식을 확인해주세요.
          </p>
        ) : null}
      </div>

      {previewResult ? (
        <section aria-labelledby="import-candidates-title" className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold" id="import-candidates-title">거래 후보</h3>
              <p className="mt-1 text-xs font-medium text-[var(--wl-color-text-secondary)]">
                저장 전 금액, 날짜와 카테고리를 확인하세요.
              </p>
            </div>
            <span className="text-xs font-bold text-[var(--wl-color-text-secondary)]">
              {selectedCandidates.length}/{candidates.length}건 선택
            </span>
          </div>

          <div className="mt-3 divide-y divide-[var(--wl-color-border)] border-y border-[var(--wl-color-border)]">
            {candidates.map((candidate) => (
              <fieldset className="py-4" disabled={saveImportMutation.isPending} key={candidate.id}>
                <label className="flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--wl-color-text-main)]">
                  <input
                    checked={candidate.selected}
                    className="size-5 accent-[var(--wl-color-primary)]"
                    onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })}
                    type="checkbox"
                  />
                  저장할 거래에 포함
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                    유형
                    <select
                      className="mt-1 h-11 w-full px-3 text-sm"
                      onChange={(event) => updateCandidate(candidate.id, {
                        type: event.target.value as TransactionType,
                        categoryId: null,
                      })}
                      value={candidate.type}
                    >
                      <option value="EXPENSE">지출</option>
                      <option value="INCOME">수입</option>
                    </select>
                  </label>
                  <div className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                    <p>날짜</p>
                    <DatePicker
                      ariaLabel={`${candidate.id} 날짜`}
                      className="mt-1 w-full"
                      onChange={(date) => updateCandidate(candidate.id, { transactionDate: date })}
                      value={candidate.transactionDate}
                    />
                  </div>
                  <label className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                    금액
                    <input
                      className="mt-1 h-11 w-full px-3 text-sm"
                      min="1"
                      onChange={(event) => updateCandidate(candidate.id, { amount: Number(event.target.value) })}
                      required
                      type="number"
                      value={candidate.amount}
                    />
                  </label>
                  <label className="text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                    카테고리
                    <select
                      className="mt-1 h-11 w-full px-3 text-sm"
                      onChange={(event) => updateCandidate(candidate.id, { categoryId: Number(event.target.value) || null })}
                      value={candidate.categoryId ?? ''}
                    >
                      <option value="">미분류</option>
                      {categoriesQuery.data
                        ?.filter((category) => category.type === candidate.type)
                        .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[var(--wl-color-text-secondary)] sm:col-span-2">
                    메모
                    <input
                      className="mt-1 h-11 w-full px-3 text-sm"
                      onChange={(event) => updateCandidate(candidate.id, { memo: event.target.value })}
                      value={candidate.memo}
                    />
                  </label>
                </div>
              </fieldset>
            ))}
          </div>

          {!candidates.length ? (
            <p className="py-6 text-center text-sm font-medium text-[var(--wl-color-text-secondary)]">
              저장할 수 있는 거래 후보가 없습니다.
            </p>
          ) : null}
          {saveImportMutation.isError ? (
            <p className="mt-3 text-sm font-semibold text-[var(--wl-color-danger)]" role="alert">
              선택한 거래를 저장하지 못했습니다. 입력값을 다시 확인해주세요.
            </p>
          ) : null}
          <button
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] text-base font-bold text-white disabled:bg-slate-300"
            disabled={!selectedCandidates.length || saveImportMutation.isPending}
            onClick={handleSaveSelected}
            type="button"
          >
            <Save aria-hidden="true" size={18} />
            {saveImportMutation.isPending ? '저장 중' : `선택 ${selectedCandidates.length}건 저장`}
          </button>
        </section>
      ) : null}
    </div>
  )
}
