import { apiRequest } from '../../../shared/api/client'
import type { BudgetSource } from '../../transaction/api/transactionApi'
/* 할부 관련 필드(totalAmount·round·totalRounds·principalAmount·monthlyInterest)는
 * type === 'RECURRING_EXPENSE' 인 플랜에서는 항상 null 이다. */
export type ScheduledPlan = { id: number; type: 'RECURRING_EXPENSE' | 'INSTALLMENT'; name: string; amount: number; frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'; nextDueDate: string; isFixedExpense: boolean; categoryId: number | null; categoryName: string | null; budgetSource: BudgetSource | null; totalAmount: number | null; round: number | null; totalRounds: number | null; principalAmount: number | null; monthlyInterest: number | null }
export type RecurringExpensePlanRequest = { name: string; amount: number; merchant?: string | null; memo?: string | null; categoryId: number; budgetSource: BudgetSource; frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'; startDate: string; endDate?: string | null; isFixedExpense: boolean; paymentMethod?: { type: 'CASH' | 'CARD' | 'OTHER'; displayName?: string | null } | null }
export function listScheduledPlans(ledgerId: number, params: { status?: string; kind?: string; fixedExpense?: boolean } = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])); return apiRequest<ScheduledPlan[]>(`/api/ledgers/${ledgerId}/scheduled-plans${query.size ? `?${query}` : ''}`) }
export function createRecurringExpensePlan(ledgerId: number, request: RecurringExpensePlanRequest) { return apiRequest<ScheduledPlan>(`/api/ledgers/${ledgerId}/scheduled-plans/recurring-expenses`, { method: 'POST', body: request }) }
export function getFixedExpenses(ledgerId: number) { return apiRequest<ScheduledPlan[]>(`/api/ledgers/${ledgerId}/fixed-expenses`) }
export type UpdateScheduledPlanRequest = { scope: 'FUTURE'; name?: string; amount?: number; nextDueDate?: string; endDate?: string | null; isFixedExpense?: boolean; categoryId?: number; budgetSource?: BudgetSource; frequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY' }
export function updateScheduledPlan(planId: number, request: UpdateScheduledPlanRequest) { return apiRequest<ScheduledPlan>(`/api/scheduled-plans/${planId}`, { method: 'PUT', body: request }) }
export function pauseScheduledPlan(planId: number) { return apiRequest<ScheduledPlan>(`/api/scheduled-plans/${planId}/pause`, { method: 'POST' }) }
export function resumeScheduledPlan(planId: number, nextDueDate: string) { return apiRequest<ScheduledPlan>(`/api/scheduled-plans/${planId}/resume`, { method: 'POST', body: { nextDueDate } }) }
export function deleteScheduledPlan(planId: number) { return apiRequest<void>(`/api/scheduled-plans/${planId}`, { method: 'DELETE' }) }
