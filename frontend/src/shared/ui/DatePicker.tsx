import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { CalendarGrid } from './CalendarGrid'

const VIEWPORT_GUTTER = 16
const POPOVER_GAP = 8
const POPOVER_WIDTH = 336
const POPOVER_HEIGHT = 390

type PopoverPosition = { left: number; top: number; maxHeight: number }

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : undefined
}
function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function toDisplayValue(value: string): string {
  const date = toDate(value)
  return date
    ? `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`
    : '날짜 선택'
}

/** 하나의 날짜를 고르는 팝오버 입력. 팝오버는 document.body로 포털되므로 overflow:hidden 안에서도 잘리지 않습니다. */
export interface DatePickerProps {
  /** 'YYYY-MM-DD' 또는 빈 문자열 */
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  /** 값을 폼으로 전송해야 할 때 hidden input 이름. */
  name?: string
  disabled?: boolean
  /** true면 팝오버 하단에 지우기 버튼이 생깁니다. */
  clearable?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  ariaLabel = '날짜',
  name,
  disabled = false,
  clearable = false,
  className = '',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const [month, setMonth] = useState(() => (value || toInputValue(new Date())).slice(0, 7))
  const triggerRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!open) return undefined
    function update() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2)
      const left = Math.min(Math.max(VIEWPORT_GUTTER, rect.right - width), window.innerWidth - width - VIEWPORT_GUTTER)
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_GUTTER
      const spaceAbove = rect.top - POPOVER_GAP - VIEWPORT_GUTTER
      const opensBelow = spaceBelow >= POPOVER_HEIGHT || spaceBelow >= spaceAbove
      const availableHeight = opensBelow ? spaceBelow : spaceAbove
      setPosition({
        left,
        maxHeight: Math.max(160, availableHeight),
        top: opensBelow
          ? rect.bottom + POPOVER_GAP
          : Math.max(VIEWPORT_GUTTER, rect.top - POPOVER_GAP - Math.min(POPOVER_HEIGHT, availableHeight)),
      })
    }
    const frame = window.requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  function select(date: string) {
    onChange(date)
    setOpen(false)
  }

  return (
    <div className={`woorilog-date-picker relative ${className}`}>
      {name ? <input name={name} type="hidden" value={value || ''} /> : null}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-[var(--wl-color-border-strong)] bg-[var(--wl-color-surface)] px-4 text-left text-base font-bold text-[var(--wl-color-text-main)] outline-none transition hover:border-[var(--wl-color-primary)] disabled:bg-[var(--wl-color-surface-subtle)] disabled:text-[var(--wl-color-text-secondary)]"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span>{toDisplayValue(value)}</span>
        <Icon name="calendar-days" size="lg" className="shrink-0 text-[var(--wl-color-primary-dark)]" />
      </button>
      {open && position
        ? createPortal(
            <div
              aria-label={`${ariaLabel} 달력`}
              className="woorilog-date-picker fixed z-[70] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] p-3 shadow-[var(--wl-shadow-modal)]"
              role="dialog"
              style={position}
            >
              <CalendarGrid
                budgetMonth={month}
                selectedDate={value}
                onSelectDate={select}
                onMonthChange={setMonth}
                compact
              />
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--wl-color-border)] pt-3">
                <button
                  className="min-h-11 rounded-lg px-3 text-sm font-bold text-[var(--wl-color-primary-dark)] hover:bg-[var(--wl-brand-50)]"
                  onClick={() => select(toInputValue(new Date()))}
                  type="button"
                >
                  오늘
                </button>
                <span>
                  {clearable ? (
                    <button
                      aria-label={`${ariaLabel} 지우기`}
                      className="flex size-11 items-center justify-center rounded-lg text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-color-surface-subtle)]"
                      onClick={() => {
                        onChange('')
                        setOpen(false)
                      }}
                      type="button"
                    >
                      <Icon name="x" size="md" />
                    </button>
                  ) : null}
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
