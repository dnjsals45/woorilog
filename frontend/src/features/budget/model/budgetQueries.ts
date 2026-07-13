import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeBudgetMonth,
  getBudgetMonth,
  getDashboardSummary,
  getMonthlyStatistics,
  reopenBudgetMonth,
  saveBudgetMonth,
  type SaveBudgetMonthRequest,
} from '../api/budgetApi'

export const budgetQueryKeys = {
  all: ['budget'] as const,
  dashboard: (budgetMonth?: string) => [...budgetQueryKeys.all, 'dashboard', budgetMonth ?? 'current'] as const,
  month: (ledgerId: number, budgetMonth: string) =>
    [...budgetQueryKeys.all, ledgerId, 'month', budgetMonth] as const,
  statistics: (ledgerId: number, from: string, to: string) =>
    [...budgetQueryKeys.all, ledgerId, 'statistics', from, to] as const,
}

export function useDashboardSummaryQuery(budgetMonth?: string) {
  return useQuery({
    queryKey: budgetQueryKeys.dashboard(budgetMonth),
    queryFn: () => getDashboardSummary(budgetMonth),
    retry: false,
  })
}

export function useBudgetMonthQuery(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  return useQuery({
    queryKey: ledgerId
      ? budgetQueryKeys.month(ledgerId, budgetMonth)
      : budgetQueryKeys.all,
    queryFn: () => getBudgetMonth(ledgerId!, budgetMonth),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useSaveBudgetMonthMutation(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveBudgetMonthRequest) =>
      saveBudgetMonth(ledgerId!, budgetMonth, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.month(ledgerId, budgetMonth),
        })
        queryClient.invalidateQueries({ queryKey: [...budgetQueryKeys.all, 'dashboard'] })
      }
    },
  })
}

export function useCloseBudgetMonthMutation(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => closeBudgetMonth(ledgerId!, budgetMonth),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.month(ledgerId, budgetMonth),
        })
        queryClient.invalidateQueries({ queryKey: [...budgetQueryKeys.all, 'dashboard'] })
      }
    },
  })
}

export function useReopenBudgetMonthMutation(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => reopenBudgetMonth(ledgerId!, budgetMonth),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.month(ledgerId, budgetMonth),
        })
        queryClient.invalidateQueries({ queryKey: [...budgetQueryKeys.all, 'dashboard'] })
      }
    },
  })
}

export function useMonthlyStatisticsQuery(
  ledgerId: number | undefined,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ledgerId
      ? budgetQueryKeys.statistics(ledgerId, from, to)
      : budgetQueryKeys.all,
    queryFn: () => getMonthlyStatistics(ledgerId!, from, to),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}
