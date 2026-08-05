import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'

export const analyticsScopeSchema = z.enum(['ALL', 'SHARED', 'MINE'])
export type AnalyticsScope = z.infer<typeof analyticsScopeSchema>

export const analyticsResponseSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  scope: analyticsScopeSchema,
  totalExpenseAmount: z.number(),
  previousPeriodExpenseAmount: z.number().nullable(),
  changeAmount: z.number().nullable(),
  /* previousAmount 는 비교할 이전 기간이 없을 때만 null 입니다(백엔드 InsightsResult 주석). */
  categoryDistribution: z.array(z.object({ groupCode: z.string(), groupName: z.string(), amount: z.number(), previousAmount: z.number().nullable() })),
  dailyFlow: z.array(z.object({ date: z.string(), amount: z.number(), cumulativeAmount: z.number() })),
  trend: z.array(z.object({ startDate: z.string(), endDate: z.string(), expenseAmount: z.number() })),
})
export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>

export function getAnalytics(ledgerId: number, periodStart?: string, scope: AnalyticsScope = 'ALL') { const query = new URLSearchParams({ scope }); if (periodStart) query.set('periodStart', periodStart); return apiRequest(`/api/ledgers/${ledgerId}/analytics?${query}`, { schema: analyticsResponseSchema }) }
