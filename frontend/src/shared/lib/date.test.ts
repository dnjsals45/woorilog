import { describe, expect, it } from 'vitest'
import { addDateInputPeriod, countRecurringOccurrences, formatMonthlyClosingDay, getRecurringSummaryPeriod } from './date'

describe('monthly closing day', () => {
  it('labels 31 as the end of each month', () => {
    expect(formatMonthlyClosingDay(25)).toBe('매달 25일')
    expect(formatMonthlyClosingDay(31)).toBe('매달 말일')
  })
})

describe('recurring summary period', () => {
  it('uses the day after the closing day through the next closing day', () => {
    expect(getRecurringSummaryPeriod(10, new Date(2026, 6, 13))).toEqual({
      startDate: '2026-07-11',
      endDate: '2026-08-10',
    })
    expect(getRecurringSummaryPeriod(20, new Date(2026, 6, 14))).toEqual({
      startDate: '2026-07-21',
      endDate: '2026-08-20',
    })
    expect(getRecurringSummaryPeriod(31, new Date(2026, 6, 14))).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    })
  })

  it('counts weekly and monthly occurrences within the summary period', () => {
    expect(countRecurringOccurrences('2026-07-11', null, 'WEEKLY', '2026-07-11', '2026-08-10')).toBe(5)
    expect(countRecurringOccurrences('2026-07-10', null, 'MONTHLY', '2026-07-11', '2026-08-10')).toBe(1)
  })
})

describe('addDateInputPeriod', () => {
  it('adds a week, month, or year while keeping end-of-month dates valid', () => {
    expect(addDateInputPeriod('2026-07-13', 'WEEK')).toBe('2026-07-20')
    expect(addDateInputPeriod('2026-01-31', 'MONTH')).toBe('2026-02-28')
    expect(addDateInputPeriod('2024-02-29', 'YEAR')).toBe('2025-02-28')
  })
})
