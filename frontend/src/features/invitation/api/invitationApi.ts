import { apiRequest } from '../../../shared/api/client'
import type { CurrentUser } from '../../auth/api/authApi'
import type { LedgerSummary, LedgerType } from '../../ledger/api/ledgerApi'

export type InvitationType = 'DIRECT' | 'LINK'
export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'

export type InvitableUserResponse = {
  user: CurrentUser & { lastUsedLedgerId?: number | null }
  invitable: boolean
  reason: string | null
}

export type Invitation = {
  id: number
  ledgerId: number
  ledgerName: string
  ledgerType: LedgerType
  inviter: CurrentUser & { lastUsedLedgerId?: number | null }
  invitee: (CurrentUser & { lastUsedLedgerId?: number | null }) | null
  type: InvitationType
  status: InvitationStatus
  token: string | null
  expiresAt: string | null
  respondedAt: string | null
  createdAt: string
}

export type LinkInvitationPreview = {
  invitationId: number
  ledgerName: string
  inviter: { id: number; nickname: string }
  status: InvitationStatus
  expiresAt: string
  authenticationRequired: boolean
}

export type InvitationLinkCreated = { invitationId: number; url: string; expiresAt: string }

export function getInvitableUser(ledgerId: number, email: string) {
  const params = new URLSearchParams({ email })

  return apiRequest<InvitableUserResponse>(
    `/api/ledgers/${ledgerId}/invitable-user?${params.toString()}`,
  )
}

export function inviteUser(ledgerId: number, userId: number) {
  return apiRequest<Invitation>(`/api/ledgers/${ledgerId}/invitations/users`, {
    method: 'POST',
    body: { userId },
  })
}

export function createInvitationLink(ledgerId: number) {
  return apiRequest<InvitationLinkCreated>(`/api/ledgers/${ledgerId}/invitations/links`, {
    method: 'POST',
  })
}

export function getLedgerInvitations(ledgerId: number) {
  return apiRequest<Invitation[]>(`/api/ledgers/${ledgerId}/invitations`)
}

export function cancelInvitation(ledgerId: number, invitationId: number) {
  return apiRequest<void>(
    `/api/ledgers/${ledgerId}/invitations/${invitationId}`,
    { method: 'DELETE' },
  )
}

export function getPendingInvitations() {
  return apiRequest<Invitation[]>('/api/invitations/pending')
}

export function acceptInvitation(invitationId: number) {
  return apiRequest<Invitation>(`/api/invitations/${invitationId}/accept`, {
    method: 'POST',
  })
}

export function rejectInvitation(invitationId: number) {
  return apiRequest<Invitation>(`/api/invitations/${invitationId}/reject`, {
    method: 'POST',
  })
}

export function getLinkInvitationPreview(token: string) {
  return apiRequest<LinkInvitationPreview>(`/api/invitations/links/${token}`)
}

export function acceptLinkInvitation(token: string) {
  return apiRequest<{ ledger: LedgerSummary }>(`/api/invitations/links/${token}/accept`, {
    method: 'POST',
  })
}

export function rejectLinkInvitation(token: string) {
  return apiRequest<void>(`/api/invitations/links/${token}/reject`, { method: 'POST' })
}
