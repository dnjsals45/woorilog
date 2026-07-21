import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  previewTransactionImageImport,
  previewTransactionImport,
  saveTransactionImport,
  type TransactionImportPreviewRequest,
} from '../api/transactionImportApi'
import type { SaveTransactionRequest } from '../../transaction/api/transactionApi'
import { transactionQueryKeys } from '../../transaction/model/transactionQueries'

export function useTransactionImportPreviewMutation(ledgerId: number | undefined) {
  return useMutation({
    mutationFn: (request: TransactionImportPreviewRequest) =>
      previewTransactionImport(ledgerId!, request),
  })
}

export function useTransactionImageImportPreviewMutation(ledgerId: number | undefined) {
  return useMutation({
    mutationFn: ({ images, transactionDate }: { images: File[]; transactionDate?: string | null }) =>
      previewTransactionImageImport(ledgerId!, images, transactionDate),
  })
}

export function useSaveTransactionImportMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (candidates: SaveTransactionRequest[]) =>
      saveTransactionImport(ledgerId!, candidates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })
}
