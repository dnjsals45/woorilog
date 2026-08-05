import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'

export const notificationTypeSchema = z.enum([
  'INVITATION',
  'BUDGET',
  'MONTH_CLOSED',
  'SYSTEM',
  'BUDGET_THRESHOLD_80',
  'BUDGET_THRESHOLD_100',
  'BUDGET_PERIOD_PREPARATION',
  'WEEKLY_GUIDE',
  'BUDGET_CHANGED',
  'RESERVE_TRANSFER',
])
export type NotificationType = z.infer<typeof notificationTypeSchema>

export const userNotificationSchema = z.object({
  id: z.number(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  ledgerId: z.number().nullable(),
  budgetPeriodStart: z.string().nullable(),
  targetPath: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
})
export type UserNotification = z.infer<typeof userNotificationSchema>

export const notificationListSchema = z.object({ items: z.array(userNotificationSchema), unreadCount: z.number(), nextCursor: z.string().nullable() })
export type NotificationList = z.infer<typeof notificationListSchema>

export type GetNotificationsParams = { ledgerId?: number; unreadOnly?: boolean; cursor?: string; limit?: number }

export function getNotifications(params: GetNotificationsParams = {}) {
  const query = new URLSearchParams()
  if (params.ledgerId !== undefined) query.set('ledgerId', String(params.ledgerId))
  if (params.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly))
  if (params.cursor !== undefined) query.set('cursor', params.cursor)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  return apiRequest(`/api/notifications${query.size ? `?${query}` : ''}`, { schema: notificationListSchema })
}

export function markNotificationRead(notificationId: number) { return apiRequest<void>(`/api/notifications/${notificationId}/read`, { method: 'POST' }) }
export function markAllNotificationsRead() { return apiRequest<void>('/api/notifications/read-all', { method: 'POST' }) }
export const notificationPreferencesSchema = z.object({ budgetWarning80Enabled: z.boolean(), weeklyGuideEnabled: z.boolean() })
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>
export function getNotificationPreferences() { return apiRequest('/api/notification-preferences', { schema: notificationPreferencesSchema }) }
export function updateNotificationPreferences(request: NotificationPreferences) { return apiRequest('/api/notification-preferences', { method: 'PUT', body: request, schema: notificationPreferencesSchema }) }
