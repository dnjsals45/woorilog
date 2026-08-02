import { apiRequest } from '../../../shared/api/client'
import type { BudgetSource } from '../../transaction/api/transactionApi'

export type BudgetAllocation = { id: number; source: BudgetSource; owner?: { id: number; nickname: string } | null; amount: number; spentAmount: number; currentBalance: number; scheduledAmount: number; availableAmount: number }
export type BudgetPeriod = { id: number; ledgerId: number; startDate: string; endDate: string; status: 'UPCOMING' | 'CURRENT' | 'PAST'; totalBudget: number; allocations: BudgetAllocation[]; reserveAmount: number | null; prepared: boolean }
export type BudgetPeriodDetail = BudgetPeriod & { categoryBudgets: Array<{ source: BudgetSource; groupCode: string; groupName: string; amount: number; spentAmount: number; previousSpentAmount: number | null }> }
export type ConfigureBudgetPeriodRequest = { totalBudget: number; personalAllocations: Array<{ userId: number; amount: number }>; sharedAllocation: number; categoryBudgets: Array<{ source: BudgetSource; groupCode: string; amount: number }>; increaseTotalBudgetIfNeeded: boolean; applyToFutureDefaults: boolean }
const base = (ledgerId: number) => `/api/ledgers/${ledgerId}/budget-periods`
export function getCurrentBudgetPeriod(ledgerId: number, at?: string) { return apiRequest<BudgetPeriodDetail>(`${base(ledgerId)}/current${at ? `?at=${at}` : ''}`) }
export function listBudgetPeriods(ledgerId: number) { return apiRequest<{ items: BudgetPeriod[]; nextCursor: string | null }>(base(ledgerId)) }
export function getBudgetPeriod(ledgerId: number, startDate: string) { return apiRequest<BudgetPeriodDetail>(`${base(ledgerId)}/${startDate}`) }
export function configureBudgetPeriod(ledgerId: number, startDate: string, request: ConfigureBudgetPeriodRequest) { return apiRequest<BudgetPeriodDetail>(`${base(ledgerId)}/${startDate}`, { method: 'PUT', body: request }) }
export function copyBudgetPeriod(ledgerId: number, startDate: string, sourceStartDate: string) { return apiRequest<BudgetPeriodDetail>(`${base(ledgerId)}/${startDate}/copy`, { method: 'POST', body: { sourceStartDate } }) }
export function transferReserve(ledgerId: number, startDate: string, amount: number, target: BudgetSource) { return apiRequest<{ period: BudgetPeriod; transfer: unknown }>(`${base(ledgerId)}/${startDate}/reserve-transfers`, { method: 'POST', body: { amount, target } }) }
export type ReserveTransfer = { id: number; amount: number; target: BudgetSource; actor: { id: number; nickname: string }; createdAt: string }
export function getReserveTransfers(ledgerId: number, startDate: string) { return apiRequest<ReserveTransfer[]>(`${base(ledgerId)}/${startDate}/reserve-transfers`) }
