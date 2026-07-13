import { apiRequest } from '../../../shared/api/client'
import type { TransactionType } from '../../transaction/api/transactionApi'

export type CategorySummary = {
  id: number
  ledgerId: number
  name: string
  type: TransactionType
  categoryGroupId: number
  categoryGroupName: string
  sortOrder: number
  defaultCategory: boolean
}

export type CreateCategoryRequest = {
  name: string
  type: TransactionType
  categoryGroupId: number
}

export type UpdateCategoryRequest = {
  name: string
  categoryGroupId: number
}

export type CategoryGroupSummary = {
  id: number
  ledgerId: number
  name: string
  type: TransactionType
}

export type CreateCategoryGroupRequest = {
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

export function updateCategory(categoryId: number, request: UpdateCategoryRequest) {
  return apiRequest<CategorySummary>(`/api/categories/${categoryId}`, {
    method: 'PATCH',
    body: request,
  })
}

export function deleteCategory(categoryId: number) {
  return apiRequest<void>(`/api/categories/${categoryId}`, { method: 'DELETE' })
}

export function getCategoryGroups(ledgerId: number) {
  return apiRequest<CategoryGroupSummary[]>(`/api/ledgers/${ledgerId}/category-groups`)
}

export function createCategoryGroup(ledgerId: number, request: CreateCategoryGroupRequest) {
  return apiRequest<CategoryGroupSummary>(`/api/ledgers/${ledgerId}/category-groups`, {
    method: 'POST',
    body: request,
  })
}
