import { apiRequest } from '../../../shared/api/client'
import type { BudgetSource } from '../../transaction/api/transactionApi'
export type ScheduledPlan = { id: number; type: 'RECURRING_EXPENSE' | 'INSTALLMENT'; name: string; amount: number; frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'; nextDueDate: string; isFixedExpense: boolean }
export type RecurringExpensePlanRequest = { name: string; amount: number; merchant?: string | null; memo?: string | null; categoryId: number; budgetSource: BudgetSource; frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'; startDate: string; endDate?: string | null; fixedExpense: boolean; paymentMethod?: { type: 'CASH' | 'CARD' | 'OTHER'; displayName?: string | null } | null }
export function listScheduledPlans(ledgerId: number, params: { status?: string; kind?: string; fixedExpense?: boolean } = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])); return apiRequest<ScheduledPlan[]>(`/api/ledgers/${ledgerId}/scheduled-plans${query.size ? `?${query}` : ''}`) }
export function createRecurringExpensePlan(ledgerId: number, request: RecurringExpensePlanRequest) { return apiRequest<ScheduledPlan>(`/api/ledgers/${ledgerId}/scheduled-plans/recurring-expenses`, { method: 'POST', body: request }) }
export function getFixedExpenses(ledgerId: number) { return apiRequest<ScheduledPlan[]>(`/api/ledgers/${ledgerId}/fixed-expenses`) }
export function pauseScheduledPlan(planId: number) { return apiRequest<ScheduledPlan>(`/api/scheduled-plans/${planId}/pause`, { method: 'POST' }) }
export function resumeScheduledPlan(planId: number, nextDueDate: string) { return apiRequest<ScheduledPlan>(`/api/scheduled-plans/${planId}/resume`, { method: 'POST', body: { nextDueDate } }) }
export function deleteScheduledPlan(planId: number) { return apiRequest<void>(`/api/scheduled-plans/${planId}`, { method: 'DELETE' }) }
