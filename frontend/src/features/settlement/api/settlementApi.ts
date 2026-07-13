import { apiRequest } from '../../../shared/api/client'

export type SettlementMember = { userId: number; nickname: string; paidAmount: number; owedAmount: number; balanceAmount: number }
export type SettlementTransfer = { fromUserId: number; fromNickname: string; toUserId: number; toNickname: string; amount: number }
export type SettlementPayment = { id: number; fromUserId: number; fromNickname: string; toUserId: number; toNickname: string; amount: number; settledAt: string }
export type SettlementSummary = { ledgerId: number; budgetMonth: string; totalExpenseAmount: number; members: SettlementMember[]; transfers: SettlementTransfer[]; payments: SettlementPayment[] }

export function getSettlementSummary(ledgerId: number, budgetMonth: string) {
  return apiRequest<SettlementSummary>(`/api/ledgers/${ledgerId}/months/${budgetMonth}/settlements`)
}

export function recordSettlement(ledgerId: number, budgetMonth: string, transfer: { fromUserId: number; toUserId: number; amount: number }) {
  return apiRequest<SettlementSummary>(`/api/ledgers/${ledgerId}/months/${budgetMonth}/settlements`, { method: 'POST', body: transfer })
}

export function deleteSettlement(paymentId: number) {
  return apiRequest<void>(`/api/settlements/${paymentId}`, { method: 'DELETE' })
}
