import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  createCategoryGroup,
  deleteCategory,
  getCategoryGroups,
  type CreateCategoryGroupRequest,
  getCategories,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  updateCategory,
} from '../api/categoryApi'

export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (ledgerId: number) => [...categoryQueryKeys.all, ledgerId, 'list'] as const,
  groups: (ledgerId: number) => [...categoryQueryKeys.all, ledgerId, 'groups'] as const,
}

export function useCategoryGroupsQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? categoryQueryKeys.groups(ledgerId) : categoryQueryKeys.all,
    queryFn: () => getCategoryGroups(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useCategoriesQuery(ledgerId: number | undefined) {
  return useQuery({
    queryKey: ledgerId ? categoryQueryKeys.list(ledgerId) : categoryQueryKeys.all,
    queryFn: () => getCategories(ledgerId!),
    enabled: Boolean(ledgerId),
    retry: false,
  })
}

export function useCreateCategoryGroupMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateCategoryGroupRequest) => createCategoryGroup(ledgerId!, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKeys.groups(ledgerId) })
      }
    },
  })
}

export function useCreateCategoryMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateCategoryRequest) => createCategory(ledgerId!, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list(ledgerId) })
        queryClient.invalidateQueries({ queryKey: ['budget'] })
      }
    },
  })
}

export function useUpdateCategoryMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ categoryId, request }: { categoryId: number; request: UpdateCategoryRequest }) => updateCategory(categoryId, request),
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list(ledgerId) })
        queryClient.invalidateQueries({ queryKey: ['budget'] })
      }
    },
  })
}

export function useDeleteCategoryMutation(ledgerId: number | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      if (ledgerId) {
        queryClient.invalidateQueries({ queryKey: categoryQueryKeys.list(ledgerId) })
        queryClient.invalidateQueries({ queryKey: ['budget'] })
      }
    },
  })
}
