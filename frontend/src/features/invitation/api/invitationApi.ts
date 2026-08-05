import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { currentUserSchema } from '../../auth/api/authApi'
import { budgetCycleSchema, ledgerTypeSchema, v1LedgerSummarySchema } from '../../ledger/api/ledgerApi'

export const invitationTypeSchema = z.enum(['DIRECT', 'LINK'])
export type InvitationType = z.infer<typeof invitationTypeSchema>
export const invitationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'])
export type InvitationStatus = z.infer<typeof invitationStatusSchema>

/** 초대 응답의 사용자에는 CurrentUser 에 없는 lastUsedLedgerId 가 함께 옵니다. */
const invitationUserSchema = currentUserSchema.extend({ lastUsedLedgerId: z.number().nullish() })

export const invitableUserResponseSchema = z.object({
  user: invitationUserSchema,
  invitable: z.boolean(),
  reason: z.string().nullable(),
})
export type InvitableUserResponse = z.infer<typeof invitableUserResponseSchema>

export const invitationSchema = z.object({
  id: z.number(),
  ledgerId: z.number(),
  ledgerName: z.string(),
  ledgerType: ledgerTypeSchema,
  inviter: invitationUserSchema,
  invitee: invitationUserSchema.nullable(),
  type: invitationTypeSchema,
  status: invitationStatusSchema,
  token: z.string().nullable(),
  expiresAt: z.string().nullable(),
  respondedAt: z.string().nullable(),
  createdAt: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>

export const linkInvitationPreviewSchema = z.object({
  invitationId: z.number(),
  ledgerName: z.string(),
  inviter: z.object({ id: z.number(), nickname: z.string() }),
  status: invitationStatusSchema,
  expiresAt: z.string(),
  authenticationRequired: z.boolean(),
  currentMemberCount: z.number(),
  /** 비로그인 조회면 null. */
  viewerAlreadyMember: z.boolean().nullable(),
  /** 이 가계부를 쓴 적 있는 다른 상대가 있어 참여가 막히는지. 비로그인 조회면 null. */
  viewerIsDifferentPartner: z.boolean().nullable(),
  budgetCycle: budgetCycleSchema,
})
export type LinkInvitationPreview = z.infer<typeof linkInvitationPreviewSchema>

export const invitationLinkCreatedSchema = z.object({ invitationId: z.number(), url: z.string(), expiresAt: z.string() })
export type InvitationLinkCreated = z.infer<typeof invitationLinkCreatedSchema>

export function getInvitableUser(ledgerId: number, email: string) {
  const params = new URLSearchParams({ email })

  return apiRequest(`/api/ledgers/${ledgerId}/invitable-user?${params.toString()}`, {
    schema: invitableUserResponseSchema,
  })
}

export function inviteUser(ledgerId: number, userId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/invitations/users`, {
    method: 'POST',
    body: { userId },
    schema: invitationSchema,
  })
}

export function createInvitationLink(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/invitations/links`, {
    method: 'POST',
    schema: invitationLinkCreatedSchema,
  })
}

export function getLedgerInvitations(ledgerId: number) {
  return apiRequest(`/api/ledgers/${ledgerId}/invitations`, { schema: z.array(invitationSchema) })
}

export function cancelInvitation(ledgerId: number, invitationId: number) {
  return apiRequest<void>(
    `/api/ledgers/${ledgerId}/invitations/${invitationId}`,
    { method: 'DELETE' },
  )
}

export function getPendingInvitations() {
  return apiRequest('/api/invitations/pending', { schema: z.array(invitationSchema) })
}

export function acceptInvitation(invitationId: number) {
  return apiRequest(`/api/invitations/${invitationId}/accept`, {
    method: 'POST',
    schema: invitationSchema,
  })
}

export function rejectInvitation(invitationId: number) {
  return apiRequest(`/api/invitations/${invitationId}/reject`, {
    method: 'POST',
    schema: invitationSchema,
  })
}

export function getLinkInvitationPreview(token: string) {
  return apiRequest(`/api/invitations/links/${token}`, { schema: linkInvitationPreviewSchema })
}

export function acceptLinkInvitation(token: string) {
  return apiRequest(`/api/invitations/links/${token}/accept`, {
    method: 'POST',
    schema: z.object({ ledger: v1LedgerSummarySchema }),
  })
}

export function rejectLinkInvitation(token: string) {
  return apiRequest<void>(`/api/invitations/links/${token}/reject`, { method: 'POST' })
}
