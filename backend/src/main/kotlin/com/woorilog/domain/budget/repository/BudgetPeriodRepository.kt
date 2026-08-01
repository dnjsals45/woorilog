package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.BudgetPeriod
import java.time.LocalDate

interface BudgetPeriodRepository {
    fun findByIdOrNull(id: Long): BudgetPeriod?
    fun findAll(): List<BudgetPeriod>
    fun findByLedgerIdAndStartDate(ledgerId: Long, startDate: LocalDate): BudgetPeriod?
    fun findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate,
    ): BudgetPeriod?
    fun findByLedgerIdOrderByStartDateDesc(ledgerId: Long): List<BudgetPeriod>
    fun save(budgetPeriod: BudgetPeriod): BudgetPeriod
}
