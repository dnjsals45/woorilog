import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { ledgerSummarySchema, type LedgerSummary } from '../../ledger/api/ledgerApi'
import { transactionSummarySchema, type TransactionSummary } from '../../transaction/api/transactionApi'

export type BudgetCategorySetting = {
  categoryId: number
  categoryName: string
  type: 'EXPENSE' | 'INCOME'
  categoryGroupId: number
  categoryGroupName: string
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
  fixedBudgetTotalAmount: number
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
  scheduledRecurringExpenseAmount: number
  remainingBudgetAmount: number
  recentTransactions: TransactionSummary[]
  categorySpending: Array<{
    categoryGroupId: number
    categoryName: string
    amount: number
  }>
  memberSpending: Array<{
    userId: number
    nickname: string
    amount: number
  }>
  cardPaymentSummaries: Array<{
    cardId: number
    cardName: string
    statementClosingDate: string
    expectedPaymentMonth: string
    totalAmount: number
  }>
  ledger: { id: number; name: string; type: 'PERSONAL' | 'SHARED'; role: 'OWNER' | 'MEMBER'; accessState: 'ACTIVE' | 'FORMER'; partner: { id: number; nickname: string } | null } | null
  period: { id: number; startDate: string; endDate: string; totalBudget: number } | null
  sharedBudget: DashboardBudget | null
  myBudget: DashboardBudget | null
  incomeAmount: number | null
  weeklyGuide: { weekStartDate: string; recommendedAmount: number; remainingOverageAmount: number } | null
  emptyState: 'INVITE_PARTNER' | 'ALLOCATE_BUDGET' | 'ADD_FIRST_TRANSACTION' | 'READY' | null
}

export type DashboardBudget = { allocationId: number; amount: number; spentAmount: number; currentBalance: number; availableAmount: number }

export type MonthlyStatistic = {
  budgetMonth: string
  totalBudgetAmount: number
  expenseAmount: number
  incomeAmount: number
  categorySpending: Array<{
    categoryGroupId: number
    categoryName: string
    amount: number
  }>
}

type BudgetMonthSettingsResponse = Omit<BudgetMonthSettings, 'categoryBudgets'> & {
  categoryBudgets: Array<{
    categoryId: number
    name: string
    type: 'EXPENSE' | 'INCOME'
    categoryGroupId: number
    categoryGroupName: string
    amount: number
  }>
}

/* 대시보드는 화면이 실제로 쓰는 유일한 legacy 응답이라 schema 로 검증합니다.
 * 아래 months/ statistics 계열은 지금 어떤 화면도 부르지 않아 그대로 둡니다(legacy 정리 대상).
 *
 * 응답의 categorySpending·memberSpending 은 화면이 쓰는 이름과 달라서 adapt* 함수가 한 번 옮깁니다.
 * schema 는 '옮기기 전' 실제 응답 모양이어야 합니다. */
const dashboardBudgetSchema = z.object({ allocationId: z.number(), amount: z.number(), spentAmount: z.number(), currentBalance: z.number(), availableAmount: z.number() })

const dashboardSummaryResponseSchema = z.object({
  currentLedger: ledgerSummarySchema,
  budgetMonth: z.string(),
  totalBudgetAmount: z.number(),
  totalExpenseAmount: z.number(),
  scheduledRecurringExpenseAmount: z.number(),
  remainingBudgetAmount: z.number(),
  recentTransactions: z.array(transactionSummarySchema),
  categorySpending: z.array(z.object({ categoryGroupId: z.number(), name: z.string(), totalSpent: z.number() })),
  memberSpending: z.array(z.object({ userId: z.number(), nickname: z.string(), totalSpent: z.number() })),
  cardPaymentSummaries: z.array(z.object({ cardId: z.number(), cardName: z.string(), statementClosingDate: z.string(), expectedPaymentMonth: z.string(), totalAmount: z.number() })),
  ledger: z.object({ id: z.number(), name: z.string(), type: z.enum(['PERSONAL', 'SHARED']), role: z.enum(['OWNER', 'MEMBER']), accessState: z.enum(['ACTIVE', 'FORMER']), partner: z.object({ id: z.number(), nickname: z.string() }).nullable() }).nullable(),
  period: z.object({ id: z.number(), startDate: z.string(), endDate: z.string(), totalBudget: z.number() }).nullable(),
  sharedBudget: dashboardBudgetSchema.nullable(),
  myBudget: dashboardBudgetSchema.nullable(),
  incomeAmount: z.number().nullable(),
  weeklyGuide: z.object({ weekStartDate: z.string(), recommendedAmount: z.number(), remainingOverageAmount: z.number() }).nullable(),
  emptyState: z.enum(['INVITE_PARTNER', 'ALLOCATE_BUDGET', 'ADD_FIRST_TRANSACTION', 'READY']).nullable(),
})
type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>

type MonthlyStatisticResponse = {
  month: string
  totalBudgetAmount: number
  totalExpenseAmount: number
  totalIncomeAmount: number
  categorySpending: Array<{
    categoryGroupId: number
    name: string
    totalSpent: number
  }>
}

function adaptBudgetMonth(response: BudgetMonthSettingsResponse): BudgetMonthSettings {
  return {
    ...response,
    categoryBudgets: response.categoryBudgets.map((categoryBudget) => ({
      categoryId: categoryBudget.categoryId,
      categoryName: categoryBudget.name,
      type: categoryBudget.type,
      categoryGroupId: categoryBudget.categoryGroupId,
      categoryGroupName: categoryBudget.categoryGroupName,
      amount: categoryBudget.amount,
    })),
  }
}

function adaptDashboardSummary(response: DashboardSummaryResponse): DashboardSummary {
  return {
    ...response,
    categorySpending: response.categorySpending.map((spending) => ({
      categoryGroupId: spending.categoryGroupId,
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
    categorySpending: response.categorySpending.map((item) => ({
      categoryGroupId: item.categoryGroupId,
      categoryName: item.name,
      amount: item.totalSpent,
    })),
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

export async function getDashboardSummary(budgetMonth?: string) {
  const query = budgetMonth ? `?budgetMonth=${encodeURIComponent(budgetMonth)}` : ''
  const response = await apiRequest(`/api/dashboard/current${query}`, { schema: dashboardSummaryResponseSchema })

  return adaptDashboardSummary(response)
}

export async function getMonthlyStatistics(ledgerId: number, from: string, to: string) {
  const response = await apiRequest<MonthlyStatisticResponse[]>(
    `/api/ledgers/${ledgerId}/statistics/monthly?from=${from}&to=${to}`,
  )

  return response.map(adaptMonthlyStatistic)
}
