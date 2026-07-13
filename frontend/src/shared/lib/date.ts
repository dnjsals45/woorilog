export function formatBudgetMonth(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDateInputPeriod(
  dateString: string,
  period: 'WEEK' | 'MONTH' | 'YEAR',
) {
  const date = parseLocalDate(dateString)

  if (period === 'WEEK') {
    date.setDate(date.getDate() + 7)
    return formatLocalDate(date)
  }

  const targetYear = date.getFullYear() + (period === 'YEAR' ? 1 : 0)
  const targetMonth = period === 'MONTH' ? date.getMonth() + 1 : date.getMonth()
  const targetMonthLastDay = new Date(targetYear, targetMonth + 1, 0).getDate()

  return formatLocalDate(new Date(
    targetYear,
    targetMonth,
    Math.min(date.getDate(), targetMonthLastDay),
  ))
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dateWithClosingDay(year: number, month: number, closingDay: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(closingDay, lastDay))
}

export function getRecurringSummaryPeriod(closingDay: number, today = new Date()) {
  if (closingDay === 31) {
    return {
      startDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatLocalDate(dateWithClosingDay(today.getFullYear(), today.getMonth() + 1, closingDay)),
    }
  }

  const periodStart = dateWithClosingDay(today.getFullYear(), today.getMonth() + 1, closingDay)
  periodStart.setDate(periodStart.getDate() + 1)
  const periodEnd = dateWithClosingDay(today.getFullYear(), today.getMonth() + 2, closingDay)

  return { startDate: formatLocalDate(periodStart), endDate: formatLocalDate(periodEnd) }
}

export function countRecurringOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: 'WEEKLY' | 'MONTHLY',
  periodStartDate: string,
  periodEndDate: string,
) {
  const periodStart = parseLocalDate(periodStartDate)
  const periodEnd = parseLocalDate(periodEndDate)
  const recurrenceEnd = endDate ? parseLocalDate(endDate) : null
  let occurrence = parseLocalDate(startDate)
  let count = 0

  while (occurrence <= periodEnd && (!recurrenceEnd || occurrence <= recurrenceEnd)) {
    if (occurrence >= periodStart) count += 1
    if (frequency === 'WEEKLY') {
      occurrence.setDate(occurrence.getDate() + 7)
    } else {
      const nextMonth = occurrence.getMonth() + 1
      const nextMonthLastDay = new Date(occurrence.getFullYear(), nextMonth + 1, 0).getDate()
      occurrence = new Date(occurrence.getFullYear(), nextMonth, Math.min(occurrence.getDate(), nextMonthLastDay))
    }
  }

  return count
}
