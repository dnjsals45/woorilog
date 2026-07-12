import { Inbox } from 'lucide-react'
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
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="dashboard-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
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
  return (
    <div className="dashboard-card-header">
      <div><p className="dashboard-eyebrow">{eyebrow}</p><h2 className="dashboard-card-title" id={id}>{title}</h2></div>
      {trailing}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="dashboard-empty flex flex-col items-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={23} aria-hidden="true" /></span>
      <strong className="mt-3 text-sm text-slate-800">{title}</strong>
      <span className="mt-1 max-w-xs text-xs font-medium leading-5 text-slate-400">{description}</span>
    </div>
  )
}
