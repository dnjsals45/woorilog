import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { transactionTypeSchema, type TransactionType } from '../../transaction/api/transactionApi'

export const categorySummarySchema = z.object({
  id: z.number(),
  ledgerId: z.number(),
  name: z.string(),
  type: transactionTypeSchema,
  categoryGroupId: z.number(),
  categoryGroupName: z.string(),
  /** 기본 카테고리의 안정된 식별자 (FOOD, HOUSING …). 사용자가 만든 그룹은 빈 문자열입니다. */
  groupCode: z.string(),
  sortOrder: z.number(),
  defaultCategory: z.boolean(),
  active: z.boolean(),
})
export type CategorySummary = z.infer<typeof categorySummarySchema>

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

export const categoryGroupSummarySchema = z.object({
  id: z.number(),
  ledgerId: z.number(),
  name: z.string(),
  type: transactionTypeSchema,
  code: z.string(),
  hidden: z.boolean(),
})
export type CategoryGroupSummary = z.infer<typeof categoryGroupSummarySchema>

export function getCategories(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/categories`, { schema: z.array(categorySummarySchema) })
}

export function createCategory(ledgerId: number, request: CreateCategoryRequest) {
  return apiRequest(`/api/ledgers/${ledgerId}/categories`, {
    method: 'POST',
    body: request,
    schema: categorySummarySchema,
  })
}

export function updateCategory(categoryId: number, request: UpdateCategoryRequest) {
  return apiRequest(`/api/categories/${categoryId}`, {
    method: 'PATCH',
    body: request,
    schema: categorySummarySchema,
  })
}

export function deleteCategory(categoryId: number) {
  return apiRequest<void>(`/api/categories/${categoryId}`, { method: 'DELETE' })
}

export function getCategoryGroups(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/category-groups`, { schema: z.array(categoryGroupSummarySchema) })
}

export function updateCategoryGroupVisibility(ledgerId: number, groupCode: string, hidden: boolean) {
  return apiRequest(`/api/ledgers/${ledgerId}/category-groups/${groupCode}`, {
    method: 'PATCH',
    body: { hidden },
    schema: categoryGroupSummarySchema,
  })
}
