import { apiRequest } from '../../../shared/api/client'

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER'
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER'

export type UserSummary = {
  id: number
  nickname: string
}

export type TransactionCategorySummary = {
  id: number
  name: string
  type: TransactionType
  categoryId?: number
  groupCode?: string | null
  groupName?: string | null
  categoryName?: string
}

export type TransactionSummary = {
  id: number
  ledgerId: number
  type: TransactionType
  amount: number
  transactionDate: string
  occurredOn?: string
  category: TransactionCategorySummary | null
  payer: UserSummary
  memo: string | null
  paymentMethod: PaymentMethod | { type: PaymentMethod; displayName?: string | null } | null
  legacyPaymentMethod?: PaymentMethod
  card: {
    id: number
    name: string
  } | null
  installment: {
    planId: string
    sequence: number
    totalCount: number
  } | null
  merchant?: string | null
  transferType?: 'OWN_ACCOUNTS' | 'OUTBOUND' | 'INBOUND' | null
  scope?: BudgetSource | null
  budgetSource?: BudgetSource | null
  sharedWithPartner?: boolean | null
  occurredAt?: string | null
  schedule?: { kind: 'RECURRING_EXPENSE' | 'INSTALLMENT'; planId: number; sequence: number; totalSequences: number | null } | null
  lastModifiedBy?: UserSummary | null
  lastModifiedAt?: string | null
}

export function getTransaction(transactionId: number) {
  return apiRequest<TransactionSummary>(`/api/transactions/${transactionId}`)
}

export function deleteTransaction(transactionId: number) {
  return apiRequest<void>(`/api/transactions/${transactionId}`, { method: 'DELETE' })
}

export type BudgetSource = { type: 'PERSONAL' | 'SHARED'; ownerUserId: number | null }
export type V1TransactionRequest = { type: TransactionType; amount: number; occurredOn: string; merchant: string; categoryId: number | null; memo?: string | null; transferType?: 'OWN_ACCOUNTS' | 'OUTBOUND' | 'INBOUND' | null; scope?: BudgetSource | null; budgetSource?: BudgetSource | null; payerUserId?: number | null; sharedWithPartner?: boolean | null; paymentMethod?: PaymentMethod | { type: PaymentMethod; displayName?: string | null } | null; occurredAt?: string | null; installment?: { months: number; monthlyInterest: number } | null }
export type V1TransactionList = { items: TransactionSummary[]; nextCursor: string | null; unclassifiedCount: number }
export function listTransactions(ledgerId: number, params: { periodStart?: string; query?: string; types?: TransactionType[]; unclassified?: boolean; cursor?: string; limit?: number } = {}) { const q = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined) q.set(key, Array.isArray(value) ? value.join(',') : String(value)) }); return apiRequest<V1TransactionList>(`/api/ledgers/${ledgerId}/transactions${q.size ? `?${q}` : ''}`) }
export function createV1Transaction(ledgerId: number, request: V1TransactionRequest) { return apiRequest<TransactionSummary>(`/api/ledgers/${ledgerId}/transactions`, { method: 'POST', body: request }) }
export function updateV1Transaction(transactionId: number, request: V1TransactionRequest) { return apiRequest<TransactionSummary>(`/api/transactions/${transactionId}`, { method: 'PUT', body: request }) }
export function getTransactionEntryDefaults(ledgerId: number) { return apiRequest<{ budgetSource: BudgetSource; shareNewPersonalTransactions: boolean }>(`/api/ledgers/${ledgerId}/transaction-entry-defaults`) }
export function bulkClassifyTransactions(ledgerId: number, transactionIds: number[], categoryId: number) { return apiRequest<{ transactionIds: number[] }>(`/api/ledgers/${ledgerId}/transactions/bulk-classify`, { method: 'POST', body: { transactionIds, categoryId } }) }
