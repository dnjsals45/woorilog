package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.WeeklyBudgetGuide
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface WeeklyBudgetGuideJpaRepository : JpaRepository<WeeklyBudgetGuide, Long> {
    fun existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(userId: Long, ledgerId: Long, weekStartDate: LocalDate, budgetPeriodId: Long): Boolean
    fun findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId: Long, ledgerId: Long): WeeklyBudgetGuide?
}
