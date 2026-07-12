type CalendarGridProps = {
  budgetMonth: string
  transactionDates?: string[]
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
  compact?: boolean
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarGrid({
  budgetMonth,
  transactionDates = [],
  selectedDate,
  onSelectDate,
  compact = false,
}: CalendarGridProps) {
  const [year, month] = budgetMonth.split('-').map(Number)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  )
  const dateSet = new Set(transactionDates)

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
        {weekdayLabels.map((label, index) => (
          <span className={index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-600' : ''} key={label}>
            {label}
          </span>
        ))}
      </div>
      <div aria-label="월간 달력" className={`mt-3 grid grid-cols-7 ${compact ? 'gap-1' : 'gap-1.5 sm:gap-2'}`} role="grid">
        {cells.map((day, index) => {
          if (!day) return <span className={compact ? 'h-7' : 'h-12'} key={`empty-${index}`} />
          const date = `${budgetMonth}-${String(day).padStart(2, '0')}`
          const hasTransaction = dateSet.has(date)
          const selected = date === selectedDate
          return (
            <button
              aria-label={`${date}${hasTransaction ? ', 거래 있음' : ''}`}
              aria-selected={selected}
              role="gridcell"
              className={`relative flex items-center justify-center rounded-xl text-sm transition ${compact ? 'h-7' : 'h-12 border border-[var(--wl-color-border)]'} ${selected ? 'bg-[var(--wl-color-primary)] font-bold text-white' : 'bg-white text-slate-800 hover:bg-[var(--wl-color-primary-soft)]'}`}
              key={date}
              onClick={() => onSelectDate?.(date)}
              type="button"
            >
              {day}
              {hasTransaction ? <span className={`absolute bottom-1 size-1.5 rounded-full ${selected ? 'bg-white' : 'bg-orange-500'}`} /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
