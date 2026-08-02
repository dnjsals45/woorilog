import { apiRequest } from '../../../shared/api/client'
import type { BudgetPeriodDetail } from './budgetPeriodApi'

/* GET /api/ledgers/{ledgerId}/budget-periods/{startDate}/summary — 기간 종료 요약 화면 전용.
 * 백엔드 응답(BudgetPeriodSummaryResponse, V1InsightsService.periodSummary)을 그대로 옮긴 타입입니다.
 * nextPeriodScheduledAmount는 다음 기간에 예정된 고정비·할부의 합계 하나뿐이고, 항목별 목록(장소·주기·예산 주체)은
 * 아직 이 응답에 없습니다 — PeriodSummaryPage.tsx의 TODO(api) 주석을 참고하세요. */
export type PeriodCategorySpending = { groupCode: string; groupName: string; amount: number }
export type BudgetPeriodSummary = {
  period: BudgetPeriodDetail
  categorySpending: PeriodCategorySpending[]
  unclassifiedCount: number
  nextPeriodScheduledAmount: number
}

export function getBudgetPeriodSummary(ledgerId: number, startDate: string) {
  return apiRequest<BudgetPeriodSummary>(`/api/ledgers/${ledgerId}/budget-periods/${startDate}/summary`)
}
