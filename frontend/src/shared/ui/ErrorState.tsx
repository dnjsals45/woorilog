import type { ReactNode } from 'react'
import { Icon } from './Icon'

/** 조회 실패 상태. onRetry 를 주면 다시 시도 버튼이 붙습니다. */
export interface ErrorStateProps {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
}

export function ErrorState({
  title = '정보를 불러오지 못했습니다.',
  description = '연결 상태를 확인한 뒤 다시 시도해주세요.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="dashboard-empty flex flex-col items-center" role="alert">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--wl-danger-soft)] text-[var(--wl-color-danger)]">
        <Icon name="triangle-alert" size="xl" />
      </span>
      <strong className="mt-3 text-sm text-[var(--wl-color-text-main)]">{title}</strong>
      <span className="mt-1 max-w-sm text-center text-xs leading-5 font-medium text-[var(--wl-color-text-secondary)]">
        {description}
      </span>
      {onRetry ? (
        <button
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] px-4 text-sm font-bold text-[var(--wl-color-text-body)] hover:border-[var(--wl-color-border-strong)] hover:bg-[var(--wl-brand-50)]"
          onClick={onRetry}
          type="button"
        >
          <Icon name="rotate-ccw" size="sm" />
          다시 시도
        </button>
      ) : null}
    </div>
  )
}
