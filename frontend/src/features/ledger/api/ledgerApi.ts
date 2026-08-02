import { apiRequest } from '../../../shared/api/client'

export type LedgerType = 'PERSONAL' | 'GROUP' | 'SHARED'

export type BudgetCycle = { startType: 'DAY_OF_MONTH' | 'LAST_DAY_OF_MONTH'; startDay: number | null }

export type LedgerSummary = {
  id: number
  name: string
  type: LedgerType
  ownerId: number
  recurringSummaryClosingDay: number
  /** GET /api/ledgers, PATCH /api/ledgers/{ledgerId} 응답에는 아직 노출되지 않습니다.
   * 요청 시 보낼 수는 있지만, 저장 뒤 조회로 값을 다시 확인할 수는 없습니다. */
  budgetCycle?: BudgetCycle
}

export type LedgerListResponse = {
  currentLedgerId: number
  ledgers: LedgerSummary[]
}

export type LedgerMember = {
  userId: number
  nickname: string
  role: 'OWNER' | 'MEMBER'
  user: { id: number; nickname: string }
  status: 'ACTIVE' | 'FORMER'
  joinedAt: string
  leftAt: string | null
}

export function getLedgers() {
  return apiRequest<LedgerListResponse>('/api/ledgers')
}

export async function getLedgerMembers(ledgerId: number) {
  const response = await apiRequest<{ items: LedgerMember[] } | LedgerMember[]>(`/api/ledgers/${ledgerId}/members`)
  return Array.isArray(response) ? response : response.items
}

export function switchLedger(ledgerId: number) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}/use`, {
    method: 'POST',
  })
}

export function renameLedger(ledgerId: number, name: string) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}`, { method: 'PATCH', body: { name } })
}

export function updateLedgerBudgetCycle(ledgerId: number, budgetCycle: BudgetCycle) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}`, { method: 'PATCH', body: { budgetCycle } })
}

export function removeLedgerMember(ledgerId: number, userId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/${userId}`, { method: 'DELETE' })
}

export function leaveLedger(ledgerId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/me`, { method: 'DELETE' })
}

export type V1LedgerSummary = { id: number; name: string; type: 'PERSONAL' | 'SHARED'; role: 'OWNER' | 'MEMBER'; accessState: 'ACTIVE' | 'FORMER'; budgetCycle: BudgetCycle }
export type CreateSharedLedgerRequest = { name: string; totalBudget: number; budgetCycle: BudgetCycle }
export function createSharedLedger(request: CreateSharedLedgerRequest) { return apiRequest<{ ledger: V1LedgerSummary; currentBudgetPeriod: unknown }>('/api/ledgers/shared', { method: 'POST', body: request }) }
export async function transferLedgerOwnership(ledgerId: number, newOwnerUserId: number) { const response = await apiRequest<{ items: LedgerMember[] }>(`/api/ledgers/${ledgerId}/ownership-transfer`, { method: 'POST', body: { newOwnerUserId } }); return response.items }
