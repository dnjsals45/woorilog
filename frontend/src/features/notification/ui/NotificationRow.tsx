import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatNotificationTime } from '../model/notificationGrouping'
import { Icon } from '../../../shared/ui/Icon'
import type { IconName } from '../../../shared/ui/Icon'
import type { UserNotification } from '../api/notificationApi'

type NotificationTone = 'brand' | 'amber' | 'blue' | 'danger'

/* 디자인이 요구하는 알림 종류별 아이콘·톤 매핑입니다. 백엔드 NotificationType 10종을 모두 덮습니다. */
const TYPE_PRESENTATION: Record<UserNotification['type'], { icon: IconName; tone: NotificationTone }> = {
  INVITATION: { icon: 'users', tone: 'brand' },
  BUDGET: { icon: 'wallet', tone: 'amber' },
  MONTH_CLOSED: { icon: 'chart-pie', tone: 'brand' },
  SYSTEM: { icon: 'info', tone: 'blue' },
  BUDGET_THRESHOLD_80: { icon: 'circle-alert', tone: 'amber' },
  BUDGET_THRESHOLD_100: { icon: 'triangle-alert', tone: 'danger' },
  BUDGET_PERIOD_PREPARATION: { icon: 'wallet', tone: 'amber' },
  WEEKLY_GUIDE: { icon: 'chart-pie', tone: 'blue' },
  BUDGET_CHANGED: { icon: 'wallet', tone: 'amber' },
  RESERVE_TRANSFER: { icon: 'wallet', tone: 'brand' },
}

/* 백엔드가 알림 종류를 새로 추가해도 알림함이 죽지 않게 기본값을 둡니다.
 * 예전에는 매핑에 없는 종류가 오면 바로 아래 TONE_STYLE 조회에서 TypeError 가 났습니다. */
const FALLBACK_PRESENTATION = { icon: 'info', tone: 'blue' } as const

const TONE_STYLE: Record<NotificationTone, { background: string; color: string }> = {
  brand: { background: 'var(--wl-color-primary-soft)', color: 'var(--wl-color-primary-dark)' },
  amber: { background: 'var(--wl-data-amber-soft)', color: 'var(--wl-data-amber-ink)' },
  blue: { background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  danger: { background: 'var(--wl-danger-soft)', color: 'var(--wl-color-danger)' },
}

const rowGridStyle: CSSProperties = { gridTemplateColumns: '34px minmax(0, 1fr)', color: 'inherit', textDecoration: 'none' }

/** 알림 한 줄 — 아이콘 칩 · 제목 · 본문 · 시각. 알림함 전체 페이지와 대시보드 팝오버가 같은 행을 씁니다. */
export function NotificationRow({ item, onRead }: { item: UserNotification; onRead: () => void }) {
  const unread = !item.read
  const presentation = TYPE_PRESENTATION[item.type] ?? FALLBACK_PRESENTATION
  const toneStyle = TONE_STYLE[presentation.tone]
  const rowClassName = `grid w-full items-start gap-3 rounded-xl px-2 py-3 text-left ${unread ? 'bg-[var(--wl-brand-50)]' : 'bg-transparent'} hover:bg-[var(--wl-color-surface-subtle)]`
  /* 기간 종료 요약(/periods/:startDate/summary)의 유일한 진입점은 이 알림입니다.
   * targetPath 가 있으면 그걸 우선 쓰고, MONTH_CLOSED 인데 targetPath 가 없으면 budgetPeriodStart 로 직접 링크를 만듭니다. */
  const linkTo = item.targetPath ?? (item.type === 'MONTH_CLOSED' && item.budgetPeriodStart ? `/periods/${item.budgetPeriodStart}/summary` : null)

  const content: ReactNode = (
    <>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: 10,
          background: toneStyle.background,
          color: toneStyle.color,
        }}
      >
        <Icon name={presentation.icon} size="md" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong
            className="wl-list-title"
            style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread ? 700 : 600 }}
          >
            {item.title}
          </strong>
          {unread ? (
            <i
              aria-hidden="true"
              style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--wl-color-primary)' }}
            />
          ) : null}
        </span>
        <span className="wl-body" style={{ display: 'block', marginTop: 5, lineHeight: 1.55, wordBreak: 'keep-all' }}>
          {item.message}
        </span>
        <span className="wl-meta" style={{ display: 'block', marginTop: 7 }}>{formatNotificationTime(item.createdAt)}</span>
      </span>
    </>
  )

  return (
    <li>
      {linkTo ? (
        <Link className={rowClassName} onClick={() => unread && onRead()} style={rowGridStyle} to={linkTo}>
          {content}
        </Link>
      ) : (
        <button className={rowClassName} onClick={() => unread && onRead()} style={rowGridStyle} type="button">
          {content}
        </button>
      )}
    </li>
  )
}
