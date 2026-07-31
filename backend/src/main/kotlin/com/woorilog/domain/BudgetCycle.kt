package com.woorilog.domain

import java.time.LocalDate
import java.time.YearMonth

enum class BudgetStartType {
    DAY_OF_MONTH,
    LAST_DAY_OF_MONTH,
}

data class BudgetDateRange(
    val startDate: LocalDate,
    val endDate: LocalDate,
)

/**
 * Calculates immutable budget-period boundaries from a ledger's cycle rule.
 * Persisted periods keep their own dates; this policy is only used when a new
 * period needs to be located or created.
 */
class BudgetCyclePolicy(
    private val startType: BudgetStartType,
    private val startDay: Int?,
) {
    init {
        when (startType) {
            BudgetStartType.DAY_OF_MONTH -> require(startDay in 1..28) {
                "DAY_OF_MONTH requires startDay between 1 and 28."
            }

            BudgetStartType.LAST_DAY_OF_MONTH -> require(startDay == null) {
                "LAST_DAY_OF_MONTH does not accept startDay."
            }
        }
    }

    fun periodContaining(date: LocalDate): BudgetDateRange {
        val currentMonthStart = startFor(YearMonth.from(date))
        val start = if (currentMonthStart <= date) {
            currentMonthStart
        } else {
            startFor(YearMonth.from(date).minusMonths(1))
        }
        return BudgetDateRange(start, nextStart(start).minusDays(1))
    }

    fun nextPeriod(range: BudgetDateRange): BudgetDateRange {
        val start = nextStart(range.startDate)
        return BudgetDateRange(start, nextStart(start).minusDays(1))
    }

    private fun nextStart(start: LocalDate): LocalDate =
        startFor(YearMonth.from(start).plusMonths(1))

    private fun startFor(month: YearMonth): LocalDate = when (startType) {
        BudgetStartType.DAY_OF_MONTH -> month.atDay(checkNotNull(startDay))
        BudgetStartType.LAST_DAY_OF_MONTH -> month.atEndOfMonth()
    }
}
