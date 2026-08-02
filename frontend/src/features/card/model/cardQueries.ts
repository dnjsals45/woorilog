import { useQuery } from '@tanstack/react-query'
import { getCards } from '../api/cardApi'

export const cardQueryKeys = {
  all: ['cards'] as const,
  list: (ledgerId: number) => [...cardQueryKeys.all, ledgerId, 'list'] as const,
}

export function useCardsQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? cardQueryKeys.list(ledgerId) : cardQueryKeys.all,
    queryFn: () => getCards(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}
