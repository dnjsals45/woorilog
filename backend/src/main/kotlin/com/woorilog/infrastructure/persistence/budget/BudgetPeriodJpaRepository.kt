package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetPeriod
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface BudgetPeriodJpaRepository : JpaRepository<BudgetPeriod, Long> {
    fun findByLedgerIdAndStartDate(ledgerId: Long, startDate: LocalDate): BudgetPeriod?
    fun findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate,
    ): BudgetPeriod?
    fun findByLedgerIdOrderByStartDateDesc(ledgerId: Long): List<BudgetPeriod>
    fun findFirstByLedgerIdAndStartDateLessThanOrderByStartDateDesc(ledgerId: Long, startDate: LocalDate): BudgetPeriod?
}
