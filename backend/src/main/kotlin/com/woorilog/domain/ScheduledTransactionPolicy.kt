package com.woorilog.domain

import java.time.LocalDate
import java.time.YearMonth

enum class ScheduleFrequency {
    WEEKLY,
    MONTHLY,
    YEARLY,
}

object InstallmentPolicy {
    fun principalForSequence(totalPrincipal: Long, totalSequences: Int, sequence: Int): Long {
        require(totalPrincipal > 0) { "Total principal must be positive." }
        require(totalSequences > 0) { "Total sequences must be positive." }
        require(sequence in 1..totalSequences) { "Sequence is outside the installment range." }

        val base = totalPrincipal / totalSequences
        val remainder = totalPrincipal % totalSequences
        return base + if (sequence <= remainder) 1 else 0
    }

    fun amountForSequence(
        totalPrincipal: Long,
        totalSequences: Int,
        sequence: Int,
        monthlyInterest: Long,
    ): Long {
        require(monthlyInterest >= 0) { "Monthly interest cannot be negative." }
        return Math.addExact(
            principalForSequence(totalPrincipal, totalSequences, sequence),
            monthlyInterest,
        )
    }
}

object ScheduleDatePolicy {
    fun nextDate(current: LocalDate, frequency: ScheduleFrequency, anchorDay: Int = current.dayOfMonth): LocalDate =
        when (frequency) {
            ScheduleFrequency.WEEKLY -> current.plusWeeks(1)
            ScheduleFrequency.MONTHLY -> dateInMonth(YearMonth.from(current).plusMonths(1), anchorDay)
            ScheduleFrequency.YEARLY -> dateInMonth(
                YearMonth.of(current.year + 1, current.month),
                anchorDay,
            )
        }

    private fun dateInMonth(month: YearMonth, anchorDay: Int): LocalDate {
        require(anchorDay in 1..31) { "Anchor day must be between 1 and 31." }
        return month.atDay(minOf(anchorDay, month.lengthOfMonth()))
    }
}
