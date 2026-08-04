import { apiRequest } from '../../../shared/api/client'
import type { TransactionType } from '../../transaction/api/transactionApi'

export type CategorySummary = {
  id: number
  ledgerId: number
  name: string
  type: TransactionType
  categoryGroupId: number
  categoryGroupName: string
  /** 기본 대분류의 안정된 식별자 (FOOD, HOUSING …). 사용자가 만든 그룹은 빈 문자열입니다. */
  groupCode: string
  sortOrder: number
  defaultCategory: boolean
  active: boolean
}

export type CreateCategoryRequest = {
  name: string
  type: TransactionType
  categoryGroupId: number
}

export type UpdateCategoryRequest = {
  name: string
  categoryGroupId: number
  /** true면 이 세부 카테고리로 기록된 과거 거래의 카테고리 이름 스냅샷도 함께 바꿉니다. */
  applyNameToPastTransactions?: boolean
}

export type CategoryGroupSummary = {
  id: number
  ledgerId: number
  name: string
  type: TransactionType
  code: string
  hidden: boolean
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

export function updateCategoryGroupVisibility(ledgerId: number, groupCode: string, hidden: boolean) {
  return apiRequest<CategoryGroupSummary>(`/api/ledgers/${ledgerId}/category-groups/${groupCode}`, {
    method: 'PATCH',
    body: { hidden },
  })
}
