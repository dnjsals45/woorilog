import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { IconButton } from '../../../shared/ui/IconButton'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { groupNotifications } from '../model/notificationGrouping'
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery } from '../model/notificationQueries'
import { NotificationRow } from './NotificationRow'

export interface NotificationInboxProps {
  open: boolean
  onClose: () => void
}

/**
 * 대시보드 헤더의 종 아이콘이 여는 알림함 팝오버.
 * 디자인 원본은 전체 페이지가 아니라 `position: fixed; top:78px; right:36px; width:436px` 플로팅 카드다.
 * 내용(그룹 헤더·행·빈 상태)은 `NotificationsPage`와 같은 컴포넌트를 재사용한다.
 */
export function NotificationInbox({ open, onClose }: NotificationInboxProps) {
  const navigate = useNavigate()
  const query = useNotificationsQuery()
  const markRead = useMarkNotificationReadMutation()
  const markAll = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const unreadCount = query.data?.unreadCount ?? 0
  const groups = query.data ? groupNotifications(query.data.items) : []
  const hasItems = groups.length > 0

  return (
    <>
      <div aria-hidden="true" className="wl-notification-scrim" onClick={onClose} />
      <section aria-label="알림함" className="wl-notification-inbox" role="dialog">
        <header
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--wl-color-border)',
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            padding: '16px 18px',
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 8, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.015em', margin: 0 }}>알림</h2>
            <Badge tone={unreadCount ? 'brand' : 'neutral'}>{`읽지 않음 ${unreadCount}`}</Badge>
          </div>
          <div style={{ alignItems: 'center', display: 'flex', flex: 'none', gap: 4 }}>
            <Button disabled={markAll.isPending || unreadCount === 0} onClick={() => markAll.mutate()} variant="text">
              모두 읽음
            </Button>
            <IconButton
              label="알림 설정"
              name="settings"
              onClick={() => {
                onClose()
                navigate('/settings')
              }}
            />
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {query.isLoading ? (
            <div style={{ display: 'grid', gap: 12, padding: 20 }}>
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </div>
          ) : null}

          {query.isError ? (
            <div style={{ padding: 20 }}>
              <ErrorState onRetry={() => query.refetch()} />
            </div>
          ) : null}

          {query.isSuccess && !hasItems ? (
            <div style={{ padding: 20 }}>
              <EmptyState description="예산 사용률이 80%를 넘거나 공동 예산이 바뀌면 여기에서 알려드려요." title="새로운 알림이 없어요" />
            </div>
          ) : null}

          {query.isSuccess && hasItems
            ? groups.map((group) => (
                <div key={group.label}>
                  <p className="wl-label" style={{ margin: 0, padding: '16px 18px 6px' }}>
                    {group.label}
                  </p>
                  <ul style={{ display: 'grid', gap: 2, listStyle: 'none', margin: 0, padding: '0 10px 6px' }}>
                    {group.items.map((item) => (
                      <NotificationRow item={item} key={item.id} onRead={() => markRead.mutate(item.id)} />
                    ))}
                  </ul>
                </div>
              ))
            : null}
        </div>

        <p
          style={{
            background: 'var(--wl-color-surface-subtle)',
            borderTop: '1px solid var(--wl-color-border)',
            color: 'var(--wl-color-text-secondary)',
            fontSize: 12.5,
            lineHeight: 1.55,
            margin: 0,
            padding: '13px 18px',
            wordBreak: 'keep-all',
          }}
        >
          지난 예산 기간의 알림은 새 기간이 시작되면 자동으로 정리돼요.
        </p>
      </section>
    </>
  )
}
