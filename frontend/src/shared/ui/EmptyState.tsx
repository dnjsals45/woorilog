import type { ReactNode } from 'react'
import { Icon } from './Icon'

/** 데이터가 아직 없는 상태. 무엇을 하면 채워지는지 action 으로 알려줍니다. */
export interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="dashboard-empty flex flex-col items-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--wl-data-neutral-soft)] text-[var(--wl-data-neutral-ink)]">
        <Icon name="inbox" size="xl" />
      </span>
      <strong className="mt-3 text-sm text-[var(--wl-color-text-main)]">{title}</strong>
      <span className="mt-1 max-w-xs text-xs leading-5 font-medium text-[var(--wl-color-text-secondary)]">
        {description}
      </span>
      {action ? <div className="dashboard-empty-action-slot mt-4">{action}</div> : null}
    </div>
  )
}
