import { useMutation } from '@tanstack/react-query'
import {
  previewTransactionImport,
  type TransactionImportPreviewRequest,
} from '../api/transactionImportApi'

export function useTransactionImportPreviewMutation(ledgerId: number | undefined) {
  return useMutation({
    mutationFn: (request: TransactionImportPreviewRequest) =>
      previewTransactionImport(ledgerId!, request),
  })
}
