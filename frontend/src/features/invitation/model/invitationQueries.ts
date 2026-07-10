import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authQueryKeys } from '../../auth/model/authQueries'
import { ledgerQueryKeys } from '../../ledger/model/ledgerQueries'
import {
  acceptInvitation,
  acceptLinkInvitation,
  cancelInvitation,
  createInvitationLink,
  getInvitableUser,
  getLedgerInvitations,
  getLinkInvitationPreview,
  getPendingInvitations,
  inviteUser,
  rejectInvitation,
} from '../api/invitationApi'

export const invitationQueryKeys = {
  all: ['invitations'] as const,
  invitableUser: (ledgerId: number, email: string) =>
    [...invitationQueryKeys.all, ledgerId, 'invitable-user', email] as const,
  ledgerList: (ledgerId: number) =>
    [...invitationQueryKeys.all, ledgerId, 'ledger-list'] as const,
  pending: () => [...invitationQueryKeys.all, 'pending'] as const,
  linkPreview: (token: string) =>
    [...invitationQueryKeys.all, 'link-preview', token] as const,
}

export function useInvitableUserQuery(
  ledgerId: number | undefined,
  email: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ledgerId
      ? invitationQueryKeys.invitableUser(ledgerId, email)
      : invitationQueryKeys.all,
    queryFn: () => getInvitableUser(ledgerId!, email),
    enabled: Boolean(ledgerId && email && enabled),
    retry: false,
  })
}

export function useLedgerInvitationsQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId
      ? invitationQueryKeys.ledgerList(ledgerId)
      : invitationQueryKeys.all,
    queryFn: () => getLedgerInvitations(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function usePendingInvitationsQuery() {
  return useQuery({
    queryKey: invitationQueryKeys.pending(),
    queryFn: getPendingInvitations,
    retry: false,
  })
}

export function useInviteUserMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => inviteUser(ledgerId!, userId),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: invitationQueryKeys.ledgerList(ledgerId),
        })
      }
      queryClient.invalidateQueries({ queryKey: invitationQueryKeys.all })
    },
  })
}

export function useCreateInvitationLinkMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expiresInDays: number) =>
      createInvitationLink(ledgerId!, { expiresInDays }),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: invitationQueryKeys.ledgerList(ledgerId),
        })
      }
    },
  })
}

export function useCancelInvitationMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: number) => cancelInvitation(ledgerId!, invitationId),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({
          queryKey: invitationQueryKeys.ledgerList(ledgerId),
        })
      }
    },
  })
}

export function useInvitationResponseMutation(action: 'accept' | 'reject') {
  const queryClient = useQueryClient()
  const mutationFn = action === 'accept' ? acceptInvitation : rejectInvitation

  return useMutation({
    mutationFn: (invitationId: number) => mutationFn(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationQueryKeys.pending() })
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useLinkInvitationPreviewQuery(token: string | undefined) {
  return useQuery({
    queryKey: token
      ? invitationQueryKeys.linkPreview(token)
      : invitationQueryKeys.all,
    queryFn: () => getLinkInvitationPreview(token!),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useAcceptLinkInvitationMutation(token: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => acceptLinkInvitation(token!),
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({
          queryKey: invitationQueryKeys.linkPreview(token),
        })
      }
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
