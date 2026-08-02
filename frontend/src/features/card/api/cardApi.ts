import { apiRequest } from '../../../shared/api/client'

export type CardSummary = {
  id: number
  ledgerId: number
  name: string
  statementClosingDay: number
}

export function getCards(ledgerId: number) {
  return apiRequest<CardSummary[]>(`/api/ledgers/${ledgerId}/cards`)
}
