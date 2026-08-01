package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.WeeklyBudgetGuide
import java.time.LocalDate

interface WeeklyBudgetGuideRepository {
    fun existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(userId: Long, ledgerId: Long, weekStartDate: LocalDate, budgetPeriodId: Long): Boolean
    fun findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId: Long, ledgerId: Long): WeeklyBudgetGuide?
    fun save(weeklyBudgetGuide: WeeklyBudgetGuide): WeeklyBudgetGuide
}
