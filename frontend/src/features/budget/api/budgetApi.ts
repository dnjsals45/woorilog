import { apiRequest } from '../../../shared/api/client'
import type { LedgerSummary } from '../../ledger/api/ledgerApi'
import type { TransactionSummary } from '../../transaction/api/transactionApi'

export type BudgetCategorySetting = {
  categoryId: number
  categoryName: string
  type: 'EXPENSE' | 'INCOME'
  amount: number
}

export type BudgetMemberAllocation = {
  userId: number
  nickname: string
  amount: number
}

export type BudgetMonthSettings = {
  ledgerId: number
  budgetMonth: string
  totalBudgetAmount: number
  closed: boolean
  categoryBudgets: BudgetCategorySetting[]
  memberAllocations: BudgetMemberAllocation[]
}

export type SaveBudgetMonthRequest = {
  totalBudgetAmount: number
  categoryBudgets: Array<{
    categoryId: number
    amount: number
  }>
  memberAllocations: Array<{
    userId: number
    amount: number
  }>
}

export type DashboardSummary = {
  currentLedger: LedgerSummary
  budgetMonth: string
  totalBudgetAmount: number
  totalExpenseAmount: number
  remainingBudgetAmount: number
  recentTransactions: TransactionSummary[]
  categorySpending: Array<{
    categoryId: number | null
    categoryName: string
    amount: number
  }>
  memberSpending: Array<{
    userId: number
    nickname: string
    amount: number
  }>
}

export type MonthlyStatistic = {
  budgetMonth: string
  totalBudgetAmount: number
  expenseAmount: number
  incomeAmount: number
}

type BudgetMonthSettingsResponse = Omit<BudgetMonthSettings, 'categoryBudgets'> & {
  categoryBudgets: Array<{
    categoryId: number
    name: string
    type: 'EXPENSE' | 'INCOME'
    amount: number
  }>
}

type DashboardSummaryResponse = Omit<DashboardSummary, 'categorySpending' | 'memberSpending'> & {
  categorySpending: Array<{
    categoryId: number
    name: string
    totalSpent: number
  }>
  memberSpending: Array<{
    userId: number
    nickname: string
    totalSpent: number
  }>
}

type MonthlyStatisticResponse = {
  month: string
  totalBudgetAmount: number
  totalExpenseAmount: number
  totalIncomeAmount: number
}

function adaptBudgetMonth(response: BudgetMonthSettingsResponse): BudgetMonthSettings {
  return {
    ...response,
    categoryBudgets: response.categoryBudgets.map((categoryBudget) => ({
      categoryId: categoryBudget.categoryId,
      categoryName: categoryBudget.name,
      type: categoryBudget.type,
      amount: categoryBudget.amount,
    })),
  }
}

function adaptDashboardSummary(response: DashboardSummaryResponse): DashboardSummary {
  return {
    ...response,
    categorySpending: response.categorySpending.map((spending) => ({
      categoryId: spending.categoryId,
      categoryName: spending.name,
      amount: spending.totalSpent,
    })),
    memberSpending: response.memberSpending.map((spending) => ({
      userId: spending.userId,
      nickname: spending.nickname,
      amount: spending.totalSpent,
    })),
  }
}

function adaptMonthlyStatistic(response: MonthlyStatisticResponse): MonthlyStatistic {
  return {
    budgetMonth: response.month,
    totalBudgetAmount: response.totalBudgetAmount,
    expenseAmount: response.totalExpenseAmount,
    incomeAmount: response.totalIncomeAmount,
  }
}

export async function getBudgetMonth(ledgerId: number, budgetMonth: string) {
  const response = await apiRequest<BudgetMonthSettingsResponse>(
    `/api/ledgers/${ledgerId}/months/${budgetMonth}`,
  )

  return adaptBudgetMonth(response)
}

export async function saveBudgetMonth(
  ledgerId: number,
  budgetMonth: string,
  request: SaveBudgetMonthRequest,
) {
  const response = await apiRequest<BudgetMonthSettingsResponse>(
    `/api/ledgers/${ledgerId}/months/${budgetMonth}`,
    {
      method: 'PUT',
      body: request,
    },
  )

  return adaptBudgetMonth(response)
}

export async function closeBudgetMonth(ledgerId: number, budgetMonth: string) {
  const response = await apiRequest<BudgetMonthSettingsResponse>(
    `/api/ledgers/${ledgerId}/months/${budgetMonth}/close`,
    { method: 'POST' },
  )

  return adaptBudgetMonth(response)
}

export async function reopenBudgetMonth(ledgerId: number, budgetMonth: string) {
  const response = await apiRequest<BudgetMonthSettingsResponse>(
    `/api/ledgers/${ledgerId}/months/${budgetMonth}/reopen`,
    { method: 'POST' },
  )

  return adaptBudgetMonth(response)
}

export async function getDashboardSummary() {
  const response = await apiRequest<DashboardSummaryResponse>('/api/dashboard/current')

  return adaptDashboardSummary(response)
}

export async function getMonthlyStatistics(ledgerId: number, from: string, to: string) {
  const response = await apiRequest<MonthlyStatisticResponse[]>(
    `/api/ledgers/${ledgerId}/statistics/monthly?from=${from}&to=${to}`,
  )

  return response.map(adaptMonthlyStatistic)
}
