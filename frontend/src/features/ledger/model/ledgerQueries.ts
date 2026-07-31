import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authQueryKeys } from '../../auth/model/authQueries'
import {
  createSharedLedger,
  getLedgerMembers,
  getLedgers,
  leaveLedger,
  removeLedgerMember,
  renameLedger,
  switchLedger,
  transferLedgerOwnership,
  type CreateSharedLedgerRequest,
} from '../api/ledgerApi'

export const ledgerQueryKeys = {
  all: ['ledgers'] as const,
  list: () => [...ledgerQueryKeys.all, 'list'] as const,
  members: (ledgerId: number) => [...ledgerQueryKeys.all, ledgerId, 'members'] as const,
}

export function useLedgersQuery() {
  return useQuery({
    queryKey: ledgerQueryKeys.list(),
    queryFn: getLedgers,
    retry: false,
  })
}

export function useLedgerMembersQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? ledgerQueryKeys.members(ledgerId) : ledgerQueryKeys.all,
    queryFn: () => getLedgerMembers(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useSwitchLedgerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ledgerId: number) => switchLedger(ledgerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
      queryClient.invalidateQueries({ queryKey: ['budget', 'dashboard'] })
    },
  })
}

function invalidateLedgerState(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ledgerQueryKeys.all })
  queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
  queryClient.invalidateQueries({ queryKey: ['budget'] })
}

export function useRenameLedgerMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (name: string) => renameLedger(ledgerId!, name), onSuccess: () => invalidateLedgerState(queryClient) })
}

export function useRemoveLedgerMemberMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (userId: number) => removeLedgerMember(ledgerId!, userId), onSuccess: () => invalidateLedgerState(queryClient) })
}

export function useLeaveLedgerMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: () => leaveLedger(ledgerId!), onSuccess: () => invalidateLedgerState(queryClient) })
}

export function useCreateSharedLedgerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateSharedLedgerRequest) => createSharedLedger(request),
    onSuccess: () => invalidateLedgerState(queryClient),
  })
}

export function useTransferLedgerOwnershipMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newOwnerUserId: number) => transferLedgerOwnership(ledgerId!, newOwnerUserId),
    onSuccess: () => invalidateLedgerState(queryClient),
  })
}
