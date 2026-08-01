import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type ToastTone = 'info' | 'success' | 'warning' | 'danger'

const TONE_ICONS: Record<ToastTone, IconName> = {
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-alert',
  info: 'info',
}

/** 작업 결과를 알리는 짧은 알림. 실행 취소 같은 액션 하나까지만 붙입니다. */
export interface ToastProps {
  children: ReactNode
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
}

export function Toast({ children, tone = 'info', action }: ToastProps) {
  return (
    <div aria-live={tone === 'danger' ? 'assertive' : 'polite'} className={`wl-toast wl-toast--${tone}`} role="status">
      <span className="wl-toast-icon">
        <Icon name={TONE_ICONS[tone]} size="lg" />
      </span>
      <div className="wl-toast-body wl-body">{children}</div>
      {action ? (
        <button className="wl-button wl-button--text" onClick={action.onClick} type="button">
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
