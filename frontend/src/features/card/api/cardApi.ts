import { apiRequest } from '../../../shared/api/client'

export type Card = {
  id: number
  ledgerId: number
  name: string
  statementClosingDay: number
}

export type SaveCardRequest = Omit<Card, 'id' | 'ledgerId'>

export function getCards(ledgerId: number) {
  return apiRequest<Card[]>(`/api/ledgers/${ledgerId}/cards`)
}

export function createCard(ledgerId: number, request: SaveCardRequest) {
  return apiRequest<Card>(`/api/ledgers/${ledgerId}/cards`, { method: 'POST', body: request })
}

export function updateCard(cardId: number, request: SaveCardRequest) {
  return apiRequest<Card>(`/api/cards/${cardId}`, { method: 'PUT', body: request })
}

export function deleteCard(cardId: number) {
  return apiRequest<void>(`/api/cards/${cardId}`, { method: 'DELETE' })
}
