import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSettlement, getSettlementSummary, recordSettlement, type SettlementTransfer } from '../api/settlementApi'

export const settlementQueryKeys = {
  all: ['settlements'] as const,
  month: (ledgerId: number, budgetMonth: string) => ['settlements', ledgerId, budgetMonth] as const,
}

export function useSettlementSummaryQuery(ledgerId: number | undefined, budgetMonth: string) {
  return useQuery({
    queryKey: ledgerId ? settlementQueryKeys.month(ledgerId, budgetMonth) : settlementQueryKeys.all,
    queryFn: () => getSettlementSummary(ledgerId!, budgetMonth),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useRecordSettlementMutation(ledgerId: number | undefined, budgetMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transfer: SettlementTransfer) => recordSettlement(ledgerId!, budgetMonth, transfer),
    onSuccess: (summary) => queryClient.setQueryData(settlementQueryKeys.month(summary.ledgerId, summary.budgetMonth), summary),
  })
}

export function useDeleteSettlementMutation(ledgerId: number | undefined, budgetMonth: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: number) => deleteSettlement(paymentId),
    onSuccess: () => ledgerId && queryClient.invalidateQueries({ queryKey: settlementQueryKeys.month(ledgerId, budgetMonth) }),
  })
}
