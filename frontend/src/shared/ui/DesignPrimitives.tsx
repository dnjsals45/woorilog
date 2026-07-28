import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  const showEyebrow = Boolean(eyebrow && !/^[A-Z\s]+$/.test(eyebrow))

  return (
    <header className="flex flex-col gap-4 border-b border-[var(--wl-color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {showEyebrow ? <p className="dashboard-eyebrow">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-[-0.035em] text-[var(--wl-color-text-main)] sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm font-medium leading-6 text-[var(--wl-color-text-secondary)]">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}

export function SurfaceCard({
  children,
  className = '',
  labelledBy,
}: {
  children: ReactNode
  className?: string
  labelledBy?: string
}) {
  return <article aria-labelledby={labelledBy} className={`dashboard-card ${className}`}>{children}</article>
}

export function CardHeading({
  eyebrow,
  title,
  id,
  trailing,
}: {
  eyebrow: string
  title: string
  id?: string
  trailing?: ReactNode
}) {
  const showEyebrow = Boolean(eyebrow && !/^[A-Z\s]+$/.test(eyebrow))

  return (
    <div className="dashboard-card-header">
      <div>{showEyebrow ? <p className="dashboard-eyebrow">{eyebrow}</p> : null}<h2 className="dashboard-card-title" id={id}>{title}</h2></div>
      {trailing}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="dashboard-empty flex flex-col items-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--wl-data-neutral-soft)] text-[var(--wl-data-neutral)]"><Inbox size={23} aria-hidden="true" /></span>
      <strong className="mt-3 text-sm text-[var(--wl-color-text-main)]">{title}</strong>
      <span className="mt-1 max-w-xs text-xs font-medium leading-5 text-[var(--wl-color-text-secondary)]">{description}</span>
      {action ? <div className="dashboard-empty-action-slot mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = '정보를 불러오지 못했습니다.',
  description = '연결 상태를 확인한 뒤 다시 시도해주세요.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="dashboard-empty flex flex-col items-center" role="alert">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--wl-danger-soft)] text-[var(--wl-color-danger)]"><AlertTriangle size={23} aria-hidden="true" /></span>
      <strong className="mt-3 text-sm text-[var(--wl-color-text-main)]">{title}</strong>
      <span className="mt-1 max-w-sm text-center text-xs font-medium leading-5 text-[var(--wl-color-text-secondary)]">{description}</span>
      {onRetry ? <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] px-4 text-sm font-bold text-[var(--wl-color-text-body)] hover:border-[var(--wl-color-border-strong)] hover:bg-[var(--wl-brand-50)]" onClick={onRetry} type="button"><RotateCcw size={16} />다시 시도</button> : null}
    </div>
  )
}
