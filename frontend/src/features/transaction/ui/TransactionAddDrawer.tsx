import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMeQuery } from '../../auth/model/authQueries'
import { useCategoriesQuery } from '../../category/model/categoryQueries'
import { useCreateRecurringExpensePlanMutation, useScheduledPlanActionMutation } from '../../scheduled/model/scheduledPlanQueries'
import type { BudgetSource } from '../api/transactionApi'
import { useCreateV1TransactionMutation, useDeleteTransactionMutation } from '../model/transactionQueries'
import { formatDateInput } from '../../../shared/lib/date'
import { IconButton } from '../../../shared/ui/IconButton'
import { Toast } from '../../../shared/ui/Toast'
import { TransactionForm, type TransactionFormValues } from './TransactionForm'

const TOAST_DURATION_MS = 3500

type LastSaved = { kind: 'transaction'; id: number } | { kind: 'plan'; id: number }

export interface TransactionAddDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * 거래 추가 화면 — 디자인 `거래 추가.dc.html` 이식.
 * 대시보드 등 아무 화면 위에나 뜨는 우측 고정 드로어입니다(앱 셸 사이드바와 무관).
 * "저장 후 계속 입력하기"를 켜면 저장 뒤 금액·사용처·메모만 비우고 드로어를 유지하고,
 * 끄면 저장 뒤 드로어를 닫습니다.
 */
export function TransactionAddDrawer({ open, onClose }: TransactionAddDrawerProps) {
  const me = useMeQuery()
  const ledgerId = me.data?.currentLedger.id
  const isSharedLedger = me.data?.currentLedger.type === 'GROUP' || me.data?.currentLedger.type === 'SHARED'
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const createTransaction = useCreateV1TransactionMutation(ledgerId)
  const createRecurringPlan = useCreateRecurringExpensePlanMutation(ledgerId)
  const deleteTransaction = useDeleteTransactionMutation()
  const deleteScheduledPlan = useScheduledPlanActionMutation('delete')

  const [formKey, setFormKey] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [toast, setToast] = useState('')
  const [lastSaved, setLastSaved] = useState<LastSaved | null>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)
  const panelRef = useRef<HTMLElement>(null)

  // 열릴 때마다 폼을 새로 마운트해서 지난 세션의 입력이 남지 않게 합니다.
  // (effect 대신 렌더 중 이전 값을 비교하는 방식 — React가 권장하는 "필요하지 않은 effect 피하기" 패턴.)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setFormKey((value) => value + 1)
  }

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const items = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]',
    )
    if (!items?.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function showToast(text: string, saved: LastSaved | null) {
    window.clearTimeout(toastTimerRef.current)
    setToast(text)
    setLastSaved(saved)
    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
      setLastSaved(null)
    }, TOAST_DURATION_MS)
  }

  function handleUndo() {
    if (!lastSaved) return
    if (lastSaved.kind === 'transaction') deleteTransaction.mutate(lastSaved.id)
    else deleteScheduledPlan.mutate({ planId: lastSaved.id })
    window.clearTimeout(toastTimerRef.current)
    setToast('')
    setLastSaved(null)
  }

  function handleSubmit(values: TransactionFormValues, { keepOpen }: { keepOpen: boolean }) {
    if (!ledgerId || !me.data) return
    const source: BudgetSource = {
      type: values.budgetSourceType,
      ownerUserId: values.budgetSourceType === 'PERSONAL' ? me.data.user.id : null,
    }
    const budgetExpense = values.type === 'EXPENSE' || (values.type === 'TRANSFER' && values.transferType === 'OUTBOUND')

    if (values.repeat) {
      // V1은 반복 지출만 지원합니다 — TransactionForm이 이미 EXPENSE에서만 repeat을 true로 넘깁니다.
      createRecurringPlan.mutate(
        {
          name: values.merchant,
          amount: values.amount,
          merchant: values.merchant,
          memo: values.memo || null,
          categoryId: values.categoryId!,
          budgetSource: source,
          frequency: 'MONTHLY',
          startDate: values.occurredOn,
          endDate: null,
          isFixedExpense: values.fixedCost,
          paymentMethod: values.paymentMethod,
        },
        {
          onSuccess: (plan) => {
            if (keepOpen) {
              showToast('반복 거래로 저장했어요. 이어서 입력할 수 있어요', { kind: 'plan', id: plan.id })
              setResetSignal((value) => value + 1)
            } else {
              onClose()
            }
          },
        },
      )
      return
    }

    createTransaction.mutate(
      {
        type: values.type,
        transferType: values.type === 'TRANSFER' ? values.transferType : null,
        amount: values.amount,
        merchant: values.merchant,
        occurredOn: values.occurredOn,
        categoryId: values.categoryId,
        memo: values.memo || null,
        scope: source,
        budgetSource: budgetExpense ? source : null,
        paymentMethod: values.paymentMethod,
        cardId: values.cardId,
        installment: values.installment,
      },
      {
        onSuccess: (transaction) => {
          if (keepOpen) {
            showToast('저장했어요. 이어서 입력할 수 있어요', { kind: 'transaction', id: transaction.id })
            setResetSignal((value) => value + 1)
          } else {
            onClose()
          }
        },
      },
    )
  }

  if (!open) return null

  const submitting = createTransaction.isPending || createRecurringPlan.isPending
  const submitError =
    createTransaction.isError || createRecurringPlan.isError ? '필수값과 선택한 예산을 확인해주세요.' : null

  return (
    <>
      <div className="wl-transaction-drawer-scrim" onClick={onClose} role="presentation" />
      <section
        aria-label="거래 추가"
        aria-modal="true"
        className="wl-transaction-drawer-panel"
        onKeyDown={trapFocus}
        ref={panelRef}
        role="dialog"
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '18px 20px',
            borderBottom: '1px solid var(--wl-color-border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>거래 추가</h2>
          <IconButton label="닫기" name="x" onClick={onClose} />
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <TransactionForm
            categories={categoriesQuery.data ?? []}
            initialValues={{ occurredOn: formatDateInput(), budgetSourceType: 'SHARED' }}
            isSharedLedger={Boolean(isSharedLedger)}
            key={formKey}
            ledgerId={ledgerId}
            mode="create"
            onCancel={onClose}
            onSubmit={handleSubmit}
            resetSignal={resetSignal}
            submitError={submitError}
            submitting={submitting}
          />
        </div>
      </section>

      {toast ? (
        <div className="wl-transaction-drawer-toast">
          <Toast action={lastSaved ? { label: '실행 취소', onClick: handleUndo } : undefined} tone="success">
            {toast}
          </Toast>
        </div>
      ) : null}
    </>
  )
}
