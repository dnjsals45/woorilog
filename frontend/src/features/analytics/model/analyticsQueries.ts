import { useQuery } from '@tanstack/react-query'
import { getAnalytics, type AnalyticsScope } from '../api/analyticsApi'
export const analyticsQueryKeys = { all: ['analytics'] as const, detail: (ledgerId: number, periodStart?: string, scope: AnalyticsScope = 'ALL') => ['analytics', ledgerId, periodStart, scope] as const }
export function useAnalyticsQuery(ledgerId: number | undefined, periodStart?: string, scope: AnalyticsScope = 'ALL') { return useQuery({ queryKey: ledgerId ? analyticsQueryKeys.detail(ledgerId, periodStart, scope) : analyticsQueryKeys.all, queryFn: () => getAnalytics(ledgerId!, periodStart, scope), enabled: Boolean(ledgerId), retry: false }) }
