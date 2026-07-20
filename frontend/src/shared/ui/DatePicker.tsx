import { CalendarDays, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from '@daypicker/react'
import { ko } from '@daypicker/react/locale'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  name?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
}

type PopoverPosition = {
  left: number
  maxHeight: number
  top: number
}

const VIEWPORT_GUTTER = 16
const POPOVER_GAP = 8
const POPOVER_WIDTH = 336
const POPOVER_HEIGHT = 390

function toDate(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : undefined
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toDisplayValue(value: string): string {
  const date = toDate(value)
  return date ? `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.` : '날짜 선택'
}

export function DatePicker({ value, onChange, ariaLabel, name, disabled = false, clearable = false, className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedDate = toDate(value)

  useLayoutEffect(() => {
    if (!open) return

    function updatePopoverPosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2)
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER, rect.right - width),
        window.innerWidth - width - VIEWPORT_GUTTER,
      )
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_GUTTER
      const spaceAbove = rect.top - POPOVER_GAP - VIEWPORT_GUTTER
      const opensBelow = spaceBelow >= POPOVER_HEIGHT || spaceBelow >= spaceAbove
      const availableHeight = opensBelow ? spaceBelow : spaceAbove

      setPopoverPosition({
        left,
        maxHeight: Math.max(160, availableHeight),
        top: opensBelow
          ? rect.bottom + POPOVER_GAP
          : Math.max(VIEWPORT_GUTTER, rect.top - POPOVER_GAP - Math.min(POPOVER_HEIGHT, availableHeight)),
      })
    }

    const animationFrame = window.requestAnimationFrame(updatePopoverPosition)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open])

  function selectDate(date: Date | undefined) {
    if (!date) return
    onChange(toDateInputValue(date))
    setOpen(false)
  }

  return (
    <div className={`woorilog-date-picker relative ${className}`}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button aria-expanded={open} aria-haspopup="dialog" aria-label={ariaLabel} className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left text-base font-bold text-slate-900 outline-none transition hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400" disabled={disabled} onClick={() => setOpen((current) => !current)} ref={triggerRef} type="button"><span>{toDisplayValue(value)}</span><CalendarDays aria-hidden="true" className="shrink-0 text-emerald-700" size={19} /></button>
      {open && popoverPosition ? createPortal(
        <div aria-label={`${ariaLabel} 달력`} className="woorilog-date-picker fixed z-[70] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)]" role="dialog" style={popoverPosition}>
          <DayPicker animate locale={ko} mode="single" navLayout="around" onSelect={selectDate} selected={selectedDate} />
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button className="min-h-10 rounded-lg px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => selectDate(new Date())} type="button">오늘</button>
            <span>{clearable ? <button aria-label={`${ariaLabel} 지우기`} className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => { onChange(''); setOpen(false) }} type="button"><X size={18} /></button> : null}</span>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
