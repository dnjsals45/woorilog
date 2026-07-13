import { apiRequest } from '../../../shared/api/client'

export type FixedBudget = {
  id: number
  ledgerId: number
  name: string
  categoryId: number
  categoryName: string
  amount: number
  active: boolean
}

export type SaveFixedBudgetRequest = Omit<FixedBudget, 'id' | 'ledgerId' | 'categoryName'>

export function getFixedBudgets(ledgerId: number) {
  return apiRequest<FixedBudget[]>(`/api/ledgers/${ledgerId}/fixed-budgets`)
}

export function createFixedBudget(ledgerId: number, request: SaveFixedBudgetRequest) {
  return apiRequest<FixedBudget>(`/api/ledgers/${ledgerId}/fixed-budgets`, { method: 'POST', body: request })
}

export function updateFixedBudget(fixedBudgetId: number, request: SaveFixedBudgetRequest) {
  return apiRequest<FixedBudget>(`/api/fixed-budgets/${fixedBudgetId}`, { method: 'PUT', body: request })
}

export function deleteFixedBudget(fixedBudgetId: number) {
  return apiRequest<void>(`/api/fixed-budgets/${fixedBudgetId}`, { method: 'DELETE' })
}
