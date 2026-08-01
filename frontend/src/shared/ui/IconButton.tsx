import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

/** 라벨 없이 아이콘만 있는 액션 버튼. label은 필수(스크린리더·툴팁 겸용). */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: IconName
  /** aria-label과 title에 함께 들어갑니다. */
  label: string
  shape?: 'square' | 'circle'
  /** subtle=투명 배경 · neutral=테두리 있는 흰 배경 · danger=빨강 잉크 */
  tone?: 'subtle' | 'neutral' | 'danger'
}

export function IconButton({
  name,
  label,
  shape = 'square',
  tone = 'subtle',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={[
        'wl-icon-button',
        `wl-icon-button--${tone}`,
        shape === 'circle' ? 'wl-icon-button--circle' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      type={type}
      {...rest}
    >
      <Icon name={name} size="lg" />
    </button>
  )
}
