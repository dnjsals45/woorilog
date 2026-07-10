import { apiRequest } from '../../../shared/api/client'
import type { TransactionType } from '../../transaction/api/transactionApi'

export type CategorySummary = {
  id: number
  ledgerId: number
  name: string
  type: TransactionType
  sortOrder: number
  defaultCategory: boolean
}

export type CreateCategoryRequest = {
  name: string
  type: TransactionType
}

export function getCategories(ledgerId: number) {
  return apiRequest<CategorySummary[]>(`/api/ledgers/${ledgerId}/categories`)
}

export function createCategory(ledgerId: number, request: CreateCategoryRequest) {
  return apiRequest<CategorySummary>(`/api/ledgers/${ledgerId}/categories`, {
    method: 'POST',
    body: request,
  })
}
