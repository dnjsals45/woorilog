import { useEffect, useMemo, useRef, useState } from 'react'
import { useMeQuery } from '../../auth/model/authQueries'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import type { BudgetSource } from '../../transaction/api/transactionApi'
import type { ImportSessionCandidate, ImportSourceType, SaveImportSessionCandidate } from '../api/transactionImportApi'
import { useImportSessionPreviewMutation, useSaveImportSessionMutation } from '../model/transactionImportQueries'
import { formatWon } from '../../../shared/lib/money'
import { Button } from '../../../shared/ui/Button'
import { Icon } from '../../../shared/ui/Icon'
import { Toast } from '../../../shared/ui/Toast'

/** 이미지로 거래를 일괄 가져오는 중앙 모달 — 사진 선택 → 인식 → 검토·일괄 수정 → 저장 (이미지 업로드.dc.html). */
export interface TransactionImportModalProps {
  open: boolean
  onClose: () => void
}

type ImportStage = 'pick' | 'scanning' | 'review'
type ImportFilter = 'all' | 'selected' | 'dup' | 'uncat'

/** 업로드 중인 이미지 한 장과, 그 이미지에서 인식할 소스 타입. 영수증·카드 앱 캡처를 한
 * 드롭존에 섞어 올리는 전제라 이미지마다 따로 고를 수 있다. */
type PickedFile = { file: File; sourceType: ImportSourceType }

const SOURCE_TYPE_LABEL: Record<ImportSourceType, string> = {
  RECEIPT: '영수증',
  CARD_APP_SCREENSHOT: '카드 앱 캡처',
}

type ImportRow = {
  id: number
  occurredOn: string
  merchant: string
  amount: number
  categoryId: number | null
  budgetSource: BudgetSource | null
  duplicateSuspected: boolean
  duplicateTransactionId: number | null
  sourceType: ImportSourceType
  selected: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

function toRow(candidate: ImportSessionCandidate, ownerUserId: number | undefined): ImportRow {
  return {
    id: candidate.candidateId,
    occurredOn: candidate.occurredOn,
    merchant: candidate.merchant,
    amount: candidate.amount,
    categoryId: candidate.suggestedCategoryId,
    budgetSource: candidate.defaultBudgetSource ?? (ownerUserId ? { type: 'PERSONAL', ownerUserId } : null),
    duplicateSuspected: candidate.duplicateSuspected,
    duplicateTransactionId: candidate.duplicateTransactionId,
    sourceType: candidate.sourceType,
    selected: candidate.selectedByDefault,
  }
}

function toSaveCandidate(row: ImportRow): SaveImportSessionCandidate {
  return {
    candidateId: row.id,
    amount: row.amount,
    occurredOn: row.occurredOn,
    merchant: row.merchant,
    categoryId: row.categoryId,
    budgetSource: row.budgetSource,
    selected: row.selected,
  }
}

export function TransactionImportModal({ open, onClose }: TransactionImportModalProps) {
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const ownerUserId = me.data?.user.id
  const categories = useCategoriesQuery(ledgerId)
  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === 'EXPENSE').sort((a, b) => a.sortOrder - b.sortOrder),
    [categories.data],
  )

  const preview = useImportSessionPreviewMutation(ledgerId)
  const save = useSaveImportSessionMutation(ledgerId)

  const [files, setFiles] = useState<PickedFile[]>([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [filter, setFilter] = useState<ImportFilter>('all')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)

  // 모달을 다시 열 때마다(닫힘 → 열림 전환) 지난 세션을 지우고 새로 시작합니다.
  // 렌더 중 이전 prop과 비교해 상태를 조정하는 방식이라 별도 effect가 필요 없습니다.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setFiles([])
      setIsReviewing(false)
      setRows([])
      setFilter('all')
      setToast('')
    }
  }

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

  if (!open) return null

  const stage: ImportStage = preview.isPending ? 'scanning' : isReviewing ? 'review' : 'pick'
  const dupCount = rows.filter((row) => row.duplicateSuspected).length
  const uncatCount = rows.filter((row) => row.categoryId == null).length
  const selectedRows = rows.filter((row) => row.selected)
  const noneSelected = selectedRows.length === 0
  const selectedSum = selectedRows.reduce((sum, row) => sum + Math.abs(row.amount), 0)
  const allSelected = rows.length > 0 && selectedRows.length === rows.length
  const visibleRows = rows.filter((row) => {
    if (filter === 'selected') return row.selected
    if (filter === 'dup') return row.duplicateSuspected
    if (filter === 'uncat') return row.categoryId == null
    return true
  })

  const filters: Array<{ id: ImportFilter; label: string }> = [
    { id: 'all', label: `전체 ${rows.length}` },
    { id: 'selected', label: `저장 대상 ${selectedRows.length}` },
    { id: 'dup', label: `중복 의심 ${dupCount}` },
    { id: 'uncat', label: `미분류 ${uncatCount}` },
  ]

  function addFiles(list: FileList | File[]) {
    const next = Array.from(list)
    if (!next.length) return
    setFiles((current) => [...current, ...next.map((file) => ({ file, sourceType: 'RECEIPT' as ImportSourceType }))])
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  function setFileSourceType(index: number, sourceType: ImportSourceType) {
    setFiles((current) => current.map((picked, i) => (i === index ? { ...picked, sourceType } : picked)))
  }

  function patchRow(id: number, patch: Partial<ImportRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function bulkPatch(patch: Partial<ImportRow>) {
    setRows((current) => current.map((row) => (row.selected ? { ...row, ...patch } : row)))
  }

  function toggleAll() {
    setRows((current) => {
      const nextSelected = !current.every((row) => row.selected)
      return current.map((row) => ({ ...row, selected: nextSelected }))
    })
  }

  function startScan() {
    if (!ledgerId || files.length === 0) return
    preview.mutate(
      files.map(({ file, sourceType }) => ({ image: file, sourceType })),
      {
        onSuccess: (data) => {
          setRows(data.candidates.map((candidate) => toRow(candidate, ownerUserId)))
          setIsReviewing(true)
          setFilter('all')
        },
      },
    )
  }

  function resetToPick() {
    setIsReviewing(false)
    setFiles([])
    setRows([])
    setFilter('all')
    preview.reset()
    save.reset()
  }

  function saveBatch() {
    if (!preview.data) return
    const count = selectedRows.length
    save.mutate(
      { sessionId: preview.data.sessionId, candidates: rows.map(toSaveCandidate) },
      {
        onSuccess: () => {
          window.clearTimeout(toastTimerRef.current)
          setToast(`${count}건을 저장했어요`)
          toastTimerRef.current = window.setTimeout(() => setToast(''), 3500)
        },
      },
    )
  }

  const title = isReviewing ? '가져온 거래 검토' : '이미지로 거래 가져오기'
  const subtitle = isReviewing
    ? `이미지 ${files.length}장에서 거래 ${rows.length}건을 찾았어요. 중복 의심 ${dupCount}건은 선택에서 빼 두었어요.`
    : '영수증 사진이나 카드 앱 사용 내역 캡처를 여러 장 올려요.'

  return (
    <div
      className="wl-import-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section
        aria-label="이미지로 거래 가져오기"
        aria-modal="true"
        className={`wl-import-panel ${stage === 'review' ? 'wl-import-panel--review' : ''}`}
        role="dialog"
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flex: 'none', padding: '22px 22px 0' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h2>
            <p style={{ margin: '5px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--wl-color-text-secondary)' }}>{subtitle}</p>
          </div>
          <button aria-label="닫기" className="wl-icon-button wl-icon-button--subtle" onClick={onClose} style={{ flex: 'none' }} type="button">
            <Icon name="x" size="md" />
          </button>
        </header>

        {stage === 'pick' ? (
          <div style={{ padding: '18px 22px 22px' }}>
            <input
              accept="image/png,image/jpeg,image/heic"
              className="sr-only"
              multiple
              onChange={(event) => {
                addFiles(event.target.files ?? [])
                event.target.value = ''
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="wl-import-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                addFiles(event.dataTransfer.files)
              }}
              type="button"
            >
              <Icon name="camera" size="lg" />
              <strong style={{ fontSize: 15, fontWeight: 700 }}>사진을 끌어다 놓거나 눌러서 올려요</strong>
              <span style={{ fontSize: 12.5 }}>JPG, PNG, HEIC를 지원해요</span>
            </button>

            {files.length ? (
              <ul style={{ display: 'grid', gap: 8, margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
                {files.map(({ file, sourceType }, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px minmax(0,1fr) 44px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      border: '1px solid var(--wl-color-border)',
                      borderRadius: 'var(--wl-radius-md)',
                    }}
                  >
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'var(--wl-color-primary-soft)',
                        color: 'var(--wl-color-primary-dark)',
                      }}
                    >
                      <Icon name="receipt" size="md" />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </strong>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>
                        {formatFileSize(file.size)}
                      </span>
                      <span aria-label="이미지 종류" role="group" style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                        {(Object.keys(SOURCE_TYPE_LABEL) as ImportSourceType[]).map((option) => (
                          <button
                            aria-selected={sourceType === option}
                            className="wl-import-filter"
                            key={option}
                            onClick={() => setFileSourceType(index, option)}
                            role="tab"
                            type="button"
                          >
                            {SOURCE_TYPE_LABEL[option]}
                          </button>
                        ))}
                      </span>
                    </span>
                    <button
                      aria-label="이 사진 빼기"
                      className="wl-icon-button wl-icon-button--subtle"
                      onClick={() => removeFile(index)}
                      type="button"
                    >
                      <Icon name="x" size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {preview.isError ? (
              <p className="wl-field-error" role="alert" style={{ marginTop: 16 }}>
                <Icon name="circle-alert" size="sm" />
                이미지를 인식하지 못했어요. 다시 시도해주세요.
              </p>
            ) : (
              <p style={{ margin: '16px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                인식한 결과는 바로 저장하지 않아요. 다음 단계에서 확인하고 저장할 거래를 골라요.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Button fullWidth onClick={onClose} size="lg" variant="secondary">
                취소
              </Button>
              <Button disabled={files.length === 0} fullWidth onClick={startScan} size="lg">
                {files.length ? `사진 ${files.length}장 가져오기` : '가져오기'}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === 'scanning' ? (
          <div style={{ padding: '26px 22px 30px' }}>
            <div className="wl-import-scan-track">
              <span className="wl-import-scan-bar" />
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>
              사진 {files.length}장에서 거래를 찾고 있어요. 잠시만 기다려 주세요.
            </p>
          </div>
        ) : null}

        {stage === 'review' ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 316px',
              gridTemplateRows: 'minmax(0,1fr)',
              gap: 20,
              padding: '18px 22px 22px',
            }}
          >
            <div
              style={{
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--wl-color-border)',
                borderRadius: 'var(--wl-radius-lg)',
                background: 'var(--wl-color-surface)',
                overflow: 'hidden',
              }}
            >
              <div aria-label="후보 필터" role="tablist" style={{ flex: 'none', display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--wl-color-border)' }}>
                {filters.map((f) => (
                  <button
                    aria-selected={filter === f.id}
                    className="wl-import-filter"
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    role="tab"
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  flex: 'none',
                  display: 'grid',
                  gridTemplateColumns: '40px 92px minmax(120px,1fr) 136px 116px 112px',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 16px',
                  minHeight: 48,
                  borderBottom: '1px solid var(--wl-color-border)',
                  background: 'var(--wl-color-surface-subtle)',
                }}
              >
                <button
                  aria-label="모두 선택"
                  className={`wl-import-check ${allSelected ? 'wl-import-check--on' : ''}`}
                  onClick={toggleAll}
                  type="button"
                >
                  {allSelected ? <Icon name="check" size="sm" /> : null}
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}>날짜</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}>사용처</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}>카테고리</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}>차감 예산</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wl-color-text-secondary)', textAlign: 'right' }}>금액</span>
              </div>

              {rows.length === 0 ? (
                <p style={{ flex: 1, display: 'grid', placeItems: 'center', margin: 0, fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>
                  확인할 수 있는 거래 후보가 없어요.
                </p>
              ) : (
                <ul style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
                  {visibleRows.map((row) => (
                    <li className={`wl-import-row ${row.duplicateSuspected ? 'wl-import-row--dup' : ''}`} key={row.id}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 92px minmax(120px,1fr) 136px 116px 112px',
                          alignItems: 'center',
                          gap: 10,
                          padding: '0 16px',
                          minHeight: 62,
                        }}
                      >
                        <button
                          aria-label="이 거래 선택"
                          aria-pressed={row.selected}
                          className={`wl-import-check ${row.selected ? 'wl-import-check--on' : ''}`}
                          onClick={() => patchRow(row.id, { selected: !row.selected })}
                          type="button"
                        >
                          {row.selected ? <Icon name="check" size="sm" /> : null}
                        </button>
                        <input
                          aria-label="거래 날짜"
                          className="wl-import-cell-input wl-tabular"
                          onChange={(event) => patchRow(row.id, { occurredOn: event.target.value })}
                          type="date"
                          value={row.occurredOn}
                        />
                        <input
                          aria-label="사용처"
                          className="wl-import-cell-input"
                          onChange={(event) => patchRow(row.id, { merchant: event.target.value })}
                          style={{ fontWeight: 600, fontSize: 14 }}
                          type="text"
                          value={row.merchant}
                        />
                        <select
                          aria-label="카테고리"
                          className={`wl-import-select ${row.categoryId == null ? 'wl-import-select--uncat' : ''}`}
                          onChange={(event) => patchRow(row.id, { categoryId: event.target.value ? Number(event.target.value) : null })}
                          value={row.categoryId ?? ''}
                        >
                          <option value="">미분류</option>
                          {expenseCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="차감 예산"
                          className="wl-import-select"
                          onChange={(event) =>
                            patchRow(row.id, {
                              budgetSource:
                                event.target.value === 'SHARED'
                                  ? { type: 'SHARED', ownerUserId: null }
                                  : { type: 'PERSONAL', ownerUserId: ownerUserId ?? null },
                            })
                          }
                          value={row.budgetSource?.type ?? 'PERSONAL'}
                        >
                          <option value="SHARED">공동</option>
                          <option value="PERSONAL">내 예산</option>
                        </select>
                        <strong className="wl-tabular" style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {formatWon(-Math.abs(row.amount))}
                        </strong>
                      </div>
                      {row.duplicateTransactionId != null ? (
                        <p style={{ margin: 0, padding: '0 16px 12px 66px', fontSize: 12, lineHeight: 1.5, color: 'var(--wl-color-danger)' }}>
                          이미 저장된 거래와 날짜·금액·사용처가 같아요. 정상 결제라면 선택해서 저장해 주세요.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {preview.data && preview.data.omittedCount > 0 ? (
                <p
                  style={{
                    flex: 'none',
                    margin: 0,
                    padding: '11px 16px',
                    borderTop: '1px solid var(--wl-color-border)',
                    background: 'var(--wl-color-surface-subtle)',
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: 'var(--wl-color-text-secondary)',
                  }}
                >
                  정보가 부족한 {preview.data.omittedCount}건은 후보에서 제외했어요. 더 선명한 사진으로 다시 올리면 인식률이 올라가요.
                </p>
              ) : null}
            </div>

            <aside style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              <section style={{ flex: 'none', padding: 18, border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-lg)', background: 'var(--wl-color-surface)' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-.015em' }}>저장할 거래</h3>
                <strong className="wl-tabular" style={{ display: 'block', marginTop: 10, fontSize: 28, fontWeight: 800, letterSpacing: '-.03em' }}>
                  {selectedRows.length}건
                </strong>
                <p className="wl-tabular" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                  합계 {formatWon(selectedSum)}
                </p>
                <div style={{ display: 'grid', gap: 9, marginTop: 16 }}>
                  <Button disabled={noneSelected || save.isPending} fullWidth loading={save.isPending} onClick={saveBatch} size="lg">
                    {noneSelected ? '저장' : `${selectedRows.length}건 저장`}
                  </Button>
                  <Button fullWidth onClick={resetToPick} size="lg" variant="secondary">
                    다시 올리기
                  </Button>
                </div>
                {save.isError ? (
                  <p className="wl-field-error" role="alert" style={{ marginTop: 10 }}>
                    <Icon name="circle-alert" size="sm" />
                    저장하지 못했어요. 다시 시도해주세요.
                  </p>
                ) : null}
              </section>

              <section style={{ flex: 'none', padding: 18, border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-lg)', background: 'var(--wl-color-surface)' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-.015em' }}>선택한 거래 한번에 바꾸기</h3>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--wl-color-text-secondary)' }}>
                  {noneSelected ? '먼저 왼쪽에서 거래를 선택해 주세요.' : `선택한 ${selectedRows.length}건에 한번에 적용해요.`}
                </p>

                <span style={{ display: 'block', margin: '14px 0 8px', fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>차감 예산</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="wl-import-pill"
                    disabled={noneSelected}
                    onClick={() => bulkPatch({ budgetSource: { type: 'SHARED', ownerUserId: null } })}
                    type="button"
                  >
                    공동
                  </button>
                  <button
                    className="wl-import-pill"
                    disabled={noneSelected}
                    onClick={() => bulkPatch({ budgetSource: { type: 'PERSONAL', ownerUserId: ownerUserId ?? null } })}
                    type="button"
                  >
                    내 예산
                  </button>
                </div>

                <span style={{ display: 'block', margin: '14px 0 8px', fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-body)' }}>카테고리</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {expenseCategories.length === 0 ? (
                    <span style={{ fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>등록된 카테고리가 없어요.</span>
                  ) : (
                    expenseCategories.slice(0, 6).map((category) => (
                      <button
                        className="wl-import-pill"
                        disabled={noneSelected}
                        key={category.id}
                        onClick={() => bulkPatch({ categoryId: category.id })}
                        type="button"
                      >
                        {category.name}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </section>

      {toast ? (
        <div className="wl-import-toast">
          <Toast tone="success">{toast}</Toast>
        </div>
      ) : null}
    </div>
  )
}
