import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  getCategories,
  type CreateCategoryRequest,
} from '../api/categoryApi'

export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (ledgerId: number) => [...categoryQueryKeys.all, ledgerId, 'list'] as const,
}

export function useCategoriesQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? categoryQueryKeys.list(ledgerId) : categoryQueryKeys.all,
    queryFn: () => getCategories(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useCreateCategoryMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateCategoryRequest) => createCategory(ledgerId!, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list(ledgerId) })
      }
    },
  })
}
