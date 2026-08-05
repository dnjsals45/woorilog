import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'

/* 타입은 schema 에서 `z.infer` 로 뽑습니다. 손으로 적은 타입과 검증이 따로 놀면
 * 필드 이름이 어긋나도 아무도 모릅니다. `shared/api/contract.ts` 참고. */

export const transactionTypeSchema = z.enum(['EXPENSE', 'INCOME', 'TRANSFER'])
export type TransactionType = z.infer<typeof transactionTypeSchema>

export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'OTHER'])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const userSummarySchema = z.object({
  id: z.number(),
  nickname: z.string(),
})
export type UserSummary = z.infer<typeof userSummarySchema>

export const budgetSourceSchema = z.object({
  type: z.enum(['PERSONAL', 'SHARED']),
  ownerUserId: z.number().nullable(),
})
export type BudgetSource = z.infer<typeof budgetSourceSchema>
export type BudgetScopeType = BudgetSource['type']

export const transactionCategorySummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: transactionTypeSchema,
  categoryId: z.number().optional(),
  groupCode: z.string().nullish(),
  groupName: z.string().nullish(),
  categoryName: z.string().optional(),
})
export type TransactionCategorySummary = z.infer<typeof transactionCategorySummarySchema>

export const transactionSummarySchema = z.object({
  id: z.number(),
  ledgerId: z.number(),
  type: transactionTypeSchema,
  amount: z.number(),
  transactionDate: z.string(),
  occurredOn: z.string().optional(),
  category: transactionCategorySummarySchema.nullable(),
  payer: userSummarySchema,
  memo: z.string().nullable(),
  paymentMethod: z.union([
    paymentMethodSchema,
    z.object({ type: paymentMethodSchema, displayName: z.string().nullish() }),
  ]).nullable(),
  legacyPaymentMethod: paymentMethodSchema.optional(),
  card: z.object({ id: z.number(), name: z.string() }).nullable(),
  installment: z.object({
    planId: z.string(),
    sequence: z.number(),
    totalCount: z.number(),
    /* 예약 계획 없이 만들어진 예전 할부 거래에는 월 이자가 저장돼 있지 않아 null 이다. */
    monthlyInterest: z.number().nullable(),
  }).nullable(),
  merchant: z.string().nullish(),
  transferType: z.enum(['OWN_ACCOUNTS', 'OUTBOUND', 'INBOUND']).nullish(),
  scope: budgetSourceSchema.nullish(),
  budgetSource: budgetSourceSchema.nullish(),
  sharedWithPartner: z.boolean().nullish(),
  occurredAt: z.string().nullish(),
  schedule: z.object({
    kind: z.enum(['RECURRING_EXPENSE', 'INSTALLMENT']),
    planId: z.number(),
    sequence: z.number(),
    totalSequences: z.number().nullable(),
  }).nullish(),
  lastModifiedBy: userSummarySchema.nullish(),
  lastModifiedAt: z.string().nullish(),
})
export type TransactionSummary = z.infer<typeof transactionSummarySchema>

export function getTransaction(transactionId: number) {
  return apiRequest(`/api/transactions/${transactionId}`, { schema: transactionSummarySchema })
}

export function deleteTransaction(transactionId: number) {
  return apiRequest<void>(`/api/transactions/${transactionId}`, { method: 'DELETE' })
}

export type V1TransactionRequest = { type: TransactionType; amount: number; occurredOn: string; merchant: string; categoryId: number | null; memo?: string | null; transferType?: 'OWN_ACCOUNTS' | 'OUTBOUND' | 'INBOUND' | null; scope?: BudgetSource | null; budgetSource?: BudgetSource | null; payerUserId?: number | null; sharedWithPartner?: boolean | null; paymentMethod?: PaymentMethod | { type: PaymentMethod; displayName?: string | null } | null; occurredAt?: string | null; installment?: { months: number; monthlyInterest: number } | null; cardId?: number | null }
export const v1TransactionListSchema = z.object({ items: z.array(transactionSummarySchema), nextCursor: z.string().nullable(), unclassifiedCount: z.number() })
export type V1TransactionList = z.infer<typeof v1TransactionListSchema>
export function listTransactions(ledgerId: number, params: { periodStart?: string; query?: string; types?: TransactionType[]; unclassified?: boolean; categoryGroupCodes?: string[]; scopes?: BudgetScopeType[]; kinds?: string[]; shared?: boolean; cursor?: string; limit?: number } = {}) { const q = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && !(Array.isArray(value) && value.length === 0)) q.set(key, Array.isArray(value) ? value.join(',') : String(value)) }); return apiRequest(`/api/ledgers/${ledgerId}/transactions${q.size ? `?${q}` : ''}`, { schema: v1TransactionListSchema }) }
export function createV1Transaction(ledgerId: number, request: V1TransactionRequest) { return apiRequest(`/api/ledgers/${ledgerId}/transactions`, { method: 'POST', body: request, schema: transactionSummarySchema }) }
export function updateV1Transaction(transactionId: number, request: V1TransactionRequest) { return apiRequest(`/api/transactions/${transactionId}`, { method: 'PUT', body: request, schema: transactionSummarySchema }) }

export const transactionEntryDefaultsSchema = z.object({ budgetSource: budgetSourceSchema, shareNewPersonalTransactions: z.boolean() })
export function getTransactionEntryDefaults(ledgerId: number) { return apiRequest(`/api/ledgers/${ledgerId}/transaction-entry-defaults`, { schema: transactionEntryDefaultsSchema }) }
export function bulkClassifyTransactions(ledgerId: number, transactionIds: number[], categoryId: number) { return apiRequest(`/api/ledgers/${ledgerId}/transactions/bulk-classify`, { method: 'POST', body: { transactionIds, categoryId }, schema: z.object({ transactionIds: z.array(z.number()) }) }) }

export const merchantSuggestionSchema = z.object({ merchant: z.string(), suggestedCategoryId: z.number().nullable() })
export type MerchantSuggestion = z.infer<typeof merchantSuggestionSchema>
export function getMerchantSuggestions(ledgerId: number, query: string) {
  return apiRequest(`/api/ledgers/${ledgerId}/merchant-suggestions?query=${encodeURIComponent(query)}`, { schema: z.object({ items: z.array(merchantSuggestionSchema) }) })
}
