package com.woorilog.controller.scheduled.request

import com.woorilog.application.scheduled.command.UpdateScheduledPlanCommand
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.BudgetSource
import java.time.LocalDate

data class UpdateScheduledPlanApiRequest(
    val scope: String,
    val name: String?,
    val amount: Long?,
    val categoryId: Long?,
    val budgetSource: BudgetSource?,
    val frequency: ScheduleFrequency?,
    val nextDueDate: LocalDate?,
    val endDate: LocalDate?,
    val isFixedExpense: Boolean?,
) {
    fun toCommand() = UpdateScheduledPlanCommand(
        scope = scope,
        name = name,
        amount = amount,
        categoryId = categoryId,
        budgetSource = budgetSource,
        frequency = frequency,
        nextDueDate = nextDueDate,
        endDate = endDate,
        isFixedExpense = isFixedExpense,
    )
}
