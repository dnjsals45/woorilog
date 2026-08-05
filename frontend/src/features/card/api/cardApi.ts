import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'

export const cardSummarySchema = z.object({
  id: z.number(),
  ledgerId: z.number(),
  name: z.string(),
  statementClosingDay: z.number(),
})
export type CardSummary = z.infer<typeof cardSummarySchema>

export function getCards(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/cards`, { schema: z.array(cardSummarySchema) })
}
