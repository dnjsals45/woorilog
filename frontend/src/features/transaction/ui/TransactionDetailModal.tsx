import { useEffect, useState } from 'react'
import { useMeQuery } from '../../auth/model/authQueries'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import type { BudgetSource } from '../api/transactionApi'
import { useDeleteTransactionMutation, useTransactionQuery, useUpdateV1TransactionMutation } from '../model/transactionQueries'
import { ApiClientError } from '../../../shared/api/client'
import { useIsMobileShell } from '../../../shared/lib/useIsMobileShell'
import { Icon } from '../../../shared/ui/Icon'
import { useBodyScrollLock } from '../../../shared/ui/useBodyScrollLock'
import { useSheetDrag } from '../../../shared/ui/useSheetDrag'
import { TransactionForm, type TransactionFormInitialValues, type TransactionFormValues } from './TransactionForm'

export interface TransactionDetailModalProps {
  transactionId: number
  onClose: () => void
  /** 저장에 성공하면 모달을 닫고 토스트를 보여주기 위해 호출됩니다. */
  onSaved: () => void
  /** 삭제에 성공하면 모달을 닫고 토스트를 보여주기 위해 호출됩니다. */
  onDeleted: () => void
}

/**
 * 거래 상세 모달 — 디자인 `가계부.dc.html`의 상세 다이얼로그.
 * 필드는 거래 추가와 같은 TransactionForm(mode="edit")을 그대로 쓰고,
 * 푸터만 "미저장 변경 SaveBar + 별도 삭제 버튼" 모양이라 renderFooter로 갈아 끼웁니다.
 *
 * 공유 Modal 컴포넌트를 쓰지 않는 이유: Modal은 패널 전체에 고정 padding을 주는데,
 * 이 화면은 스크롤 본문과 별개로 padding 없는 sticky 푸터(SaveBar 자리)가 필요합니다.
 * 같은 이유로 거래 추가 드로어(TransactionAddDrawer)도 공유 Modal 대신 직접 만든 패널을 씁니다.
 */
export function TransactionDetailModal({ transactionId, onClose, onSaved, onDeleted }: TransactionDetailModalProps) {
  const meQuery = useMeQuery()
  const transactionQuery = useTransactionQuery(transactionId)
  const ledgerId = transactionQuery.data?.ledgerId ?? meQuery.data?.currentLedger.id
  const isSharedLedger = meQuery.data?.currentLedger.type === 'GROUP' || meQuery.data?.currentLedger.type === 'SHARED'
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const updateMutation = useUpdateV1TransactionMutation(transactionId)
  const deleteMutation = useDeleteTransactionMutation(transactionId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  /* 모바일에서 이 패널은 바텀시트가 됩니다(patterns/mobile-shell.css).
   * 손잡이로 끌어 닫는 제스처와 뒤 화면 스크롤 잠금은 공유 시트와 같은 것을 씁니다. */
  const isMobile = useIsMobileShell()
  const { panelRef, stateClass, gripProps } = useSheetDrag(isMobile ? onClose : undefined)
  useBodyScrollLock(true)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const transaction = transactionQuery.data
  const canDelete = transaction?.payer.id === meQuery.data?.user.id
  const scopeType = transaction?.scope?.type ?? transaction?.budgetSource?.type ?? 'SHARED'
  const editedNote =
    scopeType === 'SHARED' ? '공동 예산 거래예요. 두 사람 모두 수정할 수 있어요.' : '내 예산 거래예요. 나만 수정할 수 있어요.'
  const submitError =
    updateMutation.error instanceof ApiClientError ? updateMutation.error.message : updateMutation.isError ? '거래를 수정하지 못했습니다. 마감 여부와 입력값을 확인해주세요.' : null
  const deleteErrorMessage =
    deleteMutation.error instanceof ApiClientError ? deleteMutation.error.message : '거래를 삭제하지 못했습니다. 다시 시도해주세요.'

  function handleSubmit(values: TransactionFormValues) {
    if (!transaction || !meQuery.data) return
    const budgetExpense = values.type === 'EXPENSE' || (values.type === 'TRANSFER' && values.transferType === 'OUTBOUND')
    const source: BudgetSource = {
      type: values.budgetSourceType,
      ownerUserId: values.budgetSourceType === 'PERSONAL' ? meQuery.data.user.id : null,
    }
    updateMutation.mutate(
      {
        type: values.type,
        transferType: values.type === 'TRANSFER' ? values.transferType : null,
        amount: values.amount,
        occurredOn: values.occurredOn,
        merchant: values.merchant,
        categoryId: values.categoryId,
        memo: values.memo || null,
        scope: source,
        budgetSource: budgetExpense ? source : null,
        payerUserId: transaction.payer.id,
        // 백엔드는 이미 확정된 거래를 할부로 바꾸는 것을 막습니다("기존 거래를 할부 거래로 변경할 수 없습니다").
        // TransactionForm은 카드 결제일 때 할부 칩을 계속 보여주지만(재사용 제약), 상세 수정에서는 항상 무시합니다.
        installment: null,
        paymentMethod: values.paymentMethod,
        cardId: values.cardId,
        occurredAt: transaction.occurredAt ?? null,
        // 상대방에게 보일지 여부는 이 모달에 토글 필드가 없어 기존 값을 그대로 유지합니다.
        sharedWithPartner: transaction.sharedWithPartner ?? null,
      },
      { onSuccess: onSaved },
    )
  }

  if (!transaction || !ledgerId) {
    return (
      <div className="wl-modal-scrim" onClick={onClose} role="presentation">
        <div
          aria-label="거래 상세"
          aria-modal="true"
          className="wl-modal-panel"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          style={{ width: 'min(560px,100%)', padding: 28 }}
        >
          {transactionQuery.isError ? (
            <p className="wl-body" role="alert">
              거래를 불러오지 못했습니다.
            </p>
          ) : (
            <p className="wl-body">거래를 불러오는 중입니다.</p>
          )}
        </div>
      </div>
    )
  }

  const initialValues: TransactionFormInitialValues = {
    type: transaction.type,
    transferType: transaction.transferType ?? null,
    amount: transaction.amount,
    merchant: transaction.merchant ?? '',
    categoryId: transaction.category?.id ?? null,
    occurredOn: transaction.transactionDate,
    budgetSourceType: scopeType,
    paymentMethod: {
      type:
        (typeof transaction.paymentMethod === 'string' ? transaction.paymentMethod : transaction.paymentMethod?.type) ??
        transaction.legacyPaymentMethod ??
        'CASH',
      displayName: (typeof transaction.paymentMethod === 'object' ? transaction.paymentMethod?.displayName : undefined) ?? transaction.card?.name ?? null,
    },
    /* 백엔드가 수정 시 할부 전환을 막고 있어 저장에는 쓰이지 않지만(위 installment: null),
     * 기존 할부 조건은 화면에 보여줄 수 있도록 채웁니다. */
    installment: transaction.installment
      ? { months: transaction.installment.totalCount, monthlyInterest: transaction.installment.monthlyInterest ?? 0 }
      : null,
    memo: transaction.memo ?? '',
    repeat: false,
    fixedCost: false,
  }

  return (
    <div className="wl-modal-scrim" onClick={onClose} role="presentation">
      <div
        aria-label="거래 상세"
        aria-modal="true"
        className={`wl-modal-panel${stateClass}`}
        onClick={(event) => event.stopPropagation()}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 'min(560px,100%)',
          maxHeight: isMobile ? '88dvh' : 'calc(100vh - 48px)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {isMobile ? <div aria-hidden="true" className="wl-sheet-grip" {...gripProps} /> : null}
        <header
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: isMobile ? '4px 16px 14px 22px' : '18px 22px',
            borderBottom: '1px solid var(--wl-color-border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-.015em' }}>거래 상세</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--wl-color-text-secondary)' }}>{editedNote}</p>
          </div>
          <button
            aria-label="닫기"
            className="wl-icon-button wl-icon-button--subtle"
            onClick={onClose}
            style={{ width: isMobile ? 40 : 34, height: isMobile ? 40 : 34, flex: 'none' }}
            type="button"
          >
            <Icon name="x" size="md" />
          </button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TransactionForm
            categories={categoriesQuery.data ?? []}
            initialValues={initialValues}
            isSharedLedger={Boolean(isSharedLedger)}
            key={transaction.id}
            ledgerId={ledgerId}
            mode="edit"
            onSubmit={handleSubmit}
            renderFooter={({ dirty, submitting, submit, reset }) => (
              <>
                <div style={{ padding: '0 22px 18px', borderTop: '1px solid var(--wl-color-border)', marginTop: 4, paddingTop: 14 }}>
                  {confirmDelete ? (
                    <div
                      data-anim
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        padding: 14,
                        border: '1px solid var(--wl-color-danger)',
                        borderRadius: 'var(--wl-radius-md)',
                        background: 'var(--wl-danger-soft)',
                      }}
                    >
                      <span style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-body)', wordBreak: 'keep-all' }}>
                        삭제하면 이 거래가 쓴 예산이 바로 되돌아가요. 삭제 기록은 남지 않아요.
                      </span>
                      <span style={{ display: 'flex', gap: 8, flex: 'none' }}>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          style={{ minHeight: 40, padding: '0 12px', borderRadius: 11, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
                          type="button"
                        >
                          그대로 두기
                        </button>
                        <button
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(undefined, { onSuccess: onDeleted })}
                          style={{
                            minHeight: 40,
                            padding: '0 14px',
                            borderRadius: 11,
                            background: 'var(--wl-color-danger)',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                          type="button"
                        >
                          {deleteMutation.isPending ? '삭제 중' : '삭제'}
                        </button>
                      </span>
                    </div>
                  ) : canDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        minHeight: 44,
                        marginLeft: -12,
                        padding: '0 12px',
                        borderRadius: 12,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: 'var(--wl-color-danger)',
                      }}
                      type="button"
                    >
                      이 거래 삭제
                    </button>
                  ) : null}
                  {deleteMutation.isError ? (
                    <p className="wl-field-error" role="alert" style={{ marginTop: 8 }}>
                      <Icon name="circle-alert" size="sm" />
                      {deleteErrorMessage}
                    </p>
                  ) : null}
                  {submitError ? (
                    <p className="wl-field-error" role="alert" style={{ marginTop: 8 }}>
                      <Icon name="circle-alert" size="sm" />
                      {submitError}
                    </p>
                  ) : null}
                </div>

                {dirty ? (
                  <div
                    data-anim
                    style={{
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      /* 모바일에서는 시트 아래쪽이 홈 인디케이터에 닿습니다. */
                      padding: isMobile ? '13px 16px calc(13px + env(safe-area-inset-bottom, 0px))' : '13px 22px',
                      borderTop: '1px solid var(--wl-color-border)',
                      background: 'var(--wl-color-surface)',
                      boxShadow: '0 -10px 26px -20px rgb(24 32 29 / 40%)',
                      animation: 'wl-bar-in 220ms var(--ease-out-strong) both',
                    }}
                  >
                    <span style={{ minWidth: 0, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>바꾼 내용을 저장할까요?</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                      <button
                        onClick={reset}
                        style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
                        type="button"
                      >
                        되돌리기
                      </button>
                      <button
                        className="wl-button wl-button--primary"
                        disabled={submitting}
                        onClick={submit}
                        style={{ minHeight: 44, padding: '0 18px' }}
                        type="button"
                      >
                        {submitting ? '저장 중...' : '변경 저장'}
                      </button>
                    </span>
                  </div>
                ) : null}
              </>
            )}
            submitting={updateMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
