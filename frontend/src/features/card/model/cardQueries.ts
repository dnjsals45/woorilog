import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCard, deleteCard, getCards, updateCard, type SaveCardRequest } from '../api/cardApi'

export const cardQueryKeys = {
  all: ['cards'] as const,
  list: (ledgerId: number) => [...cardQueryKeys.all, ledgerId] as const,
}

export function useCardsQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? cardQueryKeys.list(ledgerId) : cardQueryKeys.all,
    queryFn: () => getCards(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

function invalidateCardState(queryClient: ReturnType<typeof useQueryClient>, ledgerId: number | undefined) {
  if (!ledgerId) return
  queryClient.invalidateQueries({ queryKey: cardQueryKeys.list(ledgerId) })
  queryClient.invalidateQueries({ queryKey: ['budget'] })
}

export function useCreateCardMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SaveCardRequest) => createCard(ledgerId!, request),
    onSuccess: () => invalidateCardState(queryClient, ledgerId),
  })
}

export function useUpdateCardMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: number, request: SaveCardRequest }) => updateCard(id, request),
    onSuccess: () => invalidateCardState(queryClient, ledgerId),
  })
}

export function useDeleteCardMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cardId: number) => deleteCard(cardId),
    onSuccess: () => invalidateCardState(queryClient, ledgerId),
  })
}
