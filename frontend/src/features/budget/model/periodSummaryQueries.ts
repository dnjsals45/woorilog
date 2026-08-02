import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBudgetPeriodSummary } from '../api/periodSummaryApi'
import { copyBudgetPeriod } from '../api/budgetPeriodApi'
import { budgetPeriodQueryKeys } from './budgetPeriodQueries'

export const periodSummaryQueryKeys = {
  all: ['budget-period-summary'] as const,
  detail: (ledgerId: number, startDate: string) => ['budget-period-summary', ledgerId, startDate] as const,
}

/** 기간 종료 요약 화면 전용 조회 훅. */
export function useBudgetPeriodSummaryQuery(ledgerId: number | undefined, startDate: string | undefined) {
  return useQuery({
    queryKey: ledgerId && startDate ? periodSummaryQueryKeys.detail(ledgerId, startDate) : periodSummaryQueryKeys.all,
    queryFn: () => getBudgetPeriodSummary(ledgerId!, startDate!),
    enabled: Boolean(ledgerId && startDate),
    retry: false,
  })
}

/** "다음 기간 예산 복사" — 기존 copyBudgetPeriod API(POST .../{targetStartDate}/copy)를 그대로 씁니다. */
export function useCopyBudgetPeriodMutation(ledgerId: number | undefined, targetStartDate: string | undefined) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (sourceStartDate: string) => copyBudgetPeriod(ledgerId!, targetStartDate!, sourceStartDate),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: budgetPeriodQueryKeys.all })
    },
  })
}
