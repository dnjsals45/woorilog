import { apiRequest } from '../../../shared/api/client'
import type { SaveTransactionRequest, TransactionSummary, TransactionType } from '../../transaction/api/transactionApi'

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

export type TransactionImportImagePreviewResponse = TransactionImportPreviewResponse & {
  extractedText: string
  ocrEngine: string
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

export function previewTransactionImageImport(
  ledgerId: number,
  images: File[],
  transactionDate?: string | null,
) {
  const formData = new FormData()
  images.forEach((image) => formData.append('image', image))
  if (transactionDate) {
    formData.append('transactionDate', transactionDate)
  }

  return apiRequest<TransactionImportImagePreviewResponse>(
    `/api/ledgers/${ledgerId}/transaction-imports/ocr-preview`,
    {
      method: 'POST',
      body: formData,
    },
  )
}

export function saveTransactionImport(
  ledgerId: number,
  candidates: SaveTransactionRequest[],
) {
  return apiRequest<TransactionSummary[]>(
    `/api/ledgers/${ledgerId}/transaction-imports`,
    {
      method: 'POST',
      body: { candidates },
    },
  )
}
