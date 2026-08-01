import { Icon } from './Icon'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function shiftMonth(budgetMonth: string, delta: number): string {
  const [year, month] = budgetMonth.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

type Cell = { day: number; currentMonth: boolean } | null

/** 한 달치 날짜 격자. 거래가 있는 날에는 점이 찍힙니다. */
export interface CalendarGridProps {
  /** 'YYYY-MM' */
  budgetMonth: string
  /** 거래가 있는 날짜들 'YYYY-MM-DD'[] */
  transactionDates?: string[]
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
  /** 넘기면 격자 위에 월 이동 헤더(‹ 2026년 8월 ›)가 붙습니다. 페이지가 월을 소유하면 넘기지 마세요. */
  onMonthChange?: (budgetMonth: string) => void
  /** true면 셀 높이 28px·테두리 없음(사이드 패널용). */
  compact?: boolean
}

/* 월 이동 헤더는 onMonthChange를 넘길 때만 그립니다.
 * 페이지가 월을 소유하는 화면(대시보드의 .dashboard-month-picker)에서는 넘기지 않습니다. */
export function CalendarGrid({
  budgetMonth,
  transactionDates = [],
  selectedDate,
  onSelectDate,
  onMonthChange,
  compact = false,
}: CalendarGridProps) {
  const [year, month] = budgetMonth.split('-').map(Number)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7)
  const previousMonthDays = new Date(year, month - 1, 0).getDate()
  const cells: Cell[] = compact
    ? Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
        index < firstWeekday ? null : { day: index - firstWeekday + 1, currentMonth: true },
      )
    : Array.from({ length: weekCount * 7 }, (_, index) => {
        const currentDay = index - firstWeekday + 1
        if (currentDay < 1) return { day: previousMonthDays + currentDay, currentMonth: false }
        if (currentDay > daysInMonth) return { day: currentDay - daysInMonth, currentMonth: false }
        return { day: currentDay, currentMonth: true }
      })
  const dateSet = new Set(transactionDates)
  const [headerYear, headerMonth] = budgetMonth.split('-')
  return (
    <div>
      {onMonthChange ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <button
            type="button"
            aria-label="이전 달"
            className="dashboard-month-button"
            onClick={() => onMonthChange(shiftMonth(budgetMonth, -1))}
          >
            <Icon name="chevron-left" size="lg" />
          </button>
          <strong className="wl-section-title">{`${headerYear}년 ${Number(headerMonth)}월`}</strong>
          <button
            type="button"
            aria-label="다음 달"
            className="dashboard-month-button"
            onClick={() => onMonthChange(shiftMonth(budgetMonth, 1))}
          >
            <Icon name="chevron-right" size="lg" />
          </button>
        </div>
      ) : null}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-[var(--wl-color-text-secondary)]">
        {WEEKDAYS.map((label, index) => (
          <span
            className={
              index === 0
                ? 'text-[var(--wl-color-expense)]'
                : index === 6
                  ? 'text-[var(--wl-color-income)]'
                  : ''
            }
            key={label}
          >
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
            return (
              <span
                aria-hidden="true"
                className="flex items-center justify-center text-sm font-medium text-[var(--wl-color-text-secondary)] opacity-45"
                key={`adjacent-${index}`}
              >
                {cell.day}
              </span>
            )
          }
          const date = `${budgetMonth}-${String(cell.day).padStart(2, '0')}`
          const hasTransaction = dateSet.has(date)
          const selected = date === selectedDate
          return (
            <button
              aria-label={`${date}${hasTransaction ? ', 거래 있음' : ''}`}
              aria-selected={selected}
              role="gridcell"
              className={`relative flex items-center justify-center rounded-xl text-sm transition ${compact ? 'h-7' : 'h-12'} ${selected ? 'bg-[var(--wl-color-primary)] font-bold text-white' : 'bg-[var(--wl-color-surface)] text-[var(--wl-color-text-main)] hover:bg-[var(--wl-brand-50)]'}`}
              key={date}
              onClick={() => onSelectDate && onSelectDate(date)}
              type="button"
            >
              {cell.day}
              {hasTransaction ? (
                <span
                  className={`absolute bottom-1 size-1.5 rounded-full ${selected ? 'bg-white' : 'bg-[var(--wl-color-expense-fill)]'}`}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
