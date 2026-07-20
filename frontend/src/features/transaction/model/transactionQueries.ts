import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuickTransaction,
  deleteTransaction,
  createTransaction,
  getMonthTransactions,
  getTransaction,
  updateTransaction,
  type QuickTransactionRequest,
  type SaveTransactionRequest,
} from '../api/transactionApi'

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  month: (ledgerId: number, budgetMonth: string) =>
    [...transactionQueryKeys.all, ledgerId, 'month', budgetMonth] as const,
  detail: (transactionId: number) =>
    [...transactionQueryKeys.all, transactionId, 'detail'] as const,
}

export function useMonthTransactionsQuery(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  return useQuery({
    queryKey: ledgerId
      ? transactionQueryKeys.month(ledgerId, budgetMonth)
      : transactionQueryKeys.all,
    queryFn: () => getMonthTransactions(ledgerId!, budgetMonth),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useTransactionQuery(transactionId: number | undefined) {
  return useQuery({
    queryKey: transactionId
      ? transactionQueryKeys.detail(transactionId)
      : transactionQueryKeys.all,
    queryFn: () => getTransaction(transactionId!),
    enabled: Boolean(transactionId),
    retry: false,
  })
}

export function useCreateTransactionMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveTransactionRequest) =>
      createTransaction(ledgerId!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}

export function useQuickTransactionMutation(
  ledgerId: number | undefined,
  budgetMonth: string,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: QuickTransactionRequest) =>
      createQuickTransaction(ledgerId!, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: transactionQueryKeys.month(ledgerId, budgetMonth),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}

export function useUpdateTransactionMutation(transactionId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveTransactionRequest) =>
      updateTransaction(transactionId!, request),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({
        queryKey: transactionQueryKeys.detail(transaction.id),
      })
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}

export function useDeleteTransactionMutation(transactionId?: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetTransactionId?: number) => deleteTransaction(targetTransactionId ?? transactionId!),
    onSuccess: (_response, targetTransactionId) => {
      const deletedTransactionId = targetTransactionId ?? transactionId
      queryClient.removeQueries({ queryKey: deletedTransactionId ? transactionQueryKeys.detail(deletedTransactionId) : transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}
