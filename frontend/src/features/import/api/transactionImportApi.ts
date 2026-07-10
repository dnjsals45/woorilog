import { apiRequest } from '../../../shared/api/client'
import type { TransactionType } from '../../transaction/api/transactionApi'

export type TransactionImportCandidate = {
  id: string
  type: TransactionType
  amount: number
  transactionDate: string
  categoryId: number | null
  categoryName: string | null
  memo: string
  rawText: string
  confidence: number
}

export type TransactionImportPreviewResponse = {
  candidates: TransactionImportCandidate[]
  rejectedLines: number
}

export type TransactionImportPreviewRequest = {
  text: string
  transactionDate?: string | null
  ocrEngine?: string | null
  sourceName?: string | null
}

export function previewTransactionImport(
  ledgerId: number,
  request: TransactionImportPreviewRequest,
) {
  return apiRequest<TransactionImportPreviewResponse>(
    `/api/ledgers/${ledgerId}/transaction-imports/preview`,
    {
      method: 'POST',
      body: request,
    },
  )
}
