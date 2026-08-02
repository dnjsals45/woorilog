package com.woorilog.application.scheduled.command

import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.BudgetSource
import java.time.LocalDate

data class UpdateScheduledPlanCommand(
    val scope: String,
    val name: String?,
    val amount: Long?,
    val categoryId: Long?,
    val budgetSource: BudgetSource?,
    val frequency: ScheduleFrequency?,
    val nextDueDate: LocalDate?,
    val endDate: LocalDate?,
    val isFixedExpense: Boolean?,
)
