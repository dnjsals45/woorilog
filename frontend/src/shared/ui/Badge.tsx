import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

/** 상태·분류를 나타내는 작은 알약 라벨. 클릭되지 않습니다. */
export interface BadgeProps {
  children: ReactNode
  /** neutral=기본 · brand=우리 예산/공동 · income=수입 · warning=주의 · danger=초과 */
  tone?: 'neutral' | 'brand' | 'income' | 'warning' | 'danger'
  icon?: IconName
}

export function Badge({ children, tone = 'neutral', icon }: BadgeProps) {
  return (
    <span className={`wl-badge wl-badge--${tone}`}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </span>
  )
}
