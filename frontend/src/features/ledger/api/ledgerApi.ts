import { apiRequest } from '../../../shared/api/client'

export type LedgerType = 'PERSONAL' | 'GROUP'

export type LedgerSummary = {
  id: number
  name: string
  type: LedgerType
  ownerId: number
}

export type LedgerListResponse = {
  currentLedgerId: number
  ledgers: LedgerSummary[]
}

export type LedgerMember = {
  userId: number
  nickname: string
  role: 'OWNER' | 'MEMBER'
}

export type CreateLedgerRequest = {
  name: string
}

export function getLedgers() {
  return apiRequest<LedgerListResponse>('/api/ledgers')
}

export function getLedgerMembers(ledgerId: number) {
  return apiRequest<LedgerMember[]>(`/api/ledgers/${ledgerId}/members`)
}

export function createPersonalLedger(request: CreateLedgerRequest) {
  return apiRequest<LedgerSummary>('/api/ledgers/personal', {
    method: 'POST',
    body: request,
  })
}

export function createGroupLedger(request: CreateLedgerRequest) {
  return apiRequest<LedgerSummary>('/api/ledgers/group', {
    method: 'POST',
    body: request,
  })
}

export function switchLedger(ledgerId: number) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}/use`, {
    method: 'POST',
  })
}

export function renameLedger(ledgerId: number, name: string) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}`, { method: 'PATCH', body: { name } })
}

export function archiveLedger(ledgerId: number) {
  return apiRequest<LedgerSummary>(`/api/ledgers/${ledgerId}/archive`, { method: 'POST' })
}

export function removeLedgerMember(ledgerId: number, userId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/${userId}`, { method: 'DELETE' })
}

export function leaveLedger(ledgerId: number) {
  return apiRequest<void>(`/api/ledgers/${ledgerId}/members/me`, { method: 'DELETE' })
}
