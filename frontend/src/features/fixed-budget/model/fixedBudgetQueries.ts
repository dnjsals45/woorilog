import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFixedBudget,
  deleteFixedBudget,
  getFixedBudgets,
  updateFixedBudget,
  type SaveFixedBudgetRequest,
} from '../api/fixedBudgetApi'

export const fixedBudgetQueryKeys = {
  all: ['fixed-budgets'] as const,
  list: (ledgerId: number) => [...fixedBudgetQueryKeys.all, ledgerId] as const,
}

export function useFixedBudgetsQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? fixedBudgetQueryKeys.list(ledgerId) : fixedBudgetQueryKeys.all,
    queryFn: () => getFixedBudgets(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

function invalidateFixedBudgetState(queryClient: ReturnType<typeof useQueryClient>, ledgerId: number | undefined) {
  if (!ledgerId) return
  queryClient.invalidateQueries({ queryKey: fixedBudgetQueryKeys.list(ledgerId) })
  queryClient.invalidateQueries({ queryKey: ['budget', ledgerId, 'month'] })
}

export function useCreateFixedBudgetMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SaveFixedBudgetRequest) => createFixedBudget(ledgerId!, request),
    onSuccess: () => invalidateFixedBudgetState(queryClient, ledgerId),
  })
}

export function useUpdateFixedBudgetMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: SaveFixedBudgetRequest }) => updateFixedBudget(id, request),
    onSuccess: () => invalidateFixedBudgetState(queryClient, ledgerId),
  })
}

export function useDeleteFixedBudgetMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fixedBudgetId: number) => deleteFixedBudget(fixedBudgetId),
    onSuccess: () => invalidateFixedBudgetState(queryClient, ledgerId),
  })
}
