import { apiRequest } from '../../../shared/api/client'
import type { BudgetSource } from '../../transaction/api/transactionApi'
import type { TransactionSummary } from '../../transaction/api/transactionApi'

/* GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/allocations/{allocationId} — 예산 상세 모달 전용.
 * 카테고리별 사용액, 일별 소비 흐름, 이 예산 범위(공동/개인)의 거래 목록을 한 번에 내려줍니다.
 * 백엔드 응답(AllocationDetailResponse, V1InsightsService.allocationDetail)을 그대로 옮긴 타입입니다.
 * nextCursor는 지금 백엔드가 항상 null을 내려줍니다 — transactions는 커서 없이 전체가 옵니다. */
export type AllocationCategorySpending = { groupCode: string; groupName: string; amount: number }
export type AllocationDailySpending = { date: string; amount: number }
export type AllocationDetail = {
  allocationId: number
  source: { type: BudgetSource; ownerUserId: number | null }
  amount: number
  spentAmount: number
  currentBalance: number
  scheduledAmount: number
  availableAmount: number
  categorySpending: AllocationCategorySpending[]
  dailySpending: AllocationDailySpending[]
  transactions: TransactionSummary[]
  nextCursor: string | null
}

export function getAllocationDetail(ledgerId: number, startDate: string, allocationId: number) {
  return apiRequest<AllocationDetail>(`/api/ledgers/${ledgerId}/budget-periods/${startDate}/allocations/${allocationId}`)
}
