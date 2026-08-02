import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteTransaction,
  getTransaction,
  listTransactions,
  createV1Transaction,
  updateV1Transaction,
  bulkClassifyTransactions,
  getMerchantSuggestions,
  type V1TransactionRequest,
} from '../api/transactionApi'

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  month: (ledgerId: number, budgetMonth: string) =>
    [...transactionQueryKeys.all, ledgerId, 'month', budgetMonth] as const,
  detail: (transactionId: number) =>
    [...transactionQueryKeys.all, transactionId, 'detail'] as const,
}

export function useTransactionsQuery(ledgerId: number | undefined, params: Parameters<typeof listTransactions>[1] = {}) {
  return useQuery({ queryKey: ledgerId ? [...transactionQueryKeys.all, ledgerId, 'list', params] : transactionQueryKeys.all, queryFn: () => listTransactions(ledgerId!, params), enabled: Boolean(ledgerId), retry: false })
}
export function useCreateV1TransactionMutation(ledgerId: number | undefined) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (request: V1TransactionRequest) => createV1Transaction(ledgerId!, request), onSuccess: () => { client.invalidateQueries({ queryKey: transactionQueryKeys.all }); client.invalidateQueries({ queryKey: ['budget-periods'] }) } })
}
export function useUpdateV1TransactionMutation(transactionId: number | undefined) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (request: V1TransactionRequest) => updateV1Transaction(transactionId!, request), onSuccess: (transaction) => { client.invalidateQueries({ queryKey: transactionQueryKeys.detail(transaction.id) }); client.invalidateQueries({ queryKey: transactionQueryKeys.all }); client.invalidateQueries({ queryKey: ['budget-periods'] }) } })
}
export function useBulkClassifyTransactionsMutation(ledgerId: number | undefined) {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ transactionIds, categoryId }: { transactionIds: number[]; categoryId: number }) => bulkClassifyTransactions(ledgerId!, transactionIds, categoryId), onSuccess: () => client.invalidateQueries({ queryKey: transactionQueryKeys.all }) })
}

/** 사용처 입력 자동완성 — 최소 1글자부터 본인 확정 거래 기준으로 추천합니다 (백엔드가 빈 검색어를 거부). */
export function useMerchantSuggestionsQuery(ledgerId: number | undefined, query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: [...transactionQueryKeys.all, ledgerId, 'merchant-suggestions', trimmed],
    queryFn: () => getMerchantSuggestions(ledgerId!, trimmed),
    enabled: Boolean(ledgerId) && trimmed.length > 0,
    retry: false,
    staleTime: 30_000,
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
