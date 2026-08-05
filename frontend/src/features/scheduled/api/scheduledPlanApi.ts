import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { budgetSourceSchema, type BudgetSource } from '../../transaction/api/transactionApi'
/* 할부 관련 필드(totalAmount·round·totalRounds·principalAmount·monthlyInterest)는
 * type === 'RECURRING_EXPENSE' 인 플랜에서는 항상 null 이다. */
export const scheduledPlanSchema = z.object({ id: z.number(), type: z.enum(['RECURRING_EXPENSE', 'INSTALLMENT']), name: z.string(), amount: z.number(), frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).nullable(), status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']), nextDueDate: z.string(), isFixedExpense: z.boolean(), categoryId: z.number().nullable(), categoryName: z.string().nullable(), budgetSource: budgetSourceSchema.nullable(), totalAmount: z.number().nullable(), round: z.number().nullable(), totalRounds: z.number().nullable(), principalAmount: z.number().nullable(), monthlyInterest: z.number().nullable() })
export type ScheduledPlan = z.infer<typeof scheduledPlanSchema>
export type RecurringExpensePlanRequest = { name: string; amount: number; merchant?: string | null; memo?: string | null; categoryId: number; budgetSource: BudgetSource; frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'; startDate: string; endDate?: string | null; isFixedExpense: boolean; paymentMethod?: { type: 'CASH' | 'CARD' | 'OTHER'; displayName?: string | null } | null }
export function listScheduledPlans(ledgerId: number, params: { status?: string; kind?: string; fixedExpense?: boolean } = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])); return apiRequest(`/api/ledgers/${ledgerId}/scheduled-plans${query.size ? `?${query}` : ''}`, { schema: z.array(scheduledPlanSchema) }) }
export function createRecurringExpensePlan(ledgerId: number, request: RecurringExpensePlanRequest) { return apiRequest(`/api/ledgers/${ledgerId}/scheduled-plans/recurring-expenses`, { method: 'POST', body: request, schema: scheduledPlanSchema }) }
export function getFixedExpenses(ledgerId: number) { return apiRequest(`/api/ledgers/${ledgerId}/fixed-expenses`, { schema: z.array(scheduledPlanSchema) }) }
export type UpdateScheduledPlanRequest = { scope: 'FUTURE'; name?: string; amount?: number; nextDueDate?: string; endDate?: string | null; isFixedExpense?: boolean; categoryId?: number; budgetSource?: BudgetSource; frequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY' }
export function updateScheduledPlan(planId: number, request: UpdateScheduledPlanRequest) { return apiRequest(`/api/scheduled-plans/${planId}`, { method: 'PUT', body: request, schema: scheduledPlanSchema }) }
export function pauseScheduledPlan(planId: number) { return apiRequest(`/api/scheduled-plans/${planId}/pause`, { method: 'POST', schema: scheduledPlanSchema }) }
export function resumeScheduledPlan(planId: number, nextDueDate: string) { return apiRequest(`/api/scheduled-plans/${planId}/resume`, { method: 'POST', body: { nextDueDate }, schema: scheduledPlanSchema }) }
export function deleteScheduledPlan(planId: number) { return apiRequest<void>(`/api/scheduled-plans/${planId}`, { method: 'DELETE' }) }
