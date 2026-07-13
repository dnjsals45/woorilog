import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationApi'

export const notificationQueryKeys = { all: ['notifications'] as const }
export function useNotificationsQuery() { return useQuery({ queryKey: notificationQueryKeys.all, queryFn: getNotifications, retry: false, refetchInterval: 60_000 }) }
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }) })
}
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }) })
}
