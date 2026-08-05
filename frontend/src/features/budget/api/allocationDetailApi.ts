import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { budgetSourceSchema, transactionSummarySchema } from '../../transaction/api/transactionApi'

/* GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/allocations/{allocationId} — 예산 상세 모달 전용.
 * 카테고리별 사용액, 일별 소비 흐름, 이 예산 범위(공동/개인)의 거래 목록을 한 번에 내려줍니다.
 * 백엔드 응답(AllocationDetailResponse, V1InsightsService.allocationDetail)을 그대로 옮긴 모양입니다.
 * nextCursor는 지금 백엔드가 항상 null을 내려줍니다 — transactions는 커서 없이 전체가 옵니다. */
export const allocationCategorySpendingSchema = z.object({ groupCode: z.string(), groupName: z.string(), amount: z.number() })
export type AllocationCategorySpending = z.infer<typeof allocationCategorySpendingSchema>
export const allocationDailySpendingSchema = z.object({ date: z.string(), amount: z.number() })
export type AllocationDailySpending = z.infer<typeof allocationDailySpendingSchema>

export const allocationDetailSchema = z.object({
  allocationId: z.number(),
  /* 백엔드는 BudgetSourceResponse 를 그대로 내려줍니다.
   * 예전 타입은 `{ type: BudgetSource; ownerUserId }` 로 한 겹 더 감싸 있었는데,
   * 화면에서 source 를 안 써서 아무도 몰랐습니다. */
  source: budgetSourceSchema,
  amount: z.number(),
  spentAmount: z.number(),
  currentBalance: z.number(),
  scheduledAmount: z.number(),
  availableAmount: z.number(),
  categorySpending: z.array(allocationCategorySpendingSchema),
  dailySpending: z.array(allocationDailySpendingSchema),
  transactions: z.array(transactionSummarySchema),
  nextCursor: z.string().nullable(),
})
export type AllocationDetail = z.infer<typeof allocationDetailSchema>

export function getAllocationDetail(ledgerId: number, startDate: string, allocationId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/budget-periods/${startDate}/allocations/${allocationId}`, { schema: allocationDetailSchema })
}
