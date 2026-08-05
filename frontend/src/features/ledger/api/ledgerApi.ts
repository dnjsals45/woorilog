import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'

export const ledgerTypeSchema = z.enum(['PERSONAL', 'GROUP', 'SHARED'])
export type LedgerType = z.infer<typeof ledgerTypeSchema>

export const budgetCycleSchema = z.object({
  startType: z.enum(['DAY_OF_MONTH', 'LAST_DAY_OF_MONTH']),
  startDay: z.number().nullable(),
})
export type BudgetCycle = z.infer<typeof budgetCycleSchema>

export const ledgerSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: ledgerTypeSchema,
  ownerId: z.number(),
  recurringSummaryClosingDay: z.number(),
  budgetCycle: budgetCycleSchema,
})
export type LedgerSummary = z.infer<typeof ledgerSummarySchema>

export const ledgerListResponseSchema = z.object({
  currentLedgerId: z.number(),
  ledgers: z.array(ledgerSummarySchema),
})
export type LedgerListResponse = z.infer<typeof ledgerListResponseSchema>

export const ledgerMemberSchema = z.object({
  userId: z.number(),
  nickname: z.string(),
  role: z.enum(['OWNER', 'MEMBER']),
  user: z.object({ id: z.number(), nickname: z.string() }),
  status: z.enum(['ACTIVE', 'FORMER']),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
})
export type LedgerMember = z.infer<typeof ledgerMemberSchema>

export function getLedgers() {
  return apiRequest('/api/ledgers', { schema: ledgerListResponseSchema })
}

export async function getLedgerMembers(ledgerId: number) {
  const response = await apiRequest(`/api/ledgers/${ledgerId}/members`, {
    schema: z.union([z.object({ items: z.array(ledgerMemberSchema) }), z.array(ledgerMemberSchema)]),
  })
  return Array.isArray(response) ? response : response.items
}

export function switchLedger(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/use`, {
    method: 'POST',
    schema: ledgerSummarySchema,
  })
}

export function renameLedger(ledgerId: number, name: string) {
  return apiRequest(`/api/ledgers/${ledgerId}`, { method: 'PATCH', body: { name }, schema: ledgerSummarySchema })
}

export function updateLedgerBudgetCycle(ledgerId: number, budgetCycle: BudgetCycle) {
  return apiRequest(`/api/ledgers/${ledgerId}`, { method: 'PATCH', body: { budgetCycle }, schema: ledgerSummarySchema })
}

export function removeLedgerMember(ledgerId: number, userId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/${userId}`, { method: 'DELETE' })
}

/** 공동 가계부 삭제. 소유자이고 현재 다른 활성 멤버가 없을 때만 성공합니다. */
export function deleteLedger(ledgerId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}`, { method: 'DELETE' })
}

export function leaveLedger(ledgerId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/me`, { method: 'DELETE' })
}

/** POST /api/ledgers/shared 와 초대 수락 응답이 쓰는 요약 타입. GET /api/ledgers 의 LedgerSummary 와 모양이 다릅니다. */
export const v1LedgerSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['PERSONAL', 'SHARED']),
  role: z.enum(['OWNER', 'MEMBER']),
  accessState: z.enum(['ACTIVE', 'FORMER']),
  partner: z.object({ id: z.number(), nickname: z.string() }).nullable(),
  budgetCycle: budgetCycleSchema,
})
export type V1LedgerSummary = z.infer<typeof v1LedgerSummarySchema>
export type CreateSharedLedgerRequest = { name: string; totalBudget: number; budgetCycle: BudgetCycle }
export function createSharedLedger(request: CreateSharedLedgerRequest) { return apiRequest('/api/ledgers/shared', { method: 'POST', body: request, schema: z.object({ ledger: v1LedgerSummarySchema, currentBudgetPeriod: z.unknown() }) }) }
export async function transferLedgerOwnership(ledgerId: number, newOwnerUserId: number) { const response = await apiRequest(`/api/ledgers/${ledgerId}/ownership-transfer`, { method: 'POST', body: { newOwnerUserId }, schema: z.object({ items: z.array(ledgerMemberSchema) }) }); return response.items }
