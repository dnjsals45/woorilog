import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { budgetPeriodDetailSchema } from './budgetPeriodApi'

/* GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary — 기간 종료 요약 화면 전용.
 * 백엔드 응답(BudgetPeriodSummaryResponse, V1InsightsService.periodSummary)을 그대로 옮긴 모양입니다.
 * nextPeriodScheduledAmount는 다음 기간에 예정된 고정비·할부의 합계 하나뿐이고, 항목별 목록(장소·주기·예산 주체)은
 * 아직 이 응답에 없습니다 — PeriodSummaryPage.tsx의 TODO(api) 주석을 참고하세요. */
export const periodCategorySpendingSchema = z.object({ groupCode: z.string(), groupName: z.string(), amount: z.number() })
export type PeriodCategorySpending = z.infer<typeof periodCategorySpendingSchema>

export const budgetPeriodSummarySchema = z.object({
  period: budgetPeriodDetailSchema,
  categorySpending: z.array(periodCategorySpendingSchema),
  unclassifiedCount: z.number(),
  nextPeriodScheduledAmount: z.number(),
})
export type BudgetPeriodSummary = z.infer<typeof budgetPeriodSummarySchema>

export function getBudgetPeriodSummary(ledgerId: number, startDate: string) {
  return apiRequest(`/api/ledgers/${ledgerId}/budget-periods/${startDate}/summary`, { schema: budgetPeriodSummarySchema })
}
