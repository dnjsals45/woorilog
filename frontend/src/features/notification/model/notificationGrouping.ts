import type { UserNotification } from '../api/notificationApi'

export type NotificationGroup = { label: string; items: UserNotification[] }

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfWeek(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

/** 알림 목록을 오늘/이번 주/이전 알림 그룹으로 나눕니다. 알림함 전체 페이지와 대시보드 팝오버가 공유합니다. */
export function groupNotifications(notifications: UserNotification[]): NotificationGroup[] {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const today: UserNotification[] = []
  const thisWeek: UserNotification[] = []
  const earlier: UserNotification[] = []
  for (const item of notifications) {
    const createdAt = new Date(item.createdAt)
    if (isSameDate(createdAt, now)) today.push(item)
    else if (createdAt >= weekStart) thisWeek.push(item)
    else earlier.push(item)
  }
  return [
    { label: '오늘', items: today },
    { label: '이번 주', items: thisWeek },
    { label: '이전 알림', items: earlier },
  ].filter((group) => group.items.length > 0)
}

export function formatNotificationTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const hours24 = date.getHours()
  const period = hours24 < 12 ? '오전' : '오후'
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const minute = String(date.getMinutes()).padStart(2, '0')
  const timeLabel = `${period} ${hour12}시 ${minute}분`
  return isSameDate(date, now) ? `오늘 ${timeLabel}` : `${date.getMonth() + 1}월 ${date.getDate()}일 ${timeLabel}`
}
