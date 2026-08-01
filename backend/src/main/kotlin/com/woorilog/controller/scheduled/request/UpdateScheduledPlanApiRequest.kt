package com.woorilog.controller.scheduled.request

import com.woorilog.application.scheduled.command.UpdateScheduledPlanCommand
import java.time.LocalDate

data class UpdateScheduledPlanApiRequest(
    val scope: String,
    val name: String?,
    val amount: Long?,
    val nextDueDate: LocalDate?,
    val endDate: LocalDate?,
    val fixedExpense: Boolean?,
) {
    fun toCommand() = UpdateScheduledPlanCommand(
        scope = scope,
        name = name,
        amount = amount,
        nextDueDate = nextDueDate,
        endDate = endDate,
        fixedExpense = fixedExpense,
    )
}
