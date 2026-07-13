import { apiRequest } from '../../../shared/api/client'

export type UserNotification = { id: number; type: 'INVITATION' | 'BUDGET' | 'MONTH_CLOSED' | 'SYSTEM'; title: string; message: string; targetPath: string | null; readAt: string | null; createdAt: string }
export type NotificationList = { unreadCount: number; notifications: UserNotification[] }

export function getNotifications() { return apiRequest<NotificationList>('/api/notifications') }
export function markNotificationRead(notificationId: number) { return apiRequest<UserNotification>(`/api/notifications/${notificationId}/read`, { method: 'POST' }) }
export function markAllNotificationsRead() { return apiRequest<void>('/api/notifications/read-all', { method: 'POST' }) }
