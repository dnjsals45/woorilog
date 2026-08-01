import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

/**
 * 화면의 주요 액션 버튼. 한 화면에 primary는 하나만 둡니다.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** primary=초록 CTA · secondary=흰 배경 · text=인라인 링크형 · danger=파괴적 액션 */
  variant?: 'primary' | 'secondary' | 'text' | 'danger'
  /** md=44px · lg=48px */
  size?: 'md' | 'lg'
  /** primary에서만 스피너로 바뀝니다. */
  loading?: boolean
  fullWidth?: boolean
  iconLeft?: IconName
  iconRight?: IconName
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const busy = loading && variant === 'primary'
  return (
    <button
      aria-busy={busy || undefined}
      className={[
        'wl-button',
        `wl-button--${variant}`,
        size === 'lg' ? 'wl-button--lg' : '',
        fullWidth ? 'wl-button--full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || busy}
      type={type}
      {...rest}
    >
      {busy ? (
        <span aria-hidden="true" className="wl-button-spinner" />
      ) : iconLeft ? (
        <Icon name={iconLeft} size="md" />
      ) : null}
      {children}
      {iconRight ? <Icon name={iconRight} size="md" /> : null}
    </button>
  )
}
