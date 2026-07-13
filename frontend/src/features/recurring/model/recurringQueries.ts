import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetQueryKeys } from '../../budget/model/budgetQueries'
import { transactionQueryKeys } from '../../transaction/model/transactionQueries'
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  generateRecurringTransactions,
  getRecurringDue,
  getRecurringTemplates,
  pauseRecurringTemplate,
  resumeRecurringTemplate,
  updateRecurringTemplate,
  type SaveRecurringTemplateRequest,
} from '../api/recurringApi'

export const recurringQueryKeys = {
  all: ['recurring'] as const,
  list: (ledgerId: number) => [...recurringQueryKeys.all, ledgerId, 'list'] as const,
  due: (ledgerId: number, asOf: string) =>
    [...recurringQueryKeys.all, ledgerId, 'due', asOf] as const,
}

export function useRecurringTemplatesQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? recurringQueryKeys.list(ledgerId) : recurringQueryKeys.all,
    queryFn: () => getRecurringTemplates(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useRecurringDueQuery(
  ledgerId: number | undefined,
  asOf: string,
) {
  return useQuery({
    queryKey: ledgerId ? recurringQueryKeys.due(ledgerId, asOf) : recurringQueryKeys.all,
    queryFn: () => getRecurringDue(ledgerId!, asOf),
    enabled: Boolean(ledgerId && asOf),
    retry: false,
  })
}

export function useCreateRecurringTemplateMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveRecurringTemplateRequest) =>
      createRecurringTemplate(ledgerId!, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: recurringQueryKeys.list(ledgerId) })
        queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all })
      }
    },
  })
}

export function useUpdateRecurringTemplateMutation(templateId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveRecurringTemplateRequest) =>
      updateRecurringTemplate(templateId!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.all })
    },
  })
}

export function useDeleteRecurringTemplateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: number) => deleteRecurringTemplate(templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all }),
  })
}

export function useRecurringPauseMutation(action: 'pause' | 'resume') {
  const queryClient = useQueryClient()
  const mutationFn = action === 'pause' ? pauseRecurringTemplate : resumeRecurringTemplate

  return useMutation({
    mutationFn: (templateId: number) => mutationFn(templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all }),
  })
}

export function useGenerateRecurringTransactionsMutation(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (asOf: string) => generateRecurringTransactions(ledgerId!, asOf),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: recurringQueryKeys.all })
        queryClient.invalidateQueries({
          queryKey: transactionQueryKeys.month(ledgerId, budgetMonth),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}
