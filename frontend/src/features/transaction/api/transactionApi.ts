import { apiRequest } from '../../../shared/api/client'

export type TransactionType = 'EXPENSE' | 'INCOME'
export type PaymentMethod = 'CASH' | 'CARD'

export type UserSummary = {
  id: number
  nickname: string
}

export type TransactionCategorySummary = {
  id: number
  name: string
  type: TransactionType
}

export type TransactionSummary = {
  id: number
  ledgerId: number
  type: TransactionType
  amount: number
  transactionDate: string
  category: TransactionCategorySummary | null
  payer: UserSummary
  memo: string | null
  paymentMethod: PaymentMethod
  card: {
    id: number
    name: string
  } | null
  installment: {
    planId: string
    sequence: number
    totalCount: number
  } | null
}

export type TransactionListResponse = {
  budgetMonth: string
  transactions: TransactionSummary[]
}

export type SaveTransactionRequest = {
  type: TransactionType
  amount: number
  transactionDate: string
  categoryId?: number | null
  memo?: string | null
  payerUserId?: number | null
  installmentMonths?: number | null
  paymentMethod?: PaymentMethod | null
  cardId?: number | null
}

export type QuickTransactionRequest = {
  text: string
  transactionDate?: string
}

export async function getMonthTransactions(ledgerId: number, budgetMonth: string) {
  const transactions = await apiRequest<TransactionSummary[]>(
    `/api/ledgers/${ledgerId}/months/${budgetMonth}/transactions`,
  )

  return {
    budgetMonth,
    transactions,
  }
}

export function getTransaction(transactionId: number) {
  return apiRequest<TransactionSummary>(`/api/transactions/${transactionId}`)
}

export function createTransaction(
  ledgerId: number,
  request: SaveTransactionRequest,
) {
  return apiRequest<TransactionSummary>(`/api/ledgers/${ledgerId}/transactions`, {
    method: 'POST',
    body: request,
  })
}

export function createQuickTransaction(
  ledgerId: number,
  request: QuickTransactionRequest,
) {
  return apiRequest<TransactionSummary>(
    `/api/ledgers/${ledgerId}/quick-transactions`,
    {
      method: 'POST',
      body: request,
    },
  )
}

export function updateTransaction(
  transactionId: number,
  request: SaveTransactionRequest,
) {
  return apiRequest<TransactionSummary>(`/api/transactions/${transactionId}`, {
    method: 'PUT',
    body: request,
  })
}

export function deleteTransaction(transactionId: number) {
  return apiRequest<void>(`/api/transactions/${transactionId}`, { method: 'DELETE' })
}

export function bulkDeleteTransactions(transactionIds: number[]) {
  return apiRequest<void>('/api/transactions/bulk-delete', {
    method: 'POST',
    body: { transactionIds },
  })
}
