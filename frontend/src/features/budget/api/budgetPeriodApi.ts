import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { budgetSourceSchema, type BudgetSource } from '../../transaction/api/transactionApi'

export const budgetAllocationSchema = z.object({ id: z.number(), source: budgetSourceSchema, owner: z.object({ id: z.number(), nickname: z.string() }).nullish(), amount: z.number(), spentAmount: z.number(), currentBalance: z.number(), scheduledAmount: z.number(), availableAmount: z.number() })
export type BudgetAllocation = z.infer<typeof budgetAllocationSchema>
export const budgetPeriodSchema = z.object({ id: z.number(), ledgerId: z.number(), startDate: z.string(), endDate: z.string(), status: z.enum(['UPCOMING', 'CURRENT', 'PAST']), totalBudget: z.number(), allocations: z.array(budgetAllocationSchema), reserveAmount: z.number().nullable(), prepared: z.boolean() })
export type BudgetPeriod = z.infer<typeof budgetPeriodSchema>
export const budgetPeriodDetailSchema = budgetPeriodSchema.extend({ categoryBudgets: z.array(z.object({ source: budgetSourceSchema, groupCode: z.string(), groupName: z.string(), amount: z.number(), spentAmount: z.number(), previousSpentAmount: z.number().nullable() })) })
export type BudgetPeriodDetail = z.infer<typeof budgetPeriodDetailSchema>
export type ConfigureBudgetPeriodRequest = { totalBudget: number; personalAllocations: Array<{ userId: number; amount: number }>; sharedAllocation: number; categoryBudgets: Array<{ source: BudgetSource; groupCode: string; amount: number }>; increaseTotalBudgetIfNeeded: boolean; applyToFutureDefaults: boolean }
const base = (ledgerId: number) => `/api/ledgers/${ledgerId}/budget-periods`
export function getCurrentBudgetPeriod(ledgerId: number, at?: string) { return apiRequest(`${base(ledgerId)}/current${at ? `?at=${at}` : ''}`, { schema: budgetPeriodDetailSchema }) }
export function listBudgetPeriods(ledgerId: number) { return apiRequest(base(ledgerId), { schema: z.object({ items: z.array(budgetPeriodSchema), nextCursor: z.string().nullable() }) }) }
export function getBudgetPeriod(ledgerId: number, startDate: string) { return apiRequest(`${base(ledgerId)}/${startDate}`, { schema: budgetPeriodDetailSchema }) }
export function configureBudgetPeriod(ledgerId: number, startDate: string, request: ConfigureBudgetPeriodRequest) { return apiRequest(`${base(ledgerId)}/${startDate}`, { method: 'PUT', body: request, schema: budgetPeriodDetailSchema }) }
export function copyBudgetPeriod(ledgerId: number, startDate: string, sourceStartDate: string) { return apiRequest(`${base(ledgerId)}/${startDate}/copy`, { method: 'POST', body: { sourceStartDate }, schema: budgetPeriodDetailSchema }) }
export function transferReserve(ledgerId: number, startDate: string, amount: number, target: BudgetSource) { return apiRequest(`${base(ledgerId)}/${startDate}/reserve-transfers`, { method: 'POST', body: { amount, target }, schema: z.object({ period: budgetPeriodSchema, transfer: z.unknown() }) }) }
export const reserveTransferSchema = z.object({ id: z.number(), amount: z.number(), target: budgetSourceSchema, actor: z.object({ id: z.number(), nickname: z.string() }), createdAt: z.string() })
export type ReserveTransfer = z.infer<typeof reserveTransferSchema>
export function getReserveTransfers(ledgerId: number, startDate: string) { return apiRequest(`${base(ledgerId)}/${startDate}/reserve-transfers`, { schema: z.object({ items: z.array(reserveTransferSchema) }) }) }
