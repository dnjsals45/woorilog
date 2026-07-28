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
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7)
  const previousMonthDays = new Date(year, month - 1, 0).getDate()
  const cells = compact
    ? Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (
      index < firstWeekday
        ? null
        : { day: index - firstWeekday + 1, currentMonth: true }
    ))
    : Array.from({ length: weekCount * 7 }, (_, index) => {
      const currentDay = index - firstWeekday + 1
      if (currentDay < 1) return { day: previousMonthDays + currentDay, currentMonth: false }
      if (currentDay > daysInMonth) return { day: currentDay - daysInMonth, currentMonth: false }
      return { day: currentDay, currentMonth: true }
    })
  const dateSet = new Set(transactionDates)

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-[var(--wl-color-text-secondary)]">
        {weekdayLabels.map((label, index) => (
          <span className={index === 0 ? 'text-[var(--wl-color-expense)]' : index === 6 ? 'text-[var(--wl-color-income)]' : ''} key={label}>
            {label}
          </span>
        ))}
      </div>
      <div
        aria-label="월간 달력"
        className={`mt-3 grid grid-cols-7 ${compact ? 'gap-1' : 'h-[350px] gap-x-1.5 gap-y-2 sm:gap-x-2'}`}
        role="grid"
        style={compact ? undefined : { gridTemplateRows: `repeat(${weekCount}, minmax(48px, 1fr))` }}
      >
        {cells.map((cell, index) => {
          if (!cell) return <span className={compact ? 'h-7' : 'h-12'} key={`empty-${index}`} />
          if (!cell.currentMonth) {
            return <span aria-hidden="true" className="flex items-center justify-center text-sm font-medium text-[var(--wl-color-text-secondary)] opacity-45" key={`adjacent-${index}`}>{cell.day}</span>
          }
          const date = `${budgetMonth}-${String(cell.day).padStart(2, '0')}`
          const hasTransaction = dateSet.has(date)
          const selected = date === selectedDate
          return (
            <button
              aria-label={`${date}${hasTransaction ? ', 거래 있음' : ''}`}
              aria-selected={selected}
              role="gridcell"
              className={`relative flex items-center justify-center rounded-xl text-sm transition ${compact ? 'h-7' : 'h-12 border border-[var(--wl-color-border)]'} ${selected ? 'bg-[var(--wl-color-primary)] font-bold text-white' : 'bg-[var(--wl-color-surface)] text-[var(--wl-color-text-main)] hover:border-[var(--wl-color-border-strong)] hover:bg-[var(--wl-brand-50)]'}`}
              key={date}
              onClick={() => onSelectDate?.(date)}
              type="button"
            >
              {cell.day}
              {hasTransaction ? <span className={`absolute bottom-1 size-1.5 rounded-full ${selected ? 'bg-white' : 'bg-[var(--wl-color-expense)]'}`} /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
