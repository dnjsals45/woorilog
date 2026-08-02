import { apiRequest } from '../../../shared/api/client'

export type NotificationType =
  | 'INVITATION'
  | 'BUDGET'
  | 'MONTH_CLOSED'
  | 'SYSTEM'
  | 'BUDGET_THRESHOLD_80'
  | 'BUDGET_THRESHOLD_100'
  | 'BUDGET_PERIOD_PREPARATION'
  | 'WEEKLY_GUIDE'

export type UserNotification = {
  id: number
  type: NotificationType
  title: string
  message: string
  ledgerId: number | null
  budgetPeriodStart: string | null
  targetPath: string | null
  read: boolean
  createdAt: string
}

export type NotificationList = { items: UserNotification[]; unreadCount: number; nextCursor: string | null }

export type GetNotificationsParams = { ledgerId?: number; unreadOnly?: boolean; cursor?: string; limit?: number }

export function getNotifications(params: GetNotificationsParams = {}) {
  const query = new URLSearchParams()
  if (params.ledgerId !== undefined) query.set('ledgerId', String(params.ledgerId))
  if (params.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly))
  if (params.cursor !== undefined) query.set('cursor', params.cursor)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  return apiRequest<NotificationList>(`/api/notifications${query.size ? `?${query}` : ''}`)
}

export function markNotificationRead(notificationId: number) { return apiRequest<void>(`/api/notifications/${notificationId}/read`, { method: 'POST' }) }
export function markAllNotificationsRead() { return apiRequest<void>('/api/notifications/read-all', { method: 'POST' }) }
export type NotificationPreferences = { budgetWarning80Enabled: boolean; weeklyGuideEnabled: boolean }
export function getNotificationPreferences() { return apiRequest<NotificationPreferences>('/api/notification-preferences') }
export function updateNotificationPreferences(request: NotificationPreferences) { return apiRequest<NotificationPreferences>('/api/notification-preferences', { method: 'PUT', body: request }) }
